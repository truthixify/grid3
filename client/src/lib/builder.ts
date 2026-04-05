import { ccc } from "@ckb-ccc/connector-react";
import type { GameState } from "./types";
import { GameStatus, Player, Winner, WINNING_LINES } from "./types";
import { packGameState, bytesToHex } from "./codec";
import {
  SCRIPT_CODE_HASH,
  SCRIPT_HASH_TYPE,
  SCRIPT_CELL_DEP,
  FEE_LOCK_ARGS,
  SECP256K1_CODE_HASH,
  GAME_CELL_CAPACITY,
} from "./constants";

export function determineWinner(board: number[]): Winner {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === Player.X ? Winner.X : Winner.O;
    }
  }
  if (board.every((cell) => cell !== 0)) {
    return Winner.DRAW;
  }
  return Winner.NONE;
}

/** The fee recipient's secp256k1 lock script */
function feeLockScript(): ccc.Script {
  return ccc.Script.from({
    codeHash: SECP256K1_CODE_HASH,
    hashType: "type",
    args: FEE_LOCK_ARGS,
  });
}

/**
 * Build the type script for game cells.
 * Type script args: 0x00 + fee_lock_HASH (32 bytes — blake2b of the fee lock script)
 *
 * The contract compares this hash with load_cell_lock_hash() on output cells,
 * so it MUST be the actual blake2b hash, not just the lock_arg.
 */
function gameTypeScript(): ccc.Script {
  const feeLock = feeLockScript();
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
 * Build the lock script for game cells.
 * Lock script args: 0x01 + player_x_lock_hash(32) + player_o_lock_hash(32)
 */
function gameLockScript(
  playerXLockHash: string,
  playerOLockHash: string
): ccc.Script {
  const xClean = playerXLockHash.startsWith("0x")
    ? playerXLockHash.slice(2)
    : playerXLockHash;
  const oClean = playerOLockHash.startsWith("0x")
    ? playerOLockHash.slice(2)
    : playerOLockHash;
  const xPadded = xClean.padEnd(64, "0");
  const oPadded = oClean.padEnd(64, "0");
  const args = "0x01" + xPadded + oPadded;

  return ccc.Script.from({
    codeHash: SCRIPT_CODE_HASH,
    hashType: SCRIPT_HASH_TYPE,
    args,
  });
}

function addGameCellDep(tx: ccc.Transaction): void {
  tx.addCellDeps({
    outPoint: {
      txHash: SCRIPT_CELL_DEP.outPoint.txHash,
      index: SCRIPT_CELL_DEP.outPoint.index,
    },
    depType: SCRIPT_CELL_DEP.depType,
  });
}

async function getSignerLockHash(signer: ccc.Signer): Promise<string> {
  const addressObj = await signer.getRecommendedAddressObj();
  return addressObj.script.hash();
}

// -- CREATE --

export async function buildCreateTx(
  signer: ccc.Signer,
  stakeAmount: bigint
): Promise<ccc.Transaction> {
  const playerXLockHash = await getSignerLockHash(signer);
  const zeroLock = "0x" + "00".repeat(32);

  const state: GameState = {
    gameStatus: GameStatus.WAITING,
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    currentTurn: Player.X,
    playerXLock: playerXLockHash,
    playerOLock: zeroLock,
    stakeAmount,
    winner: Winner.NONE,
  };

  const gameLock = gameLockScript(playerXLockHash, zeroLock);
  const gameType = gameTypeScript();
  const packedData = bytesToHex(packGameState(state));
  const totalCapacity = GAME_CELL_CAPACITY + stakeAmount;

  const tx = ccc.Transaction.from({
    outputs: [{ lock: gameLock, type: gameType }],
    outputsData: [packedData],
  });

  // Set capacity directly (already in shannons)
  tx.outputs[0].capacity = totalCapacity;

  addGameCellDep(tx);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  return tx;
}

// -- JOIN --

export async function buildJoinTx(
  signer: ccc.Signer,
  gameCell: { outPoint: ccc.OutPointLike; capacity: bigint },
  inputGameState: GameState
): Promise<ccc.Transaction> {
  const playerOLockHash = await getSignerLockHash(signer);

  const newState: GameState = {
    ...inputGameState,
    gameStatus: GameStatus.ACTIVE,
    playerOLock: playerOLockHash,
  };

  const gameLock = gameLockScript(
    inputGameState.playerXLock,
    playerOLockHash
  );
  const gameType = gameTypeScript();
  const packedData = bytesToHex(packGameState(newState));
  const totalCapacity = gameCell.capacity + inputGameState.stakeAmount;

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: gameCell.outPoint }],
    outputs: [{ lock: gameLock, type: gameType }],
    outputsData: [packedData],
  });

  tx.outputs[0].capacity = totalCapacity;

  addGameCellDep(tx);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  return tx;
}

// -- MOVE --

