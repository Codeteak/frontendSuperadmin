"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EraserIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";

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
import {
  bulkDeleteShopCategories,
  createShopCategory,
  deleteShopCategory,
} from "@/lib/api/shops";
import { appToast } from "@/lib/app-toast";
import { shopCategoriesQuery, shopKeys } from "@/lib/queries/shops";
import type { ShopCategory } from "@/types/api";

type ShopCategoriesTabProps = {
  shopId: string;
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message.trim() ? err.message : fallback;
}

export function ShopCategoriesTab({ shopId }: ShopCategoriesTabProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyDelete, setBusyDelete] = useState(false);
  const [createName, setCreateName] = useState("");
  const [busyCreate, setBusyCreate] = useState(false);
  const categoriesQuery = useQuery(shopCategoriesQuery(shopId));
  const items = categoriesQuery.data?.items ?? [];
  const loading = categoriesQuery.isPending;
  const error = categoriesQuery.error
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Failed to load categories"
    : null;

  const selectableIds = useMemo(
    () =>
      items
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [items],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  async function refresh() {
    setSelected(new Set());
    await queryClient.invalidateQueries({
      queryKey: [...shopKeys.all, "categories", shopId],
    });
    await queryClient.invalidateQueries({
      queryKey: [...shopKeys.all, "products", shopId],
    });
    await categoriesQuery.refetch();
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
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

  async function onDeleteOne(category: ShopCategory, hard = false) {
    const id = Number(category.id);
    const name = category.category_name ?? `#${id}`;
    if (!Number.isFinite(id) || id <= 0) return;
    const ok = hard
      ? confirm(
          `HARD delete "${name}" permanently?\n\nThis is refused if the category still has products or sub-categories. This cannot be undone.`,
        )
      : confirm(
          `Soft-delete category "${name}"?\n\nThis is refused if the category still has products or sub-categories.`,
        );
    if (!ok) return;
    try {
      await deleteShopCategory(shopId, id, hard);
      appToast.success(hard ? "Category permanently deleted." : "Category soft-deleted.");
      await refresh();
    } catch (err) {
      appToast.error(errorMessage(err, "Delete failed"));
    }
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = createName.trim();
    if (!name) return;
    setBusyCreate(true);
    try {
      const created = await createShopCategory(shopId, { category_name: name });
      appToast.success(
        created.restored
          ? `Restored soft-deleted category "${name}".`
          : `Category "${name}" created.`,
      );
      setCreateName("");
      await refresh();
    } catch (err) {
      appToast.error(errorMessage(err, "Could not create category"));
    } finally {
      setBusyCreate(false);
    }
  }

  async function onBulkDelete(hard = false) {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = hard
      ? confirm(
          `HARD delete ${ids.length} selected categor${ids.length === 1 ? "y" : "ies"} permanently?\n\nRows that still have products or sub-categories are skipped. This cannot be undone.`,
        )
      : confirm(
          `Soft-delete ${ids.length} selected categor${ids.length === 1 ? "y" : "ies"}?\n\nRows that still have products or sub-categories are skipped.`,
        );
    if (!ok) return;
    setBusyDelete(true);
    try {
      const result = await bulkDeleteShopCategories(shopId, ids, hard);
      const { succeeded, failed, total } = result.summary;
      const verb = hard ? "Hard-deleted" : "Deleted";
      if (failed === 0) {
        appToast.success(`${verb} ${succeeded}/${total} categories.`);
      } else {
        const sample = result.results
          .filter((row) => !row.ok)
          .slice(0, 3)
          .map((row) => row.message || `${row.category_id}: ${row.error_code}`)
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

  const columns = useMemo<ColumnDef<ShopCategory>[]>(() => {
    return [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <input
            type="checkbox"
            className="size-4 accent-primary"
            aria-label="Select all categories"
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
              aria-label={`Select category ${id}`}
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
        accessorKey: "category_name",
        header: "Category",
        cell: ({ row }) => {
          const name = row.original.category_name ?? "—";
          const alt = row.original.category_name_alt;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              {alt ? (
                <p className="truncate text-xs text-muted-foreground">{alt}</p>
              ) : null}
            </div>
          );
        },
        meta: { label: "Category" },
        size: 240,
      },
      {
        accessorKey: "parent_id",
        header: "Parent",
        cell: ({ row }) => {
          const parentId = Number(row.original.parent_id);
          if (!Number.isFinite(parentId) || parentId <= 0) return "—";
          const parent = items.find((item) => Number(item.id) === parentId);
          return parent?.category_name ?? parentId;
        },
        meta: { label: "Parent" },
        size: 90,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        meta: { label: "Status" },
        size: 110,
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
          const category = row.original;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Soft delete category"
                      onClick={() => void onDeleteOne(category, false)}
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
                      aria-label="Hard delete category"
                      onClick={() => void onDeleteOne(category, true)}
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
        size: 90,
      },
    ];
  }, [allSelected, someSelected, selected, selectableIds, shopId, items]);

  return (
    <section className="max-w-none">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">Categories</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading
              ? "Loading categories…"
              : `${items.length} categor${items.length === 1 ? "y" : "ies"}`}
            {selected.size > 0 ? ` · ${selected.size} selected` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void categoriesQuery.refetch()}
          >
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
          <form className="flex items-center gap-2" onSubmit={(event) => void onCreate(event)}>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="New category name"
              aria-label="New category name"
              className="h-8 w-48 rounded-md border bg-background px-2 text-sm"
              maxLength={255}
            />
            <Button type="submit" size="sm" disabled={busyCreate || createName.trim().length === 0}>
              <PlusIcon className="size-3.5" />
              Add category
            </Button>
          </form>
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
        </div>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No categories"
          description="This shop has no active categories."
        />
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <DataTable
          columns={columns}
          data={items}
          searchPlaceholder="Search categories…"
          emptyMessage="No categories match this search."
          getRowId={(row, index) => String(row.id ?? index)}
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      ) : null}
    </section>
  );
}
