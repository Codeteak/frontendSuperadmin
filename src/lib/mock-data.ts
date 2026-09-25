import type {
  AnalyticsCustomerRow,
  AnalyticsTicket,
  CreateRiderInput,
  CreateVenuePickerInput,
  CreateShopInput,
  DashboardChartsResponse,
  DashboardSummaryResponse,
  HealthResponse,
  Invoice,
  InvoiceStatus,
  Paginated,
  PatchShopInput,
  PatchShopResponse,
  AttachPosShopLinkInput,
  CreatePosTemplateInput,
  PatchPosLinkFeaturesInput,
  PosShopLink,
  PosSyncStatus,
  PosTemplate,
  PosTemplateSummary,
  PosTestConnectionInput,
  PosTestConnectionResponse,
  PosTestMapInput,
  PosTestMapResponse,
  ReportDataset,
  UpdatePosTemplateInput,
  RestaurantPerformanceRow,
  Rider,
  VenuePicker,
  VenuePickerListItem,
  VenuePickerScope,
  RotateIntegrationTokenResponse,
  ShopActivityResponse,
  ShopDeliverySettings,
  ShopDetail,
  ShopEcomSettings,
  ShopListItem,
  ShopProduct,
  TriggerShopLogoutResponse,
} from "@/types/api";
import { siteConfig } from "@/config/site";
import {
  defaultPosTemplateConfig,
  isPosProvider,
  laneForProvider,
  POS_DEFAULT_CAPABILITIES,
  POS_DEFAULT_EVENTS,
  type PosProvider,
} from "@/lib/pos/contract";
import { SHOP_USER_ID_MAX, SHOP_USER_ID_MIN } from "@/lib/shop-create-validation";

export function isDevelopmentMode() {
  return siteConfig.developmentMode;
}

function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const mockShops: ShopListItem[] = [
  {
    shop_id: "SHOP001",
    user_id: 100001,
    shop_name: "Al Noor Kitchen",
    phone: "+971501234567",
    email: "alnoor@example.com",
    status: "active",
    is_deleted: false,
    ecom_enabled: true,
    ecom_slug: "al-noor-kitchen",
    ecom_order_confirmation_enabled: true,
    scheduled_order: false,
    pre_booking_enabled: false,
    nightly_stock_reset_enabled: false,
    merge_order: false,
    address: {
      address_line_1: "Sheikh Zayed Rd",
      city: "Dubai",
      locality: "Business Bay",
      latitude: 25.186,
      longitude: 55.264,
      contact_number: "+971501234567",
    },
    photo_url:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=256&h=256&fit=crop",
    created_at: "2026-01-12T08:00:00Z",
    updated_at: "2026-07-20T10:00:00Z",
  },
  {
    shop_id: "SHOP002",
    user_id: 1002,
    shop_name: "Marina Bites",
    phone: "+971509876543",
    email: "marina@example.com",
    status: "active",
    is_deleted: false,
    ecom_enabled: true,
    ecom_slug: "marina-bites",
    ecom_order_confirmation_enabled: false,
    scheduled_order: true,
    pre_booking_enabled: true,
    nightly_stock_reset_enabled: false,
    merge_order: true,
    address: {
      address_line_1: "Marina Walk",
      city: "Dubai",
      locality: "Dubai Marina",
      latitude: 25.0801,
      longitude: 55.1402,
    },
    photo_url:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=256&h=256&fit=crop",
    created_at: "2026-02-01T08:00:00Z",
    updated_at: "2026-07-18T10:00:00Z",
  },
  {
    shop_id: "SHOP003",
    user_id: 1003,
    shop_name: "Corniche Grill",
    phone: "+971551112233",
    email: "corniche@example.com",
    status: "inactive",
    is_deleted: false,
    ecom_enabled: false,
    ecom_slug: "corniche-grill",
    ecom_order_confirmation_enabled: false,
    scheduled_order: false,
    pre_booking_enabled: false,
    nightly_stock_reset_enabled: false,
    merge_order: false,
    address: {
      address_line_1: "Corniche Rd",
      city: "Abu Dhabi",
      latitude: 24.4764,
      longitude: 54.3705,
    },
    created_at: "2026-03-01T08:00:00Z",
    updated_at: "2026-07-10T10:00:00Z",
  },
  {
    shop_id: "SHOP004",
    user_id: 100004,
    shop_name: "Desert Deli (Deleted)",
    phone: "+971501119998",
    email: "desert@example.com",
    status: "inactive",
    is_deleted: true,
    ecom_enabled: false,
    ecom_slug: "desert-deli",
    ecom_order_confirmation_enabled: false,
    scheduled_order: false,
    pre_booking_enabled: false,
    nightly_stock_reset_enabled: false,
    merge_order: false,
    address: {
      address_line_1: "Al Quoz",
      city: "Dubai",
      latitude: 25.14,
      longitude: 55.23,
    },
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-07-25T10:00:00Z",
  },
];

const mockProducts: ShopProduct[] = [
  {
    id: 1,
    product_name: "Chicken Biryani",
    product_name_alt: null,
    description: "Classic Dubai-style biryani",
    price: "35",
    vat_rate: "5",
    is_vat_inclusive: false,
    img_url: null,
    category_id: 10,
    status: "active",
    availability: "available",
    diet_type: "non_veg",
    sort_order: 1,
    seo_slug: "chicken-biryani",
    pos_product_id: "POS-100",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
  },
  {
    id: 2,
    product_name: "Shawarma Wrap",
    product_name_alt: null,
    description: null,
    price: "18",
    vat_rate: "5",
    is_vat_inclusive: true,
    img_url: null,
    category_id: 11,
    status: "active",
    availability: "available",
    diet_type: "non_veg",
    sort_order: 2,
    seo_slug: "shawarma-wrap",
    pos_product_id: "POS-101",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
  },
  {
    id: 3,
    product_name: "Fresh Lemonade",
    product_name_alt: null,
    description: null,
    price: "12",
    vat_rate: "0",
    is_vat_inclusive: false,
    img_url: null,
    category_id: 12,
    status: "inactive",
    availability: "out_of_stock",
    diet_type: "veg",
    sort_order: 3,
    seo_slug: "fresh-lemonade",
    pos_product_id: "POS-102",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
  },
];

const mockRidersByShop: Record<string, Rider[]> = {
  SHOP001: [
    {
      delivery_partner_id: "DP1001",
      first_name: "Ahmed",
      last_name: "Hassan",
      phone1: "+971500001111",
      age: 28,
      is_blocked: false,
      online_status: "online",
      vehicle_detail: "Yamaha FZ",
    },
    {
      delivery_partner_id: "DP1002",
      first_name: "Ravi",
      last_name: "Kumar",
      phone1: "+971500002222",
      age: 31,
      is_blocked: false,
      online_status: "offline",
      vehicle_detail: "Honda Activa",
    },
  ],
  SHOP002: [
    {
      delivery_partner_id: "DP2001",
      first_name: "Omar",
      last_name: "Ali",
      phone1: "+971500003333",
      age: 26,
      is_blocked: true,
      online_status: "offline",
    },
  ],
};

const mockVenuePickersByShop: Record<string, VenuePicker[]> = {
  SHOP001: [
    {
      venue_picker_id: "VP1001",
      shop_id: "SHOP001",
      name: "Table Host A",
      phone: "971500004444",
      scope: "table",
      is_blocked: false,
      is_deleted: false,
      dining_area_ids: [1, 2],
      third_party_id: null,
      last_login: null,
    },
    {
      venue_picker_id: "VP1002",
      shop_id: "SHOP001",
      name: "Pickup Desk",
      phone: "971500005555",
      scope: "pickup_counter",
      is_blocked: false,
      is_deleted: false,
      dining_area_ids: [],
      third_party_id: "POS-PK1",
      last_login: "2026-07-10T08:00:00Z",
    },
  ],
  SHOP002: [
    {
      venue_picker_id: "VP2001",
      shop_id: "SHOP002",
      name: "Room Attendant",
      phone: "971500006666",
      scope: "room",
      is_blocked: true,
      is_deleted: false,
      dining_area_ids: [3],
      third_party_id: null,
      last_login: null,
    },
  ],
};

function toVenuePickerListItem(picker: VenuePicker): VenuePickerListItem {
  return {
    venue_picker_id: picker.venue_picker_id,
    name: picker.name,
    phone: picker.phone,
    scope: picker.scope,
    is_blocked: Boolean(picker.is_blocked),
    last_login: picker.last_login ?? null,
  };
}

function seededPosTemplate(
  id: number,
  name: string,
  provider: PosProvider,
  connector_type: string,
  description: string,
): PosTemplate {
  const config = defaultPosTemplateConfig(provider);
  const capabilities = POS_DEFAULT_CAPABILITIES[provider];
  const events = POS_DEFAULT_EVENTS[provider];
  return {
    id,
    name,
    provider,
    version: "1",
    connector_type,
    lane: laneForProvider(provider),
    description,
    is_system: true,
    is_active: true,
    capabilities,
    events,
    status_maps: { outbound: {}, inbound: {} },
    config,
    created_at: "2026-08-04T09:58:20.142Z",
    updated_at: "2026-08-04T09:58:20.142Z",
  };
}

