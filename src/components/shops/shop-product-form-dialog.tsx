"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ShopPhotoDropzone } from "@/components/shops/shop-photo-dropzone";
import {
  ErrorState,
  LoadingState,
} from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  createShopProduct,
  getShopProduct,
  updateShopProduct,
} from "@/lib/api/shops";
import {
  revokeShopPhotoPreview,
  type ShopPhotoSelection,
} from "@/lib/shop-photo";
import type {
  ShopProduct,
  ShopProductCreateInput,
  ShopProductUpdateInput,
} from "@/types/api";

type Mode = "create" | "edit";

type ShopProductFormDialogProps = {
  shopId: string;
  mode: Mode;
  productId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

type FormState = {
  product_name: string;
  product_name_alt: string;
  description: string;
  price: string;
  category_id: string;
  category_name: string;
  availability: "in_stock" | "out_of_stock";
  diet_type: "" | "veg" | "non_veg" | "egg";
  status: "active" | "blocked";
  sort_order: string;
  catalog_role: "main" | "modifier" | "both";
  show_on_menu: boolean;
};

const EMPTY_FORM: FormState = {
  product_name: "",
  product_name_alt: "",
  description: "",
  price: "",
  category_id: "",
  category_name: "",
  availability: "in_stock",
  diet_type: "",
  status: "active",
  sort_order: "0",
  catalog_role: "main",
  show_on_menu: true,
};

function productToForm(product: ShopProduct): FormState {
  const availabilityRaw = String(product.availability ?? "").toLowerCase();
  const availability: FormState["availability"] =
    availabilityRaw === "out_of_stock" || product.is_available === false
      ? "out_of_stock"
      : "in_stock";
  const diet = String(product.diet_type ?? "");
  return {
    product_name: String(product.product_name ?? product.name ?? ""),
    product_name_alt: String(product.product_name_alt ?? ""),
    description: String(product.description ?? ""),
    price: String(product.price ?? ""),
    category_id:
      product.category_id != null && product.category_id !== ""
        ? String(product.category_id)
        : "",
    category_name: "",
    availability,
    diet_type:
      diet === "veg" || diet === "non_veg" || diet === "egg" ? diet : "",
    status: product.status === "blocked" ? "blocked" : "active",
    sort_order:
      product.sort_order != null ? String(product.sort_order) : "0",
    catalog_role:
      product.catalog_role === "modifier" || product.catalog_role === "both"
        ? product.catalog_role
        : "main",
    show_on_menu: product.show_on_menu !== false,
  };
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    return parseApiFormError(err, err.message).message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ShopProductFormDialog({
  shopId,
  mode,
  productId,
  open,
  onOpenChange,
  onChanged,
}: ShopProductFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<ShopPhotoSelection | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const productQuery = useQuery({
    queryKey: ["shops", "product", shopId, productId],
    queryFn: () => getShopProduct(shopId, productId!),
    enabled: open && mode === "edit" && productId != null,
  });

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setClearImage(false);
    revokeShopPhotoPreview(photo);
    setPhoto(null);
    if (mode === "create") {
      setForm(EMPTY_FORM);
      return;
    }
    if (productQuery.data) {
      setForm(productToForm(productQuery.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset photo only on open/mode change
  }, [open, mode, productQuery.data]);

  function patchForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const name = form.product_name.trim();
      const price = form.price.trim();
      if (!name || !price) {
        throw new Error("Product name and price are required.");
      }
      if (!/^\d+(\.\d{1,2})?$/.test(price)) {
        throw new Error("Price must be like 12 or 12.50.");
      }
      if (form.category_id && form.category_name.trim()) {
        throw new Error("Use category id or category name, not both.");
      }

      const imageFields =
        photo && !clearImage
          ? {
              image_base64: photo.base64,
              image_content_type: photo.contentType,
            }
          : {};

      if (mode === "create") {
        const payload: ShopProductCreateInput = {
          product_name: name,
          price,
          product_name_alt: form.product_name_alt.trim() || null,
          description: form.description.trim() || null,
          availability: form.availability,
          status: form.status,
          catalog_role: form.catalog_role,
          show_on_menu: form.show_on_menu,
          sort_order: Number(form.sort_order || 0),
          ...(form.diet_type ? { diet_type: form.diet_type } : { diet_type: null }),
          ...(form.category_id
            ? { category_id: Number(form.category_id) }
            : {}),
          ...(form.category_name.trim()
            ? { category_name: form.category_name.trim() }
            : {}),
          ...imageFields,
        };
        const created = await createShopProduct(shopId, payload);
        if (created.restored || created.warning_code === "product_restored") {
          appToast.success(created.warning || "Soft-deleted product restored.");
        } else {
          appToast.success("Product created.");
        }
      } else {
        if (productId == null) return;
        const payload: ShopProductUpdateInput = {
          product_name: name,
          price,
          product_name_alt: form.product_name_alt.trim() || null,
          description: form.description.trim() || null,
          availability: form.availability,
          status: form.status,
          catalog_role: form.catalog_role,
          show_on_menu: form.show_on_menu,
          sort_order: Number(form.sort_order || 0),
          diet_type: form.diet_type || null,
          // Omit category when blank so we do not wipe an existing category.
          ...(form.category_id
            ? { category_id: Number(form.category_id) }
            : {}),
          ...(form.category_name.trim()
            ? { category_name: form.category_name.trim() }
            : {}),
          ...(clearImage ? { clear_image: true } : imageFields),
        };
        await updateShopProduct(shopId, productId, payload);
        appToast.success("Product updated.");
      }

      revokeShopPhotoPreview(photo);
      setPhoto(null);
      onOpenChange(false);
      await onChanged();
    } catch (err) {
      const msg = errorMessage(err, "Save failed");
      setMessage(msg);
      appToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const loadError =
    mode === "edit" && productQuery.error
      ? productQuery.error instanceof Error
        ? productQuery.error.message
        : "Failed to load product"
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add product" : `Edit product #${productId}`}
          </DialogTitle>
        </DialogHeader>

        {mode === "edit" && productQuery.isPending ? (
          <LoadingState label="Loading product…" />
        ) : null}
        {loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => void productQuery.refetch()}
          />
        ) : null}

        {(mode === "create" || productQuery.data) && !loadError ? (
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product_name">Name</Label>
                <Input
                  id="product_name"
                  value={form.product_name}
                  onChange={(e) => patchForm("product_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product_name_alt">Alt name</Label>
                <Input
                  id="product_name_alt"
                  value={form.product_name_alt}
                  onChange={(e) =>
                    patchForm("product_name_alt", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (AED)</Label>
                <Input
                  id="price"
                  value={form.price}
                  onChange={(e) => patchForm("price", e.target.value)}
                  placeholder="12.50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category_id">Category ID</Label>
                <Input
                  id="category_id"
                  value={form.category_id}
                  onChange={(e) => patchForm("category_id", e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category_name">Category name</Label>
                <Input
                  id="category_name"
                  value={form.category_name}
                  onChange={(e) => patchForm("category_name", e.target.value)}
                  placeholder="Optional if ID set"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Availability</Label>
                <Select
                  value={form.availability}
                  onValueChange={(value) =>
                    patchForm(
                      "availability",
                      value as FormState["availability"],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    patchForm("status", value as FormState["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Diet</Label>
                <Select
                  value={form.diet_type || "__none__"}
                  onValueChange={(value) =>
                    patchForm(
                      "diet_type",
                      !value || value === "__none__"
                        ? ""
                        : (value as FormState["diet_type"]),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non_veg">Non-veg</SelectItem>
                    <SelectItem value="egg">Egg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catalog role</Label>
                <Select
                  value={form.catalog_role}
                  onValueChange={(value) =>
                    patchForm(
                      "catalog_role",
                      value as FormState["catalog_role"],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="modifier">Modifier</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input
                  id="sort_order"
                  value={form.sort_order}
                  onChange={(e) => patchForm("sort_order", e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Show on menu</p>
                  <p className="text-xs text-muted-foreground">
                    Hide modifiers that should not appear as standalone items.
                  </p>
                </div>
                <Switch
                  checked={form.show_on_menu}
                  onCheckedChange={(checked) =>
                    patchForm("show_on_menu", Boolean(checked))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => patchForm("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <ShopPhotoDropzone
              label="Product image"
              hint="Optional. JPEG, PNG, or WebP up to 5 MB."
              value={photo}
              onChange={(next) => {
                setClearImage(false);
                setPhoto(next);
              }}
              disabled={saving}
            />
            {mode === "edit" && productQuery.data?.img_url && !photo ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={clearImage}
                  onChange={(e) => setClearImage(e.target.checked)}
                />
                Clear existing image
              </label>
            ) : null}

            {message ? (
              <p className="text-sm text-destructive">{message}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : mode === "create"
                    ? "Create product"
                    : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
