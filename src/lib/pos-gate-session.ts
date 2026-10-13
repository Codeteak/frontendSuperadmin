const POS_GATE_UNLOCK_KEY = "yaadro_admin_pos_gate_unlocked";

/**
 * POS unlock is in-memory only (React state in PosGate).
 * These helpers only clear any legacy sessionStorage flag from older builds.
 */

export function clearPosGateUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(POS_GATE_UNLOCK_KEY);
  } catch {
    // ignore
  }
}
