"use client";

import { type ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";

export function CKBProvider({ children }: { children: ReactNode }) {
  return (
    <ccc.Provider
      preferredNetworks={[
        {
          addressPrefix: "ckt",
          signerType: ccc.SignerType.CKB,
          network: "nervos_testnet",
        },
      ]}
      name="GRID3"
    >
      {children}
    </ccc.Provider>
  );
}
