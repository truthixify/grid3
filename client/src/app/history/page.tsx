"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import AppShell from "@/components/AppShell";
import { CKB_EXPLORER_URL } from "@/lib/constants";
import { fetchHistory, type HistoryEntry } from "@/lib/db";
import { shortenHash, formatCKB } from "@/lib/ckb";

const RESULT_STYLES = {
  win: "text-primary bg-primary/10",
  loss: "text-error bg-error/10",
  draw: "text-on-surface-variant bg-surface-container-highest",
};

export default function HistoryPage() {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!signer) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    signer.getRecommendedAddressObj().then((addr) => {
      if (cancelled) return;
      fetchHistory(addr.script.hash()).then((data) => {
        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [signer]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-tertiary text-xl">
            history
          </span>
          <h1 className="font-headline font-bold text-xl md:text-2xl text-on-surface tracking-tight">
            MATCH HISTORY
          </h1>
        </div>

        {!signer ? (
          <div className="glass-panel rounded-sm p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-3 block">
              account_balance_wallet
            </span>
            <p className="text-on-surface-variant text-sm font-body mb-4">
              Connect your wallet to see your match history.
            </p>
            <button
              onClick={open}
              className="cta-gradient text-on-primary-fixed font-headline font-bold text-xs tracking-widest px-6 py-3 rounded-sm cursor-pointer"
            >
              CONNECT_WALLET
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="glass-panel rounded-sm h-16 animate-pulse"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="glass-panel rounded-sm p-12 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-3 block">
              sports_esports
            </span>
            <p className="text-on-surface-variant text-sm font-body">
              No games finished yet. Play a game to build your history!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((game) => (
              <div
                key={game.id}
                className="glass-panel rounded-sm px-4 py-3 flex flex-wrap items-center gap-4"
              >
                {/* Date */}
                <span className="text-on-surface-variant text-xs font-body w-24 shrink-0">
                  {game.finishedAt
                    ? new Date(game.finishedAt).toLocaleDateString()
                    : "—"}
                </span>

                {/* Opponent */}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-headline tracking-widest text-on-surface-variant block">
                    OPPONENT
                  </span>
                  <span className="text-on-surface text-xs font-mono">
                    {game.opponent ? shortenHash(game.opponent) : "Unknown"}
                  </span>
                </div>

                {/* Result */}
                <span
                  className={`text-[10px] font-headline font-bold tracking-widest px-3 py-1 rounded-sm shrink-0 uppercase ${
                    RESULT_STYLES[game.result]
                  }`}
                >
                  {game.result}
                </span>

                {/* Stake */}
                <div className="text-right shrink-0 w-24">
                  <span className="text-[10px] font-headline tracking-widest text-on-surface-variant block">
                    STAKE
                  </span>
                  <span className="text-on-surface text-xs font-body">
                    {formatCKB(BigInt(game.stakeAmount || 0))} CKB
                  </span>
                </div>

                {/* TX link */}
                {game.txHash && (
                  <a
                    href={`${CKB_EXPLORER_URL}/transaction/${game.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-body hover:underline shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      open_in_new
                    </span>
                    TX
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
