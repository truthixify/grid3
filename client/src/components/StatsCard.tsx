"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { fetchPlayerStats, type PlayerStats } from "@/lib/db";

export default function StatsCard() {
  const signer = ccc.useSigner();
  const [stats, setStats] = useState<PlayerStats>({
    wins: 0,
    losses: 0,
    draws: 0,
    totalGames: 0,
    winRate: 0,
    totalStaked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!signer) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    signer.getRecommendedAddressObj().then((addr) => {
      if (cancelled) return;
      fetchPlayerStats(addr.script.hash()).then((s) => {
        if (!cancelled) {
          setStats(s);
          setLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [signer]);

  if (!signer) {
    return (
      <div className="glass-panel rounded-sm p-6 text-center">
        <p className="text-on-surface-variant text-xs font-body">
          Connect wallet to see your stats
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-tertiary text-base">
          monitoring
        </span>
        <h3 className="font-headline font-bold text-sm text-on-surface tracking-widest">
          YOUR_STATS
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-8 bg-surface-container-highest rounded-sm animate-pulse" />
          <div className="h-4 bg-surface-container-highest rounded-sm animate-pulse w-2/3" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-primary text-2xl font-headline font-bold">
                {stats.wins}
              </p>
              <p className="text-on-surface-variant text-[10px] font-headline tracking-widest">
                WINS
              </p>
            </div>
            <div>
              <p className="text-secondary text-2xl font-headline font-bold">
                {stats.losses}
              </p>
              <p className="text-on-surface-variant text-[10px] font-headline tracking-widest">
                LOSSES
              </p>
            </div>
            <div>
              <p className="text-on-surface text-2xl font-headline font-bold">
                {stats.totalGames}
              </p>
              <p className="text-on-surface-variant text-[10px] font-headline tracking-widest">
                PLAYED
              </p>
            </div>
          </div>

          <div className="mb-1 flex items-center justify-between">
            <span className="text-on-surface-variant text-[10px] font-body">
              Win Rate
            </span>
            <span className="text-on-surface text-[10px] font-body">
              {stats.winRate}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-sm overflow-hidden">
            <div
              className="h-full progress-bar rounded-sm transition-all"
              style={{ width: `${stats.winRate}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
