"use client";

import { useState } from "react";
import { DownloadIcon, KeyRoundIcon, ShieldAlertIcon } from "lucide-react";

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
import { appToast } from "@/lib/app-toast";

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

function downloadTokenCsv(shopId: string, token: string) {
  const escapedShopId = `"${shopId.replaceAll('"', '""')}"`;
  const escapedToken = `"${token.replaceAll('"', '""')}"`;
  const csv = `shop_id,integration_token,link_token\n${escapedShopId},${escapedToken},${escapedToken}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${shopId}-integration-token.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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
  const [downloaded, setDownloaded] = useState(false);
  const isRotated = mode === "rotated";
  const linkName = deviceLinkName?.trim() || "Saleculator";

  function handleDownload() {
    downloadTokenCsv(shopId, token);
    setDownloaded(true);
    appToast.success("Integration token CSV downloaded.");
  }

  function handleClose() {
    setDownloaded(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton
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
                ? "A new plaintext token was issued and the previous token is now invalid. Copy or download it now — it will not be shown again."
                : "This plaintext token is shown only once. Copy or download it now — it will not be shown again and is not stored in this panel."}
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
                ? "Integration token (= Saleculator link_token)"
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
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={handleDownload}>
            <DownloadIcon className="size-4" />
            {downloaded ? "Download again (CSV)" : "Download CSV"}
          </Button>
          <Button type="button" onClick={handleClose}>
            I saved the token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
