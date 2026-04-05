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

const PRESETS = [100, 500, 1000];

export default function CreateGamePanel() {
  const router = useRouter();
  const signer = ccc.useSigner();
  const { createGame, loading, error } = useGameActions();
  const [stakeInput, setStakeInput] = useState<string>("100");
  const [customMode, setCustomMode] = useState(false);

  const stakeNum = Number(stakeInput) || 0;
  const isValid = stakeNum >= MINIMUM_STAKE_CKB && stakeNum <= MAXIMUM_STAKE_CKB;

  async function handleCreate() {
    if (!signer || !isValid) return;
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
      <p className="text-on-surface-variant text-xs font-body mb-5">
        Set your stake and create a new game cell on CKB.
      </p>

      {/* Preset buttons */}
      <span className="text-on-surface-variant text-[10px] font-headline tracking-widest mb-2 block">
        STAKE_AMOUNT (CKB)
      </span>
      <div className="flex gap-2 mb-3">
        {PRESETS.map((amount) => (
          <button
            key={amount}
            onClick={() => { setStakeInput(String(amount)); setCustomMode(false); }}
            className={`flex-1 py-2 rounded-sm text-xs font-headline font-bold tracking-widest transition-colors cursor-pointer ${
              !customMode && stakeNum === amount
                ? "cta-gradient text-on-primary-fixed"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface ghost-border"
            }`}
          >
            {amount}
          </button>
        ))}
        <button
          onClick={() => { setCustomMode(true); setStakeInput(""); }}
          className={`px-3 py-2 rounded-sm text-xs font-headline font-bold tracking-widest transition-colors cursor-pointer ${
            customMode
              ? "cta-gradient text-on-primary-fixed"
              : "bg-surface-container-high text-on-surface-variant hover:text-on-surface ghost-border"
          }`}
        >
          <span className="material-symbols-outlined text-sm">edit</span>
        </button>
      </div>

      {/* Custom input */}
      {customMode && (
        <input
          type="number"
          min={MINIMUM_STAKE_CKB}
          max={MAXIMUM_STAKE_CKB}
          value={stakeInput}
          onChange={(e) => setStakeInput(e.target.value)}
          autoFocus
          className="w-full bg-transparent border-b border-outline-variant text-on-surface font-headline text-xl font-bold py-2 mb-1 outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder={`${MINIMUM_STAKE_CKB} — ${MAXIMUM_STAKE_CKB.toLocaleString()}`}
        />
      )}

      {/* Selected amount display */}
      {!customMode && (
        <p className="text-on-surface font-headline font-bold text-xl mb-1">
          {stakeNum.toLocaleString()} <span className="text-sm text-on-surface-variant">CKB</span>
        </p>
      )}

      {/* Cell capacity fee */}
      <div className="flex items-center justify-between mb-5 text-xs font-body mt-3">
        <span className="text-on-surface-variant">Cell Capacity Fee</span>
        <span className="text-on-surface">
          ~{formatCKB(GAME_CELL_CAPACITY)} CKB
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-error text-xs font-body mb-4">{error}</p>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={loading || !signer || !isValid}
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
