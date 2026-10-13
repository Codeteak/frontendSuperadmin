import { apiFetch } from "@/lib/api";

export type PosGateStatus = {
  must_change_pin: boolean;
};

export type PosGateUnlockResult = {
  unlocked: boolean;
  must_change_pin: boolean;
};

export type PosGateOtpRequestResult = {
  accepted: boolean;
  expires_in?: number;
  sent_to_hint?: string;
};

export function getPosGateStatus() {
  return apiFetch<PosGateStatus>("/v2/pos-gate");
}

export function verifyPosGatePin(pin: string) {
  return apiFetch<PosGateUnlockResult>("/v2/pos-gate/verify", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export function changePosGatePin(currentPin: string, newPin: string) {
  return apiFetch<PosGateUnlockResult>("/v2/pos-gate/change-pin", {
    method: "POST",
    body: JSON.stringify({
      current_pin: currentPin,
      new_pin: newPin,
    }),
  });
}

export function requestPosGateResetOtp() {
  return apiFetch<PosGateOtpRequestResult>("/v2/pos-gate/forgot/request-otp", {
    method: "POST",
  });
}

export function resetPosGatePin(otp: string, newPin: string) {
  return apiFetch<PosGateUnlockResult>("/v2/pos-gate/forgot/reset", {
    method: "POST",
    body: JSON.stringify({
      otp,
      new_pin: newPin,
    }),
  });
}
