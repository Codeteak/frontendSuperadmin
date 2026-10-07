/**
 * Known POS providers (Cratis, Saleculator, Generic, Gravity).
 * Pull POS names (dart, topos, …) are template slugs with connector
 * saleculator_pull. Do not add those names to POS_PROVIDERS.
 */

export const POS_PROVIDERS = [
  "cratis",
  "saleculator",
  "generic",
  "gravity",
] as const;

export type PosProvider = (typeof POS_PROVIDERS)[number];

export const POS_CONNECTOR_TYPES = [
  "cratis",
  "saleculator_pull",
  "generic_json",
  "webhook_inbound",
  "gravity",
] as const;

export type PosConnectorType = (typeof POS_CONNECTOR_TYPES)[number];

/** Provider → allowed connector_type pairs (server-enforced). */
export const POS_PROVIDER_CONNECTOR_PAIRS = {
  cratis: ["cratis"],
  saleculator: ["saleculator_pull"],
  generic: ["generic_json", "webhook_inbound"],
  gravity: ["gravity", "generic_json", "webhook_inbound"],
} as const satisfies Record<PosProvider, readonly PosConnectorType[]>;

export type PosLane =
  | "cratis"
  | "saleculator"
  | "generic"
  | "gravity";

/** Derived lane from provider (seeded templates use same name). */
export const POS_PROVIDER_LANE = {
  cratis: "cratis",
  saleculator: "saleculator",
  generic: "generic",
  gravity: "gravity",
} as const satisfies Record<PosProvider, PosLane>;

export const POS_CAPABILITY_CATALOG = [
  "none",
  "pull_combined",
  "pull_split",
] as const;
export type PosCapabilityCatalog = (typeof POS_CAPABILITY_CATALOG)[number];

export const POS_CAPABILITY_ORDERS_OUT = ["push", "none"] as const;
export type PosCapabilityOrdersOut = (typeof POS_CAPABILITY_ORDERS_OUT)[number];

export const POS_CAPABILITY_ORDERS_IN = [
  "webhook",
  "pos_pull",
  "none",
] as const;
export type PosCapabilityOrdersIn = (typeof POS_CAPABILITY_ORDERS_IN)[number];

export const POS_CAPABILITY_STATUS_OUT = ["push", "none"] as const;
export type PosCapabilityStatusOut = (typeof POS_CAPABILITY_STATUS_OUT)[number];

export const POS_CAPABILITY_STATUS_IN = [
  "webhook",
  "pos_post",
  "none",
] as const;
export type PosCapabilityStatusIn = (typeof POS_CAPABILITY_STATUS_IN)[number];

export const POS_CAPABILITY_RIDERS = ["inbound", "none"] as const;
export type PosCapabilityRiders = (typeof POS_CAPABILITY_RIDERS)[number];

export type PosCapabilities = {
  catalog: PosCapabilityCatalog;
  orders_out: PosCapabilityOrdersOut;
  orders_in: PosCapabilityOrdersIn;
  status_out: PosCapabilityStatusOut;
  status_in: PosCapabilityStatusIn;
  riders: PosCapabilityRiders;
};

export type PosEvents = {
  order_create_on: string[];
  status_out_on: string[];
};

/** Known domain events (matches backend POS_DOMAIN_EVENTS). */
export const POS_DOMAIN_EVENTS = [
  "blank_created",
  "customer_order_created",
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Rejected",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "customer_not_available",
  "cancelled",
] as const;

export const POS_ORDER_CREATE_EVENT_OPTIONS = [
  "blank_created",
  "customer_order_created",
] as const;

export const POS_STATUS_OUT_EVENT_OPTIONS = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Rejected",
  "Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "customer_not_available",
  "cancelled",
] as const;

export type PosStatusMaps = {
  outbound?: Record<string, unknown>;
  inbound?: Record<string, unknown>;
  export?: Record<string, unknown>;
};

