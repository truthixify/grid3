"use client";

import { useState, useEffect, useCallback } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import AppShell from "@/components/AppShell";
import StatsCard from "@/components/StatsCard";
import GameList from "@/components/GameList";
import CreateGamePanel from "@/components/CreateGamePanel";
import { findGameCells } from "@/lib/queries";
import { GameStatus } from "@/lib/types";
import type { GameCell } from "@/lib/types";

export default function LobbyPage() {
  const { client } = ccc.useCcc();
  const { open } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [waitingGames, setWaitingGames] = useState<GameCell[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [refreshingGames, setRefreshingGames] = useState(false);

  const fetchGames = useCallback(async () => {
    if (!client) return;
    try {
      const cells = await findGameCells(client, GameStatus.WAITING);
      setWaitingGames(cells);
    } catch {
      // Silently fail
    } finally {
      setLoadingGames(false);
      setRefreshingGames(false);
    }
  }, [client]);

  function handleRefreshGames() {
    setRefreshingGames(true);
    fetchGames();
  }

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 10000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero section */}
        <section className="py-8 md:py-12">
          <div className="inline-flex items-center gap-2 glass-panel rounded-sm px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-headline tracking-widest text-on-surface-variant">
              PROTOCOL v1.0 // CKB TESTNET
            </span>
          </div>

          <h1 className="font-headline font-bold text-3xl md:text-5xl lg:text-6xl text-on-surface mb-2 leading-tight">
            STAKE CKB,
            <br />
            <span className="text-gradient-hero">PLAY ON-CHAIN</span>
          </h1>

          <p className="text-on-surface-variant text-sm md:text-base font-body max-w-lg mb-8">
            Fully decentralized Tic Tac Toe. Every move is a transaction. Every
            game is a UTXO. No server. No trust. Just CKB.
          </p>

          <div className="flex items-center gap-3">
            {!signer ? (
              <button
                onClick={open}
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-sm tracking-widest px-6 py-3 rounded-sm flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">
                  bolt
                </span>
                START_SESSION
              </button>
            ) : (
              <a
                href="#create"
                className="cta-gradient text-on-primary-fixed font-headline font-bold text-sm tracking-widest px-6 py-3 rounded-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">
                  bolt
                </span>
                START_SESSION
              </a>
            )}
          </div>
        </section>

        {/* Stats */}
        <StatsCard />

        {/* Waiting games */}
        <section id="waiting">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                hourglass_top
              </span>
              <h2 className="font-headline font-bold text-sm text-on-surface tracking-widest">
                WAITING_GAMES
              </h2>
            </div>
            <button
              onClick={handleRefreshGames}
              disabled={refreshingGames}
              className="text-on-surface-variant text-xs font-body hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${refreshingGames ? "animate-spin" : ""}`}>
                refresh
              </span>
              {refreshingGames ? "Syncing..." : "Refresh"}
            </button>
          </div>

          {loadingGames ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-panel rounded-sm h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="relative">
              {refreshingGames && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/50 rounded-sm">
                  <span className="material-symbols-outlined text-primary text-xl animate-spin">refresh</span>
                </div>
              )}
              <GameList games={waitingGames} onJoined={fetchGames} />
            </div>
          )}
        </section>

        {/* Create game */}
        <section id="create">
          <CreateGamePanel />
        </section>

        {/* Network status */}
        <section className="glass-panel rounded-sm p-4 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[10px] font-headline tracking-widest text-on-surface-variant">
            NETWORK: CKB TESTNET
          </span>
          <span className="text-[10px] font-body text-on-surface-variant ml-auto">
            Indexer connected
          </span>
        </section>
      </div>
    </AppShell>
  );
}
