"use client";

import { useRouter } from "next/navigation";
import { ccc } from "@ckb-ccc/connector-react";
import type { GameCell as GameCellType } from "@/lib/types";
import { formatCKB, shortenAddress } from "@/lib/ckb";
import { useGameActions } from "@/hooks/useGameActions";

interface GameListProps {
  games: GameCellType[];
  onJoined?: () => void;
}

export default function GameList({ games, onJoined }: GameListProps) {
  const router = useRouter();
  const signer = ccc.useSigner();
  const { joinGame, loading } = useGameActions();

  async function handleJoin(game: GameCellType) {
    if (!signer) return;
    try {
      const txHash = await joinGame(
        { outPoint: game.outPoint, capacity: game.capacity },
        game.state
      );
      onJoined?.();
      router.push(`/game/${encodeURIComponent(`${txHash}:0x0`)}`);
    } catch {
      // Error handled inside hook
    }
  }

  if (games.length === 0) {
    return (
      <div className="glass-panel rounded-sm p-6 text-center">
        <p className="text-on-surface-variant text-sm font-body">
          No waiting games found. Create one to start playing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {games.map((game) => {
        const gameId = `${game.outPoint.txHash}:${game.outPoint.index}`;
        return (
          <div
            key={gameId}
            className="glass-panel rounded-sm px-4 py-3 flex items-center gap-4"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-surface-container-highest rounded-sm flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-base">
                person
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-on-surface text-sm font-body truncate">
                {shortenAddress(game.state.playerXLock)}
              </p>
              <p className="text-on-surface-variant text-[10px] font-body">
                Waiting for opponent
              </p>
            </div>

            {/* Stake */}
            <div className="text-right shrink-0">
              <p className="text-primary text-sm font-headline font-semibold">
                {formatCKB(game.state.stakeAmount)} CKB
              </p>
              <p className="text-on-surface-variant text-[10px] font-body">
                STAKE
              </p>
            </div>

            {/* Join button */}
            <button
              onClick={() => handleJoin(game)}
              disabled={loading || !signer}
              className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs px-4 py-2 rounded-sm tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              JOIN
            </button>
          </div>
        );
      })}
    </div>
  );
}
