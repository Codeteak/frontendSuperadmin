const POS_GATE_UNLOCK_KEY = "yaadro_admin_pos_gate_unlocked";

export function isPosGateUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(POS_GATE_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPosGateUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(POS_GATE_UNLOCK_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

export function clearPosGateUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(POS_GATE_UNLOCK_KEY);
  } catch {
    // ignore
  }
}