let mockPosTemplates: PosTemplate[] = [
  seededPosTemplate(
    1,
    "saleculator-pull-v1",
    "saleculator",
    "saleculator_pull",
    "Saleculator pull lane (Lane B)",
  ),
  seededPosTemplate(
    2,
    "cratis-v1",
    "cratis",
    "cratis",
    "Cratis push lane (Lane A)",
  ),
  seededPosTemplate(
    3,
    "generic-v1",
    "generic",
    "generic_json",
    "Plug-and-play generic JSON (Lane C)",
  ),
  seededPosTemplate(
    4,
    "gravity-v1",
    "gravity",
    "gravity",
    "Gravity plug-and-play lane",
  ),
  seededPosTemplate(
    5,
    "topas-v1",
    "topas",
    "topas",
    "Topas plug-and-play lane",
  ),
];

let mockShopLinkSeq = 10;
const mockShopLinks: Record<string, PosShopLink> = {
  SHOP001: {
    id: 10,
    shop_id: "SHOP001",
    mapping_profile_id: 2,
    mapping_profile_name: "cratis-v1",
    provider: "cratis",
    connector_type: "cratis",
    lane: "cratis",
    is_active: true,
    config_overrides: {
      api: {
        baseUrl: "https://cratis-pos.example.com",
        auth: { type: "bearer" },
      },
    },
    config_version: 1,
    has_credentials: false,
    webhook_secret_configured: false,
    integration_token_present: false,
    integration_enabled: false,
    capabilities: {},
    events: POS_DEFAULT_EVENTS.cratis,
    status_maps: { outbound: {}, inbound: {} },
    catalog_sync_enabled: true,
    order_push_enabled: true,
    order_pull_enabled: false,
    last_catalog_sync_at: null,
    last_order_sync_at: null,
    sync_error: null,
    created_at: "2026-08-04T10:00:00.000Z",
    updated_at: "2026-08-04T10:00:00.000Z",
  },
};

export const mockReports = [
  {
    id: "RPT-001",
    name: "Daily sales summary",
    shop: "Al Noor Kitchen",
    period: "2026-07-21",
    total: "AED 12,450",
    status: "ready",
  },
  {
    id: "RPT-002",
    name: "Rider performance",
    shop: "Marina Bites",
    period: "2026-07-14 → 2026-07-21",
    total: "48 deliveries",
    status: "ready",
  },
  {
    id: "RPT-003",
    name: "Catalog gaps",
    shop: "Corniche Grill",
    period: "2026-07-21",
    total: "12 missing items",
    status: "draft",
  },
];

export const mockAnalytics = {
  gmv_7d: "AED 86,320",
  orders_7d: 1240,
  avg_ticket: "AED 69.60",
  active_shops: 2,
  series: [
    { day: "Thu", orders: 160 },
    { day: "Fri", orders: 210 },
    { day: "Sat", orders: 240 },
    { day: "Sun", orders: 180 },
    { day: "Mon", orders: 150 },
    { day: "Tue", orders: 155 },
    { day: "Wed", orders: 145 },
  ],
};

export const mockInvoices = [
  {
    id: "INV-2401",
    shop: "Al Noor Kitchen",
    amount: "AED 1,200",
    issued_at: "2026-07-01",
    due_at: "2026-07-15",
    status: "paid",
  },
  {
    id: "INV-2402",
    shop: "Marina Bites",
    amount: "AED 980",
    issued_at: "2026-07-01",
    due_at: "2026-07-15",
    status: "open",
  },
  {
    id: "INV-2403",
    shop: "Corniche Grill",
    amount: "AED 450",
    issued_at: "2026-06-01",
    due_at: "2026-06-15",
    status: "overdue",
  },
];

export async function mockListShops(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  deleted?: boolean;
}): Promise<Paginated<ShopListItem>> {
  let items = [...mockShops];

  if (params?.deleted === true) {
    items = items.filter((s) => s.is_deleted === true);
  } else if (params?.deleted === false) {
    items = items.filter((s) => s.is_deleted !== true);
  }

  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (s) =>
        s.shop_name.toLowerCase().includes(q) ||
        s.shop_id.toLowerCase().includes(q) ||
        String(s.email ?? "")
          .toLowerCase()
          .includes(q) ||
        String(s.phone ?? "").includes(q),
    );
  }
  if (params?.status) {
    items = items.filter((s) => s.status === params.status);
  }

  // Active (non-deleted) first, then deleted — both by name
  items.sort((a, b) => {
    const aDeleted = a.is_deleted === true ? 1 : 0;
    const bDeleted = b.is_deleted === true ? 1 : 0;
    if (aDeleted !== bDeleted) return aDeleted - bDeleted;
    return a.shop_name.localeCompare(b.shop_name);
  });

  return delay({
    items,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    total: items.length,
    total_pages: 1,
  });
}

export async function mockGetNextShopUserId(): Promise<{ user_id: number }> {
  const used = new Set<number>();
  for (const shop of mockShops) {
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
    candidate = Math.min(Math.max(...used) + 1, SHOP_USER_ID_MAX);
  }
  while (candidate <= SHOP_USER_ID_MAX) {
    if (!used.has(candidate)) return delay({ user_id: candidate });
    candidate += 1;
  }

  for (let id = SHOP_USER_ID_MIN; id <= SHOP_USER_ID_MAX; id += 1) {
    if (!used.has(id)) return delay({ user_id: id });
  }

  throw new Error(
    `No free shop user_id left in range ${SHOP_USER_ID_MIN}–${SHOP_USER_ID_MAX}`,
  );
}

