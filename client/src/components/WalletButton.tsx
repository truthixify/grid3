"use client";

import { useState, useEffect } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { shortenAddress } from "@/lib/ckb";

export default function WalletButton() {
  const signer = ccc.useSigner();
  const { open, disconnect } = ccc.useCcc();
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    if (!signer) {
      setAddress("");
      return;
    }
    let cancelled = false;
    signer.getRecommendedAddress().then((addr) => {
      if (!cancelled) setAddress(addr);
    });
    return () => {
      cancelled = true;
    };
  }, [signer]);

  if (!signer) {
    return (
      <button
        onClick={open}
        className="cta-gradient text-on-primary-fixed font-headline font-bold text-sm px-5 py-2 rounded-sm tracking-wide cursor-pointer hover:opacity-90 transition-opacity"
      >
        CONNECT WALLET
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-on-surface-variant text-sm font-body">
        {shortenAddress(address)}
      </span>
      <button
        onClick={disconnect}
        className="ghost-border text-on-surface-variant text-xs font-body px-3 py-1.5 rounded-sm cursor-pointer hover:text-on-surface transition-colors"
      >
        DISCONNECT
      </button>
    </div>
  );
}
