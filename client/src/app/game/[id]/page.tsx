"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ccc } from "@ckb-ccc/connector-react";
import AppShell from "@/components/AppShell";
import GameBoard from "@/components/GameBoard";
import PlayerCard from "@/components/PlayerCard";
import { useGameState } from "@/hooks/useGameState";
import { useGameActions } from "@/hooks/useGameActions";
import { GameStatus, Player, Winner } from "@/lib/types";
import { formatCKB, shortenHash } from "@/lib/ckb";
import { CKB_EXPLORER_URL } from "@/lib/constants";
import { determineWinner } from "@/lib/builder";

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GamePage({ params }: GamePageProps) {
  const { id } = use(params);
  const gameId = decodeURIComponent(id);
  const router = useRouter();
  const signer = ccc.useSigner();

  // Remember the active game so BATTLE link can return here
  useEffect(() => {
    sessionStorage.setItem("activeGameId", gameId);
    return () => {
      // Don't clear on unmount — we want it to persist across navigation
    };
  }, [gameId]);

  const {
    gameState,
    winningLine,
    loading,
    refreshing,
    error,
    capacity,
    lockScript,
    currentGameId,
    lastPoll,
    cellConsumed,
    pausePolling,
    refresh,
  } = useGameState(gameId);

  const {
    makeMove,
    finishGame,
    resetGame,
    forfeitGame,
    cancelGame,
    loading: actionLoading,
    error: actionError,
  } = useGameActions();

  const [signerLockHash, setSignerLockHash] = useState<string>("");
  const [pendingMove, setPendingMove] = useState<number | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandonTxHash, setAbandonTxHash] = useState<string | null>(null);
  const [showAbandonSuccess, setShowAbandonSuccess] = useState(false);
  const [showOpponentQuit, setShowOpponentQuit] = useState(false);

  useEffect(() => {
    if (!signer) return;
    let cancelled = false;
    signer.getRecommendedAddressObj().then((addr) => {
      if (!cancelled) setSignerLockHash(addr.script.hash());
    });
    return () => {
      cancelled = true;
    };
  }, [signer]);

  // Clear pending move when game state updates
  useEffect(() => {
    setPendingMove(null);
  }, [gameState?.board]);

  // Compute isLoser before any early returns so the useEffect below always runs
  const winner = gameState ? determineWinner(gameState.board) : Winner.NONE;
  const isWin = winner === Winner.X || winner === Winner.O;
  const isPlayerXEarly =
    signerLockHash && gameState
      ? gameState.playerXLock.toLowerCase() === signerLockHash.toLowerCase()
      : false;
  const isPlayerOEarly =
    signerLockHash && gameState
      ? gameState.playerOLock.toLowerCase() === signerLockHash.toLowerCase()
      : false;
  const isLoser =
    isWin &&
    ((winner === Winner.X && isPlayerOEarly) || (winner === Winner.O && isPlayerXEarly));

  // Detect opponent quitting: cell consumed + game was active + no winner + we didn't forfeit
  useEffect(() => {
    if (
      cellConsumed &&
      gameState &&
      gameState.gameStatus === GameStatus.ACTIVE &&
      !isWin &&
      !showAbandonSuccess &&
      !showClaimSuccess &&
      (isPlayerXEarly || isPlayerOEarly)
    ) {
      setShowOpponentQuit(true);
    }
  }, [cellConsumed, gameState, isWin, showAbandonSuccess, showClaimSuccess, isPlayerXEarly, isPlayerOEarly]);

  // Show loss modal when the connected player loses
  useEffect(() => {
    if (isLoser && !showClaimSuccess) {
      const timer = setTimeout(() => setShowLossModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoser, showClaimSuccess]);

  // Only show full-page loading on first load when we have no data yet
  if (loading && !gameState) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-primary text-4xl waiting-pulse">
              sync
            </span>
            <p className="text-on-surface-variant text-sm font-body mt-4">
              Loading game state from chain...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if ((error && !gameState) || !gameState) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="glass-panel rounded-sm p-8 text-center max-w-md">
            <span className="material-symbols-outlined text-error text-4xl mb-4">
              error
            </span>
            <p className="text-error text-sm font-body mb-4">
              {error || "Game not found"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={refresh}
                className="ghost-border text-on-surface-variant font-headline text-xs tracking-widest px-4 py-2 rounded-sm hover:text-on-surface transition-colors cursor-pointer"
              >
                RETRY
              </button>
              <button
                onClick={() => { sessionStorage.removeItem("activeGameId"); router.push("/"); }}
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-4 py-2 rounded-sm cursor-pointer"
              >
                LOBBY
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Determine if this is WAITING state
  if (gameState.gameStatus === GameStatus.WAITING) {
    return <WaitingRoom gameState={gameState} gameId={currentGameId} capacity={capacity} />;
  }

  // ACTIVE or FINISHED game
  const isPlayerX =
    signerLockHash &&
    gameState.playerXLock.toLowerCase() === signerLockHash.toLowerCase();
  const isPlayerO =
    signerLockHash &&
    gameState.playerOLock.toLowerCase() === signerLockHash.toLowerCase();
  const isMyTurn =
    (gameState.currentTurn === Player.X && isPlayerX) ||
    (gameState.currentTurn === Player.O && isPlayerO);

  const isDraw = winner === Winner.DRAW;
  const isFinished = gameState.gameStatus === GameStatus.FINISHED || isWin || isDraw;

  // Only the WINNER can claim prize
  const canClaimPrize =
    isWin &&
    gameState.gameStatus === GameStatus.ACTIVE &&
    ((winner === Winner.X && isPlayerX) || (winner === Winner.O && isPlayerO));

  // On draw, EITHER player can reset the board
  const canReset =
    isDraw &&
    gameState.gameStatus === GameStatus.ACTIVE &&
    (isPlayerX || isPlayerO);

  const totalStake = gameState.stakeAmount * 2n;

  // Deterministic random name per game (derived from gameId hash)
  // Derive name from playerXLock (constant for the entire game, never changes)
  const gameName = useGameName(gameState.playerXLock);

  async function handleCellClick(index: number) {
    if (!signer || !isMyTurn || isFinished || actionLoading || !lockScript)
      return;
    if (gameState!.board[index] !== Player.NONE) return;

    setPendingMove(index);
    pausePolling();

    try {
      await makeMove(
        {
          outPoint: parseOutPointFromId(currentGameId),
          capacity,
          lockScript,
        },
        gameState!,
        index
      );
    } catch {
      setPendingMove(null);
    }
  }

  async function handleClaimPrize() {
    if (!signer || !canClaimPrize || !lockScript) return;
    pausePolling();
    try {
      const txHash = await finishGame(
        {
          outPoint: parseOutPointFromId(currentGameId),
          capacity,
          lockScript,
        },
        gameState!
      );
      setClaimTxHash(txHash);
      setShowClaimSuccess(true);
    } catch {
      // Error handled in hook
    }
  }

  async function handleReset() {
    if (!signer || !canReset || !lockScript) return;
    pausePolling();
    try {
      await resetGame(
        {
          outPoint: parseOutPointFromId(currentGameId),
          capacity,
          lockScript,
        },
        gameState!
      );
    } catch {
      // Error handled in hook
    }
  }

  async function confirmAbandon() {
    if (!signer) return;
    setShowAbandonModal(false);
    pausePolling();
    try {
      const txHash = await forfeitGame(
        { outPoint: parseOutPointFromId(currentGameId), capacity },
        gameState!.playerXLock
      );
      setAbandonTxHash(txHash);
      setShowAbandonSuccess(true);
      sessionStorage.removeItem("activeGameId");
    } catch {
      // Error handled in hook
    }
  }

  return (
    <AppShell>
      {/* Claim Prize Success Modal */}
      {showClaimSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-sm p-10 text-center max-w-sm mx-4 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-6xl mb-4 block">
              emoji_events
            </span>
            <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight mb-2">
              VICTORY_CLAIMED
            </h2>
            <p className="text-on-surface-variant text-sm font-body mb-6">
              Your prize has been distributed on-chain.
            </p>
            {claimTxHash && (
              <a
                href={`${CKB_EXPLORER_URL}/transaction/${claimTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-xs font-body hover:underline mb-6"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View transaction on explorer
              </a>
            )}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => { sessionStorage.removeItem("activeGameId"); router.push("/"); }}
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-8 py-3 rounded-sm cursor-pointer"
              >
                GO_TO_LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loss Modal */}
      {showLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-sm p-10 text-center max-w-sm mx-4 border border-error/20">
            <span className="material-symbols-outlined text-error text-6xl mb-4 block">
              sentiment_dissatisfied
            </span>
            <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight mb-2">
              DEFEAT
            </h2>
            <p className="text-on-surface-variant text-sm font-body mb-6">
              Better luck next time. Your opponent claimed the victory.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLossModal(false)}
                className="ghost-border text-on-surface-variant font-headline font-bold text-xs tracking-widest px-6 py-3 rounded-sm cursor-pointer hover:text-on-surface transition-colors"
              >
                VIEW_BOARD
              </button>
              <button
                onClick={() => { sessionStorage.removeItem("activeGameId"); router.push("/"); }}
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-8 py-3 rounded-sm cursor-pointer"
              >
                GO_TO_LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Confirmation Modal */}
      {showAbandonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-sm p-8 text-center max-w-sm mx-4 border border-error/20">
            <span className="material-symbols-outlined text-error text-5xl mb-4 block">
              warning
            </span>
            <h2 className="font-headline font-bold text-xl text-on-surface tracking-tight mb-2">
              FORFEIT_MATCH?
            </h2>
            <p className="text-on-surface-variant text-sm font-body mb-2">
              You will lose your stake of{" "}
              <span className="text-primary font-headline font-bold">
                {formatCKB(gameState.stakeAmount)} CKB
              </span>
            </p>
            <p className="text-on-surface-variant text-xs font-body mb-6">
              The entire pool will be sent to the protocol treasury.
              Your opponent wins by default.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowAbandonModal(false)}
                className="ghost-border text-on-surface-variant font-headline font-bold text-xs tracking-widest px-6 py-3 rounded-sm cursor-pointer hover:text-on-surface transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={confirmAbandon}
                className="bg-error/20 border border-error/30 text-error font-headline font-bold text-xs tracking-widest px-6 py-3 rounded-sm cursor-pointer hover:bg-error/30 transition-colors"
              >
                FORFEIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Success Modal */}
      {showAbandonSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-sm p-10 text-center max-w-sm mx-4 border border-error/20">
            <span className="material-symbols-outlined text-error text-5xl mb-4 block">
              flag
            </span>
            <h2 className="font-headline font-bold text-xl text-on-surface tracking-tight mb-2">
              MATCH_FORFEITED
            </h2>
            <p className="text-on-surface-variant text-sm font-body mb-4">
              You have forfeited the match. Your stake has been sent to the protocol treasury.
            </p>
            {abandonTxHash && (
              <a
                href={`${CKB_EXPLORER_URL}/transaction/${abandonTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-xs font-body hover:underline mb-6"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View transaction on explorer
              </a>
            )}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => { sessionStorage.removeItem("activeGameId"); router.push("/"); }}
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-8 py-3 rounded-sm cursor-pointer"
              >
                GO_TO_LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Quit Modal */}
      {showOpponentQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-sm p-10 text-center max-w-sm mx-4 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-6xl mb-4 block">
              emoji_events
            </span>
            <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight mb-2">
              OPPONENT_FORFEITED
            </h2>
            <p className="text-on-surface-variant text-sm font-body mb-2">
              Your opponent has quit the match.
            </p>
            <p className="text-primary text-sm font-headline font-bold mb-6">
              You win by default!
            </p>
            <p className="text-on-surface-variant text-xs font-body mb-6">
              Your prize will be distributed from the protocol treasury.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => { sessionStorage.removeItem("activeGameId"); router.push("/"); }}
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-8 py-3 rounded-sm cursor-pointer"
              >
                GO_TO_LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 glass-panel rounded-sm px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary waiting-pulse" />
              <span className="text-[10px] font-headline tracking-widest text-primary">
                LIVE_MATCH
              </span>
            </span>
            <h1 className="font-headline font-bold text-lg md:text-xl text-on-surface tracking-tight">
              {gameName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-headline tracking-widest text-on-surface-variant">
              TOTAL_STAKE_POOL
            </span>
            <span className="text-primary font-headline font-bold text-sm">
              {formatCKB(totalStake)} CKB
            </span>
          </div>
        </div>

        {/* Mobile: compact player bar above the board */}
        <div className="flex lg:hidden items-center gap-3 mb-4">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm ${
            gameState.currentTurn === Player.X && !isFinished ? "bg-primary/10 border border-primary/20" : "bg-surface-container-high"
          }`}>
            <span className="font-headline font-bold italic text-sm text-primary">X</span>
            <span className="text-on-surface-variant text-[10px] font-mono">{shortenHash(gameState.playerXLock)}</span>
            {isPlayerX && <span className="text-[8px] text-primary font-bold">YOU</span>}
          </div>
          <span className="text-on-surface-variant text-[10px]">vs</span>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm ${
            gameState.currentTurn === Player.O && !isFinished ? "bg-secondary/10 border border-secondary/20" : "bg-surface-container-high"
          }`}>
            <span className="font-headline font-bold italic text-sm text-secondary">O</span>
            <span className="text-on-surface-variant text-[10px] font-mono">{shortenHash(gameState.playerOLock)}</span>
            {isPlayerO && <span className="text-[8px] text-secondary font-bold">YOU</span>}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column — hidden on mobile, shown on desktop */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            <PlayerCard
              player="X"
              lockHash={gameState.playerXLock}
              isCurrentTurn={gameState.currentTurn === Player.X && !isFinished}
              isConnectedPlayer={!!isPlayerX}
            />
            <PlayerCard
              player="O"
              lockHash={gameState.playerOLock}
              isCurrentTurn={gameState.currentTurn === Player.O && !isFinished}
              isConnectedPlayer={!!isPlayerO}
            />

            {/* Move chronicle */}
            <div className="glass-panel rounded-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-tertiary text-base">
                  history
                </span>
                <h3 className="font-headline font-bold text-[10px] tracking-widest text-on-surface-variant">
                  MOVE_CHRONICLE
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {gameState.board.map((cell, i) => {
                  if (cell === Player.NONE) return null;
                  const label = cell === Player.X ? "X" : "O";
                  const color =
                    cell === Player.X
                      ? "text-primary"
                      : "text-secondary";
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] font-body bg-surface-container-high px-2 py-1 rounded-sm"
                    >
                      <span className={`font-headline font-bold ${color}`}>
                        {label}
                      </span>
                      <span className="text-on-surface-variant">
                        [{Math.floor(i / 3)},{i % 3}]
                      </span>
                    </span>
                  );
                })}
                {gameState.board.every((c) => c === 0) && (
                  <p className="text-on-surface-variant text-[10px] font-body">
                    No moves yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center column - Game board */}
          <div className="lg:col-span-6 flex flex-col items-center gap-6">
            {/* Turn indicator */}
            <div className="glass-panel rounded-sm px-4 py-2 flex items-center gap-2">
              {isFinished ? (
                <>
                  <span className="material-symbols-outlined text-secondary text-base">
                    emoji_events
                  </span>
                  <span className="text-xs font-headline font-semibold tracking-widest text-on-surface">
                    {winner === Winner.DRAW
                      ? "DRAW"
                      : winner === Winner.X
                      ? "PLAYER_X WINS"
                      : "PLAYER_O WINS"}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`font-headline font-bold italic text-sm ${
                      gameState.currentTurn === Player.X
                        ? "text-primary"
                        : "text-secondary"
                    }`}
                  >
                    {gameState.currentTurn === Player.X ? "X" : "O"}
                  </span>
                  <span className="text-xs font-headline tracking-widest text-on-surface-variant">
                    {isMyTurn ? "YOUR TURN" : "OPPONENT TURN"}
                  </span>
                </>
              )}
            </div>

            {/* Board */}
            <GameBoard
              board={gameState.board}
              onCellClick={handleCellClick}
              disabled={!isMyTurn || isFinished || actionLoading}
              winningLine={winningLine}
              pendingMove={pendingMove}
              currentTurn={gameState.currentTurn}
            />

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {canClaimPrize && (
                <button
                  onClick={handleClaimPrize}
                  disabled={actionLoading}
                  className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-6 py-3 rounded-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">
                    emoji_events
                  </span>
                  {actionLoading ? "CLAIMING..." : "CLAIM_PRIZE"}
                </button>
              )}
              {canReset && (
                <button
                  onClick={handleReset}
                  disabled={actionLoading}
                  className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-6 py-3 rounded-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base">
                    replay
                  </span>
                  {actionLoading ? "RESETTING..." : "NEW_ROUND"}
                </button>
              )}
              {!isFinished && (isPlayerX || isPlayerO) && (
                <button
                  onClick={() => setShowAbandonModal(true)}
                  disabled={actionLoading}
                  className="ghost-border text-error font-headline font-bold text-xs tracking-widest px-4 py-3 rounded-sm hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  ABANDON
                </button>
              )}
            </div>

            {/* Action error */}
            {actionError && (
              <p className="text-error text-xs font-body">{actionError}</p>
            )}
          </div>

          {/* Right column — hidden on mobile, shown on desktop */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {/* UTXO commitment */}
            <div className="glass-panel rounded-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-base">
                  token
                </span>
                <h3 className="font-headline font-bold text-[10px] tracking-widest text-on-surface-variant">
                  UTXO_COMMITMENT
                </h3>
              </div>
              <div className="space-y-2 text-xs font-body">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Capacity</span>
                  <span className="text-on-surface">
                    {formatCKB(capacity)} CKB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Stake/player</span>
                  <span className="text-on-surface">
                    {formatCKB(gameState.stakeAmount)} CKB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Total pool</span>
                  <span className="text-primary font-semibold">
                    {formatCKB(totalStake)} CKB
                  </span>
                </div>
              </div>
            </div>

            {/* Match data */}
            <div className="glass-panel rounded-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-secondary text-base">
                  data_object
                </span>
                <h3 className="font-headline font-bold text-[10px] tracking-widest text-on-surface-variant">
                  MATCH_DATA
                </h3>
              </div>
              <div className="space-y-2 text-xs font-body">
                <div>
                  <span className="text-on-surface-variant block mb-0.5">
                    Game ID
                  </span>
                  <span className="text-on-surface text-[10px] break-all">
                    {shortenHash(currentGameId.split(":")[0] || "")}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block mb-0.5">
                    Status
                  </span>
                  <span
                    className={`text-[10px] font-headline tracking-widest ${
                      isFinished ? "text-secondary" : "text-primary"
                    }`}
                  >
                    {isFinished ? "FINISHED" : "ACTIVE"}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block mb-0.5">
                    Moves
                  </span>
                  <span className="text-on-surface">
                    {gameState.board.filter((c) => c !== 0).length} / 9
                  </span>
                </div>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={refreshing}
              className="w-full ghost-border text-on-surface-variant font-body text-xs px-4 py-2 rounded-sm flex items-center justify-center gap-2 hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${refreshing ? "animate-spin" : ""}`}>sync</span>
              {refreshing ? "Refreshing..." : "Refresh State"}
            </button>
            {lastPoll > 0 && (
              <p className="text-[9px] text-on-surface-variant/50 font-mono text-center mt-1">
                Last sync: {new Date(lastPoll).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---- Waiting Room Component ----

function WaitingRoom({
  gameState,
  gameId,
  capacity,
}: {
  gameState: import("@/lib/types").GameState;
  gameId: string;
  capacity: bigint;
}) {
  const router = useRouter();
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const { joinGame, cancelGame, loading: actionLoading, error: actionError } =
    useGameActions();
  const [copied, setCopied] = useState(false);
  const [signerLockHash, setSignerLockHash] = useState("");

  useEffect(() => {
    if (!signer) {
      setSignerLockHash("");
      return;
    }
    let cancelled = false;
    signer.getRecommendedAddressObj().then((addr) => {
      if (!cancelled) setSignerLockHash(addr.script.hash());
    });
    return () => {
      cancelled = true;
    };
  }, [signer]);

  const isCreator =
    signerLockHash &&
    gameState.playerXLock.toLowerCase() === signerLockHash.toLowerCase();

  const gameUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/game/${encodeURIComponent(gameId)}`
      : "";

  function handleCopy() {
    if (!gameUrl) return;
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleJoin() {
    if (!signer) return;
    try {
      await joinGame(
        { outPoint: parseOutPointFromId(gameId), capacity },
        gameState
      );
    } catch {
      // Error handled in hook
    }
  }

  async function handleCancel() {
    if (!signer) return;
    try {
      await cancelGame(
        { outPoint: parseOutPointFromId(gameId), capacity },
        gameState.playerXLock
      );
      router.push("/");
    } catch {
      // Error handled in hook
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <span className="material-symbols-outlined text-secondary text-base">
            schedule
          </span>
          <span className="text-[10px] font-headline tracking-widest text-on-surface-variant">
            PROTOCOL // WAITING_STATE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left panel - Info */}
          <div className="space-y-6">
            <h1 className="font-headline font-bold italic text-3xl md:text-4xl text-on-surface leading-tight">
              {isCreator ? (
                <>
                  WAITING_FOR
                  <br />
                  <span className="text-gradient-hero">RECIPIENT</span>
                </>
              ) : (
                <>
                  JOIN_THE
                  <br />
                  <span className="text-gradient-hero">BATTLE</span>
                </>
              )}
            </h1>

            {/* Stake card */}
            <div className="glass-panel rounded-sm p-4">
              <span className="text-[10px] font-headline tracking-widest text-on-surface-variant block mb-1">
                STAKE_AMOUNT
              </span>
              <span className="text-primary text-2xl font-headline font-bold">
                {formatCKB(gameState.stakeAmount)} CKB
              </span>
              {!isCreator && (
                <p className="text-on-surface-variant text-xs font-body mt-2">
                  You will need to match this stake to join.
                </p>
              )}
            </div>

            {/* Game ID */}
            <div className="glass-panel rounded-sm p-4 space-y-2">
              <div>
                <span className="text-[10px] font-headline tracking-widest text-on-surface-variant block mb-1">
                  CREATOR
                </span>
                <span className="text-on-surface text-xs font-body break-all">
                  {shortenHash(gameState.playerXLock)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-headline tracking-widest text-on-surface-variant block mb-1">
                  GAME_ID
                </span>
                <span className="text-on-surface text-xs font-body break-all">
                  {gameId}
                </span>
              </div>
            </div>

            {/* Copy link (creator only) */}
            {isCreator && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="ghost-border text-on-surface-variant font-headline text-xs tracking-widest px-4 py-2.5 rounded-sm flex items-center gap-2 hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "COPIED" : "COPY_LINK"}
                </button>
              </div>
            )}

            {/* Join button (opponent) */}
            {!isCreator && (
              <div className="space-y-3">
                {!signer ? (
                  <button
                    onClick={open}
                    className="cta-gradient text-on-primary-fixed font-headline font-bold text-sm tracking-widest px-8 py-4 rounded-sm flex items-center gap-2 cursor-pointer w-full justify-center"
                  >
                    <span className="material-symbols-outlined text-base">
                      account_balance_wallet
                    </span>
                    CONNECT_WALLET_TO_JOIN
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    className="cta-gradient text-on-primary-fixed font-headline font-bold text-sm tracking-widest px-8 py-4 rounded-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                  >
                    <span className="material-symbols-outlined text-base">
                      rocket_launch
                    </span>
                    {actionLoading ? "JOINING..." : "JOIN_GAME"}
                  </button>
                )}
                {actionError && (
                  <p className="text-error text-xs font-body">{actionError}</p>
                )}
              </div>
            )}
          </div>

          {/* Right panel - Monolith animation */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-sm aspect-square glass-panel rounded-sm flex flex-col items-center justify-center p-8">
              {/* Spinning border */}
              <div className="absolute inset-0 rounded-sm overflow-hidden">
                <div
                  className="absolute inset-[-50%] spin-border"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent, #69DAFF, transparent, #D674FF, transparent)",
                    opacity: 0.15,
                  }}
                />
                <div className="absolute inset-[1px] bg-surface-container-high rounded-sm" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-primary text-5xl waiting-pulse mb-6">
                  {isCreator ? "pending" : "videogame_asset"}
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface tracking-widest mb-2">
                  {isCreator ? (
                    <>
                      SEARCHING FOR
                      <br />
                      OPPONENT
                    </>
                  ) : (
                    <>
                      READY TO
                      <br />
                      PLAY?
                    </>
                  )}
                </h3>
                <p className="text-on-surface-variant text-xs font-body mb-6">
                  {isCreator
                    ? "Share the game link with your opponent"
                    : `Stake ${formatCKB(gameState.stakeAmount)} CKB to enter the match`}
                </p>

                {/* Progress bar (creator only) */}
                {isCreator && (
                  <>
                    <div className="w-full h-1 bg-surface-container-highest rounded-sm overflow-hidden">
                      <div
                        className="h-full progress-bar rounded-sm waiting-pulse"
                        style={{ width: "60%" }}
                      />
                    </div>
                    <span className="mt-4 glass-panel rounded-sm px-3 py-1 text-[10px] font-headline tracking-widest text-on-surface-variant">
                      UTXO_PENDING
                    </span>
                  </>
                )}

                {/* Stake info (opponent) */}
                {!isCreator && (
                  <div className="w-full glass-panel rounded-sm p-3 text-center">
                    <span className="text-[10px] font-headline tracking-widest text-on-surface-variant block mb-1">
                      TOTAL_POT_AFTER_JOIN
                    </span>
                    <span className="text-primary font-headline font-bold text-lg">
                      {formatCKB(gameState.stakeAmount * 2n)} CKB
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cancel button (creator only) */}
        {isCreator && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleCancel}
              disabled={actionLoading || !signer}
              className="ghost-border border-error/30 text-error font-headline font-bold text-sm tracking-widest px-8 py-3 rounded-sm hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                cancel
              </span>
              CANCEL GAME
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ---- Game Name Generator ----

const GAME_NAMES = [
  "THE_VOID_GRID",
  "NEON_CLASH",
  "CELL_WARS",
  "HASH_DUEL",
  "BLOCK_SIEGE",
  "BYTE_ARENA",
  "NODE_STRIKE",
  "CHAIN_BRAWL",
  "PROOF_OF_PLAY",
  "EPOCH_BATTLE",
  "GRID_LOCK",
  "BIT_SKIRMISH",
  "ZERO_SUM",
  "FORK_FIGHT",
  "UTXO_RUMBLE",
  "SYNC_OR_SINK",
  "THE_LAST_CELL",
  "BLOCK_GAMBIT",
  "DARK_LATTICE",
  "NERVE_CHECK",
  "STAKE_BREACH",
  "FINAL_STATE",
  "HASH_CLASH",
  "DEAD_LOCK",
  "CELL_SHOCK",
];

function useGameName(gameId: string): string {
  // Derive a stable index from the gameId so both players see the same name
  let hash = 0;
  const id = gameId.split(":")[0] || gameId;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return GAME_NAMES[Math.abs(hash) % GAME_NAMES.length];
}

// ---- Utility ----

function parseOutPointFromId(gameId: string): { txHash: string; index: string } {
  const parts = gameId.split(":");
  return {
    txHash: parts[0] || "",
    index: parts[1] || "0x0",
  };
}