export async function mockCreateShop(input: CreateShopInput): Promise<ShopDetail> {
  if (input.ecom_order_confirmation_enabled && !input.ecom_enabled) {
    throw Object.assign(
      new Error("Ecom order confirmation requires ecom to be enabled"),
      { status: 400, code: "ecom_confirmation_requires_ecom" },
    );
  }
  const userId =
    input.user_id ??
    Math.floor(SHOP_USER_ID_MIN + Math.random() * (SHOP_USER_ID_MAX - SHOP_USER_ID_MIN));
  const shop: ShopListItem = {
    shop_id: input.shop_id,
    user_id: userId,
    shop_name: input.shop_name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    status: (input.status as ShopListItem["status"]) ?? "active",
    is_deleted: false,
    ecom_enabled: input.ecom_enabled ?? false,
    ecom_slug: input.ecom_slug ?? null,
    ecom_order_confirmation_enabled:
      input.ecom_order_confirmation_enabled ?? false,
    scheduled_order: input.scheduled_order ?? false,
    pre_booking_enabled: input.pre_booking_enabled ?? false,
    nightly_stock_reset_enabled: input.nightly_stock_reset_enabled ?? false,
    merge_order: input.merge_order ?? false,
    address: input.address ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockShops.unshift(shop);
  return delay({
    ...shop,
    features: {
      ecom_enabled: shop.ecom_enabled,
      ecom_order_confirmation_enabled: shop.ecom_order_confirmation_enabled,
      scheduled_order: shop.scheduled_order,
      pre_booking_enabled: shop.pre_booking_enabled,
      nightly_stock_reset_enabled: shop.nightly_stock_reset_enabled,
      merge_order: shop.merge_order,
      return_option: input.return_option ?? false,
      customer_ticket: input.customer_ticket ?? false,
      venue_management_enabled: input.venue_management_enabled ?? false,
      qr_ordering_enabled: input.qr_ordering_enabled ?? false,
      table_ordering_enabled: input.table_ordering_enabled ?? false,
      room_service_enabled: input.room_service_enabled ?? false,
      pickup_ordering_enabled: input.pickup_ordering_enabled ?? false,
      drive_thru_enabled: input.drive_thru_enabled ?? false,
      ecom_slug: shop.ecom_slug,
      integration_enabled: input.integration_enabled ?? false,
      integration_rate_limit: input.integration_rate_limit ?? 300,
      is_msg_activated: input.is_msg_activated ?? false,
      single_msg: input.single_msg ?? false,
      has_integration_token: false,
    },
    delivery: {
      delivery_time: 30,
      self_assigned: false,
      pickup_disabled: false,
      preparing_status_enabled: true,
      ready_status_enabled: true,
      bonus_penalty: false,
      bonus_penalty_start_status: "assigned",
      dp_commission_enabled: false,
      dp_commission_percent: 0,
      common_penalty_enabled: false,
      common_penalty_idle_minutes: 45,
      common_penalty_min_online_minutes: 45,
      ...(input.delivery ?? {}),
    },
    ecom: {
      domain: null,
      cooking_notes_enabled: false,
      item_notes_enabled: false,
      delivery_instructions_enabled: false,
      cutlery_enabled: false,
      payment_methods: [],
      robots_index: true,
      service_configs: {
        delivery: {
          enabled: true,
          min_order_amount: 0,
          prep_time_minutes: 30,
          requires_phone: true,
          delivery_charge: 0,
          delivery_radius_km: 5,
        },
      },
      allow_anonymous_table_orders: false,
      table_session_policy: "single_order",
      ...(input.ecom ?? {}),
    },
  });
}

export async function mockGetShop(shopId: string): Promise<ShopDetail> {
  const shop = mockShops.find((s) => s.shop_id === shopId);
  if (!shop) {
    throw Object.assign(new Error("Shop not found"), { status: 404 });
  }
  const stored = mockShopExtras[shopId];
  return delay({
    ...shop,
    profile: {
      shop_name: shop.shop_name,
      second_name:
        typeof stored?.profile?.second_name === "string"
          ? stored.profile.second_name
          : null,
      phone: shop.phone,
      email: shop.email,
      photo: shop.photo ?? null,
      photo_url: shop.photo_url ?? null,
      shop_license_no:
        typeof stored?.profile?.shop_license_no === "string"
          ? stored.profile.shop_license_no
          : null,
      contact_person_number:
        typeof stored?.profile?.contact_person_number === "string"
          ? stored.profile.contact_person_number
          : null,
      contact_person_email:
        typeof stored?.profile?.contact_person_email === "string"
          ? stored.profile.contact_person_email
          : null,
      upi_id:
        typeof stored?.profile?.upi_id === "string"
          ? stored.profile.upi_id
          : null,
      vat_enabled: Boolean(stored?.profile?.vat_enabled),
      vat:
        stored?.profile?.vat != null ? String(stored.profile.vat) : "5",
      enable_promotion: Boolean(stored?.profile?.enable_promotion),
    },
    features: {
      ecom_enabled: Boolean(shop.ecom_enabled),
      ecom_order_confirmation_enabled: Boolean(
        shop.ecom_order_confirmation_enabled,
      ),
      scheduled_order: Boolean(shop.scheduled_order),
      pre_booking_enabled: Boolean(shop.pre_booking_enabled),
      nightly_stock_reset_enabled: Boolean(shop.nightly_stock_reset_enabled),
      merge_order: Boolean(shop.merge_order),
      return_option: Boolean(stored?.features?.return_option),
      customer_ticket: Boolean(
        stored?.features?.customer_ticket ?? shop.ecom_enabled,
      ),
      venue_management_enabled: Boolean(
        stored?.features?.venue_management_enabled ??
          shop.venue_management_enabled,
      ),
      qr_ordering_enabled: Boolean(
        stored?.features?.qr_ordering_enabled ?? shop.qr_ordering_enabled,
      ),
      table_ordering_enabled: Boolean(
        stored?.features?.table_ordering_enabled ?? shop.table_ordering_enabled,
      ),
      room_service_enabled: Boolean(
        stored?.features?.room_service_enabled ?? shop.room_service_enabled,
      ),
      pickup_ordering_enabled: Boolean(
        stored?.features?.pickup_ordering_enabled ??
          shop.pickup_ordering_enabled,
      ),
      drive_thru_enabled: Boolean(
        stored?.features?.drive_thru_enabled ?? shop.drive_thru_enabled,
      ),
      ecom_slug: shop.ecom_slug,
      integration_enabled: Boolean(stored?.features?.integration_enabled),
      integration_rate_limit:
        typeof stored?.features?.integration_rate_limit === "number"
          ? stored.features.integration_rate_limit
          : 100,
      has_integration_token: Boolean(stored?.has_integration_token),
      is_msg_activated: Boolean(stored?.features?.is_msg_activated),
      single_msg: Boolean(stored?.features?.single_msg),
    },
    products: { items: mockProducts, total: mockProducts.length },
    delivery: stored?.delivery ?? {
      delivery_time: 30,
      self_assigned: false,
      pickup_disabled: false,
      preparing_status_enabled: true,
      ready_status_enabled: true,
      bonus_penalty: false,
      bonus_penalty_start_status: "assigned",
      dp_commission_enabled: false,
      dp_commission_percent: 0,
      common_penalty_enabled: false,
      common_penalty_idle_minutes: 45,
      common_penalty_min_online_minutes: 45,
    },
    subscription: {
      plan: "growth",
      status: "active",
      renews_at: "2026-08-01",
    },
    promotion: {
      headline: "Free delivery weekend",
      active: true,
      discount_percent: 10,
    },
    ecom: stored?.ecom ?? {
      domain: null,
      cooking_notes_enabled: false,
      item_notes_enabled: false,
      delivery_instructions_enabled: false,
      cutlery_enabled: false,
      payment_methods: ["online", "cash_on_delivery"],
      robots_index: true,
      service_configs: {
        delivery: {
          enabled: true,
          min_order_amount: 0,
          prep_time_minutes: 30,
          requires_phone: true,
          delivery_charge: 0,
          delivery_radius_km: 5,
        },
      },
    },
  } satisfies ShopDetail);
}

type MockShopExtras = {
  profile?: Record<string, unknown>;
  features?: Record<string, unknown>;
  delivery?: ShopDeliverySettings;
  ecom?: ShopEcomSettings;
  has_integration_token?: boolean;
};

const mockShopExtras: Record<string, MockShopExtras> = {};

export async function mockPatchShop(
  shopId: string,
  input: PatchShopInput | Record<string, unknown>,
): Promise<PatchShopResponse> {
  const idx = mockShops.findIndex((s) => s.shop_id === shopId);
  if (idx < 0) {
    return delay({ shop_id: shopId, updated_at: new Date().toISOString() });
  }

  const current = mockShops[idx];
  const extras = mockShopExtras[shopId] ?? (mockShopExtras[shopId] = {});

  const nextEcom =
    typeof input.ecom_enabled === "boolean"
      ? input.ecom_enabled
      : Boolean(current.ecom_enabled);
  const nextConfirm =
    typeof input.ecom_order_confirmation_enabled === "boolean"
      ? input.ecom_order_confirmation_enabled
      : Boolean(current.ecom_order_confirmation_enabled);

  if (nextConfirm && !nextEcom) {
    throw Object.assign(
      new Error("Ecom order confirmation requires ecom to be enabled"),
      { status: 400, code: "ecom_confirmation_requires_ecom" },
    );
  }

  let photo: string | null | undefined = current.photo;
  let photoUrl: string | null | undefined = current.photo_url;

  if (input.clear_photo === true) {
    photo = null;
    photoUrl = null;
  } else if (typeof input.photo_base64 === "string") {
    const contentType =
      typeof input.photo_content_type === "string"
        ? input.photo_content_type
        : "image/png";
    const raw = input.photo_base64.replace(/^data:[^;]+;base64,/, "");
    photo = `images/shops/${shopId}/owner/mock-photo`;
    photoUrl = `data:${contentType};base64,${raw}`;
  }

  const nextAddress =
    "address" in input
      ? input.address === null
        ? null
        : {
            ...(current.address ?? {}),
            ...(typeof input.address === "object" && input.address
              ? (input.address as Record<string, unknown>)
              : {}),
          }
      : current.address;

  if (input.delivery && typeof input.delivery === "object") {
    extras.delivery = {
      ...(extras.delivery ?? {}),
      ...(input.delivery as ShopDeliverySettings),
    };
  }
  if (input.ecom && typeof input.ecom === "object") {
    extras.ecom = {
      ...(extras.ecom ?? {}),
      ...(input.ecom as ShopEcomSettings),
    };
  }

  const featureKeys = [
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
    "integration_enabled",
    "integration_rate_limit",
    "is_msg_activated",
    "single_msg",
  ] as const;

  const features: Record<string, unknown> = {};
  for (const key of featureKeys) {
    if (key in input) {
      features[key] = (input as Record<string, unknown>)[key];
      extras.features = { ...(extras.features ?? {}), [key]: features[key] };
    }
  }

  const profileKeys = [
    "shop_name",
    "second_name",
    "phone",
    "email",
    "shop_license_no",
    "contact_person_number",
    "contact_person_email",
    "upi_id",
    "vat_enabled",
    "vat",
    "enable_promotion",
  ] as const;
  const profile: Record<string, unknown> = {};
  for (const key of profileKeys) {
    if (key in input) {
      profile[key] = (input as Record<string, unknown>)[key];
      extras.profile = { ...(extras.profile ?? {}), [key]: profile[key] };
    }
  }
  if (input.clear_photo === true || typeof input.photo_base64 === "string") {
    profile.photo = photo ?? null;
    profile.photo_url = photoUrl ?? null;
  }

  let integration_token: string | undefined;
  if (
    input.integration_enabled === true &&
    !extras.has_integration_token
  ) {
    extras.has_integration_token = true;
    features.has_integration_token = true;
    integration_token = `mock-token-${shopId}-${Date.now()}`;
  }

  mockShops[idx] = {
    ...current,
    shop_name:
      typeof input.shop_name === "string" ? input.shop_name : current.shop_name,
    phone:
      input.phone !== undefined
        ? (input.phone as string | null)
        : current.phone,
    email:
      input.email !== undefined
        ? (input.email as string | null)
        : current.email,
    status:
      typeof input.status === "string"
        ? (input.status as ShopListItem["status"])
        : current.status,
    address: nextAddress as ShopListItem["address"],
    photo: photo ?? null,
    photo_url: photoUrl ?? null,
    ecom_enabled: nextEcom,
    ecom_order_confirmation_enabled: nextConfirm,
    ecom_slug:
      "ecom_slug" in input
        ? ((input.ecom_slug as string | null) ?? null)
        : current.ecom_slug,
    scheduled_order:
      typeof input.scheduled_order === "boolean"
        ? input.scheduled_order
        : current.scheduled_order,
    pre_booking_enabled:
      typeof input.pre_booking_enabled === "boolean"
        ? input.pre_booking_enabled
        : current.pre_booking_enabled,
    nightly_stock_reset_enabled:
      typeof input.nightly_stock_reset_enabled === "boolean"
        ? input.nightly_stock_reset_enabled
        : current.nightly_stock_reset_enabled,
    merge_order:
      typeof input.merge_order === "boolean"
        ? input.merge_order
        : current.merge_order,
    updated_at: new Date().toISOString(),
  } as ShopListItem;

  return delay({
    shop_id: shopId,
    updated_at: mockShops[idx].updated_at,
    ...(Object.keys(features).length ? { features } : {}),
    ...(Object.keys(profile).length ? { profile } : {}),
    ...("address" in input ? { address: mockShops[idx].address } : {}),
    ...("delivery" in input ? { delivery: extras.delivery } : {}),
    ...("ecom" in input
      ? {
          ecom: (() => {
            const { theme_config: _t, structured_data: _s, ...rest } =
              extras.ecom ?? {};
            return rest;
          })(),
        }
      : {}),
    ...(integration_token ? { integration_token } : {}),
  });
}

export async function mockRotateShopIntegrationToken(
  shopId: string,
): Promise<RotateIntegrationTokenResponse> {
  const idx = mockShops.findIndex((s) => s.shop_id === shopId);
  if (idx < 0) {
    throw Object.assign(new Error("Shop not found"), { status: 404 });
  }

  const shop = mockShops[idx];
  if (shop.is_deleted === true) {
    throw Object.assign(new Error("Shop not found"), { status: 404 });
  }

  const extras = mockShopExtras[shopId] ?? (mockShopExtras[shopId] = {});
  const features = {
    ...(extras.features ?? {}),
  } as Record<string, unknown>;
  const integrationEnabled = Boolean(features.integration_enabled);

  if (!integrationEnabled) {
    throw Object.assign(new Error("integration_disabled"), {
      status: 422,
      body: { code: "integration_disabled", message: "integration_disabled" },
    });
  }

  extras.has_integration_token = true;
  features.integration_enabled = true;
  features.has_integration_token = true;
  extras.features = features;

  const updated_at = new Date().toISOString();
  const integration_token = `mock-token-${shopId}-${Date.now()}`;

  return delay({
    shop_id: shopId,
    updated_at,
    token_rotated: true,
    features: {
      integration_enabled: true,
      has_integration_token: true,
    },
    integration_token,
  });
}

export async function mockDeleteShop(shopId: string, hard = false) {
  const idx = mockShops.findIndex((s) => s.shop_id === shopId);
  if (idx < 0) {
    return delay({ ok: true, mode: hard ? "hard" : "soft" });
  }

  if (hard) {
    mockShops.splice(idx, 1);
    return delay({ ok: true, mode: "hard" });
  }

  // Soft delete only marks deleted — do not clear ecom / feature flags.
  mockShops[idx] = {
    ...mockShops[idx],
    is_deleted: true,
    status: "inactive",
    updated_at: new Date().toISOString(),
  };
  return delay({ ok: true, is_deleted: true, mode: "soft" });
}

export async function mockRestoreShop(shopId: string): Promise<ShopDetail> {
  const idx = mockShops.findIndex((s) => s.shop_id === shopId);
  if (idx < 0) {
    throw Object.assign(new Error("Shop not found"), { status: 404 });
  }
  if (mockShops[idx].is_deleted !== true) {
    throw Object.assign(
      new Error(`Shop ${shopId} is not deleted`),
      { status: 409, code: "shop_not_deleted" },
    );
  }
  mockShops[idx] = {
    ...mockShops[idx],
    is_deleted: false,
    // status stays inactive after restore
    status: "inactive",
    updated_at: new Date().toISOString(),
  };
  return mockGetShop(shopId);
}

export async function mockGetShopActivity(): Promise<ShopActivityResponse> {
  return delay({
    order_counts: {
      today: 186,
      pending: 24,
      completed: 152,
      cancelled: 10,
      total: 186,
    },
    backlog: {
      total: 14,
      items: [
        { id: "ORD-9001", shop: "Al Noor Kitchen", age_min: 12, status: "preparing" },
        { id: "ORD-9002", shop: "Marina Bites", age_min: 8, status: "ready" },
        { id: "ORD-9003", shop: "Al Noor Kitchen", age_min: 5, status: "assigned" },
      ],
    },
    activity: {
      total: 8,
      items: [
        { at: "18:40", event: "Shop SHOP001 went online" },
        { at: "18:22", event: "Rider DP1001 accepted order ORD-9001" },
        { at: "17:55", event: "Catalog sync completed for Marina Bites" },
        { at: "17:10", event: "Invoice INV-2402 generated" },
      ],
    },
  });
}

export async function mockListShopProducts(
  _shopId: string,
  params?: { q?: string; status?: string; availability?: string },
): Promise<Paginated<ShopProduct>> {
  let items = [...mockProducts];
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter((p) =>
      String(p.product_name ?? p.name ?? "")
        .toLowerCase()
        .includes(q),
    );
  }
  if (params?.status) items = items.filter((p) => p.status === params.status);
  if (params?.availability) {
    items = items.filter((p) => p.availability === params.availability);
  }
  return delay({ items, total: items.length, page: 1, limit: 50 });
}

