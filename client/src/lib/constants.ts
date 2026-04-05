// CKB Testnet
export const CKB_RPC_URL = "https://testnet.ckb.dev/rpc";
export const CKB_INDEXER_URL = "https://testnet.ckb.dev/indexer";
export const CKB_EXPLORER_URL = "https://pudge.explorer.nervos.org";

// Deployed contract info
export const SCRIPT_CODE_HASH =
  "0x4245528f6287893443bb2a160757f32c4aba0669772c2575955abbff298dc59d";
export const SCRIPT_HASH_TYPE = "type" as const;
export const SCRIPT_CELL_DEP = {
  outPoint: {
    txHash:
      "0x4dfd4e2b086ba8eca9d60c0fae80ec9f5c717319f855c85bb9c411c8157e6d5b",
    index: "0x0",
  },
  depType: "code" as const,
};

// Fee address — secp256k1 lock
export const FEE_LOCK_ARGS =
  "0x8e42b1999f265a0078503c4acec4d5e134534297";
export const SECP256K1_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";

// Stake limits
export const MINIMUM_STAKE_CKB = 100;
export const MAXIMUM_STAKE_CKB = 100_000;
export const SHANNONS_PER_CKB = BigInt(100_000_000);

// Minimum cell capacity for a game cell (in shannons)
export const GAME_CELL_CAPACITY = BigInt(300) * SHANNONS_PER_CKB;

// Polling interval for game state (ms)
export const POLL_INTERVAL_MS = 5000;
