import { ApiError, apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockCreateShop,
  mockCreateSubscription,
  mockDeleteShop,
  mockGetActiveSubscription,
  mockGetDeliverySettings,
  mockGetPromotion,
  mockGetShop,
  mockGetNextShopUserId,
  mockGetShopActivity,
  mockListShopProducts,
  mockListShops,
  mockPatchShop,
  mockPutPromotion,
  mockRestoreShop,
  mockRotateShopIntegrationToken,
  mockTriggerShopLogout,
} from "@/lib/mock-data";
import {
  SHOP_USER_ID_MAX,
  SHOP_USER_ID_MIN,
} from "@/lib/shop-create-validation";
import type {
  CreateShopInput,
  Paginated,
  PatchShopInput,
  PatchShopResponse,
  RotateIntegrationTokenResponse,
  ShopActivityResponse,
  ShopDeliverySettings,
  ShopDetail,
  ShopEcomSettings,
  ShopListItem,
  ShopProduct,
  ShopStatus,
  TriggerShopLogoutResponse,
} from "@/types/api";
import type {
  ConnectShopWhatsAppInput,
  SetShopWhatsAppSenderInput,
  ShopPageAccessStatus,
  ShopWhatsAppStatus,
} from "@/types/shop-whatsapp";

export function listShops(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: ShopStatus | string;
  /** `true` = only deleted, `false` = only non-deleted, omit = both */
  deleted?: boolean;
}) {
  if (isDevelopmentMode()) return mockListShops(params);
  return apiFetch<Paginated<ShopListItem>>("/v2/shops", {
    params: {
      page: params?.page,
      limit: params?.limit,
      q: params?.q,
      status: params?.status,
      deleted:
        params?.deleted === undefined
          ? undefined
          : params.deleted
            ? "true"
            : "false",
    },
  });
}

/** Fetch every shop page until the full catalog is loaded. */
export async function listAllShops(params?: {
  q?: string;
  status?: ShopStatus | string;
  pageSize?: number;
  deleted?: boolean;
}) {
  const pageSize = params?.pageSize ?? 100;
  const all: ShopListItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await listShops({
      page,
      limit: pageSize,
      q: params?.q,
      status: params?.status,
      deleted: params?.deleted,
    });
    const items = data.items ?? [];
    all.push(...items);
    totalPages =
      data.total_pages ??
      (data.total != null ? Math.ceil(data.total / pageSize) : 1);
    if (items.length < pageSize) break;
    page += 1;
  } while (page <= totalPages && page <= 50);

  return {
    items: all,
    total: all.length,
    page: 1,
    limit: all.length,
  } satisfies Paginated<ShopListItem>;
}

