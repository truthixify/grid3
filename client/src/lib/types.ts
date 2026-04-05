export enum GameStatus {
  WAITING = 0,
  ACTIVE = 1,
  FINISHED = 2,
  CANCELLED = 3,
}

export enum Player {
  NONE = 0,
  X = 1,
  O = 2,
}

export enum Winner {
  NONE = 0,
  X = 1,
  O = 2,
  DRAW = 3,
}

export interface GameState {
  gameStatus: GameStatus;
  board: number[];
  currentTurn: Player;
  playerXLock: string;
  playerOLock: string;
  stakeAmount: bigint;
  winner: Winner;
}

export interface GameCell {
  outPoint: { txHash: string; index: string };
  state: GameState;
  capacity: bigint;
}

export const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
