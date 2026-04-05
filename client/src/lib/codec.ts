import type { GameState } from "./types";
import { GameStatus, Player, Winner } from "./types";

const GAME_DATA_LEN = 84;

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return (
    "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

export function packGameState(state: GameState): Uint8Array {
  const data = new Uint8Array(GAME_DATA_LEN);
  const view = new DataView(data.buffer);

  data[0] = state.gameStatus;
  for (let i = 0; i < 9; i++) {
    data[1 + i] = state.board[i] ?? 0;
  }
  data[10] = state.currentTurn;
  data.set(hexToBytes(state.playerXLock).slice(0, 32), 11);
  data.set(hexToBytes(state.playerOLock).slice(0, 32), 43);
  view.setBigUint64(75, state.stakeAmount, true);
  data[83] = state.winner;

  return data;
}

export function unpackGameState(data: Uint8Array): GameState {
  if (data.length !== GAME_DATA_LEN) {
    throw new Error(
      `Invalid game data: expected ${GAME_DATA_LEN} bytes, got ${data.length}`
    );
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const board: number[] = [];
  for (let i = 0; i < 9; i++) {
    board.push(data[1 + i]);
  }

  return {
    gameStatus: data[0] as GameStatus,
    board,
    currentTurn: data[10] as Player,
    playerXLock: bytesToHex(data.slice(11, 43)),
    playerOLock: bytesToHex(data.slice(43, 75)),
    stakeAmount: view.getBigUint64(75, true),
    winner: data[83] as Winner,
  };
}
