import { apiFetch } from "@/lib/api";
import {
  isDevelopmentMode,
  mockAttachShopLink,
  mockClonePosTemplate,
  mockCreatePosTemplate,
  mockDeletePosTemplate,
  mockGetPosTemplate,
  mockGetShopLink,
  mockGetSyncStatus,
  mockListPosTemplates,
  mockListShopLinks,
  mockPatchLinkFeatures,
  mockPatchPosTemplate,
  mockTestConnectionPosTemplate,
  mockTestMapPosTemplate,
} from "@/lib/mock-data";
import {
  type PosConnectorType,
  type PosEndpointKey,
  type PosProvider,
} from "@/lib/pos/contract";
import type {
  AttachPosShopLinkInput,
  CreatePosTemplateInput,
  Paginated,
  PatchPosLinkFeaturesInput,
  PosShopLink,
  PosSyncStatus,
  PosTemplate,
  PosTemplateSummary,
  PosTestConnectionInput,
  PosTestConnectionResponse,
  PosTestMapInput,
  PosTestMapResponse,
  UpdatePosTemplateInput,
} from "@/types/api";

export type { PosProvider, PosConnectorType, PosEndpointKey };
export type {
  CreatePosTemplateInput,
  UpdatePosTemplateInput,
  AttachPosShopLinkInput,
  PatchPosLinkFeaturesInput,
};
export {
  POS_PROVIDERS,
  POS_CONNECTOR_TYPES,
  POS_PROVIDER_CONNECTOR_PAIRS,
  POS_PROVIDER_LABELS,
  POS_ENDPOINT_KEYS,
  POS_TEMPLATE_NAME_PATTERN,
  POS_TEST_MAP_DEFAULT_SECTION,
  POS_LANE_ATTACH_PRESETS,
  PULL_POS_ATTACH_PRESET,
  attachPresetForProvider,
  connectorsForProvider,
  defaultConnectorForProvider,
  defaultPosTemplateConfig,
  defaultPullPosTemplateConfig,
  deviceLinkLabel,
  displayPosProviderName,
  isPosProvider,
  isPullPosProfile,
  isValidProviderConnectorPair,
  laneForProfile,
  laneForProvider,
  slugifyPosTemplateName,
} from "@/lib/pos/contract";

export type ListPosTemplatesParams = {
  page?: number;
  limit?: number;
  search?: string;
  provider?: PosProvider | string;
  connector_type?: PosConnectorType | string;
  is_active?: boolean;
  is_system?: boolean;
};

export type ListShopLinksParams = {
  page?: number;
  limit?: number;
  search?: string;
  provider?: PosProvider | string;
  connector_type?: PosConnectorType | string;
  is_active?: boolean;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  shop_id?: string;
};

export function listPosTemplates(params?: ListPosTemplatesParams) {
  if (isDevelopmentMode()) return mockListPosTemplates(params);
  return apiFetch<Paginated<PosTemplateSummary>>("/v2/pos/templates", {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search,
      provider: params?.provider,
      connector_type: params?.connector_type,
      is_active: params?.is_active,
      is_system: params?.is_system,
    },
  });
}

export function createPosTemplate(input: CreatePosTemplateInput) {
  if (isDevelopmentMode()) return mockCreatePosTemplate(input);
  return apiFetch<PosTemplate>("/v2/pos/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPosTemplate(id: string | number) {
  if (isDevelopmentMode()) return mockGetPosTemplate(id);
  return apiFetch<PosTemplate>(`/v2/pos/templates/${id}`);
}

export function patchPosTemplate(
  id: string | number,
  input: UpdatePosTemplateInput,
) {
  if (isDevelopmentMode()) return mockPatchPosTemplate(id, input);
  return apiFetch<PosTemplate>(`/v2/pos/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function clonePosTemplate(id: string | number) {
  if (isDevelopmentMode()) return mockClonePosTemplate(id);
  return apiFetch<PosTemplate>(`/v2/pos/templates/${id}/clone`, {
    method: "POST",
  });
}

export function testMapPosTemplate(
  id: string | number,
  input: PosTestMapInput,
) {
  if (isDevelopmentMode()) return mockTestMapPosTemplate(input);
  return apiFetch<PosTestMapResponse>(`/v2/pos/templates/${id}/test-map`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function testConnectionPosTemplate(
  id: string | number,
  input: PosTestConnectionInput,
) {
  if (isDevelopmentMode()) return mockTestConnectionPosTemplate(input);
  return apiFetch<PosTestConnectionResponse>(
    `/v2/pos/templates/${id}/test-connection`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deletePosTemplate(id: string | number) {
  if (isDevelopmentMode()) return mockDeletePosTemplate(id);
  return apiFetch<{ ok?: boolean }>(`/v2/pos/templates/${id}`, {
    method: "DELETE",
  });
}

export function listShopLinks(params?: ListShopLinksParams) {
  if (isDevelopmentMode()) return mockListShopLinks(params);
  return apiFetch<Paginated<PosShopLink>>("/v2/pos/shop-links", {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search,
      provider: params?.provider,
      connector_type: params?.connector_type,
      is_active: params?.is_active,
      catalog_sync_enabled: params?.catalog_sync_enabled,
      order_push_enabled: params?.order_push_enabled,
      shop_id: params?.shop_id,
    },
  });
}

export function getShopLink(shopId: string) {
  if (isDevelopmentMode()) return mockGetShopLink(shopId);
  return apiFetch<PosShopLink>(`/v2/pos/shops/${shopId}/link`);
}

export function attachShopLink(shopId: string, input: AttachPosShopLinkInput) {
  if (isDevelopmentMode()) return mockAttachShopLink(shopId, input);
  return apiFetch<PosShopLink>(`/v2/pos/shops/${shopId}/link`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function patchLinkFeatures(
  shopId: string,
  input: PatchPosLinkFeaturesInput,
) {
  if (isDevelopmentMode()) return mockPatchLinkFeatures(shopId, input);
  return apiFetch<PosShopLink>(`/v2/pos/shops/${shopId}/link/features`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getSyncStatus(shopId: string) {
  if (isDevelopmentMode()) return mockGetSyncStatus(shopId);
  return apiFetch<PosSyncStatus>(`/v2/pos/shops/${shopId}/sync-status`);
}
