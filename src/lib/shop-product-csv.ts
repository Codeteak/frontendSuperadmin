import type {
  ShopProductCreateInput,
  ShopProductUpdateInput,
} from "@/types/api";

const CREATE_HEADERS = [
  "product_name",
  "price",
  "product_name_alt",
  "description",
  "category_id",
  "category_name",
  "availability",
  "diet_type",
  "status",
  "sort_order",
  "catalog_role",
  "show_on_menu",
] as const;

const UPDATE_HEADERS = ["product_id", ...CREATE_HEADERS] as const;

export const SHOP_PRODUCT_BULK_CREATE_TEMPLATE = `${CREATE_HEADERS.join(",")}\nChicken Biryani,35.00,,Classic biryani,12,,in_stock,non_veg,active,1,main,true\n`;

export const SHOP_PRODUCT_BULK_UPDATE_TEMPLATE = `${UPDATE_HEADERS.join(",")}\n1,Chicken Biryani,36.00,,Updated biryani,12,,in_stock,non_veg,active,1,main,true\n`;

const UPSERT_HEADERS = [
  "product_id",
  "product_name",
  "price",
  "pos_product_id",
  "pos_category_id",
  "category_name",
  "product_name_alt",
  "description",
  "availability",
  "diet_type",
  "status",
  "sort_order",
  "catalog_role",
  "show_on_menu",
] as const;

export const SHOP_PRODUCT_BULK_UPSERT_TEMPLATE = `${UPSERT_HEADERS.join(",")}\n,Chicken Biryani,35.00,POS-CHKN-BIR,POS-MAINS,Mains,,Classic biryani,in_stock,non_veg,active,1,main,true\n`;

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export function parseCsvObjects(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      row[header] = cells[i] ?? "";
    });
    if (!Object.values(row).some((v) => v.trim())) {
      throw new Error(`Row ${index + 2} is empty.`);
    }
    return row;
  });
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function optionalBool(value: string | undefined): boolean | undefined {
  const raw = value?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  throw new Error(`Invalid boolean "${value}"`);
}