export async function mockGetDeliverySettings(): Promise<Record<string, unknown>> {
  return delay({
    delivery_time: 30,
    self_assigned: true,
    pickup_disabled: false,
    preparing_status_enabled: true,
    ready_status_enabled: true,
    bonus_penalty: false,
    bonus_penalty_start_status: "assigned",
    dp_commission_enabled: false,
    dp_commission_percent: 0,
    common_penalty_enabled: false,
    common_penalty_idle_minutes: 45,
    common_penalty_min_online_minutes: 45,
    radius_km: 8,
    base_fee: 8,
    free_delivery_min: 80,
    enabled: true,
    slots: ["11:00-15:00", "18:00-23:00"],
  });
}

export async function mockPutDeliverySettings(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return delay({ ...input, updated: true });
}

export async function mockGetActiveSubscription(): Promise<Record<string, unknown>> {
  return delay({
    plan: "growth",
    status: "active",
    renews_at: "2026-08-01",
    amount: 299,
    currency: "AED",
  });
}

export async function mockCreateSubscription(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return delay({ ...input, status: "active", id: "SUB-DEV-1" });
}

export async function mockGetPromotion(): Promise<Record<string, unknown>> {
  return delay({
    headline: "Free delivery weekend",
    active: true,
    discount_percent: 10,
    code: "WEEKEND10",
  });
}

export async function mockPutPromotion(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return delay({ ...input, updated: true });
}

export async function mockListRiders(
  shopId: string,
  params?: {
    q?: string;
    is_blocked?: boolean;
    online_status?: string;
    include_deleted?: boolean;
    deleted_only?: boolean;
  },
): Promise<Paginated<Rider>> {
  let items = [...(mockRidersByShop[shopId] ?? [])];
  if (params?.deleted_only) {
    items = items.filter((r) => r.is_deleted === true || r.status === "deleted");
  } else if (!params?.include_deleted) {
    items = items.filter((r) => r.is_deleted !== true && r.status !== "deleted");
  }
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        String(r.delivery_partner_id).toLowerCase().includes(q),
    );
  }
  if (typeof params?.is_blocked === "boolean") {
    items = items.filter((r) => Boolean(r.is_blocked) === params.is_blocked);
  }
  if (params?.online_status) {
    items = items.filter((r) => r.online_status === params.online_status);
  }
  return delay({ items, total: items.length, page: 1, limit: 50 });
}

export async function mockGetNextRiderId(
  shopId: string,
): Promise<{
  delivery_partner_id?: string;
  next_id?: string;
  code?: string;
}> {
  const items = mockRidersByShop[shopId] ?? [];
  const next = `DP${1000 + items.length + 1}`;
  return delay({ delivery_partner_id: next, next_id: next, code: next });
}

export async function mockCreateRider(shopId: string, input: CreateRiderInput) {
  const rider: Rider = {
    ...input,
    delivery_partner_id:
      input.delivery_partner_id ?? (await mockGetNextRiderId(shopId)).next_id,
    status: "offline",
    is_blocked: false,
    online_status: "offline",
  };
  if (!mockRidersByShop[shopId]) mockRidersByShop[shopId] = [];
  mockRidersByShop[shopId].unshift(rider);
  return delay(rider);
}

export async function mockGetRider(shopId: string, dpId: string) {
  const rider = (mockRidersByShop[shopId] ?? []).find(
    (r) => r.delivery_partner_id === dpId,
  );
  if (!rider) throw Object.assign(new Error("Rider not found"), { status: 404 });
  return delay(rider);
}

export async function mockPatchRider(
  shopId: string,
  dpId: string,
  input: Record<string, unknown>,
) {
  const list = mockRidersByShop[shopId] ?? [];
  const idx = list.findIndex((r) => r.delivery_partner_id === dpId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...input,
      ...(input.is_deleted === false
        ? {
            is_deleted: false,
            status: list[idx].is_blocked ? "blocked" : (list[idx].online_status ?? "offline"),
          }
        : {}),
    };
    return delay(list[idx]);
  }
  return delay(input);
}

export async function mockResetRiderPassword() {
  return delay({ ok: true });
}

export async function mockBlockRider(shopId: string, dpId: string) {
  return mockPatchRider(shopId, dpId, { is_blocked: true });
}

export async function mockUnblockRider(shopId: string, dpId: string) {
  return mockPatchRider(shopId, dpId, { is_blocked: false });
}

export async function mockDeleteRider(shopId: string, dpId: string, hard = false) {
  if (hard) {
    mockRidersByShop[shopId] = (mockRidersByShop[shopId] ?? []).filter(
      (r) => r.delivery_partner_id !== dpId,
    );
    return delay({ ok: true, deleted: true, mode: "hard" });
  }
  mockRidersByShop[shopId] = (mockRidersByShop[shopId] ?? []).map((r) =>
    r.delivery_partner_id === dpId
      ? { ...r, is_deleted: true, status: "deleted" }
      : r,
  );
  return delay({ ok: true, is_deleted: true, mode: "soft" });
}

