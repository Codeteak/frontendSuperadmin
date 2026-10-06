"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import { PosPlaybook } from "@/components/pos/pos-playbook";
import { DetailList } from "@/components/shared/detail-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  attachPresetForProvider,
  attachShopLink,
  defaultConnectorForProvider,
  displayPosProviderName,
  isPosProvider,
  isPullPosProfile,
  patchLinkFeatures,
  POS_PROVIDER_LABELS,
  PULL_POS_ATTACH_PRESET,
} from "@/lib/api/pos";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  POS_SHOP_FALLBACK_PLAYBOOK,
  POS_SHOP_OPERATE_PLAYBOOK,
  POS_SHOP_PLAYBOOK,
  pullShopPlaybook,
} from "@/lib/pos/playbook-copy";
import { cn } from "@/lib/utils";
import {
  shopDetailQuery,
  shopPosLinkQuery,
  shopSyncStatusQuery,
} from "@/lib/queries/shops";
import { posTemplatesQuery } from "@/lib/queries/pos";
import type { PosShopLink, PosSyncStatus } from "@/types/api";

function ShopSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? "max-w-3xl"}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function formatTs(value: unknown) {
  if (value == null || value === "") return "—";
  try {
    return new Date(String(value)).toLocaleString("en-AE", {
      timeZone: "Asia/Dubai",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function slugFromOrdersPath(path: string) {
  return path.split("/").filter(Boolean)[0] ?? "";
}

function yesNo(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

export function ShopPosTab({ shopId }: { shopId: string }) {
  const shopQuery = useQuery(shopDetailQuery(shopId));
  const templatesQuery = useQuery(
    posTemplatesQuery({ page: 1, limit: 100, is_active: true }),
  );
  const linkQuery = useQuery(shopPosLinkQuery(shopId));
  const syncQuery = useQuery(shopSyncStatusQuery(shopId));

  const shop = shopQuery.data;
  const templates = templatesQuery.data?.items ?? [];
  const link =
    linkQuery.data ??
    (linkQuery.error instanceof ApiError && linkQuery.error.status === 404
      ? null
      : null);
  const sync = (syncQuery.data as PosSyncStatus | undefined) ?? null;

  const integrationEnabled = Boolean(
    shop?.features?.integration_enabled ?? shop?.integration_enabled,
  );

  const [form, setForm] = useState({
    mapping_profile_id: "",
    provider: "cratis",
    connector_type: "cratis",
    is_active: true,
    catalog_sync_enabled: true,
    order_push_enabled: true,
    order_pull_enabled: false,
    base_url: "",
    auth_type: "bearer",
    menu_path: "",
    orders_path: "",
    provider_slug: "",
    account: "",
    location: "",
    brand_id: "",
    timezone: "Asia/Dubai",
    channel: "Yaadro",
    credentials_plaintext: "",
    webhook_secret: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const pullPartner = isPullPosProfile(form.provider, form.connector_type);
  const selectedProvider = isPosProvider(form.provider)
    ? form.provider
    : null;
  const preset = pullPartner
    ? PULL_POS_ATTACH_PRESET
    : selectedProvider
      ? attachPresetForProvider(selectedProvider)
      : null;
  const pullName = displayPosProviderName(form.provider);
  const selectedTemplateName =
    templates.find((t) => String(t.id) === form.mapping_profile_id)?.name ??
    "the template";

  useEffect(() => {
    const existing = linkQuery.data as PosShopLink | undefined;
    if (!existing) return;
    const overrides = (existing.config_overrides ?? {}) as Record<
      string,
      unknown
    >;
    const api = (overrides.api ?? {}) as Record<string, unknown>;
    const auth = (api.auth ?? {}) as Record<string, unknown>;
    const menuTenant = (api.menuTenant ?? {}) as Record<string, unknown>;
    const orderTenant = (api.orderTenant ?? {}) as Record<string, unknown>;
    setForm({
      mapping_profile_id: String(existing.mapping_profile_id ?? ""),
      provider: String(existing.provider ?? "cratis"),
      connector_type: String(existing.connector_type ?? "cratis"),
      is_active: Boolean(existing.is_active ?? true),
      catalog_sync_enabled: Boolean(existing.catalog_sync_enabled ?? false),
      order_push_enabled: Boolean(existing.order_push_enabled ?? false),
      order_pull_enabled: Boolean(existing.order_pull_enabled ?? false),
      base_url: typeof api.baseUrl === "string" ? api.baseUrl : "",
      auth_type: typeof auth.type === "string" ? auth.type : "bearer",
      menu_path: typeof api.menuPath === "string" ? api.menuPath : "",
      orders_path: typeof api.ordersPath === "string" ? api.ordersPath : "",
      provider_slug:
        typeof api.providerSlug === "string" && api.providerSlug.trim()
          ? api.providerSlug
          : slugFromOrdersPath(
              typeof api.ordersPath === "string" ? api.ordersPath : "",
            ),
      account:
        typeof menuTenant.account === "string"
          ? menuTenant.account
          : typeof orderTenant.account === "string"
            ? orderTenant.account
            : typeof api.account === "string"
              ? api.account
              : "",
      location:
        typeof menuTenant.location === "string"
          ? menuTenant.location
          : typeof orderTenant.location === "string"
            ? orderTenant.location
            : typeof api.location === "string"
              ? api.location
              : "",
      brand_id: typeof api.brandId === "string" ? api.brandId : "",
      timezone:
        typeof api.timezone === "string" ? api.timezone : "Asia/Dubai",
      channel: typeof api.channel === "string" ? api.channel : "Yaadro",
      credentials_plaintext: "",
      webhook_secret: "",
    });
  }, [linkQuery.data]);

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => String(t.id) === templateId);
    if (!template) {
      setForm((prev) => ({ ...prev, mapping_profile_id: templateId }));
      return;
    }
    const rawProvider = String(template.provider ?? "").trim().toLowerCase();
    const rawConnector = String(template.connector_type ?? "")
      .trim()
      .toLowerCase();
    const pull = isPullPosProfile(rawProvider, rawConnector);
    const provider = isPosProvider(rawProvider)
      ? rawProvider
      : pull
        ? rawProvider
        : "generic";
    const lanePreset = pull
      ? PULL_POS_ATTACH_PRESET
      : attachPresetForProvider(isPosProvider(provider) ? provider : "generic");
    setForm((prev) => ({
      ...prev,
      mapping_profile_id: templateId,
      provider,
      connector_type:
        rawConnector ||
        (isPosProvider(provider)
          ? defaultConnectorForProvider(provider)
          : rawConnector),
      catalog_sync_enabled: lanePreset.catalog_sync_enabled,
      order_push_enabled: lanePreset.order_push_enabled,
      order_pull_enabled: lanePreset.order_pull_enabled,
      ...(provider === "cratis"
        ? {
            base_url: "https://online.cratis.live",
            auth_type: "bearer",
            provider_slug: "cratis_test",
            menu_path: "/cratis_test/pos/",
            orders_path: "/cratis_test/orders/",
            timezone: "Asia/Dubai",
            channel: "1",
          }
        : {}),
    }));
  }

  async function load() {
    await Promise.all([
      shopQuery.refetch(),
      templatesQuery.refetch(),
      linkQuery.refetch(),
      syncQuery.refetch(),
    ]);
  }

  async function onRefreshSync() {
    setSyncLoading(true);
    try {
      await syncQuery.refetch();
      appToast.success("Sync status refreshed.");
    } catch {
      appToast.error("Failed to refresh sync status.");
    } finally {
      setSyncLoading(false);
    }
  }

  async function onAttach(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!preset || (!selectedProvider && !pullPartner)) {
      const msg = "Select a valid POS provider template.";
      setError(msg);
      appToast.error(msg);
      return;
    }

    if (preset.requiresIntegration && !integrationEnabled) {
      const msg =
        selectedProvider === "saleculator"
          ? "Enable Integration on the Features tab before attaching Saleculator."
          : `Enable Integration on the Features tab before attaching ${pullName}.`;
      setError(msg);
      appToast.error(msg);
      return;
    }

    const pushEnabled = preset.flagsLocked
      ? preset.order_push_enabled
      : form.order_push_enabled;
    if ((preset.requiresBaseUrl || pushEnabled) && !form.base_url.trim()) {
      const msg =
        "Vendor base URL is required when order push is enabled for this lane.";
      setError(msg);
      appToast.error(msg);
      return;
    }

    const providerSlug = form.provider_slug.trim().toLowerCase();
    if (selectedProvider === "cratis" && !/^[a-z0-9][a-z0-9_-]*$/.test(providerSlug)) {
      const msg =
        "Cratis provider slug is required (letters, numbers, _ or -). Use cratis_test now and yaadro in production.";
      setError(msg);
      appToast.error(msg);
      return;
    }
    if (
      selectedProvider === "cratis" &&
      !form.credentials_plaintext.trim() &&
      !link?.has_credentials
    ) {
      const msg = "Paste the Cratis bearer token. Save the token only, not the word Bearer.";
      setError(msg);
      appToast.error(msg);
      return;
    }

    const account = form.account.trim();
    const location = form.location.trim();
    const menuPath =
      selectedProvider === "cratis" ? `/${providerSlug}/pos/` : form.menu_path.trim();
    const ordersPath =
      selectedProvider === "cratis"
        ? `/${providerSlug}/orders/`
        : form.orders_path.trim();
    const config_overrides =
      form.base_url.trim() ||
      form.auth_type ||
      menuPath ||
      ordersPath ||
      account ||
      location
        ? {
            api: {
              ...(form.base_url.trim()
                ? { baseUrl: form.base_url.trim() }
                : {}),
              auth:
                selectedProvider === "cratis"
                  ? { type: "bearer", headerName: "Authorization" }
                  : { type: form.auth_type },
              ...(selectedProvider === "cratis" ? { providerSlug } : {}),
              ...(menuPath ? { menuPath } : {}),
              ...(ordersPath ? { ordersPath } : {}),
              ...(selectedProvider === "cratis"
                ? {}
                : {
                    ...(account ? { account } : {}),
                    ...(location ? { location } : {}),
                    ...(account || location
                      ? {
                          menuTenant: { account, location },
                          orderTenant: { account, location },
                        }
                      : {}),
                  }),
              ...(form.brand_id.trim()
                ? { brandId: form.brand_id.trim() }
                : {}),
              ...(form.timezone.trim()
                ? { timezone: form.timezone.trim() }
                : {}),
              ...(form.channel.trim() ? { channel: form.channel.trim() } : {}),
              ...(selectedProvider === "cratis"
                ? {
                    endpoints: {
                      menu: { method: "GET", path: menuPath },
                      orderCreate: { method: "POST", path: ordersPath },
                      orderStatus: { method: "POST", path: ordersPath },
                    },
                  }
                : {}),
            },
          }
        : undefined;

    try {
      await attachShopLink(shopId, {
        mapping_profile_id: Number(form.mapping_profile_id),
        provider: form.provider,
        connector_type: form.connector_type,
        is_active: form.is_active,
        catalog_sync_enabled: form.catalog_sync_enabled,
        order_push_enabled: form.order_push_enabled,
        order_pull_enabled: form.order_pull_enabled,
        ...(config_overrides ? { config_overrides } : {}),
        ...(form.credentials_plaintext.trim()
          ? { credentials_plaintext: form.credentials_plaintext.trim() }
          : {}),
        ...(form.webhook_secret.trim()
          ? { webhook_secret: form.webhook_secret.trim() }
          : {}),
      });
      appToast.success("POS link attached.");
      setForm((prev) => ({
        ...prev,
        credentials_plaintext: "",
        webhook_secret: "",
      }));
      await load();
    } catch (err) {
      const msg = parseApiFormError(err, "Attach failed").message;
      setError(msg);
      appToast.error(msg);
    }
  }

  async function onFeatures() {
    setError(null);
    try {
      await patchLinkFeatures(shopId, {
        catalog_sync_enabled: form.catalog_sync_enabled,
        order_push_enabled: form.order_push_enabled,
        order_pull_enabled: form.order_pull_enabled,
        is_active: form.is_active,
      });
      appToast.success("POS link features updated.");
      await load();
    } catch (err) {
      const msg = parseApiFormError(err, "Update failed").message;
      setError(msg);
      appToast.error(msg);
    }
  }

  const flagDisabled = Boolean(preset?.flagsLocked);
  const templateOptions = useMemo(() => templates, [templates]);
  const attachPlaybook = pullPartner
    ? pullShopPlaybook(pullName)
    : (selectedProvider && POS_SHOP_PLAYBOOK[selectedProvider]) ||
      POS_SHOP_FALLBACK_PLAYBOOK;

  return (
    <div className="space-y-12">
      <PosPlaybook playbook={attachPlaybook} />

      <ShopSection
        title="POS link"
        description="Attach a mapping template. Saleculator requires Integration enabled + link_token (Features token); Cratis/Generic need vendor base URL when push is on."
      >
        {selectedProvider === "saleculator" && !integrationEnabled ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
            Saleculator requires{" "}
            <span className="font-medium">Integration enabled</span>. Turn it on
            in the{" "}
            <Link
              href={`/shops/${shopId}?tab=features`}
              className="font-medium underline underline-offset-2"
            >
              Features
            </Link>{" "}
            tab, rotate/create the token (that plaintext is Saleculator{" "}
            <span className="font-medium">link_token</span>), then attach{" "}
            <span className="font-medium">saleculator-pull-v1</span>.
          </div>
        ) : null}

        {selectedProvider === "saleculator" && integrationEnabled ? (
          <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm">
            <p className="font-medium">Saleculator device link</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Features token plaintext = device{" "}
                <code className="text-xs">link_token</code>
              </li>
              <li>
                Attach template <code className="text-xs">saleculator-pull-v1</code>
              </li>
              <li>
                Point Saleculator at DMS{" "}
                <code className="text-xs">/api/v1/pos</code>
              </li>
              <li>
                Till calls{" "}
                <code className="text-xs">POST /api/v1/pos/links</code> then
                polls with Bearer JWT
              </li>
            </ol>
          </div>
        ) : null}

        {pullPartner && !integrationEnabled ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
            {pullName} requires{" "}
            <span className="font-medium">Integration enabled</span>. Turn it on
            in the{" "}
            <Link
              href={`/shops/${shopId}?tab=features`}
              className="font-medium underline underline-offset-2"
            >
              Features
            </Link>{" "}
            tab, rotate/create the token (that plaintext is the{" "}
            <span className="font-medium">link_token</span>), then attach{" "}
            <span className="font-medium">{selectedTemplateName}</span>.
          </div>
        ) : null}

        {pullPartner && integrationEnabled ? (
          <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm">
            <p className="font-medium">{pullName} device link</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Features token plaintext = device{" "}
                <code className="text-xs">link_token</code>
              </li>
              <li>
                Attach template{" "}
                <code className="text-xs">{selectedTemplateName}</code>
              </li>
              <li>
                Point {pullName} at DMS{" "}
                <code className="text-xs">/api/v1/pos</code>
              </li>
              <li>
                Till calls{" "}
                <code className="text-xs">POST /api/v1/pos/links</code> then
                polls with Bearer JWT
              </li>
            </ol>
          </div>
        ) : null}
        <form onSubmit={onAttach} className="max-w-xl space-y-4">
          <Field label="Template">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={form.mapping_profile_id}
              onChange={(e) => applyTemplate(e.target.value)}
              required
            >
              <option value="">Select template…</option>
              {templateOptions.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name} · {t.provider}/{t.connector_type}
                  {t.lane ? ` · ${t.lane}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider" hint="Locked from template">
              <Input
                value={
                  selectedProvider
                    ? POS_PROVIDER_LABELS[selectedProvider]
                    : pullPartner
                      ? pullName
                      : form.provider
                }
                readOnly
              />
            </Field>
            <Field label="Connector type" hint="Locked from template">
              <Input value={form.connector_type} readOnly />
            </Field>
          </div>

          {(preset?.requiresBaseUrl || form.order_push_enabled) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vendor base URL">
                <Input
                  value={form.base_url}
                  onChange={(e) =>
                    setForm({ ...form, base_url: e.target.value })
                  }
                  placeholder="https://pos-vendor.example.com"
                  required={Boolean(
                    preset?.requiresBaseUrl || form.order_push_enabled,
                  )}
                />
              </Field>
              <Field label="Auth type">
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={form.auth_type}
                  onChange={(e) =>
                    setForm({ ...form, auth_type: e.target.value })
                  }
                >
                  <option value="none">none</option>
                  <option value="bearer">bearer</option>
                  <option value="integration_token">integration_token</option>
                </select>
              </Field>
            </div>
          )}

          {selectedProvider === "cratis" ? (
            <div className="space-y-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Cratis shop connection</p>
                <p className="text-xs text-muted-foreground">
                  Account and location come from the shop group and shop name. The provider slug sets the URL and the order by field.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Provider slug"
                  hint="Used in the URL and the order by field. cratis_test now, yaadro in production."
                >
                  <Input
                    value={form.provider_slug}
                    onChange={(e) =>
                      setForm({ ...form, provider_slug: e.target.value })
                    }
                    placeholder="cratis_test"
                    required
                  />
                </Field>
                <Field label="Orders URL">
                  <Input
                    value={
                      form.provider_slug.trim()
                        ? `/${form.provider_slug.trim().toLowerCase()}/orders/`
                        : ""
                    }
                    readOnly
                  />
                </Field>
                <Field label="Menu URL">
                  <Input
                    value={
                      form.provider_slug.trim()
                        ? `/${form.provider_slug.trim().toLowerCase()}/pos/`
                        : ""
                    }
                    readOnly
                  />
                </Field>
                <Field
                  label="Account"
                  hint="Sent as the shop group name, or individual when the shop has no group."
                >
                  <Input
                    value={shop?.group_id ? "Shop group name" : "individual"}
                    readOnly
                  />
                </Field>
                <Field label="Location" hint="Sent as this shop's name.">
                  <Input value={shop?.shop_name ?? ""} readOnly />
                </Field>
                <Field label="Brand ID" hint="Restaurant brand shown to Cratis.">
                  <Input
                    value={form.brand_id}
                    onChange={(e) =>
                      setForm({ ...form, brand_id: e.target.value })
                    }
                    placeholder="Hot N Cool"
                  />
                </Field>
                <Field label="Timezone">
                  <Input
                    value={form.timezone}
                    onChange={(e) =>
                      setForm({ ...form, timezone: e.target.value })
                    }
                    placeholder="Asia/Dubai"
                  />
                </Field>
                <Field label="Channel" hint="Cratis always receives channel 1.">
                  <Input value="1" readOnly />
                </Field>
              </div>
            </div>
          ) : null}

          {selectedProvider && selectedProvider !== "saleculator" ? (
            <Field
              label={
                selectedProvider === "cratis"
                  ? "Cratis bearer token"
                  : "Credentials (plaintext)"
              }
              hint={
                selectedProvider === "cratis"
                  ? link?.has_credentials
                    ? "Token is saved and sealed. Paste a new token to replace it, or leave blank to keep the current one."
                    : "Required. Paste the token only. Do not include the word Bearer."
                  : "Optional. Encrypted at rest. Leave blank to keep existing."
              }
            >
              <Textarea
                value={form.credentials_plaintext}
                onChange={(e) =>
                  setForm({ ...form, credentials_plaintext: e.target.value })
                }
                rows={2}
                placeholder={
                  selectedProvider === "cratis"
                    ? "paste-the-cratis-token"
                    : '{"apiKey":"secret-from-vendor"}'
                }
                required={selectedProvider === "cratis" && !link?.has_credentials}
              />
            </Field>
          ) : null}

          {selectedProvider === "generic" ||
          selectedProvider === "gravity" ||
          selectedProvider === "topas" ? (
            <Field
              label="Webhook secret"
              hint="Optional. 8–512 chars when set."
            >
              <Input
                value={form.webhook_secret}
                onChange={(e) =>
                  setForm({ ...form, webhook_secret: e.target.value })
                }
                placeholder="my-webhook-secret-min-8-chars"
              />
            </Field>
          ) : null}

          <div className="divide-y border-y">
            <label className="flex items-center gap-2 py-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Link active
            </label>
            <label
              className={cn(
                "flex items-center gap-2 py-3 text-sm",
                flagDisabled && "opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.catalog_sync_enabled}
                disabled={flagDisabled}
                onChange={(e) =>
                  setForm({ ...form, catalog_sync_enabled: e.target.checked })
                }
              />
              Catalog sync
              {flagDisabled ? (
                <span className="text-xs text-muted-foreground">
                  (lane preset)
                </span>
              ) : null}
            </label>
            <label
              className={cn(
                "flex items-center gap-2 py-3 text-sm",
                flagDisabled && "opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.order_push_enabled}
                disabled={flagDisabled}
                onChange={(e) =>
                  setForm({ ...form, order_push_enabled: e.target.checked })
                }
              />
              Order push
              {flagDisabled ? (
                <span className="text-xs text-muted-foreground">
                  (lane preset)
                </span>
              ) : null}
            </label>
            <label
              className={cn(
                "flex items-center gap-2 py-3 text-sm",
                flagDisabled && "opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.order_pull_enabled}
                disabled={flagDisabled}
                onChange={(e) =>
                  setForm({ ...form, order_pull_enabled: e.target.checked })
                }
              />
              Order pull
              {flagDisabled ? (
                <span className="text-xs text-muted-foreground">
                  (lane preset)
                </span>
              ) : null}
            </label>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit">Save link</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onFeatures()}
              disabled={!link}
            >
              Update features
            </Button>
          </div>
        </form>
      </ShopSection>

      {link ? (
        <PosPlaybook playbook={POS_SHOP_OPERATE_PLAYBOOK} defaultOpen={false} />
      ) : null}

      {link ? (
        <ShopSection title="Current link" className="max-w-3xl">
          {link.warnings && link.warnings.length > 0 ? (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <p className="mb-1 font-medium">Warnings</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {link.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {link.setup_guide ? (
            <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm">
              <p className="font-medium">
                {link.setup_guide.title ?? "Saleculator setup"}
              </p>
              {link.setup_guide.link_token_hint ? (
                <p className="mt-1 text-muted-foreground">
                  {link.setup_guide.link_token_hint}
                </p>
              ) : null}
              {link.setup_guide.device_auth ? (
                <p className="mt-1 text-muted-foreground">
                  {link.setup_guide.device_auth}
                </p>
              ) : null}
              {link.setup_guide.steps && link.setup_guide.steps.length > 0 ? (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                  {link.setup_guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
          <DetailList
            items={[
              { label: "Link ID", value: link.id != null ? String(link.id) : null },
              { label: "Shop ID", value: link.shop_id },
              {
                label: "Template",
                value:
                  link.mapping_profile_name ??
                  String(link.mapping_profile_id ?? ""),
              },
              { label: "Provider", value: link.provider },
              { label: "Connector", value: link.connector_type },
              { label: "Lane", value: link.lane },
              { label: "Active", value: yesNo(link.is_active) },
              {
                label: "Catalog sync",
                value: yesNo(link.catalog_sync_enabled),
              },
              { label: "Order push", value: yesNo(link.order_push_enabled) },
              { label: "Order pull", value: yesNo(link.order_pull_enabled) },
              {
                label: "Has credentials",
                value: yesNo(link.has_credentials),
              },
              {
                label: "Webhook secret",
                value: yesNo(link.webhook_secret_configured),
              },
              {
                label: "Integration enabled",
                value: yesNo(link.integration_enabled),
              },
              {
                label: "Integration token",
                value: yesNo(link.integration_token_present),
              },
              {
                label: "Link token ready",
                value: yesNo(link.link_token_ready),
              },
              {
                label: "Token fingerprint",
                value: yesNo(link.integration_token_fingerprint_present),
              },
              {
                label: "Config version",
                value:
                  link.config_version != null
                    ? String(link.config_version)
                    : null,
              },
              {
                label: "Last catalog sync",
                value: formatTs(link.last_catalog_sync_at),
              },
              {
                label: "Last order sync",
                value: formatTs(link.last_order_sync_at),
              },
              { label: "Sync error", value: link.sync_error },
            ]}
          />
        </ShopSection>
      ) : null}

      <ShopSection title="Sync status" className="max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Live POS sync state for this shop.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncLoading || syncQuery.isFetching}
            onClick={() => void onRefreshSync()}
          >
            <RefreshCwIcon
              className={cn(
                "size-3.5",
                (syncLoading || syncQuery.isFetching) && "animate-spin",
              )}
            />
            {syncLoading || syncQuery.isFetching
              ? "Refreshing…"
              : "Refresh sync status"}
          </Button>
        </div>

        {sync ? (
          <div className="space-y-4">
            {sync.warnings && sync.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
                <p className="mb-1 font-medium">Warnings</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {sync.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <DetailList
              items={[
                { label: "Shop ID", value: sync.shop_id },
                { label: "Provider", value: sync.provider },
                { label: "Connector", value: sync.connector_type },
                { label: "Lane", value: sync.lane },
                { label: "Active", value: yesNo(sync.is_active) },
                {
                  label: "Integration enabled",
                  value: yesNo(sync.integration_enabled),
                },
                {
                  label: "Integration token",
                  value: yesNo(sync.integration_token_present),
                },
                {
                  label: "Link token ready",
                  value: yesNo(sync.link_token_ready),
                },
                {
                  label: "Token fingerprint",
                  value: yesNo(sync.integration_token_fingerprint_present),
                },
                {
                  label: "Catalog sync",
                  value: yesNo(sync.catalog_sync_enabled),
                },                {
                  label: "Order push",
                  value: yesNo(sync.order_push_enabled),
                },
                {
                  label: "Order pull",
                  value: yesNo(sync.order_pull_enabled),
                },
                {
                  label: "Last catalog sync",
                  value: formatTs(sync.last_catalog_sync_at),
                },
                {
                  label: "Last order sync",
                  value: formatTs(sync.last_order_sync_at),
                },
                { label: "Sync error", value: sync.sync_error },
                {
                  label: "Config version",
                  value:
                    sync.config_version != null
                      ? String(sync.config_version)
                      : null,
                },
              ]}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No sync data loaded yet.
          </p>
        )}
      </ShopSection>
    </div>
  );
}
