"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUpIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  SHOP_PRODUCT_BULK_CREATE_TEMPLATE,
  SHOP_PRODUCT_BULK_UPDATE_TEMPLATE,
} from "@/lib/shop-product-csv";
import { cn } from "@/lib/utils";
import type { BulkShopProductResult } from "@/types/api";

type BulkMode = "create" | "update";

type ShopProductsBulkDialogProps = {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

export function ShopProductsBulkDialog({
  shopId,
  open,
  onOpenChange,
  onChanged,
}: ShopProductsBulkDialogProps) {
  const [mode, setMode] = useState<BulkMode>("create");
  const [csvText, setCsvText] = useState(SHOP_PRODUCT_BULK_CREATE_TEMPLATE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BulkShopProductResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const template = useMemo(
    () =>
      mode === "create"
        ? SHOP_PRODUCT_BULK_CREATE_TEMPLATE
        : SHOP_PRODUCT_BULK_UPDATE_TEMPLATE,
    [mode],
  );

  useEffect(() => {
    if (!open) return;
    setMode("create");
    setCsvText(SHOP_PRODUCT_BULK_CREATE_TEMPLATE);
    setFileName(null);
    setBusy(false);
    setMessage(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  function onModeChange(next: BulkMode) {
    setMode(next);
    setCsvText(
      next === "create"
        ? SHOP_PRODUCT_BULK_CREATE_TEMPLATE
        : SHOP_PRODUCT_BULK_UPDATE_TEMPLATE,
    );
    setFileName(null);
    setResult(null);
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setResult(null);
    setMessage(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setResult(null);
    try {
      const response =
        mode === "create"
          ? await bulkCreateShopProducts(shopId, mapBulkCreateCsv(csvText))
          : await bulkUpdateShopProducts(shopId, mapBulkUpdateCsv(csvText));
      setResult(response);
      const { succeeded, failed, total } = response.summary;
      if (failed === 0) {
        appToast.success(`Bulk ${mode}: ${succeeded}/${total} succeeded.`);
      } else {
        appToast.error(`Bulk ${mode}: ${succeeded} ok, ${failed} failed.`);
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden border bg-card p-0 shadow-xl sm:max-w-3xl"
      >
        <form
          className="flex max-h-[90vh] flex-col"
          onSubmit={(e) => void onSubmit(e)}
        >
          <div className="space-y-5 overflow-y-auto p-6 pb-5">
            <DialogHeader className="gap-2 text-left">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadIcon className="size-5" />
              </div>
              <DialogTitle className="text-lg font-semibold">
                Bulk products CSV
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Import up to 500 rows. Create restores a soft-deleted product
                with the same name when present. Update requires{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  product_id
                </code>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Mode
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === "create" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => onModeChange("create")}
                >
                  Bulk create
                </Button>
                <Button
                  type="button"
                  variant={mode === "update" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => onModeChange("update")}
                >
                  Bulk update
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label
                  htmlFor="bulk_csv"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  CSV content
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCsvText(template);
                      setFileName(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Reset template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(template);
                      appToast.success("Template copied.");
                    }}
                  >
                    Copy template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUpIcon className="size-3.5" />
                    Upload file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="sr-only"
                    onChange={(e) => {
                      void onPickFile(e.target.files?.[0] ?? null);
                    }}
                  />
                </div>
              </div>
              {fileName ? (
                <p className="truncate text-xs text-muted-foreground">
                  Loaded from <span className="font-medium">{fileName}</span>
                </p>
              ) : null}
              <Textarea
                id="bulk_csv"
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setFileName(null);
                }}
                spellCheck={false}
                className={cn(
                  "min-h-56 w-full resize-y overflow-x-auto whitespace-pre font-mono text-xs leading-5",
                )}
              />
              <p className="text-xs text-muted-foreground">
                Header row required. Paste CSV or upload a{" "}
                <code className="text-[11px]">.csv</code> file.
              </p>
            </div>

            {message ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}

            {result ? (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-medium">
                  Summary: {result.summary.succeeded} succeeded,{" "}
                  {result.summary.failed} failed / {result.summary.total}
                </p>
                {result.results.some((r) => !r.ok || r.warning) ? (
                  <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-xs text-muted-foreground">
                    {result.results
                      .filter((r) => !r.ok || r.warning)
                      .slice(0, 50)
                      .map((r) => (
                        <li
                          key={`${r.index}-${r.product_id}`}
                          className="rounded-md border bg-background px-2 py-1.5"
                        >
                          #{r.index + 1}
                          {r.product_id != null ? ` (id ${r.product_id})` : ""}:{" "}
                          {r.ok
                            ? r.warning || "ok"
                            : `${r.error_code ?? "error"} — ${r.message ?? ""}`}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={busy || !csvText.trim()}>
              {busy ? "Running…" : `Run bulk ${mode}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
