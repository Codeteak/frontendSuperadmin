"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EraserIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { ShopProductFormDialog } from "@/components/shops/shop-product-form-dialog";
import { ShopProductsBulkDialog } from "@/components/shops/shop-products-bulk-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  bulkDeleteShopProducts,
  deleteShopProduct,
} from "@/lib/api/shops";
import { shopKeys, shopProductsQuery } from "@/lib/queries/shops";
import { formatCurrency } from "@/lib/utils";
import type { ShopProduct } from "@/types/api";

type ShopProductsTabProps = {
  shopId: string;
};

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    return parseApiFormError(err, err.message).message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ShopProductsTab({ shopId }: ShopProductsTabProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"create" | "update">("create");
  const [busyDelete, setBusyDelete] = useState(false);

  function openBulk(mode: "create" | "update") {
    setBulkMode(mode);
    setBulkOpen(true);
  }

  const productsQuery = useQuery(shopProductsQuery(shopId));
  const items = productsQuery.data?.items ?? [];
  const loading = productsQuery.isPending;
  const error = productsQuery.error
    ? productsQuery.error instanceof Error
      ? productsQuery.error.message
      : "Failed to load products"
    : null;

  const selectableIds = useMemo(
    () =>
      items
        .map((p) => Number(p.id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [items],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: [...shopKeys.all, "products", shopId],
    });
    await productsQuery.refetch();
    setSelected(new Set());
  }

  function openCreate() {
    setFormMode("create");
    setEditProductId(null);
    setFormOpen(true);
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableIds));
  }

  async function onDeleteOne(product: ShopProduct, hard = false) {
    const id = Number(product.id);
    const name = product.product_name ?? product.name ?? `#${id}`;
    if (!Number.isFinite(id) || id <= 0) return;
    const ok = hard
      ? confirm(
          `HARD delete "${name}" permanently?\n\nRemoves the product row, session/pre-booking links, and daily specials. Order lines keep their names but lose the product link. This cannot be undone.`,
        )
      : confirm(`Soft-delete product "${name}"?`);
    if (!ok) return;
    try {
      await deleteShopProduct(shopId, id, hard);
      appToast.success(hard ? "Product permanently deleted." : "Product soft-deleted.");
      await refresh();
    } catch (err) {
      appToast.error(errorMessage(err, "Delete failed"));
    }
  }

  async function onBulkDelete(hard = false) {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = hard
      ? confirm(
          `HARD delete ${ids.length} selected product(s) permanently?\n\nThis cannot be undone.`,
        )
      : confirm(`Soft-delete ${ids.length} selected product(s)?`);
    if (!ok) return;
    setBusyDelete(true);
    try {
      const result = await bulkDeleteShopProducts(shopId, ids, hard);
      const { succeeded, failed, total } = result.summary;
      const verb = hard ? "Hard-deleted" : "Deleted";
      if (failed === 0) {
        appToast.success(`${verb} ${succeeded}/${total} products.`);
      } else {
        const sample = result.results
          .filter((r) => !r.ok)
          .slice(0, 3)
          .map((r) => `${r.product_id}: ${r.error_code}`)
          .join("; ");
        appToast.error(`${verb} ${succeeded}, failed ${failed}. ${sample}`);
      }
      await refresh();
    } catch (err) {
      appToast.error(errorMessage(err, "Bulk delete failed"));
    } finally {
      setBusyDelete(false);
    }
  }

  const columns = useMemo<ColumnDef<ShopProduct>[]>(() => {
    return [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <input
            type="checkbox"
            className="size-4 accent-primary"
            aria-label="Select all products"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={(e) => toggleAll(e.target.checked)}
          />
        ),
        cell: ({ row }) => {
          const id = Number(row.original.id);
          if (!Number.isFinite(id) || id <= 0) return null;
          return (
            <input
              type="checkbox"
              className="size-4 accent-primary"
              aria-label={`Select product ${id}`}
              checked={selected.has(id)}
              onChange={(e) => toggleSelected(id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        size: 44,
      },
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.id ?? "—"}</span>
        ),
        meta: { label: "ID" },
        size: 80,
      },
      {
        id: "product_name",
        accessorFn: (row) => row.product_name ?? row.name ?? "",
        header: "Product",
        cell: ({ row }) => {
          const name = row.original.product_name ?? row.original.name ?? "—";
          const alt = row.original.product_name_alt;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              {alt ? (
                <p className="truncate text-xs text-muted-foreground">{alt}</p>
              ) : null}
            </div>
          );
        },
        meta: { label: "Product" },
        size: 220,
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
          const price = row.original.price;
          if (price == null || price === "") return "—";
          const amount = Number(price);
          return (
            <span className="tabular-nums">
              {Number.isFinite(amount) ? formatCurrency(amount) : String(price)}
            </span>
          );
        },
        meta: { label: "Price" },
        size: 110,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        meta: { label: "Status" },
        size: 110,
      },
      {
        accessorKey: "availability",
        header: "Availability",
        cell: ({ row }) => (
          <span className="capitalize">
            {String(
              row.original.availability ??
                (row.original.is_available === false
                  ? "out_of_stock"
                  : "in_stock"),
            ).replaceAll("_", " ")}
          </span>
        ),
        meta: { label: "Availability" },
        size: 130,
      },
      {
        accessorKey: "category_id",
        header: "Category",
        cell: ({ row }) => row.original.category_id ?? "—",
        meta: { label: "Category" },
        size: 90,
      },
      {
        accessorKey: "diet_type",
        header: "Diet",
        cell: ({ row }) =>
          row.original.diet_type
            ? String(row.original.diet_type).replaceAll("_", " ")
            : "—",
        meta: { label: "Diet" },
        size: 100,
      },
      {
        accessorKey: "catalog_role",
        header: "Role",
        cell: ({ row }) => (
          <span className="capitalize">
            {row.original.catalog_role
              ? String(row.original.catalog_role).replaceAll("_", " ")
              : "—"}
          </span>
        ),
        meta: { label: "Role" },
        size: 90,
      },
      {
        accessorKey: "sort_order",
        header: "Sort",
        cell: ({ row }) => row.original.sort_order ?? "—",
        meta: { label: "Sort" },
        size: 70,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const product = row.original;
          const id = Number(product.id);
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Edit product"
                      onClick={() => {
                        setFormMode("edit");
                        setEditProductId(id);
                        setFormOpen(true);
                      }}
                    />
                  }
                >
                  <PencilIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Soft delete product"
                      onClick={() => void onDeleteOne(product, false)}
                    />
                  }
                >
                  <Trash2Icon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Soft delete</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      aria-label="Hard delete product"
                      onClick={() => void onDeleteOne(product, true)}
                    />
                  }
                >
                  <EraserIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Hard delete</TooltipContent>
              </Tooltip>
            </div>
          );
        },
        size: 110,
      },
    ];
  }, [allSelected, someSelected, selected]);

  return (
    <section className="max-w-none">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">Products</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading
              ? "Loading catalog…"
              : `${items.length} product${items.length === 1 ? "" : "s"}`}
            {selected.size > 0 ? ` · ${selected.size} selected` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void productsQuery.refetch()}
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openBulk("create")}
          >
            <UploadIcon className="size-3.5" />
            Bulk create
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openBulk("update")}
          >
            <UploadIcon className="size-3.5" />
            Bulk update
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || busyDelete}
            onClick={() => void onBulkDelete(false)}
          >
            <Trash2Icon className="size-3.5" />
            Soft delete selected
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={selected.size === 0 || busyDelete}
            onClick={() => void onBulkDelete(true)}
          >
            <EraserIcon className="size-3.5" />
            Hard delete selected
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <PlusIcon className="size-3.5" />
            Add product
          </Button>
        </div>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void productsQuery.refetch()}
        />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No products"
          description="Create a product or import a CSV bulk-create file."
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={openCreate}>
                <PlusIcon className="size-3.5" />
                Add product
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openBulk("create")}
              >
                <UploadIcon className="size-3.5" />
                Bulk create
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openBulk("update")}
              >
                <UploadIcon className="size-3.5" />
                Bulk update
              </Button>
            </div>
          }
        />
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Search products…"
          emptyMessage="No products match this search."
          getRowId={(row, index) => String(row.id ?? index)}
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      ) : null}

      <ShopProductFormDialog
        shopId={shopId}
        mode={formMode}
        productId={editProductId}
        open={formOpen}
        onOpenChange={setFormOpen}
        onChanged={refresh}
      />
      <ShopProductsBulkDialog
        shopId={shopId}
        mode={bulkMode}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onChanged={refresh}
      />
    </section>
  );
}
