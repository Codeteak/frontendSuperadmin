"use client";

import { useEffect, useState } from "react";
import { KeyRoundIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  changePosGatePin,
  getPosGateStatus,
  requestPosGateResetOtp,
  resetPosGatePin,
  verifyPosGatePin,
} from "@/lib/api/pos-gate";
import {
  isPosGateUnlocked,
  setPosGateUnlocked,
} from "@/lib/pos-gate-session";

type GateStep = "unlock" | "force-change" | "forgot-otp" | "forgot-reset";

export function PosGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [mustChangePin, setMustChangePin] = useState(false);
  const [step, setStep] = useState<GateStep>("unlock");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (isPosGateUnlocked()) {
        if (!cancelled) {
          setUnlocked(true);
          setReady(true);
        }
        return;
      }

      try {
        const status = await getPosGateStatus();
        if (cancelled) return;
        setMustChangePin(status.must_change_pin);
        setStep(status.must_change_pin ? "force-change" : "unlock");
      } catch {
        if (!cancelled) {
          setStep("unlock");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function unlockSession() {
    setPosGateUnlocked();
    setUnlocked(true);
    setError(null);
    setInfo(null);
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const result = await verifyPosGatePin(pin.trim());
      if (result.must_change_pin) {
        setMustChangePin(true);
        setCurrentPin(pin.trim());
        setStep("force-change");
        setInfo("Default PIN accepted. Choose a new PIN to continue.");
        setPin("");
        return;
      }
      if (result.unlocked) {
        unlockSession();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect PIN");
    } finally {
      setLoading(false);
    }
  }

  async function onForceChange(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    if (newPin.trim() !== confirmPin.trim()) {
      setError("New PIN confirmation does not match");
      setLoading(false);
      return;
    }
    try {
      const result = await changePosGatePin(
        currentPin.trim() || pin.trim(),
        newPin.trim(),
      );
      if (result.unlocked) {
        unlockSession();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change PIN");
    } finally {
      setLoading(false);
    }
  }

  async function onRequestOtp() {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const result = await requestPosGateResetOtp();
      setOtpHint(result.sent_to_hint ?? null);
      setStep("forgot-reset");
      setInfo(
        result.sent_to_hint
          ? `Reset code sent to ${result.sent_to_hint}.`
          : "Reset code sent.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    if (newPin.trim() !== confirmPin.trim()) {
      setError("New PIN confirmation does not match");
      setLoading(false);
      return;
    }
    try {
      const result = await resetPosGatePin(otp.trim(), newPin.trim());
      if (result.unlocked) {
        unlockSession();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset PIN");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center px-1 py-10">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
          <KeyRoundIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">POS PIN required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "force-change" || mustChangePin
              ? "The default PIN must be changed before POS tools unlock."
              : step.startsWith("forgot")
                ? "Reset the shared POS PIN with a one-time code."
                : "Enter the shared POS PIN to unlock this section for this browser tab."}
          </p>
        </div>
      </div>

      {info ? (
        <p className="mb-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {info}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {step === "unlock" ? (
        <form className="space-y-4" onSubmit={(e) => void onVerify(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="pos-gate-pin">PIN</Label>
            <Input
              id="pos-gate-pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="••••"
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || pin.length < 4}>
            {loading ? "Checking…" : "Unlock POS"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setStep("forgot-otp");
              setError(null);
              setInfo(null);
            }}
          >
            Forgot PIN
          </Button>
        </form>
      ) : null}

      {step === "force-change" ? (
        <form className="space-y-4" onSubmit={(e) => void onForceChange(e)}>
          {!currentPin ? (
            <div className="space-y-1.5">
              <Label htmlFor="pos-gate-current-pin">Current PIN</Label>
              <Input
                id="pos-gate-current-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                disabled={loading}
                required
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="pos-gate-new-pin">New PIN</Label>
            <Input
              id="pos-gate-new-pin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-gate-confirm-pin">Confirm new PIN</Label>
            <Input
              id="pos-gate-confirm-pin"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              disabled={loading}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || newPin.length < 4}
          >
            {loading ? "Saving…" : "Set PIN and unlock"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setStep("forgot-otp");
              setError(null);
              setInfo(null);
            }}
          >
            Forgot PIN
          </Button>
        </form>
      ) : null}

      {step === "forgot-otp" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A one-time code will be emailed to the POS PIN recovery address.
          </p>
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void onRequestOtp()}
          >
            {loading ? "Sending…" : "Send reset code"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => {
              setStep(mustChangePin ? "force-change" : "unlock");
              setError(null);
              setInfo(null);
            }}
          >
            Back
          </Button>
        </div>
      ) : null}

      {step === "forgot-reset" ? (
        <form className="space-y-4" onSubmit={(e) => void onForgotReset(e)}>
          {otpHint ? (
            <p className="text-xs text-muted-foreground">Code sent to {otpHint}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="pos-gate-otp">OTP</Label>
            <Input
              id="pos-gate-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-gate-forgot-new-pin">New PIN</Label>
            <Input
              id="pos-gate-forgot-new-pin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-gate-forgot-confirm-pin">Confirm new PIN</Label>
            <Input
              id="pos-gate-forgot-confirm-pin"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              disabled={loading}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || otp.length < 6 || newPin.length < 4}
          >
            {loading ? "Resetting…" : "Reset PIN and unlock"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={loading}
            onClick={() => void onRequestOtp()}
          >
            Resend code
          </Button>
        </form>
      ) : null}
    </div>
  );
}
