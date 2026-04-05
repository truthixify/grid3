"use client";

import GameCell from "./GameCell";

interface GameBoardProps {
  board: number[];
  onCellClick: (index: number) => void;
  disabled: boolean;
  winningLine: number[] | null;
  pendingMove: number | null;
  currentTurn: number;
}

export default function GameBoard({
  board,
  onCellClick,
  disabled,
  winningLine,
  pendingMove,
  currentTurn,
}: GameBoardProps) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[360px] mx-auto">
      {board.map((value, index) => (
        <GameCell
          key={index}
          value={value}
          index={index}
          onClick={onCellClick}
          disabled={disabled}
          isWinningCell={winningLine?.includes(index) ?? false}
          isPending={pendingMove === index}
          pendingPlayer={currentTurn}
        />
      ))}
    </div>
  );
}
