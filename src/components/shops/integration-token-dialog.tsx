"use client";

import { useEffect, useState } from "react";
import { KeyRoundIcon, ShieldAlertIcon } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type IntegrationTokenDialogProps = {
  open: boolean;
  shopId: string;
  shopName?: string | null;
  token: string;
  /** First-time enable vs rotate re-issue */
  mode?: "created" | "rotated";
  /** When the till links with POST /api/v1/pos/links */
  saleculatorLinkToken?: boolean;
  /** Shown in the link_token copy. Saleculator stays "Saleculator". */
  deviceLinkName?: string;
  onOpenChange: (open: boolean) => void;
};

export function IntegrationTokenDialog({
  open,
  shopId,
  shopName,
  token,
  mode = "created",
  saleculatorLinkToken = false,
  deviceLinkName,
  onOpenChange,
}: IntegrationTokenDialogProps) {
  const [savedAck, setSavedAck] = useState(false);
  const isRotated = mode === "rotated";
  const linkName = deviceLinkName?.trim() || "Saleculator";

  useEffect(() => {
    if (open) setSavedAck(false);
  }, [open, token]);

  function handleClose() {
    setSavedAck(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (!savedAck) return;
          handleClose();
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border bg-card p-0 shadow-xl sm:max-w-lg"
      >
        <div className="p-6 pb-5">
          <DialogHeader className="gap-3 text-left">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {isRotated
                ? "Integration token rotated"
                : "Integration token created"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {isRotated
                ? "A new plaintext token was issued and the previous token is now invalid. Copy it now — it will not be shown again."
                : "This plaintext token is shown only once. Copy it now — it will not be shown again and is not stored in this panel."}
              {saleculatorLinkToken
                ? ` For ${linkName}, paste this value as the device link_token (POST /api/v1/pos/links).`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-sm">
            {shopName ? (
              <p className="font-medium">{shopName}</p>
            ) : null}
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {shopId}
            </p>
          </div>

          {saleculatorLinkToken ? (
            <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
              <p className="font-medium">{linkName} link_token</p>
              <p className="mt-1 text-muted-foreground">
                Device links with{" "}
                <code className="text-xs">POST /api/v1/pos/links</code> using
                this secret, then polls with the returned Bearer JWT. After
                rotate, the till must re-link.
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
            <div className="flex gap-2">
              <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                After you close this dialog, the token cannot be recovered from
                here. Store it securely if you need it later.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {saleculatorLinkToken
                ? "Integration token (= device link_token)"
                : "Integration token"}
            </p>
            <div className="flex items-start gap-2 rounded-xl border bg-background p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-sm">
                {token}
              </code>
              <CopyButton
                value={token}
                label="Copy token"
                className="shrink-0"
              />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={savedAck}
              onChange={(e) => setSavedAck(e.target.checked)}
            />
            <span>
              I have copied and stored this token securely. I understand it
              cannot be shown again.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" disabled={!savedAck} onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
