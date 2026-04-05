"use client";

import { useState, useEffect, useRef, useReducer } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import type { GameState } from "../lib/types";
import { GameStatus, Winner, WINNING_LINES } from "../lib/types";
import { getGameCellFull, findGameCells } from "../lib/queries";
import { POLL_INTERVAL_MS } from "../lib/constants";

function checkWinningLine(board: number[]): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

function detectWinner(board: number[]): Winner {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === 1 ? Winner.X : Winner.O;
    }
  }
  if (board.every((cell) => cell !== 0)) return Winner.DRAW;
  return Winner.NONE;
}

function parseOutPoint(gid: string) {
  if (!gid || gid === "unknown") return null;
  const parts = gid.split(":");
  if (parts.length !== 2) return null;
  return { txHash: parts[0], index: parseInt(parts[1], 16) };
}

function countMoves(board: number[]): number {
  return board.filter((v) => v !== 0).length;
}

/**
 * Is `next` a valid forward progression from `current`?
 * Prevents the indexer flip-flop from causing flickering.
 */
function isForwardProgress(current: GameState, next: GameState): boolean {
  const curStatus = current.gameStatus;
  const nextStatus = next.gameStatus;
  const curMoves = countMoves(current.board);
  const nextMoves = countMoves(next.board);

  // WAITING → ACTIVE = forward (opponent joined)
  if (curStatus === GameStatus.WAITING && nextStatus === GameStatus.ACTIVE) return true;

  // ACTIVE → WAITING = backward (never valid)
  if (curStatus === GameStatus.ACTIVE && nextStatus === GameStatus.WAITING) return false;

  // Both ACTIVE: more moves = forward
  if (curStatus === GameStatus.ACTIVE && nextStatus === GameStatus.ACTIVE) {
    if (nextMoves > curMoves) return true;
    // Reset: full board (9) → empty board (0)
    if (curMoves === 9 && nextMoves === 0) return true;
    return false;
  }

  // Both WAITING: no progress (shouldn't happen, same cell)
  if (curStatus === GameStatus.WAITING && nextStatus === GameStatus.WAITING) return false;

  // Any other transition (FINISHED, etc): accept
  return true;
}

interface GameSnapshot {
  gameState: GameState | null;
  winningLine: number[] | null;
  capacity: bigint;
  lockScript: ccc.ScriptLike | null;
  currentGameId: string;
  error: string | null;
}