export async function mockListVenuePickers(
  shopId: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
    is_blocked?: boolean;
    scope?: VenuePickerScope;
    dining_area_id?: number;
  },
): Promise<Paginated<VenuePickerListItem>> {
  let items = (mockVenuePickersByShop[shopId] ?? []).filter(
    (p) => p.is_deleted !== true,
  );
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.venue_picker_id.toLowerCase().includes(q),
    );
  }
  if (typeof params?.is_blocked === "boolean") {
    items = items.filter((p) => Boolean(p.is_blocked) === params.is_blocked);
  }
  if (params?.scope) {
    items = items.filter((p) => p.scope === params.scope);
  }
  if (typeof params?.dining_area_id === "number") {
    items = items.filter((p) =>
      (p.dining_area_ids ?? []).includes(params.dining_area_id!),
    );
  }
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit).map(toVenuePickerListItem);
  return delay({
    items: pageItems,
    total: items.length,
    page,
    limit,
  });
}

export async function mockCreateVenuePicker(
  shopId: string,
  input: CreateVenuePickerInput,
) {
  const list = mockVenuePickersByShop[shopId] ?? [];
  const picker: VenuePicker = {
    venue_picker_id: `VP${1000 + list.length + 1}`,
    shop_id: shopId,
    name: input.name,
    phone: input.phone,
    scope: input.scope,
    dining_area_ids: input.dining_area_ids ?? [],
    third_party_id: input.third_party_id ?? null,
    is_blocked: false,
    is_deleted: false,
    requires_password_reset: false,
    last_login: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!mockVenuePickersByShop[shopId]) mockVenuePickersByShop[shopId] = [];
  mockVenuePickersByShop[shopId].unshift(picker);
  return delay(picker);
}

export async function mockGetVenuePicker(shopId: string, pickerId: string) {
  const picker = (mockVenuePickersByShop[shopId] ?? []).find(
    (p) => p.venue_picker_id === pickerId,
  );
  if (!picker) {
    throw Object.assign(new Error("Venue picker not found"), { status: 404 });
  }
  return delay(picker);
}

export async function mockPatchVenuePicker(
  shopId: string,
  pickerId: string,
  input: Record<string, unknown>,
) {
  const list = mockVenuePickersByShop[shopId] ?? [];
  const idx = list.findIndex((p) => p.venue_picker_id === pickerId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...input,
      updated_at: new Date().toISOString(),
    } as VenuePicker;
    return delay(list[idx]);
  }
  return delay({ venue_picker_id: pickerId, ...input });
}

export async function mockResetVenuePickerPassword() {
  return delay({ password_reset: true });
}

export async function mockBlockVenuePicker(shopId: string, pickerId: string) {
  return mockPatchVenuePicker(shopId, pickerId, { is_blocked: true });
}

export async function mockUnblockVenuePicker(shopId: string, pickerId: string) {
  return mockPatchVenuePicker(shopId, pickerId, { is_blocked: false });
}

export async function mockDeleteVenuePicker(shopId: string, pickerId: string) {
  mockVenuePickersByShop[shopId] = (mockVenuePickersByShop[shopId] ?? []).map(
    (p) =>
      p.venue_picker_id === pickerId
        ? { ...p, is_deleted: true, updated_at: new Date().toISOString() }
        : p,
  );
  const picker = (mockVenuePickersByShop[shopId] ?? []).find(
    (p) => p.venue_picker_id === pickerId,
  );
  return delay(picker ?? { venue_picker_id: pickerId, is_deleted: true });
}

function toPosTemplateSummary(template: PosTemplate): PosTemplateSummary {
  const { config: _config, ...summary } = template;
  return summary;
}

export async function mockListPosTemplates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  connector_type?: string;
  is_active?: boolean;
  is_system?: boolean;
}): Promise<Paginated<PosTemplateSummary>> {
  let items = mockPosTemplates.map(toPosTemplateSummary);
  if (params?.search) {
    const q = params.search.toLowerCase();
    items = items.filter((t) => t.name.toLowerCase().includes(q));
  }
  if (params?.provider) {
    items = items.filter((t) => t.provider === params.provider);
  }
  if (params?.connector_type) {
    items = items.filter((t) => t.connector_type === params.connector_type);
  }
  if (typeof params?.is_active === "boolean") {
    items = items.filter((t) => Boolean(t.is_active) === params.is_active);
  }
  if (typeof params?.is_system === "boolean") {
    items = items.filter((t) => Boolean(t.is_system) === params.is_system);
  }
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const start = (page - 1) * limit;
  return delay({
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
  });
}