export const POS_AUTH_TYPES = [
  "none",
  "bearer",
  "integration_token",
  "oauth2_client_credentials",
] as const;
export type PosAuthType = (typeof POS_AUTH_TYPES)[number];

/** Auth types that require a `headerName` (static header injection). */
export const POS_AUTH_TYPES_NEEDING_HEADER = [
  "bearer",
  "integration_token",
  "oauth2_client_credentials",
] as const satisfies readonly PosAuthType[];

/** Auth types that require a `tokenUrl` (OAuth/login exchange). */
export const POS_AUTH_TYPES_NEEDING_TOKEN_URL = [
  "oauth2_client_credentials",
] as const satisfies readonly PosAuthType[];

/** Default header name per auth type when the vendor doesn't specify one. */
export const POS_AUTH_HEADER_DEFAULTS: Record<PosAuthType, string | undefined> = {
  none: undefined,
  bearer: "Authorization",
  integration_token: "X-Integration-Token",
  oauth2_client_credentials: "Authorization",
};

export function authTypeNeedsHeader(type: PosAuthType): boolean {
  return (POS_AUTH_TYPES_NEEDING_HEADER as readonly string[]).includes(type);
}

export function authTypeNeedsTokenUrl(type: PosAuthType): boolean {
  return (POS_AUTH_TYPES_NEEDING_TOKEN_URL as readonly string[]).includes(type);
}

export const POS_STATUS_UPDATE_MODES = [
  "api",
  "webhook_handshake",
  "none",
] as const;
export type PosStatusUpdateMode = (typeof POS_STATUS_UPDATE_MODES)[number];

export const POS_ENDPOINT_KEYS = [
  "menu",
  "menuCategories",
  "menuProducts",
  "orderCreate",
  "orderStatus",
  "riderSync",
] as const;
export type PosEndpointKey = (typeof POS_ENDPOINT_KEYS)[number];

export const POS_TEST_MAP_DEFAULT_SECTION = "order_inbound" as const;

/** Mapping sections consumed by dms-api MappingEngine / BillMapper. */
export const POS_MAPPING_SECTIONS = [
  "order_inbound",
  "order_outbound",
  "status_outbound",
  "catalog_sync",
  "catalog_categories",
  "catalog_products",
  "rider_inbound",
] as const;

/** Stored in Advanced JSON only — no dms-api consumer today. */
export const POS_MAPPING_SECTIONS_ADVANCED_ONLY = ["status_inbound"] as const;

/** Starter order_inbound for Lane C webhook profiles (matches backend migration). */
export const POS_STARTER_ORDER_INBOUND_MAPPING = {
  bill_no: { paths: ["vno", "bill_no", "id"] },
  customer_name: { paths: ["customer.name", "cust_name", "customer_name"] },
  customer_phone: { paths: ["customer.phone", "cust_phone", "customer_phone"] },
  address: { concat: ["addr1", "addr2"], separator: ", " },
  total_amount: { paths: ["total", "grand_total", "total_amount"] },
  payment_mode: { paths: ["pay_mode", "payment_mode"] },
  items: {
    array_path: "items",
    item: {
      item_name: { paths: ["itn", "name", "item_name"] },
      quantity: { paths: ["qty", "quantity"], default: 1 },
      price: { paths: ["rate", "price"], default: 0 },
      totalamount: { paths: ["amt", "total", "totalamount"], default: 0 },
    },
  },
} as const;

export const POS_TEMPLATE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

