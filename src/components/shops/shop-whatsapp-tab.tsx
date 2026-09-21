"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import { DetailList } from "@/components/shared/detail-list";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  connectShopWhatsApp,
  disconnectShopWhatsApp,
  setShopWhatsAppEnabled,
  setShopWhatsAppTransactional,
  setShopPageAccessPassword,
  setShopWhatsAppSender,
} from "@/lib/api/shops";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  shopKeys,
  shopPageAccessQuery,
  shopWhatsAppQuery,
} from "@/lib/queries/shops";

function ShopSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-3xl">
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
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ShopWhatsAppTab({ shopId }: { shopId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    shopWhatsAppQuery(shopId),
  );
  const pageAccessQuery = useQuery(shopPageAccessQuery(shopId));

  const [widgetToken, setWidgetToken] = useState("");
  const [orgName, setOrgName] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [pagePassword, setPagePassword] = useState("");
  const [senderMode, setSenderMode] = useState<"platform" | "shop">("platform");
  const [bspChannelId, setBspChannelId] = useState("");
  const [bspAccessToken, setBspAccessToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setOrgName(data.org_name ?? "");
    setDisplayPhone(data.display_phone_e164 ?? "");
    setSenderMode(data.sender_mode ?? "platform");
    setBspChannelId(data.bsp_channel_id ?? "");
  }, [data]);

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: shopKeys.whatsapp(shopId) }),
      queryClient.invalidateQueries({ queryKey: shopKeys.pageAccess(shopId) }),
    ]);
  }

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      appToast.success(success);
      await invalidate();
      return true;
    } catch (err) {
      const parsed = parseApiFormError(err);
      appToast.error(
        parsed.message ||
          (err instanceof ApiError ? err.message : "Request failed"),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || pageAccessQuery.isLoading) {
    return <LoadingState label="Loading WhatsApp…" />;
  }
  if (isError) {
    return (
      <ErrorState
        title="Could not load WhatsApp"
        description={error instanceof Error ? error.message : "Unknown error"}
        onRetry={() => refetch()}
      />
    );
  }

  const status = data!;
  const pageAccessConfigured = Boolean(
    pageAccessQuery.data?.password_configured,
  );

  return (
    <div className="space-y-10">
      <ShopSection
        title="Chazt / WhatsApp workspace"
        description="Provision a per-shop Chazt widget token so the shop can run inbox and campaigns from their own WhatsApp Business number."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching || busy}
            onClick={() => refetch()}
          >
            <RefreshCwIcon
              className={`mr-1.5 size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      >
        <DetailList
          items={[
            {
              label: "Connected",
              value: status.connected ? "Yes" : "No",
            },
            {
              label: "Enabled",
              value: status.enabled ? "Active" : "Paused",
            },
            {
              label: "Transactional WA",
              value: status.transactional_enabled ? "On" : "Off",
            },
            {
              label: "Token status",
              value: status.token_status,
            },
            {
              label: "Token prefix",
              value: status.token_prefix ?? "—",
            },
            {
              label: "Org",
              value: status.org_name ?? "—",
            },
            {
              label: "Page access password",
              value: pageAccessConfigured
                ? "Configured"
                : "Not set (page locked)",
            },
            {
              label: "Sender mode",
              value: status.sender_mode,
            },
            {
              label: "Display phone",
              value: status.display_phone_e164 ?? "—",
            },
          ]}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Widget token"
            hint="Paste the Chazt wgt_… token. Origins must include https://shop.yaadro.ae"
          >
            <Input
              type="password"
              autoComplete="off"
              value={widgetToken}
              onChange={(e) => setWidgetToken(e.target.value)}
              placeholder="wgt_live_…"
            />
          </Field>
          <Field label="Org name (optional)">
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Shop Chazt org"
            />
          </Field>
          <Field label="Display phone (E.164, optional)">
            <Input
              value={displayPhone}
              onChange={(e) => setDisplayPhone(e.target.value)}
              placeholder="+9715…"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || widgetToken.trim().length < 20}
            onClick={async () => {
              const ok = await run(
                () =>
                  connectShopWhatsApp(shopId, {
                    widget_token: widgetToken.trim(),
                    org_name: orgName.trim() || null,
                    display_phone_e164: displayPhone.trim() || null,
                    enabled: true,
                  }),
                "Chazt connected",
              );
              if (ok) setWidgetToken("");
            }}
          >
            Connect / update token
          </Button>
          {status.has_token ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(
                    () => setShopWhatsAppEnabled(shopId, !status.enabled),
                    status.enabled ? "WhatsApp paused" : "WhatsApp resumed",
                  )
                }
              >
                {status.enabled ? "Pause" : "Resume"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  run(
                    () => disconnectShopWhatsApp(shopId),
                    "Chazt disconnected",
                  )
                }
              >
                Disconnect
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  setShopWhatsAppTransactional(
                    shopId,
                    !status.transactional_enabled,
                  ),
                status.transactional_enabled
                  ? "Order templates paused"
                  : "Order templates enabled",
              )
            }
          >
            {status.transactional_enabled
              ? "Disable order WA"
              : "Enable order WA"}
          </Button>
        </div>
      </ShopSection>

      <ShopSection
        title="Page access password"
        description="Shop-level password (separate from login). Unlocks WhatsApp and any future protected shop pages. Leave blank to keep current; use Clear to remove."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" hint="Minimum 8 characters">
            <Input
              type="password"
              autoComplete="new-password"
              value={pagePassword}
              onChange={(e) => setPagePassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || pagePassword.trim().length < 8}
            onClick={async () => {
              const ok = await run(
                () =>
                  setShopPageAccessPassword(shopId, {
                    password: pagePassword.trim(),
                  }),
                "Page access password saved",
              );
              if (ok) setPagePassword("");
            }}
          >
            Set password
          </Button>
          {pageAccessConfigured ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(
                  () => setShopPageAccessPassword(shopId, { clear: true }),
                  "Page access password cleared",
                )
              }
            >
              Clear password
            </Button>
          ) : null}
        </div>
      </ShopSection>

      <ShopSection
        title="Transactional sender (order templates)"
        description="Platform = Yaadro Libromi channel. Shop = send order WhatsApp from this shop’s Libromi channel / credentials (their number)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sender mode">
            <Select
              value={senderMode}
              onValueChange={(v) => setSenderMode(v as "platform" | "shop")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">Platform (Yaadro)</SelectItem>
                <SelectItem value="shop">Shop (own Libromi channel)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {senderMode === "shop" ? (
            <>
              <Field label="Libromi channel ID">
                <Input
                  value={bspChannelId}
                  onChange={(e) => setBspChannelId(e.target.value)}
                  placeholder="channel id"
                />
              </Field>
              <Field
                label="Libromi access token"
                hint={
                  status.has_bsp_channel
                    ? "Leave blank to keep existing token"
                    : "Required when switching to shop mode"
                }
              >
                <Input
                  type="password"
                  autoComplete="off"
                  value={bspAccessToken}
                  onChange={(e) => setBspAccessToken(e.target.value)}
                  placeholder="Bearer token"
                />
              </Field>
            </>
          ) : null}
        </div>
        <div className="mt-4">
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(
                () =>
                  setShopWhatsAppSender(shopId, {
                    sender_mode: senderMode,
                    display_phone_e164: displayPhone.trim() || null,
                    ...(senderMode === "shop"
                      ? {
                          ...(bspChannelId.trim()
                            ? { bsp_channel_id: bspChannelId.trim() }
                            : {}),
                          ...(bspAccessToken.trim()
                            ? { bsp_access_token: bspAccessToken.trim() }
                            : {}),
                        }
                      : {}),
                  }),
                "Sender settings saved",
              );
              if (ok) setBspAccessToken("");
            }}
          >
            Save sender
          </Button>
        </div>
      </ShopSection>
    </div>
  );
}
