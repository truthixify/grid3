import { SHANNONS_PER_CKB } from "./constants";

/**
 * Format shannons (bigint) to CKB string with 2 decimal places.
 */
export function formatCKB(shannons: bigint): string {
  const whole = shannons / SHANNONS_PER_CKB;
  const fraction = shannons % SHANNONS_PER_CKB;
  const fractionStr = fraction.toString().padStart(8, "0").slice(0, 2);
  return `${whole.toLocaleString()}.${fractionStr}`;
}

/**
 * Parse CKB string to shannons (bigint).
 */
export function parseCKB(ckb: string): bigint {
  const trimmed = ckb.trim();
  if (!trimmed || isNaN(Number(trimmed))) {
    return BigInt(0);
  }
  const parts = trimmed.split(".");
  const whole = BigInt(parts[0] || "0") * SHANNONS_PER_CKB;
  if (parts.length === 1) {
    return whole;
  }
  const fractionStr = (parts[1] || "0").padEnd(8, "0").slice(0, 8);
  return whole + BigInt(fractionStr);
}

/**
 * Shorten a CKB address for display.
 * e.g., "ckt1qzda0cr08m85hc8jlnfp3zer7x..." -> "ckt1qz...pgwga"
 */
export function shortenAddress(addr: string): string {
  if (!addr || addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

/**
 * Shorten a transaction hash for display.
 * e.g., "0xabcdef1234567890..." -> "0xabcd...7890"
 */
export function shortenHash(hash: string): string {
  if (!hash || hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}
