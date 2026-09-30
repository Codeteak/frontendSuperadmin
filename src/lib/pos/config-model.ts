import {
  defaultPosTemplateConfig,
  type PosAuthType,
  type PosCapabilities,
  type PosEndpointKey,
  type PosEvents,
  type PosStatusUpdateMode,
  POS_ENDPOINT_KEYS,
} from "@/lib/pos/contract";

export type PosEndpointDef = {
  method: string;
  path: string;
  query?: Record<string, string>;
};

export type PosApiConfig = {
  baseUrl: string;
  auth: {
    type: PosAuthType;
    headerName: string;
    tokenUrl: string;
  };
  menuTenant: { account: string; location: string };
  orderTenant: { account: string; location: string };
  endpoints: Partial<Record<PosEndpointKey, PosEndpointDef>>;
};

export type PosTemplateConfigModel = {
  api: PosApiConfig;
  capabilities: PosCapabilities;
  events: PosEvents;
  status_maps: {
    outbound: Record<string, string>;
    inbound: Record<string, string>;
    export: Record<string, string>;
  };
  status_update: { mode: PosStatusUpdateMode };
  mappings: Record<string, unknown>;
  value_maps: Record<string, Record<string, string>>;
  /** Keys not handled by structured UI — preserved on save */
  extra: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function mapRecord(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string" || typeof val === "number") {
      out[k] = String(val);
    }
  }
  return out;
}

function parseValueMaps(raw: unknown): Record<string, Record<string, string>> {
  if (!isRecord(raw)) return {};
  const out: Record<string, Record<string, string>> = {};
  for (const [name, map] of Object.entries(raw)) {
    const parsed = mapRecord(map);
    if (Object.keys(parsed).length > 0) out[name] = parsed;
  }
  return out;
}

function parseEndpoint(v: unknown): PosEndpointDef | undefined {
  if (!isRecord(v)) return undefined;
  const path = str(v.path);
  if (!path) return undefined;
  return {
    method: str(v.method, "GET").toUpperCase(),
    path,
    query: mapRecord(v.query),
  };
}

function parseEndpoints(raw: unknown): Partial<Record<PosEndpointKey, PosEndpointDef>> {
  if (!isRecord(raw)) return {};
  const out: Partial<Record<PosEndpointKey, PosEndpointDef>> = {};
  for (const key of POS_ENDPOINT_KEYS) {
    const ep = parseEndpoint(raw[key]);
    if (ep) out[key] = ep;
  }
  return out;
}

function parseCapabilities(raw: unknown, provider: string): PosCapabilities {
  const defaults = defaultPosTemplateConfig(provider).capabilities as PosCapabilities;
  if (!isRecord(raw)) return defaults;
  return {
    catalog: (str(raw.catalog, defaults.catalog) as PosCapabilities["catalog"]) || defaults.catalog,
    orders_out: (str(raw.orders_out, defaults.orders_out) as PosCapabilities["orders_out"]) || defaults.orders_out,
    orders_in: (str(raw.orders_in, defaults.orders_in) as PosCapabilities["orders_in"]) || defaults.orders_in,
    status_out: (str(raw.status_out, defaults.status_out) as PosCapabilities["status_out"]) || defaults.status_out,
    status_in: (str(raw.status_in, defaults.status_in) as PosCapabilities["status_in"]) || defaults.status_in,
    riders: (str(raw.riders, defaults.riders) as PosCapabilities["riders"]) || defaults.riders,
  };
}

function parseEvents(raw: unknown, provider: string): PosEvents {
  const defaults = defaultPosTemplateConfig(provider).events as PosEvents;
  if (!isRecord(raw)) return defaults;
  const arr = (v: unknown, fallback: string[]) =>
    Array.isArray(v) ? v.map(String).filter(Boolean) : fallback;
  return {
    order_create_on: arr(raw.order_create_on, defaults.order_create_on ?? []),
    status_out_on: arr(raw.status_out_on, defaults.status_out_on ?? []),
  };
}

