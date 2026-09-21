import { queryOptions } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import {
  getActiveSubscription,
  getDeliverySettings,
  getPromotion,
  getShop,
  listAllShops,
  listShopProducts,
  listShops,
  getShopWhatsApp,
  getShopPageAccess,
} from "@/lib/api/shops";
import { getRider, listRiders } from "@/lib/api/riders";
import {
  getVenuePicker,
  listVenuePickers,
} from "@/lib/api/venue-pickers";
import {
  getShopLink,
  getSyncStatus,
} from "@/lib/api/pos";
import type { ShopStatus, VenuePickerScope } from "@/types/api";

type ShopListParams = {
  page?: number;
  limit?: number;
  q?: string;
  status?: ShopStatus | string;
  /** `true` = only deleted, `false` = only non-deleted, omit = both */
  deleted?: boolean;
};

export const shopKeys = {
  all: ["shops"] as const,
  list: (params: ShopListParams) => [...shopKeys.all, "list", params] as const,
  allShops: () => [...shopKeys.all, "all"] as const,
  detail: (shopId: string) => [...shopKeys.all, "detail", shopId] as const,
  products: (shopId: string, params: Record<string, unknown>) =>
    [...shopKeys.all, "products", shopId, params] as const,
  delivery: (shopId: string) => [...shopKeys.all, "delivery", shopId] as const,
  subscription: (shopId: string) =>
    [...shopKeys.all, "subscription", shopId] as const,
  promotion: (shopId: string) => [...shopKeys.all, "promotion", shopId] as const,
  riders: (shopId: string, params: Record<string, unknown>) =>
    [...shopKeys.all, "riders", shopId, params] as const,
  rider: (shopId: string, dpId: string) =>
    [...shopKeys.all, "rider", shopId, dpId] as const,
  venuePickers: (shopId: string, params: Record<string, unknown>) =>
    [...shopKeys.all, "venue-pickers", shopId, params] as const,
  venuePicker: (shopId: string, pickerId: string) =>
    [...shopKeys.all, "venue-picker", shopId, pickerId] as const,
  posLink: (shopId: string) => [...shopKeys.all, "pos-link", shopId] as const,
  syncStatus: (shopId: string) =>
    [...shopKeys.all, "sync-status", shopId] as const,
  whatsapp: (shopId: string) => [...shopKeys.all, "whatsapp", shopId] as const,
  pageAccess: (shopId: string) =>
    [...shopKeys.all, "page-access", shopId] as const,
};

export function shopsListQuery(params: ShopListParams) {
  return queryOptions({
    queryKey: shopKeys.list(params),
    queryFn: () => listShops(params),
    staleTime: 30_000,
  });
}

export function allShopsQuery() {
  return queryOptions({
    queryKey: shopKeys.allShops(),
    queryFn: () => listAllShops({ pageSize: 100 }),
    staleTime: 60_000,
  });
}

export function shopDetailQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.detail(shopId),
    queryFn: () => getShop(shopId),
    enabled: Boolean(shopId),
  });
}

export function shopProductsQuery(
  shopId: string,
  params: { page?: number; limit?: number; q?: string },
) {
  return queryOptions({
    queryKey: shopKeys.products(shopId, params),
    queryFn: () => listShopProducts(shopId, params),
    enabled: Boolean(shopId),
  });
}

export function shopDeliveryQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.delivery(shopId),
    queryFn: () => getDeliverySettings(shopId),
    enabled: Boolean(shopId),
  });
}

export function shopSubscriptionQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.subscription(shopId),
    queryFn: () => getActiveSubscription(shopId),
    enabled: Boolean(shopId),
    retry: false,
  });
}

export function shopPromotionQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.promotion(shopId),
    queryFn: () => getPromotion(shopId),
    enabled: Boolean(shopId),
  });
}

export function shopRidersQuery(
  shopId: string,
  params: {
    page?: number;
    limit?: number;
    q?: string;
    is_blocked?: boolean;
    include_deleted?: boolean;
    deleted_only?: boolean;
  },
) {
  return queryOptions({
    queryKey: shopKeys.riders(shopId, params),
    queryFn: () => listRiders(shopId, params),
    enabled: Boolean(shopId),
  });
}

export function shopRiderQuery(shopId: string, dpId: string) {
  return queryOptions({
    queryKey: shopKeys.rider(shopId, dpId),
    queryFn: () => getRider(shopId, dpId),
    enabled: Boolean(shopId && dpId),
  });
}

export function shopVenuePickersQuery(
  shopId: string,
  params: {
    page?: number;
    limit?: number;
    q?: string;
    is_blocked?: boolean;
    scope?: VenuePickerScope;
    dining_area_id?: number;
  },
) {
  return queryOptions({
    queryKey: shopKeys.venuePickers(shopId, params),
    queryFn: () => listVenuePickers(shopId, params),
    enabled: Boolean(shopId),
  });
}

export function shopVenuePickerQuery(shopId: string, pickerId: string) {
  return queryOptions({
    queryKey: shopKeys.venuePicker(shopId, pickerId),
    queryFn: () => getVenuePicker(shopId, pickerId),
    enabled: Boolean(shopId && pickerId),
  });
}

export function shopPosLinkQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.posLink(shopId),
    queryFn: async () => {
      try {
        return await getShopLink(shopId);
      } catch (err) {
        const status =
          err instanceof ApiError
            ? err.status
            : err && typeof err === "object" && "status" in err
              ? Number((err as { status: unknown }).status)
              : null;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(shopId),
    retry: false,
  });
}

export function shopSyncStatusQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.syncStatus(shopId),
    queryFn: () => getSyncStatus(shopId),
    enabled: Boolean(shopId),
    retry: false,
  });
}

export function shopWhatsAppQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.whatsapp(shopId),
    queryFn: () => getShopWhatsApp(shopId),
    enabled: Boolean(shopId),
    staleTime: 15_000,
  });
}

export function shopPageAccessQuery(shopId: string) {
  return queryOptions({
    queryKey: shopKeys.pageAccess(shopId),
    queryFn: () => getShopPageAccess(shopId),
    enabled: Boolean(shopId),
    staleTime: 15_000,
  });
}
