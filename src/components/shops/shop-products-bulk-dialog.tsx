"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BulkShopProductResult | null>(null);

  const template = useMemo(
    () =>
      mode === "create"
        ? SHOP_PRODUCT_BULK_CREATE_TEMPLATE
        : SHOP_PRODUCT_BULK_UPDATE_TEMPLATE,
    [mode],
  );

  function onModeChange(next: BulkMode) {
    setMode(next);
    setCsvText(
      next === "create"
        ? SHOP_PRODUCT_BULK_CREATE_TEMPLATE
        : SHOP_PRODUCT_BULK_UPDATE_TEMPLATE,
    );
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk products</DialogTitle>
          <DialogDescription>
            Upload up to 500 rows. Create matches shop DMS bulk-create (restore
            soft-deleted same name). Update requires <code>product_id</code>.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select
              value={mode}
              onValueChange={(value) => onModeChange(value as BulkMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">Bulk create</SelectItem>
                <SelectItem value="update">Bulk update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCsvText(template)}
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk_csv">CSV</Label>
            <Textarea
              id="bulk_csv"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          {message ? (
            <p className="text-sm text-destructive">{message}</p>
          ) : null}

          {result ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">
                Summary: {result.summary.succeeded} succeeded,{" "}
                {result.summary.failed} failed / {result.summary.total}
              </p>
              {result.results.some((r) => !r.ok || r.warning) ? (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {result.results
                    .filter((r) => !r.ok || r.warning)
                    .slice(0, 50)
                    .map((r) => (
                      <li key={`${r.index}-${r.product_id}`}>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Running…" : `Run bulk ${mode}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
