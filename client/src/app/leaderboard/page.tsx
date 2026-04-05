"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import AppShell from "@/components/AppShell";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/db";
import { shortenHash } from "@/lib/ckb";

export default function LeaderboardPage() {
  const signer = ccc.useSigner();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLockHash, setMyLockHash] = useState("");

  useEffect(() => {
    fetchLeaderboard().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!signer) { setMyLockHash(""); return; }
    let cancelled = false;
    signer.getRecommendedAddressObj().then((addr) => {
      if (!cancelled) setMyLockHash(addr.script.hash());
    });
    return () => { cancelled = true; };
  }, [signer]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-secondary text-xl">
            leaderboard
          </span>
          <h1 className="font-headline font-bold text-xl md:text-2xl text-on-surface tracking-tight">
            LEADERBOARD
          </h1>
          <span className="glass-panel rounded-sm px-2 py-0.5 text-[10px] font-headline tracking-widest text-on-surface-variant">
            SEASON 1
          </span>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-sm overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-surface-container-highest rounded-sm animate-pulse"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-3 block">
                emoji_events
              </span>
              <p className="text-on-surface-variant text-sm font-body">
                No games finished yet. Play a game to appear on the leaderboard!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-outline-variant/15">
                    <th className="text-left text-[10px] font-headline tracking-widest text-on-surface-variant px-4 py-3">
                      RANK
                    </th>
                    <th className="text-left text-[10px] font-headline tracking-widest text-on-surface-variant px-4 py-3">
                      PLAYER
                    </th>
                    <th className="text-right text-[10px] font-headline tracking-widest text-on-surface-variant px-4 py-3">
                      WINS
                    </th>
                    <th className="text-right text-[10px] font-headline tracking-widest text-on-surface-variant px-4 py-3">
                      LOSSES
                    </th>
                    <th className="text-right text-[10px] font-headline tracking-widest text-on-surface-variant px-4 py-3">
                      WIN RATE
                    </th>
                    <th className="text-right text-[10px] font-headline tracking-widest text-on-surface-variant px-4 py-3">
                      GAMES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((player, i) => {
                    const isMe =
                      myLockHash &&
                      player.lock_hash.toLowerCase() ===
                        myLockHash.toLowerCase();
                    return (
                      <tr
                        key={player.lock_hash}
                        className={`border-b border-outline-variant/15 transition-colors ${
                          isMe
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-surface-container-high/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`font-headline font-bold ${
                              i < 3
                                ? "text-primary"
                                : "text-on-surface-variant"
                            }`}
                          >
                            #{i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-on-surface text-xs font-mono">
                            {shortenHash(player.lock_hash)}
                          </span>
                          {isMe && (
                            <span className="ml-2 text-[10px] font-headline tracking-widest text-primary">
                              YOU
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-primary font-headline font-bold">
                            {player.wins}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-error">{player.losses}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-on-surface">
                            {player.win_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-on-surface-variant">
                            {player.total_games}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
