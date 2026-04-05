"use client";

import { Player } from "@/lib/types";

interface GameCellProps {
  value: number;
  index: number;
  onClick: (index: number) => void;
  disabled: boolean;
  isWinningCell: boolean;
  isPending: boolean;
  pendingPlayer: number;
}

export default function GameCell({
  value,
  index,
  onClick,
  disabled,
  isWinningCell,
  isPending,
  pendingPlayer,
}: GameCellProps) {
  const isEmpty = value === Player.NONE;
  const isX = value === Player.X;
  const isO = value === Player.O;

  return (
    <button
      onClick={() => {
        if (isEmpty && !disabled) onClick(index);
      }}
      disabled={disabled && isEmpty}
      className={`
        relative w-full aspect-square bg-surface-container-high ghost-border
        flex items-center justify-center rounded-sm transition-all
        ${isEmpty && !disabled ? "cursor-pointer hover:bg-surface-container-highest hover:border-primary/20" : "cursor-default"}
        ${isWinningCell ? "ring-1 ring-primary/40" : ""}
      `}
    >
      {isX && (
        <span
          className={`font-headline font-bold italic text-4xl md:text-5xl lg:text-6xl text-primary glow-primary select-none ${
            isWinningCell ? "scale-110" : ""
          }`}
        >
          X
        </span>
      )}
      {isO && (
        <span
          className={`font-headline font-bold italic text-4xl md:text-5xl lg:text-6xl text-secondary glow-secondary select-none ${
            isWinningCell ? "scale-110" : ""
          }`}
        >
          O
        </span>
      )}
      {isPending && isEmpty && (
        <span className={`w-2 h-2 rounded-full waiting-pulse ${
          pendingPlayer === Player.O ? "bg-secondary" : "bg-primary"
        }`} />
      )}
    </button>
  );
}