/** Server-forced feature flags on attach (Saleculator / Cratis). */
export const POS_LANE_ATTACH_PRESETS = {
  saleculator: {
    catalog_sync_enabled: false,
    order_push_enabled: false,
    order_pull_enabled: true,
    flagsLocked: true,
    requiresIntegration: true,
    requiresBaseUrl: false,
  },
  cratis: {
    catalog_sync_enabled: true,
    order_push_enabled: true,
    order_pull_enabled: false,
    flagsLocked: true,
    requiresIntegration: false,
    requiresBaseUrl: true,
  },
  generic: {
    catalog_sync_enabled: false,
    order_push_enabled: true,
    order_pull_enabled: false,
    flagsLocked: false,
    requiresIntegration: false,
    requiresBaseUrl: true,
  },
  gravity: {
    catalog_sync_enabled: false,
    order_push_enabled: true,
    order_pull_enabled: false,
    flagsLocked: false,
    requiresIntegration: false,
    requiresBaseUrl: true,
  },
} as const satisfies Record<
  PosProvider,
  {
    catalog_sync_enabled: boolean;
    order_push_enabled: boolean;
    order_pull_enabled: boolean;
    flagsLocked: boolean;
    requiresIntegration: boolean;
    requiresBaseUrl: boolean;
  }
>;

/** Default capabilities per provider for create-template starter config. */
export const POS_DEFAULT_CAPABILITIES: Record<PosProvider, PosCapabilities> = {
  cratis: {
    catalog: "pull_combined",
    orders_out: "push",
    orders_in: "webhook",
    status_out: "push",
    status_in: "webhook",
    riders: "inbound",
  },
  saleculator: {
    catalog: "none",
    orders_out: "none",
    orders_in: "pos_pull",
    status_out: "none",
    status_in: "pos_post",
    riders: "none",
  },
  generic: {
    catalog: "none",
    orders_out: "push",
    orders_in: "webhook",
    status_out: "push",
    status_in: "webhook",
    riders: "none",
  },
  gravity: {
    catalog: "none",
    orders_out: "push",
    orders_in: "webhook",
    status_out: "push",
    status_in: "webhook",
    riders: "none",
  },
};

export const POS_DEFAULT_EVENTS: Record<PosProvider, PosEvents> = {
  cratis: {
    order_create_on: ["blank_created"],
    status_out_on: [
      "Accepted",
      "Assigned",
      "Picked Up",
      "Out for Delivery",
      "Delivered",
      "cancelled",
      "Rejected",
    ],
  },
  saleculator: {
    order_create_on: [],
    status_out_on: [],
  },
  generic: {
    order_create_on: ["blank_created"],
    status_out_on: [
      "Accepted",
      "Assigned",
      "Picked Up",
      "Out for Delivery",
      "Delivered",
      "cancelled",
      "Rejected",
    ],
  },
  gravity: {
    order_create_on: ["blank_created"],
    status_out_on: [
      "Accepted",
      "Assigned",
      "Picked Up",
      "Out for Delivery",
      "Delivered",
      "cancelled",
      "Rejected",
    ],
  },
};

export function isPosProvider(value: unknown): value is PosProvider {
  return (
    typeof value === "string" &&
    (POS_PROVIDERS as readonly string[]).includes(value)
  );
}

export function connectorsForProvider(
  provider: PosProvider,
): readonly PosConnectorType[] {
  return POS_PROVIDER_CONNECTOR_PAIRS[provider];
}

export function defaultConnectorForProvider(
  provider: PosProvider,
): PosConnectorType {
  return POS_PROVIDER_CONNECTOR_PAIRS[provider][0];
}

export function isValidProviderConnectorPair(
  provider: PosProvider,
  connector: PosConnectorType,
): boolean {
  return (POS_PROVIDER_CONNECTOR_PAIRS[provider] as readonly string[]).includes(
    connector,
  );
}

export function laneForProvider(provider: PosProvider): PosLane {
  return POS_PROVIDER_LANE[provider];
}

export function attachPresetForProvider(provider: PosProvider) {
  return POS_LANE_ATTACH_PRESETS[provider];
}

/** Same attach flags as Saleculator. Used for Dart and any later pull POS. */
export const PULL_POS_ATTACH_PRESET = POS_LANE_ATTACH_PRESETS.saleculator;

const PULL_PROVIDER_SLUG = /^[a-z][a-z0-9_-]{0,31}$/;

const PULL_CONNECTOR_RESERVED = new Set<string>([
  "saleculator",
  "cratis",
  "generic",
  "gravity",
]);