export async function mockCreatePosTemplate(
  input: CreatePosTemplateInput,
): Promise<PosTemplate> {
  if (mockPosTemplates.some((t) => t.name === input.name)) {
    throw Object.assign(new Error(`Mapping profile '${input.name}' already exists`), {
      status: 409,
      body: {
        code: "profile_name_exists",
        message: `Mapping profile '${input.name}' already exists`,
      },
    });
  }
  const provider = isPosProvider(input.provider) ? input.provider : "generic";
  const config = input.config;
  const capabilities =
    (config.capabilities as PosTemplate["capabilities"]) ??
    POS_DEFAULT_CAPABILITIES[provider];
  const events =
    (config.events as PosTemplate["events"]) ?? POS_DEFAULT_EVENTS[provider];
  const created: PosTemplate = {
    id: Math.max(0, ...mockPosTemplates.map((t) => Number(t.id))) + 1,
    name: input.name,
    provider,
    version: input.version,
    connector_type: input.connector_type,
    lane: laneForProvider(provider),
    description: input.description ?? null,
    is_system: Boolean(input.is_system),
    is_active: input.is_active !== false,
    capabilities,
    events,
    status_maps:
      (config.status_maps as PosTemplate["status_maps"]) ?? {
        outbound: {},
        inbound: {},
      },
    config,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockPosTemplates = [created, ...mockPosTemplates];
  return delay(created);
}

export async function mockGetPosTemplate(
  id: string | number,
): Promise<PosTemplate> {
  const found = mockPosTemplates.find((t) => String(t.id) === String(id));
  if (!found) {
    throw Object.assign(new Error("profile_not_found"), {
      status: 404,
      body: { code: "profile_not_found", message: "profile_not_found" },
    });
  }
  return delay(found);
}

export async function mockPatchPosTemplate(
  id: string | number,
  input: UpdatePosTemplateInput,
) {
  const idx = mockPosTemplates.findIndex((t) => String(t.id) === String(id));
  if (idx < 0) {
    throw Object.assign(new Error("profile_not_found"), {
      status: 404,
      body: { code: "profile_not_found", message: "profile_not_found" },
    });
  }
  const current = mockPosTemplates[idx];
  const nextConfig = input.config ?? current.config;
  const next: PosTemplate = {
    ...current,
    description:
      input.description !== undefined ? input.description : current.description,
    is_active:
      input.is_active !== undefined ? input.is_active : current.is_active,
    version: input.version !== undefined ? input.version : current.version,
    config: nextConfig,
    capabilities:
      (nextConfig?.capabilities as PosTemplate["capabilities"]) ??
      current.capabilities,
    events: (nextConfig?.events as PosTemplate["events"]) ?? current.events,
    status_maps:
      (nextConfig?.status_maps as PosTemplate["status_maps"]) ??
      current.status_maps,
    updated_at: new Date().toISOString(),
  };
  mockPosTemplates[idx] = next;
  return delay(next);
}

export async function mockClonePosTemplate(id: string | number) {
  const source = await mockGetPosTemplate(id);
  const provider = isPosProvider(source.provider)
    ? source.provider
    : "generic";
  return mockCreatePosTemplate({
    name: `${source.name}-clone-${Date.now()}`.slice(0, 100),
    provider,
    version: source.version,
    connector_type: source.connector_type as CreatePosTemplateInput["connector_type"],
    description: source.description ?? undefined,
    is_system: false,
    is_active: true,
    config: (source.config as Record<string, unknown>) ?? defaultPosTemplateConfig(provider),
  });
}

export async function mockTestMapPosTemplate(
  input: PosTestMapInput,
): Promise<PosTestMapResponse> {
  return delay({
    mapping_section: input.mapping_section,
    mapped: {
      order_id:
        typeof input.sample_payload.id === "string" ||
        typeof input.sample_payload.id === "number"
          ? String(input.sample_payload.id)
          : "POS-1001",
    },
  });
}

export async function mockTestConnectionPosTemplate(
  input: PosTestConnectionInput,
): Promise<PosTestConnectionResponse> {
  return delay({
    endpoint_key: input.endpoint_key,
    url: `https://pos-vendor.example.com/api/${input.endpoint_key}`,
    ok: true,
    status_code: 200,
    latency_ms: 120,
    error: null,
  });
}

export async function mockDeletePosTemplate(id: string | number) {
  const linked = Object.values(mockShopLinks).filter(
    (link) =>
      String(link.mapping_profile_id) === String(id) && link.is_active !== false,
  );
  if (linked.length > 0) {
    throw Object.assign(
      new Error(
        `Cannot deactivate profile ${id}: ${linked.length} active shop link(s) remain`,
      ),
      {
        status: 409,
        body: {
          code: "profile_has_active_shop_links",
          message: `Cannot deactivate profile ${id}: ${linked.length} active shop link(s) remain`,
        },
      },
    );
  }
  const idx = mockPosTemplates.findIndex((t) => String(t.id) === String(id));
  if (idx >= 0) {
    mockPosTemplates[idx] = {
      ...mockPosTemplates[idx],
      is_active: false,
      updated_at: new Date().toISOString(),
    };
  }
  return delay({ ok: true });
}

export async function mockListShopLinks(params?: {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  connector_type?: string;
  is_active?: boolean;
  catalog_sync_enabled?: boolean;
  order_push_enabled?: boolean;
  shop_id?: string;
}): Promise<Paginated<PosShopLink>> {
  let items = Object.values(mockShopLinks);
  if (params?.shop_id) {
    items = items.filter((link) => link.shop_id === params.shop_id);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    items = items.filter(
      (link) =>
        link.shop_id.toLowerCase().includes(q) ||
        String(link.mapping_profile_name ?? "")
          .toLowerCase()
          .includes(q),
    );
  }
  if (params?.provider) {
    items = items.filter((link) => link.provider === params.provider);
  }
  if (params?.connector_type) {
    items = items.filter((link) => link.connector_type === params.connector_type);
  }
  if (typeof params?.is_active === "boolean") {
    items = items.filter((link) => Boolean(link.is_active) === params.is_active);
  }
  if (typeof params?.catalog_sync_enabled === "boolean") {
    items = items.filter(
      (link) =>
        Boolean(link.catalog_sync_enabled) === params.catalog_sync_enabled,
    );
  }
  if (typeof params?.order_push_enabled === "boolean") {
    items = items.filter(
      (link) => Boolean(link.order_push_enabled) === params.order_push_enabled,
    );
  }
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const start = (page - 1) * limit;
  return delay({
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
  });
}

export async function mockGetShopLink(shopId: string): Promise<PosShopLink> {
  const found = mockShopLinks[shopId];
  if (!found) {
    throw Object.assign(new Error("integration_not_found"), {
      status: 404,
      body: { code: "integration_not_found", message: "integration_not_found" },
    });
  }
  return delay(found);
}

export async function mockAttachShopLink(
  shopId: string,
  input: AttachPosShopLinkInput,
) {
  const profile = mockPosTemplates.find(
    (t) => Number(t.id) === Number(input.mapping_profile_id) && t.is_active !== false,
  );
  if (!profile) {
    throw Object.assign(new Error("profile_not_found"), {
      status: 404,
      body: { code: "profile_not_found", message: "profile_not_found" },
    });
  }
  if (profile.provider !== input.provider) {
    throw Object.assign(new Error("profile_provider_mismatch"), {
      status: 400,
      body: {
        code: "profile_provider_mismatch",
        message: "profile_provider_mismatch",
      },
    });
  }
  if (profile.connector_type !== input.connector_type) {
    throw Object.assign(new Error("profile_connector_mismatch"), {
      status: 400,
      body: {
        code: "profile_connector_mismatch",
        message: "profile_connector_mismatch",
      },
    });
  }

  const provider = isPosProvider(input.provider) ? input.provider : "generic";
  const extras = mockShopExtras[shopId];
  const integrationEnabled = Boolean(
    extras?.features?.integration_enabled ?? false,
  );

  if (provider === "saleculator" && !integrationEnabled) {
    throw Object.assign(
      new Error(
        "integration_enabled must be true on the shop before attaching Saleculator lane",
      ),
      {
        status: 400,
        body: {
          code: "integration_disabled",
          message:
            "integration_enabled must be true on the shop before attaching Saleculator lane",
        },
      },
    );
  }

  let catalog_sync_enabled = Boolean(input.catalog_sync_enabled);
  let order_push_enabled = Boolean(input.order_push_enabled);
  let order_pull_enabled = Boolean(input.order_pull_enabled);
  if (provider === "saleculator") {
    catalog_sync_enabled = false;
    order_push_enabled = false;
    order_pull_enabled = true;
  } else if (provider === "cratis") {
    catalog_sync_enabled = true;
    order_push_enabled = true;
    order_pull_enabled = false;
  } else {
    catalog_sync_enabled = input.catalog_sync_enabled ?? false;
    order_push_enabled = input.order_push_enabled ?? true;
    order_pull_enabled = input.order_pull_enabled ?? false;
  }

  const overrides = (input.config_overrides ?? {}) as Record<string, unknown>;
  const api = (overrides.api ?? {}) as Record<string, unknown>;
  const baseUrl = typeof api.baseUrl === "string" ? api.baseUrl.trim() : "";
  if (order_push_enabled && !baseUrl) {
    throw Object.assign(
      new Error(
        "config_overrides.api.baseUrl is required when order push is enabled for this lane",
      ),
      {
        status: 400,
        body: {
          code: "pos_base_url_required",
          message:
            "config_overrides.api.baseUrl is required when order push is enabled for this lane",
        },
      },
    );
  }

  const existing = mockShopLinks[shopId];
  const now = new Date().toISOString();
  const link: PosShopLink = {
    id: existing?.id ?? ++mockShopLinkSeq,
    shop_id: shopId,
    mapping_profile_id: Number(input.mapping_profile_id),
    mapping_profile_name: profile.name,
    provider: input.provider,
    connector_type: input.connector_type,
    lane: laneForProvider(provider),
    is_active: input.is_active !== false,
    config_overrides: overrides,
    config_version: (existing?.config_version ?? 0) + 1,
    has_credentials: Boolean(input.credentials_plaintext),
    webhook_secret_configured: Boolean(input.webhook_secret),
    integration_token_present: Boolean(extras?.has_integration_token),
    integration_enabled: integrationEnabled,
    capabilities: input.capabilities ?? {},
    events: profile.events ?? POS_DEFAULT_EVENTS[provider],
    status_maps: profile.status_maps ?? { outbound: {}, inbound: {} },
    catalog_sync_enabled,
    order_push_enabled,
    order_pull_enabled,
    last_catalog_sync_at: existing?.last_catalog_sync_at ?? null,
    last_order_sync_at: existing?.last_order_sync_at ?? null,
    sync_error: null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  mockShopLinks[shopId] = link;
  return delay(link);
}

export async function mockPatchLinkFeatures(
  shopId: string,
  input: PatchPosLinkFeaturesInput,
) {
  const existing = mockShopLinks[shopId];
  if (!existing) {
    throw Object.assign(new Error("integration_not_found"), {
      status: 404,
      body: { code: "integration_not_found", message: "integration_not_found" },
    });
  }
  if (
    existing.provider === "saleculator" &&
    input.catalog_sync_enabled === true
  ) {
    throw Object.assign(
      new Error("Catalog sync is not supported for Saleculator pull lane"),
      {
        status: 400,
        body: {
          code: "saleculator_catalog_disabled",
          message: "Catalog sync is not supported for Saleculator pull lane",
        },
      },
    );
  }
  mockShopLinks[shopId] = {
    ...existing,
    ...input,
    updated_at: new Date().toISOString(),
  };
  return delay(mockShopLinks[shopId]);
}

export async function mockGetSyncStatus(shopId: string): Promise<PosSyncStatus> {
  const link = mockShopLinks[shopId];
  const extras = mockShopExtras[shopId];
  const integrationEnabled = Boolean(
    extras?.features?.integration_enabled ?? link?.integration_enabled,
  );
  const warnings: string[] = [];
  if (link?.provider === "saleculator" && !integrationEnabled) {
    warnings.push(
      "integration_enabled is false; Saleculator poll requires enabled integration and a valid token.",
    );
  }
  return delay({
    shop_id: shopId,
    provider: link?.provider ?? null,
    connector_type: link?.connector_type ?? null,
    lane: link?.lane ?? null,
    is_active: Boolean(link?.is_active),
    integration_enabled: integrationEnabled,
    integration_token_present: Boolean(extras?.has_integration_token),
    catalog_sync_enabled: Boolean(link?.catalog_sync_enabled),
    order_push_enabled: Boolean(link?.order_push_enabled),
    order_pull_enabled: Boolean(link?.order_pull_enabled),
    last_catalog_sync_at: link?.last_catalog_sync_at ?? null,
    last_order_sync_at: link?.last_order_sync_at ?? "2026-08-04T11:30:00.000Z",
    sync_error: link?.sync_error ?? null,
    config_version: link?.config_version ?? null,
    warnings,
  });
}

export async function mockHealth(): Promise<HealthResponse> {
  return delay({
    status: "ok",
    checks: {
      api: "ok",
      database: "ok",
      redis: "ok",
      mode: "development-mock",
    },
  });
}

function dubaiDayBuckets(days: number) {
  const end = new Date();
  // Approximate Dubai calendar days for mock series
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  });
}

export async function mockDashboardSummary(params?: {
  start_date?: string;
  end_date?: string;
  billing_month?: string;
}): Promise<DashboardSummaryResponse> {
  void params;
  return delay({
    total_shops_registered: 59,
    active_restaurants: 52,
    todays_orders: 186,
    platform_revenue: "12450.75",
    total_customers: 10646,
    active_tickets: 7,
    customers_under_shops: 8901,
    yaadro_current_month_revenue: "18500.00",
    timezone: "Asia/Dubai",
    as_of: new Date().toISOString(),
  });
}

