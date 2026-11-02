"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadIcon, UploadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  bulkCreateShopProducts,
  bulkUpdateShopProducts,
} from "@/lib/api/shops";
import {
  mapBulkCreateCsv,
  mapBulkUpdateCsv,
} from "@/lib/shop-product-csv";
import { cn } from "@/lib/utils";
import type { BulkShopProductResult } from "@/types/api";

export type ShopProductsBulkMode = "create" | "update";

const SAMPLE_HREF: Record<ShopProductsBulkMode, string> = {
  create: "/samples/products-bulk-create.csv",
  update: "/samples/products-bulk-update.csv",
};

const BULK_MAX_ROWS = 500;
const BULK_MAX_BYTES = 2 * 1024 * 1024;

type ShopProductsBulkDialogProps = {
  shopId: string;
  mode: ShopProductsBulkMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShopProductsBulkDialog({
  shopId,
  mode,
  open,
  onOpenChange,
  onChanged,
}: ShopProductsBulkDialogProps) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<BulkShopProductResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const title =
    mode === "update" ? "Bulk update products" : "Bulk create products";

  const help = useMemo(() => {
    if (mode === "update") {
      return "Required: product_id plus at least one field to change. Use category_name or category_id (existing only — not both). Blank keeps category; CLEAR uncategorises.";
    }
    return "Required: product_name, price. Use category_name or category_id (existing only — not both). Missing category still creates the product. Duplicate names are rejected; soft-deleted same name is restored.";
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setProgress("");
    setResult(null);
    setMessage(null);
  }, [open, mode]);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setResult(null);
    setMessage(null);
    setProgress("Validating file…");
    try {
      if (file.size <= 0) throw new Error("File is empty");
      if (file.size > BULK_MAX_BYTES) {
        throw new Error(
          `File is too large (max ${formatBytes(BULK_MAX_BYTES)}).`,
        );
      }
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".txt")) {
        throw new Error("Upload a CSV file (.csv).");
      }

      setProgress("Parsing rows…");
      const text = await file.text();
      const rows =
        mode === "update" ? mapBulkUpdateCsv(text) : mapBulkCreateCsv(text);
      if (!rows.length) throw new Error("No valid rows found.");
      if (rows.length > BULK_MAX_ROWS) {
        throw new Error(
          `Too many rows (max ${BULK_MAX_ROWS}). Split the file and import in parts.`,
        );
      }

      setProgress(`Uploading ${rows.length} row(s)…`);
      const response =
        mode === "create"
          ? await bulkCreateShopProducts(shopId, rows)
          : await bulkUpdateShopProducts(shopId, rows);
      setResult(response);
      const { succeeded, failed, total } = response.summary;
      if (failed === 0) {
        appToast.success(`${title}: ${succeeded}/${total} succeeded.`);
      } else {
        appToast.error(`${title}: ${succeeded} ok, ${failed} failed.`);
      }
      if (succeeded > 0) await onChanged();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? parseApiFormError(err, err.message).message
          : err instanceof Error
            ? err.message
            : "Bulk import failed";
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex w-[min(100%,36rem)] max-w-xl flex-col gap-0 overflow-hidden border bg-card p-0 shadow-xl",
          "sm:max-w-xl",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <DialogHeader className="min-w-0 flex-1 gap-1.5 space-y-0 text-left">
            <DialogTitle className="text-lg font-semibold leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {help} Max file {formatBytes(BULK_MAX_BYTES)}, max {BULK_MAX_ROWS}{" "}
              rows per upload.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            disabled={busy}
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <a
              href={SAMPLE_HREF[mode]}
              download
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
            >
              <DownloadIcon className="size-3.5" />
              CSV sample
            </a>
          </div>

          <label
            className={cn(
              "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <UploadIcon className="size-5 text-foreground" />
            <span className="font-medium text-foreground">
              {busy ? progress || "Working…" : "Upload CSV"}
            </span>
            <span className="text-xs">
              Drop or click to choose a .csv file
            </span>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={(e) => void onFile(e)}
            />
          </label>

          {message ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          ) : null}

          {result ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
                Succeeded:{" "}
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {result.summary.succeeded}
                </span>
                . Failed:{" "}
                <span className="font-medium text-destructive">
                  {result.summary.failed}
                </span>
                . Total: {result.summary.total}.
              </div>
              {result.results.some((r) => r.ok && r.warning) ? (
                <div className="max-h-36 overflow-auto rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                    Created with warnings
                  </p>
                  <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-50">
                    {result.results
                      .filter((r) => r.ok && r.warning)
                      .slice(0, 50)
                      .map((r) => (
                        <li key={`w-${r.index}-${r.product_id}`}>
                          Row {r.index + 1}
                          {r.product_id != null ? ` · id ${r.product_id}` : ""}
                          {r.warning_code ? ` · [${r.warning_code}]` : ""}:{" "}
                          {r.warning}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {result.results.some((r) => !r.ok) ? (
                <div className="max-h-48 overflow-auto rounded-lg border border-red-200/80 bg-red-50/70 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-100">
                    Failures with reason
                  </p>
                  <ul className="space-y-1.5 text-xs text-red-900 dark:text-red-50">
                    {result.results
                      .filter((r) => !r.ok)
                      .slice(0, 50)
                      .map((r) => (
                        <li key={`f-${r.index}-${r.product_id}`}>
                          Row {r.index + 1}
                          {r.product_id != null ? ` · id ${r.product_id}` : ""}
                          {r.error_code ? ` · [${r.error_code}]` : ""}:{" "}
                          {r.message ?? "Row failed"}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end border-t bg-muted/40 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