export async function buildMoveTx(
  signer: ccc.Signer,
  gameCell: {
    outPoint: ccc.OutPointLike;
    capacity: bigint;
    lockScript: ccc.ScriptLike;
  },
  inputGameState: GameState,
  position: number
): Promise<ccc.Transaction> {
  const newBoard = [...inputGameState.board];
  newBoard[position] = inputGameState.currentTurn;

  const newState: GameState = {
    ...inputGameState,
    board: newBoard,
    currentTurn:
      inputGameState.currentTurn === Player.X ? Player.O : Player.X,
  };

  const gameType = gameTypeScript();
  const packedData = bytesToHex(packGameState(newState));

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: gameCell.outPoint }],
    outputs: [{ lock: gameCell.lockScript, type: gameType }],
    outputsData: [packedData],
  });

  // Capacity stays the same
  tx.outputs[0].capacity = gameCell.capacity;

  addGameCellDep(tx);
  await tx.completeFeeBy(signer);
  return tx;
}

// -- FINISH --

export async function buildFinishTx(
  signer: ccc.Signer,
  gameCell: {
    outPoint: ccc.OutPointLike;
    capacity: bigint;
    lockScript: ccc.ScriptLike;
  },
  inputGameState: GameState
): Promise<ccc.Transaction> {
  const winner = determineWinner(inputGameState.board);
  // The contract uses stake_amount * 2 as the total pool, NOT the cell capacity
  const totalPool = inputGameState.stakeAmount * 2n;
  const signerAddress = await signer.getRecommendedAddressObj();

  const outputs: ccc.CellOutputLike[] = [];
  const outputsData: string[] = [];

  // Minimum cell capacity: a secp256k1 lock cell needs ~61 CKB
  const MIN_OUTPUT_CAPACITY = 6100000000n;

  if (winner === Winner.X || winner === Winner.O) {
    const feeExpected = (totalPool / 100n) * 20n;

    // Ensure fee cell meets minimum capacity
    const feeCapacity = feeExpected < MIN_OUTPUT_CAPACITY ? MIN_OUTPUT_CAPACITY : feeExpected;

    // Winner gets the rest of the game cell capacity
    const winnerCapacity = gameCell.capacity - feeCapacity;

    // Winner payout
    outputs.push({ lock: signerAddress.script });
    outputsData.push("0x");

    // Fee payout
    outputs.push({ lock: feeLockScript() });
    outputsData.push("0x");

    outputs[0].capacity = winnerCapacity;
    outputs[1].capacity = feeCapacity;
  }
  // Draws are now handled by RESET (play again), not FINISH

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: gameCell.outPoint }],
    outputs,
    outputsData,
  });

  addGameCellDep(tx);
  // Add extra inputs from signer if outputs need more capacity than the game cell provides
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  return tx;
}

// -- RESET (draw → clear board, play again) --

export async function buildResetTx(
  signer: ccc.Signer,
  gameCell: {
    outPoint: ccc.OutPointLike;
    capacity: bigint;
    lockScript: ccc.ScriptLike;
  },
  inputGameState: GameState
): Promise<ccc.Transaction> {
  const newState: GameState = {
    ...inputGameState,
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    currentTurn: Player.X,
    winner: Winner.NONE,
  };

  const gameType = gameTypeScript();
  const packedData = bytesToHex(packGameState(newState));

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: gameCell.outPoint }],
    outputs: [{ lock: gameCell.lockScript, type: gameType }],
    outputsData: [packedData],
  });

  tx.outputs[0].capacity = gameCell.capacity;

  addGameCellDep(tx);
  await tx.completeFeeBy(signer);
  return tx;
}

// -- FORFEIT (abandon → entire pool to fee address) --

export async function buildForfeitTx(
  signer: ccc.Signer,
  gameCell: { outPoint: ccc.OutPointLike; capacity: bigint }
): Promise<ccc.Transaction> {
  const MIN_OUTPUT_CAPACITY = 6100000000n;
  const feeCapacity =
    gameCell.capacity < MIN_OUTPUT_CAPACITY
      ? MIN_OUTPUT_CAPACITY
      : gameCell.capacity;

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: gameCell.outPoint }],
    outputs: [{ lock: feeLockScript() }],
    outputsData: ["0x"],
  });

  tx.outputs[0].capacity = feeCapacity;

  addGameCellDep(tx);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer);
  return tx;
}

// -- CANCEL --

export async function buildCancelTx(
  signer: ccc.Signer,
  gameCell: { outPoint: ccc.OutPointLike; capacity: bigint }
): Promise<ccc.Transaction> {
  const address = await signer.getRecommendedAddressObj();

  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: gameCell.outPoint }],
    outputs: [{ lock: address.script }],
    outputsData: ["0x"],
  });

  tx.outputs[0].capacity = gameCell.capacity;

  addGameCellDep(tx);
  await tx.completeFeeBy(signer);
  return tx;
}
