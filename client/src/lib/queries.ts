import { ccc } from "@ckb-ccc/connector-react";
import type { GameCell } from "./types";
import { GameStatus } from "./types";
import { unpackGameState, hexToBytes } from "./codec";
import {
  SCRIPT_CODE_HASH,
  SCRIPT_HASH_TYPE,
  FEE_LOCK_ARGS,
  SECP256K1_CODE_HASH,
} from "./constants";

/**
 * Build the type script used for querying game cells.
 * Type script args: 0x00 + blake2b(fee_lock_script) — 32 bytes
 */
function gameTypeScript(): ccc.Script {
  const feeLock = ccc.Script.from({
    codeHash: SECP256K1_CODE_HASH,
    hashType: "type",
    args: FEE_LOCK_ARGS,
  });
  const feeHash = feeLock.hash();
  const hashClean = typeof feeHash === "string"
    ? (feeHash.startsWith("0x") ? feeHash.slice(2) : feeHash)
    : Array.from(feeHash as Uint8Array, (b: number) => b.toString(16).padStart(2, "0")).join("");
  const args = "0x00" + hashClean;

  return ccc.Script.from({
    codeHash: SCRIPT_CODE_HASH,
    hashType: SCRIPT_HASH_TYPE,
    args,
  });
}

/**
 * Find all game cells on-chain, optionally filtered by game status.
 */
export async function findGameCells(
  client: ccc.Client,
  status?: GameStatus
): Promise<GameCell[]> {
  const cells: GameCell[] = [];
  const typeScript = gameTypeScript();

  const collector = client.findCellsByType(typeScript, true);
  for await (const cell of collector) {
    const data = cell.outputData;
    if (!data || data === "0x") continue;

    try {
      const bytes = hexToBytes(data);
      if (bytes.length !== 84) continue;
      const state = unpackGameState(bytes);
      if (status !== undefined && state.gameStatus !== status) continue;

      cells.push({
        outPoint: {
          txHash: cell.outPoint.txHash,
          index: ccc.numToHex(cell.outPoint.index),
        },
        state,
        capacity: cell.cellOutput.capacity,
      });
    } catch {
      continue;
    }
  }

  return cells;
}

/**
 * Get a specific game cell by its outPoint.
 */
export async function getGameCell(
  client: ccc.Client,
  txHash: string,
  index: number
): Promise<GameCell | null> {
  const outPoint = { txHash, index };

  try {
    const cell = await client.getCell(outPoint);
    if (!cell) return null;

    const data = cell.outputData;
    if (!data || data === "0x") return null;

    const bytes = hexToBytes(data);
    if (bytes.length !== 84) return null;

    const state = unpackGameState(bytes);
    return {
      outPoint: {
        txHash: cell.outPoint.txHash,
        index: ccc.numToHex(cell.outPoint.index),
      },
      state,
      capacity: cell.cellOutput.capacity,
    };
  } catch {
    return null;
  }
}

/**
 * Get a game cell and return its full live cell info (including lock script).
 */
export async function getGameCellFull(
  client: ccc.Client,
  txHash: string,
  index: number
): Promise<{
  gameCell: GameCell;
  lockScript: ccc.Script;
} | null> {
  const outPoint = { txHash, index };

  try {
    const cell = await client.getCell(outPoint);
    if (!cell) return null;

    const data = cell.outputData;
    if (!data || data === "0x") return null;

    const bytes = hexToBytes(data);
    if (bytes.length !== 84) return null;

    const state = unpackGameState(bytes);
    return {
      gameCell: {
        outPoint: {
          txHash: cell.outPoint.txHash,
          index: ccc.numToHex(cell.outPoint.index),
        },
        state,
        capacity: cell.cellOutput.capacity,
      },
      lockScript: cell.cellOutput.lock,
    };
  } catch {
    return null;
  }
}
