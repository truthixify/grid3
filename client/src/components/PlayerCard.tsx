"use client";

import { shortenAddress } from "@/lib/ckb";

interface PlayerCardProps {
  player: "X" | "O";
  lockHash: string;
  isCurrentTurn: boolean;
  isConnectedPlayer: boolean;
}

export default function PlayerCard({
  player,
  lockHash,
  isCurrentTurn,
  isConnectedPlayer,
}: PlayerCardProps) {
  const isX = player === "X";
  const borderColor = isX ? "border-l-primary" : "border-l-secondary";
  const accentColor = isX ? "text-primary" : "text-secondary";
  const isEmpty =
    lockHash === "0x" + "00".repeat(32) || lockHash === "";

  return (
    <div
      className={`glass-panel rounded-sm p-4 border-l-2 ${borderColor} ${
        isCurrentTurn ? `ring-1 ${isX ? "ring-primary/20" : "ring-secondary/20"}` : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`font-headline font-bold italic text-lg ${accentColor} ${
              isX ? "glow-primary" : "glow-secondary"
            }`}
          >
            {player}
          </span>
          <span className="text-[10px] font-headline tracking-widest text-on-surface-variant">
            PLAYER_{player}
          </span>
        </div>
        {isCurrentTurn && (
          <span className={`text-[10px] font-headline tracking-wider px-2 py-0.5 rounded-sm ${
            isX ? "text-primary bg-primary/10" : "text-secondary bg-secondary/10"
          }`}>
            TURN
          </span>
        )}
      </div>
      <p className="text-on-surface-variant text-xs font-body truncate">
        {isEmpty ? "Waiting..." : shortenAddress(lockHash)}
      </p>
      {isConnectedPlayer && (
        <span className={`text-[10px] font-body mt-1 inline-block ${isX ? "text-primary" : "text-secondary"}`}>
          (You)
        </span>
      )}
    </div>
  );
}