export function createShop(input: CreateShopInput) {
  if (isDevelopmentMode()) return mockCreateShop(input);

  // Only send defined values — empty strings / undefined often fail Zod.
  const body: Record<string, unknown> = {
    shop_name: input.shop_name,
    shop_id: input.shop_id,
    password: input.password,
  };

  if (input.user_id != null) {
    body.user_id = input.user_id;
  }

  const optionalKeys: Array<keyof CreateShopInput> = [
    "ecom_enabled",
    "ecom_order_confirmation_enabled",
    "scheduled_order",
    "pre_booking_enabled",
    "nightly_stock_reset_enabled",
    "merge_order",
    "return_option",
    "customer_ticket",
    "venue_management_enabled",
    "qr_ordering_enabled",
    "table_ordering_enabled",
    "room_service_enabled",
    "pickup_ordering_enabled",
    "drive_thru_enabled",
    "ecom_slug",
    "second_name",
    "status",
    "status_reason",
    "vat_enabled",
    "vat",
    "enable_promotion",
    "upi_id",
    "integration_enabled",
    "integration_rate_limit",
    "is_msg_activated",
    "single_msg",
    "phone",
    "email",
    "contact_person_number",
    "contact_person_email",
    "group_id",
    "shop_license_no",
    "address",
    "delivery",
    "ecom",
  ];
  for (const key of optionalKeys) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== "") {
      body[key] = value;
    }
  }

  return apiFetch<ShopDetail>("/v2/shops", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type NextShopUserIdResponse = {
  user_id: number;
};

/** GET /v2/shops/next-user-id — preview next login id (does not reserve it). */
export function getNextShopUserId() {
  if (isDevelopmentMode()) return mockGetNextShopUserId();
  return apiFetch<NextShopUserIdResponse>("/v2/shops/next-user-id");
}

/**
 * Next free shop login `user_id` (100000–999999).
 * Uses admin-api allocator when available; falls back to list scan on older backends.
 */
export async function suggestNextShopUserId(): Promise<number> {
  if (!isDevelopmentMode()) {
    try {
      const { user_id } = await getNextShopUserId();
      if (
        Number.isInteger(user_id) &&
        user_id >= SHOP_USER_ID_MIN &&
        user_id <= SHOP_USER_ID_MAX
      ) {
        return user_id;
      }
    } catch {
      // Fall back to client-side scan below.
    }
  } else {
    const { user_id } = await mockGetNextShopUserId();
    return user_id;
  }

  const { items } = await listAllShops({ pageSize: 100 });
  const used = new Set<number>();
  for (const shop of items) {
    const id = Number(shop.user_id);
    if (
      Number.isInteger(id) &&
      id >= SHOP_USER_ID_MIN &&
      id <= SHOP_USER_ID_MAX
    ) {
      used.add(id);
    }
  }

  let candidate = SHOP_USER_ID_MIN;
  if (used.size > 0) {
    const maxUsed = Math.max(...used);
    candidate = Math.min(maxUsed + 1, SHOP_USER_ID_MAX);
  }

  while (candidate <= SHOP_USER_ID_MAX) {
    if (!used.has(candidate)) return candidate;
    candidate += 1;
  }

  for (let id = SHOP_USER_ID_MIN; id <= SHOP_USER_ID_MAX; id += 1) {
    if (!used.has(id)) return id;
  }

  throw new Error(
    `No free shop user_id left in range ${SHOP_USER_ID_MIN}–${SHOP_USER_ID_MAX}`,
  );
}

/** True when shop_id is free (GET detail returns 404). */
export async function isShopIdAvailable(shopId: string): Promise<boolean> {
  const id = shopId.trim();
  if (!id) return false;
  try {
    await getShop(id);
    return false;
  } catch (err) {
    const status =
      err instanceof ApiError
        ? err.status
        : err && typeof err === "object" && "status" in err
          ? Number((err as { status: unknown }).status)
          : null;
    if (status === 404) return true;
    // Don't block create on transient server errors
    if (status != null && status >= 500) return true;
    throw err;
  }
}

export function getShop(
  shopId: string,
  params?: {
    products_page?: number;
    products_limit?: number;
    include?: string;
  },
) {
  if (isDevelopmentMode()) return mockGetShop(shopId);
  return apiFetch<ShopDetail>(`/v2/shops/${shopId}`, { params });
}

export function patchShop(shopId: string, input: PatchShopInput) {
  if (isDevelopmentMode()) return mockPatchShop(shopId, input);
  return apiFetch<PatchShopResponse>(`/v2/shops/${shopId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Re-issue integration token. Requires integration_enabled === true. */
export function rotateShopIntegrationToken(shopId: string) {
  if (isDevelopmentMode()) return mockRotateShopIntegrationToken(shopId);
  return apiFetch<RotateIntegrationTokenResponse>(
    `/v2/shops/${shopId}/rotate-integration-token`,
    { method: "POST" },
  );
}

/** Feature flags to keep intact across soft-delete (backend may clear them). */
export function shopFeatureFlagsFromDetail(
  shop: Pick<
    ShopDetail,
    | "ecom_enabled"
    | "ecom_slug"
    | "ecom_order_confirmation_enabled"
    | "scheduled_order"
    | "pre_booking_enabled"
    | "nightly_stock_reset_enabled"
    | "merge_order"
    | "venue_management_enabled"
    | "qr_ordering_enabled"
    | "table_ordering_enabled"
    | "room_service_enabled"
    | "pickup_ordering_enabled"
    | "drive_thru_enabled"
    | "features"
  >,
): PatchShopInput {
  const f = shop.features ?? {};
  return {
    ecom_enabled: Boolean(f.ecom_enabled ?? shop.ecom_enabled),
    ecom_order_confirmation_enabled: Boolean(
      f.ecom_order_confirmation_enabled ?? shop.ecom_order_confirmation_enabled,
    ),
    scheduled_order: Boolean(f.scheduled_order ?? shop.scheduled_order),
    pre_booking_enabled: Boolean(f.pre_booking_enabled ?? shop.pre_booking_enabled),
    nightly_stock_reset_enabled: Boolean(f.nightly_stock_reset_enabled ?? shop.nightly_stock_reset_enabled),
    merge_order: Boolean(f.merge_order ?? shop.merge_order),
    return_option: Boolean(f.return_option),
    customer_ticket: Boolean(f.customer_ticket),
    venue_management_enabled: Boolean(
      f.venue_management_enabled ?? shop.venue_management_enabled,
    ),
    qr_ordering_enabled: Boolean(
      f.qr_ordering_enabled ?? shop.qr_ordering_enabled,
    ),
    table_ordering_enabled: Boolean(
      f.table_ordering_enabled ?? shop.table_ordering_enabled,
    ),
    room_service_enabled: Boolean(
      f.room_service_enabled ?? shop.room_service_enabled,
    ),
    pickup_ordering_enabled: Boolean(
      f.pickup_ordering_enabled ?? shop.pickup_ordering_enabled,
    ),
    drive_thru_enabled: Boolean(
      f.drive_thru_enabled ?? shop.drive_thru_enabled,
    ),
    ecom_slug: f.ecom_slug ?? shop.ecom_slug ?? undefined,
    integration_enabled: Boolean(f.integration_enabled),
    integration_rate_limit:
      typeof f.integration_rate_limit === "number"
        ? f.integration_rate_limit
        : 100,
    is_msg_activated: Boolean(f.is_msg_activated),
    single_msg: Boolean(f.single_msg),
  };
}

/**
 * Soft-delete a shop without wiping feature flags (especially ecom_enabled).
 * Some backends clear ecom on DELETE soft — we re-apply the previous flags.
 */
export async function softDeleteShop(
  shopId: string,
  shop?: Parameters<typeof shopFeatureFlagsFromDetail>[0] | null,
) {
  const features = shop ? shopFeatureFlagsFromDetail(shop) : null;
  await deleteShop(shopId, false);
  if (!features) return;
  try {
    await patchShop(shopId, features);
  } catch {
    // Shop may still be soft-deleted even if feature restore fails.
  }
}

/** Upload shop logo/photo (R2 CDN). Accepts jpeg/png/webp. */
export function patchShopPhoto(
  shopId: string,
  input: { photo_base64: string; photo_content_type: string },
) {
  return patchShop(shopId, input);
}

/** Remove shop logo/photo. */
export function clearShopPhoto(shopId: string) {
  return patchShop(shopId, { clear_photo: true });
}

export function deleteShop(shopId: string, hard = false) {
  if (isDevelopmentMode()) return mockDeleteShop(shopId, hard);
  return apiFetch<unknown>(`/v2/shops/${shopId}`, {
    method: "DELETE",
    params: { mode: hard ? "hard" : "soft" },
  });
}

export function restoreShop(shopId: string) {
  if (isDevelopmentMode()) return mockRestoreShop(shopId);
  return apiFetch<ShopDetail>(`/v2/shops/${shopId}/restore`, {
    method: "POST",
  });
}

export function resetShopPassword(shopId: string, password: string) {
  if (isDevelopmentMode()) {
    return Promise.resolve({
      password_reset: true,
      shop_id: shopId,
      updated_at: new Date().toISOString(),
    });
  }
  return apiFetch<{
    password_reset?: boolean;
    shop_id?: string;
    user_id?: number;
    updated_at?: string;
  }>(`/v2/shops/${shopId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/** Fire-and-forget shop-scoped logout alert (202 Accepted). */
export function triggerShopLogoutEvent(shopId: string) {
  if (isDevelopmentMode()) return mockTriggerShopLogout(shopId);
  return apiFetch<TriggerShopLogoutResponse>(
    `/v2/shops/${encodeURIComponent(shopId)}/trigger-logout-event`,
    { method: "POST" },
  );
}

export function getShopActivity(params?: {
  page?: number;
  limit?: number;
  backlog_page?: number;
  backlog_limit?: number;
  date?: string;
  active?: boolean;
  q?: string;
  min_backlog?: number;
}) {
  if (isDevelopmentMode()) return mockGetShopActivity();
  return apiFetch<ShopActivityResponse>("/v2/shops/activity", { params });
}

export function listShopProducts(
  shopId: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    availability?: string;
  },
) {
  if (isDevelopmentMode()) return mockListShopProducts(shopId, params);
  return apiFetch<Paginated<ShopProduct> | ShopProduct[]>(
    `/v2/shops/${shopId}/products`,
    { params },
  ).then((data) => {
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? data.length,
      } satisfies Paginated<ShopProduct>;
    }
    return {
      items: data.items ?? [],
      total: data.total ?? data.items?.length ?? 0,
      page: data.page ?? params?.page ?? 1,
      limit: data.limit ?? params?.limit,
      total_pages: data.total_pages,
    } satisfies Paginated<ShopProduct>;
  });
}

export function getDeliverySettings(shopId: string) {
  if (isDevelopmentMode()) return mockGetDeliverySettings();
  // Prefer nested delivery from GET shop; keep endpoint for older backends.
  return apiFetch<ShopDeliverySettings>(
    `/v2/shops/${shopId}/delivery-settings`,
  );
}

/** Upsert delivery via PATCH /shops/:id { delivery }. */
export function patchShopDelivery(
  shopId: string,
  delivery: ShopDeliverySettings,
) {
  return patchShop(shopId, { delivery });
}

/** Upsert ecom storefront via PATCH /shops/:id { ecom }. */
export function patchShopEcom(shopId: string, ecom: ShopEcomSettings) {
  return patchShop(shopId, { ecom });
}

export function putDeliverySettings(
  shopId: string,
  input: ShopDeliverySettings,
) {
  // New contract: nested delivery on shop PATCH (dev + prod).
  return patchShopDelivery(shopId, input);
}

export function createSubscription(
  shopId: string,
  input: Record<string, unknown>,
) {
  if (isDevelopmentMode()) return mockCreateSubscription(input);
  return apiFetch<Record<string, unknown>>(
    `/v2/shops/${shopId}/subscriptions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function getActiveSubscription(shopId: string) {
  if (isDevelopmentMode()) return mockGetActiveSubscription();
  return apiFetch<Record<string, unknown>>(
    `/v2/shops/${shopId}/subscriptions/active`,
  );
}

export function getPromotion(shopId: string) {
  if (isDevelopmentMode()) return mockGetPromotion();
  return apiFetch<Record<string, unknown>>(`/v2/shops/${shopId}/promotion`);
}

export function putPromotion(shopId: string, input: Record<string, unknown>) {
  if (isDevelopmentMode()) return mockPutPromotion(input);
  return apiFetch<Record<string, unknown>>(`/v2/shops/${shopId}/promotion`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getShopWhatsApp(shopId: string) {
  return apiFetch<ShopWhatsAppStatus>(`/v2/shops/${shopId}/whatsapp`);
}

export function connectShopWhatsApp(
  shopId: string,
  input: ConnectShopWhatsAppInput,
) {
  return apiFetch<ShopWhatsAppStatus>(`/v2/shops/${shopId}/whatsapp/connect`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function disconnectShopWhatsApp(shopId: string) {
  return apiFetch<ShopWhatsAppStatus>(
    `/v2/shops/${shopId}/whatsapp/disconnect`,
    { method: "PUT" },
  );
}

export function setShopWhatsAppEnabled(shopId: string, enabled: boolean) {
  return apiFetch<ShopWhatsAppStatus>(`/v2/shops/${shopId}/whatsapp/enabled`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function setShopWhatsAppTransactional(
  shopId: string,
  transactionalEnabled: boolean,
) {
  return apiFetch<ShopWhatsAppStatus>(
    `/v2/shops/${shopId}/whatsapp/transactional`,
    {
      method: "PATCH",
      body: JSON.stringify({ transactional_enabled: transactionalEnabled }),
    },
  );
}

export function setShopWhatsAppSender(
  shopId: string,
  input: SetShopWhatsAppSenderInput,
) {
  return apiFetch<ShopWhatsAppStatus>(`/v2/shops/${shopId}/whatsapp/sender`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getShopPageAccess(shopId: string) {
  return apiFetch<ShopPageAccessStatus>(`/v2/shops/${shopId}/page-access`);
}

export function setShopPageAccessPassword(
  shopId: string,
  input: { password?: string; clear?: boolean },
) {
  return apiFetch<ShopPageAccessStatus>(
    `/v2/shops/${shopId}/page-access/password`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