type Action =
  | { type: "SET_CELL"; gameState: GameState; capacity: bigint; lockScript: ccc.ScriptLike | null; gameId: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

function reducer(state: GameSnapshot, action: Action): GameSnapshot {
  switch (action.type) {
    case "SET_CELL": {
      const w = detectWinner(action.gameState.board);
      return {
        ...state,
        gameState: action.gameState,
        capacity: action.capacity,
        lockScript: action.lockScript ?? state.lockScript,
        currentGameId: action.gameId,
        winningLine: w === Winner.X || w === Winner.O ? checkWinningLine(action.gameState.board) : null,
        error: null,
      };
    }
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "CLEAR_ERROR":
      return { ...state, error: null };
  }
}

export function useGameState(initialGameId: string) {
  const { client } = ccc.useCcc();

  const [state, dispatch] = useReducer(reducer, {
    gameState: null,
    winningLine: null,
    capacity: 0n,
    lockScript: null,
    currentGameId: initialGameId,
    error: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastPoll, setLastPoll] = useState(0);
  const [cellConsumed, setCellConsumed] = useState(false);

  const gameIdRef = useRef(initialGameId);
  const playerXRef = useRef<string | null>(null);
  const gameStateRef = useRef<GameState | null>(null); // tracks current state for comparison
  const pausedUntilRef = useRef(0);
  const minMovesRef = useRef(0);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  function applyCell(gs: GameState, cap: bigint, lock: ccc.ScriptLike | null, gid: string) {
    playerXRef.current = gs.playerXLock;
    gameStateRef.current = gs;
    dispatch({ type: "SET_CELL", gameState: gs, capacity: cap, lockScript: lock, gameId: gid });

    if (gid !== gameIdRef.current) {
      gameIdRef.current = gid;
      const newUrl = `/game/${encodeURIComponent(gid)}`;
      window.history.replaceState(window.history.state, "", newUrl);
    }
  }

  async function fetchFromChain(cl: ccc.Client): Promise<void> {
    const knownX = playerXRef.current;
    if (!knownX) return;

    const liveCells = await findGameCells(cl);
    const allMatches = liveCells.filter(
      (c) => c.state.playerXLock.toLowerCase() === knownX.toLowerCase()
    );

    if (allMatches.length === 0) {
      // Game cell no longer exists — was consumed (finished, cancelled, or forfeited)
      if (gameStateRef.current) setCellConsumed(true);
      return;
    }

    // If we have a current state, only consider cells that represent forward progress
    const currentState = gameStateRef.current;
    let candidates = allMatches;
    if (currentState) {
      const forward = allMatches.filter((c) => isForwardProgress(currentState, c.state));
      // If any forward candidates exist, use those. Otherwise keep current (no update).
      if (forward.length > 0) {
        candidates = forward;
      } else {
        // No forward progress found — don't update
        setLastPoll(Date.now());
        return;
      }
    }

    // Pick the most advanced candidate
    const match = candidates.reduce((best, c) => {
      // Prefer ACTIVE over WAITING
      if (c.state.gameStatus > best.state.gameStatus) return c;
      if (c.state.gameStatus < best.state.gameStatus) return best;
      // Same status: prefer more moves
      const bm = countMoves(best.state.board);
      const cm = countMoves(c.state.board);
      return cm > bm ? c : best;
    });

    const matchId = `${match.outPoint.txHash}:${match.outPoint.index}`;

    // Pending tx guard
    if (minMovesRef.current > 0) {
      const moves = countMoves(match.state.board);
      if (moves < minMovesRef.current) return;
      minMovesRef.current = 0;
      pausedUntilRef.current = 0;
    }

    // Only update if the cell actually changed
    if (matchId !== gameIdRef.current) {
      const op = parseOutPoint(matchId);
      if (op) {
        const full = await getGameCellFull(cl, op.txHash, op.index);
        if (full) {
          applyCell(full.gameCell.state, full.gameCell.capacity, full.lockScript, matchId);
        } else {
          applyCell(match.state, match.capacity, null, matchId);
        }
      }
    }

    setLastPoll(Date.now());
  }

  // ---- Initial load ----
  useEffect(() => {
    if (!client || initialLoadDone.current) return;
    initialLoadDone.current = true;

    gameIdRef.current = initialGameId;
    setLoading(true);

    const op = parseOutPoint(initialGameId);
    if (!op) {
      dispatch({ type: "SET_ERROR", error: "Invalid game ID" });
      setLoading(false);
      return;
    }

    getGameCellFull(client, op.txHash, op.index)
      .then((r) => {
        if (!mountedRef.current) return;
        if (r) {
          applyCell(r.gameCell.state, r.gameCell.capacity, r.lockScript, initialGameId);
        } else {
          dispatch({ type: "SET_ERROR", error: "Game not found — try refreshing." });
        }
      })
      .catch((e) => {
        if (mountedRef.current) dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "Load failed" });
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [client, initialGameId]);

  // ---- Polling ----
  useEffect(() => {
    if (!client) return;

    const id = setInterval(async () => {
      if (!playerXRef.current) return;
      if (Date.now() < pausedUntilRef.current) return;

      try {
        await fetchFromChain(client);
      } catch {
        // retry next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  function pausePolling(ms = 25000) {
    pausedUntilRef.current = Date.now() + ms;
    if (state.gameState) {
      minMovesRef.current = countMoves(state.gameState.board) + 1;
    }
  }

  async function refresh() {
    if (!client) return;
    setRefreshing(true);
    pausedUntilRef.current = 0;
    minMovesRef.current = 0;

    try {
      await fetchFromChain(client);
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "Refresh failed" });
    } finally {
      setRefreshing(false);
    }
  }

  return {
    gameState: state.gameState,
    winningLine: state.winningLine,
    capacity: state.capacity,
    lockScript: state.lockScript,
    currentGameId: state.currentGameId,
    error: state.error,
    loading,
    refreshing,
    lastPoll,
    cellConsumed,
    pausePolling,
    refresh,
  };
}