export function parseTemplateConfig(
  raw: Record<string, unknown> | null | undefined,
  provider: string,
): PosTemplateConfigModel {
  const defaults = defaultPosTemplateConfig(provider);
  const apiRaw = isRecord(raw?.api) ? raw.api : {};
  const authRaw = isRecord(apiRaw.auth) ? apiRaw.auth : {};
  const menuRaw = isRecord(apiRaw.menuTenant) ? apiRaw.menuTenant : {};
  const orderRaw = isRecord(apiRaw.orderTenant) ? apiRaw.orderTenant : {};
  const endpointsRaw =
    isRecord(apiRaw.endpoints) ? apiRaw.endpoints : isRecord(raw?.endpoints) ? raw.endpoints : {};

  const statusMapsRaw = isRecord(raw?.status_maps) ? raw.status_maps : {};
  const statusUpdateRaw = isRecord(raw?.status_update) ? raw.status_update : {};

  const knownTop = new Set([
    "api",
    "capabilities",
    "events",
    "status_maps",
    "status_update",
    "mappings",
    "value_maps",
    "endpoints",
  ]);
  const extra: Record<string, unknown> = {};
  if (raw) {
    for (const [k, v] of Object.entries(raw)) {
      if (!knownTop.has(k)) extra[k] = v;
    }
  }

  return {
    api: {
      baseUrl: str(apiRaw.baseUrl),
      auth: {
        type: (str(authRaw.type, "bearer") as PosAuthType) || "bearer",
        headerName: str(authRaw.headerName, "Authorization"),
        tokenUrl: str(authRaw.tokenUrl),
      },
      menuTenant: {
        account: str(menuRaw.account, "ACC001"),
        location: str(menuRaw.location, "LOC001"),
      },
      orderTenant: {
        account: str(orderRaw.account, "ACC001"),
        location: str(orderRaw.location, "LOC001"),
      },
      endpoints: parseEndpoints(endpointsRaw),
    },
    capabilities: parseCapabilities(raw?.capabilities, provider),
    events: parseEvents(raw?.events, provider),
    status_maps: {
      outbound: mapRecord(statusMapsRaw.outbound),
      inbound: mapRecord(statusMapsRaw.inbound),
      export: mapRecord(statusMapsRaw.export),
    },
    status_update: {
      mode: (str(statusUpdateRaw.mode, "api") as PosStatusUpdateMode) || "api",
    },
    mappings: isRecord(raw?.mappings) ? { ...raw.mappings } : {},
    value_maps: parseValueMaps(raw?.value_maps),
    extra,
  };
}

function serializeEndpoint(ep: PosEndpointDef | undefined): Record<string, unknown> | undefined {
  if (!ep?.path?.trim()) return undefined;
  const out: Record<string, unknown> = {
    method: ep.method || "GET",
    path: ep.path.trim(),
  };
  if (ep.query && Object.keys(ep.query).length > 0) {
    out.query = ep.query;
  }
  return out;
}

export function serializeTemplateConfig(model: PosTemplateConfigModel): Record<string, unknown> {
  const endpoints: Record<string, unknown> = {};
  for (const key of POS_ENDPOINT_KEYS) {
    const ep = serializeEndpoint(model.api.endpoints[key]);
    if (ep) endpoints[key] = ep;
  }

  const api: Record<string, unknown> = {
    auth: {
      type: model.api.auth.type,
      ...(model.api.auth.headerName.trim()
        ? { headerName: model.api.auth.headerName.trim() }
        : {}),
      ...(model.api.auth.tokenUrl.trim()
        ? { tokenUrl: model.api.auth.tokenUrl.trim() }
        : {}),
    },
    menuTenant: {
      account: model.api.menuTenant.account.trim() || "ACC001",
      location: model.api.menuTenant.location.trim() || "LOC001",
    },
    orderTenant: {
      account: model.api.orderTenant.account.trim() || "ACC001",
      location: model.api.orderTenant.location.trim() || "LOC001",
    },
    endpoints,
  };

  if (model.api.baseUrl.trim()) {
    api.baseUrl = model.api.baseUrl.trim();
  }

  const status_maps: Record<string, unknown> = {};
  if (Object.keys(model.status_maps.outbound).length) {
    status_maps.outbound = model.status_maps.outbound;
  }
  if (Object.keys(model.status_maps.inbound).length) {
    status_maps.inbound = model.status_maps.inbound;
  }
  if (Object.keys(model.status_maps.export).length) {
    status_maps.export = model.status_maps.export;
  }

  const value_maps: Record<string, unknown> = {};
  for (const [name, map] of Object.entries(model.value_maps)) {
    if (Object.keys(map).length > 0) value_maps[name] = map;
  }

  return {
    ...model.extra,
    api,
    capabilities: model.capabilities,
    events: model.events,
    status_maps,
    status_update: model.status_update,
    mappings: model.mappings,
    ...(Object.keys(value_maps).length ? { value_maps } : {}),
  };
}
