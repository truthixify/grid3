"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ccc } from "@ckb-ccc/connector-react";
import { useGameActions } from "@/hooks/useGameActions";
import {
  MINIMUM_STAKE_CKB,
  MAXIMUM_STAKE_CKB,
  SHANNONS_PER_CKB,
  GAME_CELL_CAPACITY,
} from "@/lib/constants";
import { formatCKB } from "@/lib/ckb";

export default function CreateGamePanel() {
  const router = useRouter();
  const signer = ccc.useSigner();
  const { createGame, loading, error } = useGameActions();
  const [stakeInput, setStakeInput] = useState<string>("100");

  async function handleCreate() {
    if (!signer) return;
    const stakeNum = Number(stakeInput);
    if (isNaN(stakeNum) || stakeNum < MINIMUM_STAKE_CKB || stakeNum > MAXIMUM_STAKE_CKB) return;

    const stakeShannons = BigInt(stakeNum) * SHANNONS_PER_CKB;

    try {
      const txHash = await createGame(stakeShannons);
      router.push(`/game/${encodeURIComponent(`${txHash}:0x0`)}`);
    } catch {
      // Error handled inside hook
    }
  }

  return (
    <div className="glass-panel rounded-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-secondary text-base">
          rocket_launch
        </span>
        <h3 className="font-headline font-bold text-sm text-on-surface tracking-widest">
          INITIATE NEW MATCH
        </h3>
      </div>
      <p className="text-on-surface-variant text-xs font-body mb-6">
        Set your stake and create a new game cell on CKB.
      </p>

      {/* Stake input */}
      <label className="block mb-4">
        <span className="text-on-surface-variant text-[10px] font-headline tracking-widest mb-1 block">
          STAKE_AMOUNT (CKB)
        </span>
        <input
          type="number"
          min={MINIMUM_STAKE_CKB}
          max={MAXIMUM_STAKE_CKB}
          value={stakeInput}
          onChange={(e) => setStakeInput(e.target.value)}
          className="w-full bg-transparent border-b border-outline-variant text-on-surface font-headline text-2xl font-bold py-2 outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40"
          placeholder="100"
        />
      </label>

      {/* Cell capacity fee */}
      <div className="flex items-center justify-between mb-6 text-xs font-body">
        <span className="text-on-surface-variant">Cell Capacity Fee</span>
        <span className="text-on-surface">
          {formatCKB(GAME_CELL_CAPACITY)} CKB
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-error text-xs font-body mb-4">{error}</p>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={loading || !signer}
        className="w-full cta-gradient text-on-primary-fixed font-headline font-bold text-sm tracking-widest px-4 py-3 rounded-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-base">
          rocket_launch
        </span>
        {loading ? "CREATING..." : "CREATE_GAME"}
      </button>

      {!signer && (
        <p className="text-on-surface-variant text-[10px] font-body text-center mt-3">
          Connect your wallet to create a game
        </p>
      )}
    </div>
  );
}