export async function mockDashboardCharts(params?: {
  range?: "day" | "week" | "month";
  granularity?: "day" | "week" | "month";
}): Promise<DashboardChartsResponse> {
  const range = params?.range ?? "week";
  const days = range === "day" ? 1 : range === "month" ? 30 : 7;
  const buckets = dubaiDayBuckets(days);

  const revenue_analytics = buckets.map((bucket, i) => {
    const base = 900 + i * 80 + (i % 3) * 120;
    return {
      bucket,
      value: (base + Math.sin(i) * 90).toFixed(2),
      count: 30 + i * 4,
    };
  });

  const yaadro_revenue_analytics = buckets.map((bucket, i) => ({
    bucket,
    value: (400 + i * 35 + (i % 2) * 50).toFixed(2),
    count: 2 + (i % 4),
  }));

  const end = buckets[buckets.length - 1]?.slice(0, 10) ?? "2026-07-21";
  const start = buckets[0]?.slice(0, 10) ?? "2026-07-15";

  return delay({
    range,
    granularity: params?.granularity ?? "day",
    start_date: start,
    end_date: end,
    timezone: "Asia/Dubai",
    revenue_analytics,
    yaadro_revenue_analytics,
    restaurant_performance: [
      {
        shop_id: "SHOP001",
        shop_name: "Al Noor Kitchen",
        delivered_orders: 128,
        revenue: "15240.00",
        on_time_deliveries: 110,
        on_time_percent: 85.94,
      },
      {
        shop_id: "SHOP002",
        shop_name: "Marina Bites",
        delivered_orders: 96,
        revenue: "11820.50",
        on_time_deliveries: 81,
        on_time_percent: 84.38,
      },
      {
        shop_id: "SHOP003",
        shop_name: "Corniche Grill",
        delivered_orders: 72,
        revenue: "8640.00",
        on_time_deliveries: 54,
        on_time_percent: 75.0,
      },
      {
        shop_id: "SHOP004",
        shop_name: "Desert Spoon",
        delivered_orders: 64,
        revenue: "7120.25",
        on_time_deliveries: 58,
        on_time_percent: 90.63,
      },
      {
        shop_id: "SHOP005",
        shop_name: "Harbor Cafe",
        delivered_orders: 51,
        revenue: "5980.00",
        on_time_deliveries: 40,
        on_time_percent: 78.43,
      },
    ],
    subscription_analytics: {
      pending: 5,
      issued: 12,
      paid: 30,
      failed: 1,
      overdue: 2,
      void: 0,
    },
    order_trends: {
      breakfast: 45,
      lunch: 120,
      dinner: 200,
      other: 35,
    },
    activity: {
      latest_shops: [
        {
          shop_id: "SHOP059",
          shop_name: "Palm Bowl",
          created_at: "2026-07-22T09:12:00.000Z",
        },
        {
          shop_id: "SHOP058",
          shop_name: "Spice Route",
          created_at: "2026-07-21T16:40:00.000Z",
        },
        {
          shop_id: "SHOP057",
          shop_name: "Blue Lagoon Kitchen",
          created_at: "2026-07-20T11:05:00.000Z",
        },
        {
          shop_id: "SHOP056",
          shop_name: "Souk Bites",
          created_at: "2026-07-19T08:22:00.000Z",
        },
        {
          shop_id: "SHOP055",
          shop_name: "Creek Deli",
          created_at: "2026-07-18T14:55:00.000Z",
        },
      ],
      latest_groups: [
        { id: 12, name: "Dubai Marina Cluster", created_at: "2026-07-21T08:00:00.000Z" },
        { id: 11, name: "Abu Dhabi Central", created_at: "2026-07-19T10:30:00.000Z" },
        { id: 10, name: "Sharjah Express", created_at: "2026-07-17T13:15:00.000Z" },
      ],
    },
    as_of: new Date().toISOString(),
  });
}

let mockInvoicesStore: Invoice[] = [
  {
    id: 1,
    invoice_id: 1,
    invoice_number: "INV-SEED-0001",
    shop_id: "SHOP001",
    shop_name: "Al Noor Kitchen",
    subscription_id: 11,
    document_type: "INVOICE",
    status: "PAID",
    billing_month: "2026-04",
    billing_period_start: "2026-04-01",
    billing_period_end: "2026-04-30",
    amount: "1200.00",
    discount: "0.00",
    other_charges: "0.00",
    vat: "60.00",
    total: "1260.00",
    due_date: "2026-04-15",
    paid_at: "2026-04-10T10:00:00+04:00",
    transaction_reference: "TXN-APR-001",
    created_at: "2026-04-01T08:00:00+04:00",
    updated_at: "2026-04-10T10:00:00+04:00",
  },
  {
    id: 2,
    invoice_id: 2,
    invoice_number: "INV-SEED-0002",
    shop_id: "SHOP001",
    shop_name: "Al Noor Kitchen",
    subscription_id: 11,
    document_type: "INVOICE",
    status: "ISSUED",
    billing_month: "2026-05",
    billing_period_start: "2026-05-01",
    billing_period_end: "2026-05-31",
    amount: "1200.00",
    discount: "0.00",
    other_charges: "0.00",
    vat: "60.00",
    total: "1260.00",
    due_date: "2026-06-10",
    created_at: "2026-05-01T08:00:00+04:00",
    updated_at: "2026-05-01T08:00:00+04:00",
  },
  {
    id: 3,
    invoice_id: 3,
    invoice_number: "INV-SEED-0003",
    shop_id: "SHOP002",
    shop_name: "Marina Bites",
    subscription_id: 22,
    document_type: "INVOICE",
    status: "PENDING",
    billing_month: "2026-06",
    billing_period_start: "2026-06-01",
    billing_period_end: "2026-06-30",
    amount: "980.00",
    discount: "0.00",
    other_charges: "0.00",
    vat: "49.00",
    total: "1029.00",
    due_date: "2026-06-20",
    created_at: "2026-06-01T08:00:00+04:00",
    updated_at: "2026-06-01T08:00:00+04:00",
  },
  {
    id: 4,
    invoice_id: 4,
    invoice_number: "INV-SEED-0004",
    shop_id: "SHOP002",
    shop_name: "Marina Bites",
    subscription_id: 22,
    document_type: "INVOICE",
    status: "PENDING",
    billing_month: "2026-07",
    billing_period_start: "2026-07-01",
    billing_period_end: "2026-07-31",
    amount: "980.00",
    discount: "15.00",
    other_charges: "5.00",
    vat: "48.50",
    total: "1018.50",
    due_date: "2026-07-20",
    created_at: "2026-07-01T08:00:00+04:00",
    updated_at: "2026-07-01T08:00:00+04:00",
  },
];

