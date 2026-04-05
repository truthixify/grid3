import { useState, useCallback } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import type { GameState } from "../lib/types";
import { Winner } from "../lib/types";
import {
  buildCreateTx,
  buildJoinTx,
  buildMoveTx,
  buildFinishTx,
  buildResetTx,
  buildForfeitTx,
  buildCancelTx,
  determineWinner,
} from "../lib/builder";
import {
  recordGameCreated,
  recordGameJoined,
  recordGameFinished,
  recordGameCancelled,
  recordGameForfeited,
} from "../lib/db";

interface UseGameActionsReturn {
  createGame: (stakeAmount: bigint) => Promise<string>;
  joinGame: (
    gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
    gameState: GameState
  ) => Promise<string>;
  makeMove: (
    gameCell: {
      outPoint: ccc.OutPointLike;
      capacity: bigint;
      lockScript: ccc.ScriptLike;
    },
    gameState: GameState,
    position: number
  ) => Promise<string>;
  finishGame: (
    gameCell: {
      outPoint: ccc.OutPointLike;
      capacity: bigint;
      lockScript: ccc.ScriptLike;
    },
    gameState: GameState
  ) => Promise<string>;
  resetGame: (
    gameCell: {
      outPoint: ccc.OutPointLike;
      capacity: bigint;
      lockScript: ccc.ScriptLike;
    },
    gameState: GameState
  ) => Promise<string>;
  forfeitGame: (
    gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
    playerXLock: string
  ) => Promise<string>;
  cancelGame: (
    gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
    playerXLock: string
  ) => Promise<string>;
  loading: boolean;
  error: string | null;
}

export function useGameActions(): UseGameActionsReturn {
  const signer = ccc.useSigner();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(
    async (stakeAmount: bigint): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildCreateTx(signer, stakeAmount);
        const txHash = await signer.sendTransaction(tx);
        const addr = await signer.getRecommendedAddressObj();
        recordGameCreated(txHash, addr.script.hash(), stakeAmount.toString());
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create game";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  const joinGame = useCallback(
    async (
      gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
      gameState: GameState
    ): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildJoinTx(signer, gameCell, gameState);
        const txHash = await signer.sendTransaction(tx);
        const addr = await signer.getRecommendedAddressObj();
        recordGameJoined(gameState.playerXLock, addr.script.hash());
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to join game";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  const makeMove = useCallback(
    async (
      gameCell: {
        outPoint: ccc.OutPointLike;
        capacity: bigint;
        lockScript: ccc.ScriptLike;
      },
      gameState: GameState,
      position: number
    ): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildMoveTx(signer, gameCell, gameState, position);
        const txHash = await signer.sendTransaction(tx);
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to make move";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  const finishGame = useCallback(
    async (
      gameCell: {
        outPoint: ccc.OutPointLike;
        capacity: bigint;
        lockScript: ccc.ScriptLike;
      },
      gameState: GameState
    ): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildFinishTx(signer, gameCell, gameState);
        const txHash = await signer.sendTransaction(tx);
        const w = determineWinner(gameState.board);
        const winnerStr = w === Winner.X ? "x" : w === Winner.O ? "o" : "draw";
        recordGameFinished(gameState.playerXLock, winnerStr);
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to finish game";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  const resetGame = useCallback(
    async (
      gameCell: {
        outPoint: ccc.OutPointLike;
        capacity: bigint;
        lockScript: ccc.ScriptLike;
      },
      gameState: GameState
    ): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildResetTx(signer, gameCell, gameState);
        const txHash = await signer.sendTransaction(tx);
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to reset game";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  const forfeitGame = useCallback(
    async (
      gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
      playerXLock: string
    ): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildForfeitTx(signer, gameCell);
        const txHash = await signer.sendTransaction(tx);
        const addr = await signer.getRecommendedAddressObj();
        recordGameForfeited(playerXLock, addr.script.hash());
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to forfeit game";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  const cancelGame = useCallback(
    async (
      gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
      playerXLock: string
    ): Promise<string> => {
      if (!signer) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const tx = await buildCancelTx(signer, gameCell);
        const txHash = await signer.sendTransaction(tx);
        recordGameCancelled(playerXLock);
        return txHash;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to cancel game";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  return {
    createGame,
    joinGame,
    makeMove,
    finishGame,
    resetGame,
    forfeitGame,
    cancelGame,
    loading,
    error,
  };
}