function optionalInt(value: string | undefined): number | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Invalid integer "${value}"`);
  return n;
}

function mapAvailability(
  value: string | undefined,
): "in_stock" | "out_of_stock" | undefined {
  const raw = value?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "in_stock" || raw === "available") return "in_stock";
  if (raw === "out_of_stock" || raw === "unavailable") return "out_of_stock";
  throw new Error(`Invalid availability "${value}"`);
}

function mapDiet(
  value: string | undefined,
): "veg" | "non_veg" | "egg" | null | undefined {
  if (value === undefined) return undefined;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "veg" || raw === "non_veg" || raw === "egg") return raw;
  throw new Error(`Invalid diet_type "${value}"`);
}

function mapStatus(value: string | undefined): "active" | "blocked" | undefined {
  const raw = value?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "active" || raw === "blocked") return raw;
  throw new Error(`Invalid status "${value}"`);
}

function mapRole(
  value: string | undefined,
): "main" | "modifier" | "both" | undefined {
  const raw = value?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "main" || raw === "modifier" || raw === "both") return raw;
  throw new Error(`Invalid catalog_role "${value}"`);
}

function mapCreateRow(row: Record<string, string>, index: number): ShopProductCreateInput {
  const productName = optionalString(row.product_name ?? row.name);
  const price = optionalString(row.price);
  if (!productName || !price) {
    throw new Error(`Row ${index + 1}: product_name and price are required.`);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(price)) {
    throw new Error(`Row ${index + 1}: invalid price "${price}".`);
  }
  const categoryId = optionalInt(row.category_id);
  return {
    product_name: productName,
    price,
    product_name_alt: optionalNullableString(row.product_name_alt),
    description: optionalNullableString(row.description),
    ...(categoryId !== undefined ? { category_id: categoryId } : {}),
    ...(optionalString(row.category_name)
      ? { category_name: optionalString(row.category_name)! }
      : {}),
    ...(mapAvailability(row.availability)
      ? { availability: mapAvailability(row.availability)! }
      : {}),
    ...(mapDiet(row.diet_type) !== undefined
      ? { diet_type: mapDiet(row.diet_type)! }
      : {}),
    ...(mapStatus(row.status) ? { status: mapStatus(row.status)! } : {}),
    ...(optionalInt(row.sort_order) !== undefined
      ? { sort_order: optionalInt(row.sort_order)! }
      : {}),
    ...(mapRole(row.catalog_role) ? { catalog_role: mapRole(row.catalog_role)! } : {}),
    ...(optionalBool(row.show_on_menu) !== undefined
      ? { show_on_menu: optionalBool(row.show_on_menu)! }
      : {}),
  };
}

export function mapBulkCreateCsv(text: string): ShopProductCreateInput[] {
  return parseCsvObjects(text).map((row, index) => mapCreateRow(row, index));
}

export function mapBulkUpdateCsv(
  text: string,
): Array<ShopProductUpdateInput & { product_id: number }> {
  return parseCsvObjects(text).map((row, index) => {
    const productId = optionalInt(row.product_id);
    if (productId == null || productId <= 0) {
      throw new Error(`Row ${index + 1}: product_id is required.`);
    }
    const patch: ShopProductUpdateInput & { product_id: number } = {
      product_id: productId,
    };
    const name = optionalString(row.product_name ?? row.name);
    if (name) patch.product_name = name;
    const price = optionalString(row.price);
    if (price) {
      if (!/^\d+(\.\d{1,2})?$/.test(price)) {
        throw new Error(`Row ${index + 1}: invalid price "${price}".`);
      }
      patch.price = price;
    }
    if ("product_name_alt" in row) {
      patch.product_name_alt = optionalNullableString(row.product_name_alt) ?? null;
    }
    if ("description" in row) {
      patch.description = optionalNullableString(row.description) ?? null;
    }
    if ("category_id" in row && row.category_id.trim()) {
      patch.category_id = optionalInt(row.category_id)!;
    }
    if ("category_name" in row && row.category_name.trim()) {
      patch.category_name = row.category_name.trim();
    }
    if ("availability" in row && row.availability.trim()) {
      patch.availability = mapAvailability(row.availability)!;
    }
    if ("diet_type" in row) {
      patch.diet_type = mapDiet(row.diet_type)!;
    }
    if ("status" in row && row.status.trim()) {
      patch.status = mapStatus(row.status)!;
    }
    if ("sort_order" in row && row.sort_order.trim()) {
      patch.sort_order = optionalInt(row.sort_order)!;
    }
    if ("catalog_role" in row && row.catalog_role.trim()) {
      patch.catalog_role = mapRole(row.catalog_role)!;
    }
    if ("show_on_menu" in row && row.show_on_menu.trim()) {
      patch.show_on_menu = optionalBool(row.show_on_menu)!;
    }

    const keys = Object.keys(patch).filter((k) => k !== "product_id");
    if (keys.length === 0) {
      throw new Error(`Row ${index + 1}: at least one field to update is required.`);
    }
    return patch;
  });
}

export function mapBulkUpsertCsv(text: string): Record<string, unknown>[] {
  return parseCsvObjects(text).map((row, index) => {
    const productName = optionalString(row.product_name ?? row.name);
    if (!productName) {
      throw new Error(`Row ${index + 1}: product_name is required.`);
    }
    const out: Record<string, unknown> = { product_name: productName };
    const productId = optionalString(row.product_id);
    if (productId) {
      const n = Number(productId);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`Row ${index + 1}: product_id must be a positive integer.`);
      }
      out.product_id = n;
    }
    const price = optionalString(row.price);
    if (price) {
      if (!/^\d+(\.\d{1,2})?$/.test(price)) {
        throw new Error(`Row ${index + 1}: invalid price "${price}".`);
      }
      out.price = price;
    }
    const copy = (key: string) => {
      const value = optionalString(row[key]);
      if (value) out[key] = value;
    };
    copy("pos_product_id");
    copy("pos_category_id");
    copy("category_name");
    if (optionalString(row.category_id)) {
      out.category_id =
        row.category_id.trim().toUpperCase() === "CLEAR" ? null : optionalInt(row.category_id);
    }
    copy("product_name_alt");
    copy("description");
    const availability = mapAvailability(row.availability);
    if (availability) out.availability = availability;
    if (optionalString(row.diet_type)) out.diet_type = mapDiet(row.diet_type);
    const status = mapStatus(row.status);
    if (status) out.status = status;
    if (optionalString(row.sort_order)) out.sort_order = optionalInt(row.sort_order);
    const role = mapRole(row.catalog_role);
    if (role) out.catalog_role = role;
    if (optionalString(row.show_on_menu)) out.show_on_menu = optionalBool(row.show_on_menu);
    return out;
  });
}