export async function mockListInvoices(params?: {
  shop_id?: string;
  status?: InvoiceStatus;
  billing_month?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Invoice>> {
  let items = [...mockInvoicesStore];
  if (params?.shop_id) items = items.filter((i) => i.shop_id === params.shop_id);
  if (params?.status) items = items.filter((i) => i.status === params.status);
  if (params?.billing_month) {
    items = items.filter(
      (i) =>
        i.billing_month === params.billing_month ||
        i.billing_period_start?.startsWith(params.billing_month!),
    );
  }
  return delay({
    items,
    total: items.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  });
}

export async function mockGetInvoice(invoiceId: string | number): Promise<Invoice> {
  const found = mockInvoicesStore.find(
    (i) =>
      String(i.id) === String(invoiceId) ||
      String(i.invoice_id) === String(invoiceId) ||
      String(i.invoice_number) === String(invoiceId),
  );
  if (!found) throw Object.assign(new Error("Invoice not found"), { status: 404 });
  return delay({
    ...found,
    shop: {
      shop_id: found.shop_id,
      shop_name: found.shop_name,
      vat_enabled: true,
      vat_rate: "5",
    },
    description:
      found.description ??
      `Subscription invoice for ${found.billing_month ?? found.billing_period_start}`,
  });
}

export async function mockGenerateInvoices(billing_month: string) {
  const nextId =
    Math.max(0, ...mockInvoicesStore.map((i) => Number(i.invoice_id) || 0)) + 1;
  const invoiceNumber = `INV-GEN-${billing_month}-${nextId}`;
  mockInvoicesStore.unshift({
    id: nextId,
    invoice_id: nextId,
    invoice_number: invoiceNumber,
    shop_id: "SHOP001",
    shop_name: "Al Noor Kitchen",
    subscription_id: 11,
    document_type: "INVOICE",
    status: "PENDING",
    billing_month,
    billing_period_start: `${billing_month}-01`,
    billing_period_end: `${billing_month}-28`,
    amount: "1200.00",
    discount: "0.00",
    other_charges: "0.00",
    vat: "60.00",
    total: "1260.00",
    due_date: `${billing_month}-20`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return delay({ billing_month, created: 1, skipped: 2, eligible: 3 });
}

export async function mockMarkOverdue() {
  let updated = 0;
  mockInvoicesStore = mockInvoicesStore.map((inv) => {
    if (inv.status === "ISSUED") {
      updated += 1;
      return { ...inv, status: "OVERDUE" };
    }
    return inv;
  });
  return delay({ updated, as_of: new Date().toISOString() });
}

export async function mockPatchInvoice(
  invoiceId: string | number,
  input: { amount?: string; discount?: string; other_charges?: string },
) {
  const idx = mockInvoicesStore.findIndex(
    (i) =>
      String(i.id) === String(invoiceId) ||
      String(i.invoice_id) === String(invoiceId),
  );
  if (idx < 0) {
    throw Object.assign(new Error("Invoice not found"), { status: 404 });
  }
  const current = mockInvoicesStore[idx];
  const status = String(current.status).toUpperCase();
  if (!["PENDING", "ISSUED", "OVERDUE"].includes(status)) {
    throw Object.assign(
      new Error(`Cannot adjust invoice in status ${status}`),
      { status: 400 },
    );
  }
  const amount = input.amount ?? String(current.amount ?? "0");
  const discount = input.discount ?? String(current.discount ?? "0");
  const other = input.other_charges ?? String(current.other_charges ?? "0");
  const vat = Number(current.vat) || 0;
  const total = (
    Number(amount) -
    Number(discount) +
    Number(other) +
    vat
  ).toFixed(2);
  mockInvoicesStore[idx] = {
    ...current,
    ...(input.amount != null ? { amount: input.amount } : {}),
    ...(input.discount != null ? { discount: input.discount } : {}),
    ...(input.other_charges != null
      ? { other_charges: input.other_charges }
      : {}),
    total,
    updated_at: new Date().toISOString(),
  };
  return delay(mockInvoicesStore[idx]);
}

export async function mockPayInvoice(
  invoiceId: string | number,
  input: { transaction_reference: string; paid_at: string },
) {
  const idx = mockInvoicesStore.findIndex(
    (i) => String(i.id) === String(invoiceId) || String(i.invoice_id) === String(invoiceId),
  );
  if (idx < 0) throw Object.assign(new Error("Invoice not found"), { status: 404 });
  mockInvoicesStore[idx] = {
    ...mockInvoicesStore[idx],
    status: "PAID",
    transaction_reference: input.transaction_reference,
    paid_at: input.paid_at,
  };
  return delay(mockInvoicesStore[idx]);
}

export async function mockVoidInvoice(invoiceId: string | number) {
  const idx = mockInvoicesStore.findIndex(
    (i) => String(i.id) === String(invoiceId) || String(i.invoice_id) === String(invoiceId),
  );
  if (idx < 0) throw Object.assign(new Error("Invoice not found"), { status: 404 });
  mockInvoicesStore[idx] = { ...mockInvoicesStore[idx], status: "VOID" };
  return delay(mockInvoicesStore[idx]);
}

export async function mockAnalyticsRestaurants(params?: {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: string;
}): Promise<Paginated<RestaurantPerformanceRow>> {
  const charts = await mockDashboardCharts({ range: "week" });
  let items = [...charts.restaurant_performance];
  const sortBy = params?.sort_by ?? "revenue";
  const dir = params?.sort_dir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    const av =
      sortBy === "delivered_orders"
        ? a.delivered_orders
        : sortBy === "on_time_percent"
          ? a.on_time_percent
          : Number(a.revenue);
    const bv =
      sortBy === "delivered_orders"
        ? b.delivered_orders
        : sortBy === "on_time_percent"
          ? b.on_time_percent
          : Number(b.revenue);
    return (av - bv) * dir;
  });
  return delay({
    items,
    total: items.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  });
}

export async function mockAnalyticsTickets(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<Paginated<AnalyticsTicket>> {
  let items: AnalyticsTicket[] = [
    {
      id: 7,
      user_id: "42",
      user_role: "customer",
      order_id: 100,
      shop_id: "TESTSHOP01",
      status: "open",
      reason: "Missing item from order",
      images: [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop",
      ],
      created_at: "2026-07-15T08:00:00.000Z",
    },
    {
      id: 101,
      user_id: "c-1001",
      user_role: "customer",
      order_id: 9001,
      shop_id: "SHOP001",
      status: "open",
      reason: "Late delivery",
      images: [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=400&fit=crop",
      ],
      created_at: "2026-07-22T08:10:00.000Z",
    },
    {
      id: 102,
      user_id: "c-1002",
      user_role: "customer",
      order_id: 9008,
      shop_id: "SHOP002",
      status: "accepted",
      reason: "Missing item",
      images: [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
      ],
      created_at: "2026-07-21T15:40:00.000Z",
    },
    {
      id: 103,
      user_id: "dp-55",
      user_role: "rider",
      order_id: null,
      shop_id: "SHOP003",
      status: "open",
      reason: "App login issue",
      images: [],
      created_at: "2026-07-21T11:05:00.000Z",
    },
  ];
  if (params?.status) {
    items = items.filter((t) => t.status === params.status);
  }
  return delay({
    items,
    total: items.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  });
}

export async function mockAnalyticsCustomers(params?: {
  page?: number;
  limit?: number;
  shop_id?: string;
}): Promise<Paginated<AnalyticsCustomerRow>> {
  let items: AnalyticsCustomerRow[] = [
    {
      shop_id: "SHOP001",
      shop_name: "Al Noor Kitchen",
      customers: 420,
      active_customers: 188,
      total_orders: 3120,
    },
    {
      shop_id: "SHOP002",
      shop_name: "Marina Bites",
      customers: 310,
      active_customers: 142,
      total_orders: 2210,
    },
    {
      shop_id: "SHOP003",
      shop_name: "Corniche Grill",
      customers: 190,
      active_customers: 64,
      total_orders: 980,
    },
  ];
  if (params?.shop_id) {
    items = items.filter((i) => i.shop_id === params.shop_id);
  }
  return delay({
    items,
    total: items.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  });
}

export async function mockAnalyticsSubscriptions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  billing_month?: string;
}): Promise<Paginated<Invoice>> {
  return mockListInvoices(params);
}

export async function mockExportAnalyticsJson(
  shopId: string,
  params: {
    dataset: ReportDataset;
    start_date?: string;
    end_date?: string;
  },
) {
  return delay({
    shop_id: shopId,
    dataset: params.dataset,
    start_date: params.start_date,
    end_date: params.end_date,
    status_counts: { delivered: 120, cancelled: 8, pending: 14 },
    delivered_totals: { revenue: "15240.00", orders: 120 },
    average_times: { prep_min: 18, delivery_min: 26 },
    delivery_partners: [
      { id: "DP1001", name: "Ahmed Hassan", deliveries: 54 },
      { id: "DP1002", name: "Ravi Kumar", deliveries: 41 },
    ],
  });
}

export async function mockExportReportBlob(
  shopId: string,
  params: { dataset: ReportDataset; start_date?: string; end_date?: string },
) {
  const { buildWorkbookBlob } = await import("@/lib/excel");
  const start = params.start_date || "2026-07-01";
  const end = params.end_date || "2026-07-10";

  let rows: Array<Array<string | number | null>>;
  let sheetName: string;

  if (params.dataset === "customers") {
    sheetName = "Customers";
    rows = [
      ["customer_id", "name", "phone", "email", "orders", "last_order_at", "spend_aed"],
      ["C1001", "Fatima Al Ali", "971501111001", "fatima@example.com", 12, "2026-07-09", 480.5],
      ["C1002", "John Smith", "971502222002", "john@example.com", 7, "2026-07-08", 215],
      ["C1003", "Priya Nair", "971503333003", "priya@example.com", 19, "2026-07-10", 920.75],
    ];
  } else if (params.dataset === "delivery_partners") {
    sheetName = "Delivery partners";
    rows = [
      ["partner_id", "name", "deliveries", "on_time_pct", "avg_mins", "rating"],
      ["DP1001", "Ahmed Hassan", 54, 96.2, 24, 4.8],
      ["DP1002", "Ravi Kumar", 41, 91.5, 28, 4.6],
      ["DP1003", "Sara Khan", 33, 94.1, 26, 4.7],
    ];
  } else if (params.dataset === "venue_pickers") {
    sheetName = "Venue pickers";
    rows = [
      [
        "venue_picker_id",
        "venue_picker_name",
        "phone",
        "scope",
        "is_blocked",
        "orders",
      ],
      ["VP1001", "Table Host A", "971500004444", "table", "false", 18],
      ["VP1002", "Pickup Desk", "971500005555", "pickup_counter", "false", 12],
      ["VP2001", "Room Attendant", "971500006666", "room", "true", 3],
    ];
  } else {
    sheetName = "Orders";
    rows = [
      ["order_id", "placed_at", "status", "customer", "items", "amount_aed", "partner"],
      ["ORD-1001", `${start}T12:10:00+04:00`, "delivered", "Fatima Al Ali", 3, 86.5, "Ahmed Hassan"],
      ["ORD-1002", `${start}T13:22:00+04:00`, "delivered", "John Smith", 2, 54, "Ravi Kumar"],
      ["ORD-1003", `${end}T18:05:00+04:00`, "cancelled", "Priya Nair", 1, 22, "—"],
      ["ORD-1004", `${end}T19:40:00+04:00`, "delivered", "Fatima Al Ali", 4, 120.25, "Sara Khan"],
      ["ORD-1005", `${end}T20:15:00+04:00`, "pending", "John Smith", 2, 41.5, "Ahmed Hassan"],
    ];
  }

  const filename = `${shopId}-${params.dataset}-export.xlsx`;
  const built = buildWorkbookBlob([{ name: sheetName, rows }], filename);
  return delay(built);
}

export async function mockTriggerShopLogout(
  shopId: string,
): Promise<TriggerShopLogoutResponse> {
  const exists = mockShops.some((s) => s.shop_id === shopId);
  if (!exists) {
    throw Object.assign(new Error("Shop not found"), { status: 404 });
  }
  return delay({
    status: "accepted",
    event_id: crypto.randomUUID(),
    shop_id: shopId,
    occurred_at: new Date().toISOString(),
  });
}