/**
 * True when the profile is a pull till that is not Saleculator.
 * Gravity, Cratis, and Generic cannot use this connector.
 * Dart and Topos (and later pull slugs) are allowed.
 */
export function isPullPosProfile(provider: string, connector: string): boolean {
  const providerKey = provider.trim().toLowerCase();
  const connectorKey = connector.trim().toLowerCase();
  if (connectorKey !== "saleculator_pull") return false;
  if (PULL_CONNECTOR_RESERVED.has(providerKey)) return false;
  return PULL_PROVIDER_SLUG.test(providerKey);
}

export function displayPosProviderName(provider: string): string {
  const key = provider.trim().toLowerCase();
  if (isPosProvider(key)) return POS_PROVIDER_LABELS[key];
  if (!key) return "POS";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Short name for the device link_token copy. Saleculator stays "Saleculator". */
export function deviceLinkLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  if (!key || key === "saleculator") return "Saleculator";
  return displayPosProviderName(key);
}

export function laneForProfile(provider: string, connector: string): PosLane {
  if (isPosProvider(provider)) return laneForProvider(provider);
  if (isPullPosProfile(provider, connector)) return "saleculator";
  return "generic";
}

/** Known providers stay themselves. A pull POS name uses the Saleculator starter. */
function resolvedTemplateProvider(provider: string): PosProvider {
  const key = provider.trim().toLowerCase();
  if (isPosProvider(key)) return key;
  if (isPullPosProfile(key, "saleculator_pull")) return "saleculator";
  return "generic";
}

/** Starter config matching admin-api create schema. */
export function defaultPosTemplateConfig(
  provider: string = "cratis",
): Record<string, unknown> {
  const key = resolvedTemplateProvider(provider);
  const capabilities = POS_DEFAULT_CAPABILITIES[key];
  const events = POS_DEFAULT_EVENTS[key];
  const needsBaseUrl =
    capabilities.catalog !== "none" || capabilities.orders_out === "push";

  return {
    api: {
      baseUrl: needsBaseUrl ? "https://pos-vendor.example.com" : undefined,
      auth: {
        type: key === "saleculator" ? "integration_token" : "bearer",
        ...(key === "saleculator"
          ? {}
          : { headerName: "Authorization" }),
      },
      menuTenant: { account: "ACC001", location: "LOC001" },
      orderTenant: { account: "ACC001", location: "LOC001" },
      endpoints: {
        menu: { method: "GET", path: "/api/menu" },
        menuCategories: { method: "GET", path: "/api/menu/categories" },
        menuProducts: { method: "GET", path: "/api/menu/products" },
        orderCreate: { method: "POST", path: "/api/orders" },
        orderStatus: { method: "PATCH", path: "/api/orders/{id}/status" },
        riderSync: { method: "POST", path: "/api/riders" },
      },
    },
    capabilities,
    events,
    status_maps: { outbound: {}, inbound: {} },
    status_update: { mode: "api" as PosStatusUpdateMode },
    mappings: {
      order_inbound:
        key === "generic" || key === "gravity"
          ? { ...POS_STARTER_ORDER_INBOUND_MAPPING }
          : {
              bill_no: { paths: ["id", "bill_no", "vno"] },
            },
    },
  };
}

/** Starter config for a new pull POS. Saleculator templates do not use this. */
export function defaultPullPosTemplateConfig(): Record<string, unknown> {
  return {
    ...defaultPosTemplateConfig("saleculator"),
    pull: {
      inbound_delivery_only: true,
      rider_match: "id_or_code_or_unique_name",
      catalog_fields: {
        items: "items",
        name: "name",
        category: "category",
        price: "price",
        code: "code",
        name_alt: "name_alt",
      },
    },
  };
}

export function slugifyPosTemplateName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export const POS_PROVIDER_LABELS: Record<PosProvider, string> = {
  cratis: "Cratis (Lane A)",
  saleculator: "Saleculator (Lane B)",
  generic: "Generic (Lane C)",
  gravity: "Gravity",
};
