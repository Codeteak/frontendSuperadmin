"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CopyIcon,
  FlaskConicalIcon,
  PlugZapIcon,
  PowerIcon,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { PosPlaybook } from "@/components/pos/pos-playbook";
import { PosConfigStructuredEditor } from "@/components/pos/pos-config-structured-editor";
import { CopyButton } from "@/components/shared/copy-button";
import {
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import {
  POS_TEMPLATE_DETAIL_PLAYBOOK,
  POS_TEMPLATE_LANE_CALLOUTS,
} from "@/lib/pos/playbook-copy";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  clonePosTemplate,
  deletePosTemplate,
  patchPosTemplate,
  POS_ENDPOINT_KEYS,
  POS_TEST_MAP_DEFAULT_SECTION,
  testConnectionPosTemplate,
  testMapPosTemplate,
  type PosEndpointKey,
} from "@/lib/api/pos";
import { posKeys, posTemplateQuery } from "@/lib/queries/pos";

const endpointKeys = POS_ENDPOINT_KEYS;

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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-4xl">
      <div className="mb-5 border-b pb-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function PosTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const id = params.templateId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [testMapBusy, setTestMapBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [endpointKey, setEndpointKey] = useState<PosEndpointKey>("menu");
  const [form, setForm] = useState({
    version: "",
    description: "",
    is_active: true,
  });

  const templateQuery = useQuery(posTemplateQuery(id));
  const template = templateQuery.data ?? null;
  const loading = templateQuery.isPending;
  const error = templateQuery.error
    ? templateQuery.error instanceof Error
      ? templateQuery.error.message
      : "Failed to load template"
    : null;
  const load = () => void templateQuery.refetch();

  useEffect(() => {
    if (!template) return;
    setForm({
      version: template.version ?? "",
      description: String(template.description ?? ""),
      is_active: Boolean(template.is_active ?? true),
    });
    setConfig(
      template.config && typeof template.config === "object"
        ? (template.config as Record<string, unknown>)
        : {},
    );
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      patchPosTemplate(id, {
        description: form.description.trim() || undefined,
        is_active: form.is_active,
        version: form.version.trim() || undefined,
        config,
      }),
    onSuccess: async () => {
      appToast.success("Template saved.");
      await queryClient.invalidateQueries({ queryKey: posKeys.template(id) });
      await queryClient.invalidateQueries({ queryKey: ["pos", "templates"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setMessage(msg);
      appToast.error(msg);
    },
  });

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    saveMutation.mutate();
  }

  async function onClone() {
    setMessage(null);
    try {
      const cloned = await clonePosTemplate(id);
      await queryClient.invalidateQueries({ queryKey: ["pos"] });
      appToast.success("Template cloned.");
      router.push(`/pos/${cloned.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Clone failed";
      setMessage(msg);
      appToast.error(msg);
    }
  }

  async function onTestMap(input: {
    mapping_section: string;
    sample_payload: Record<string, unknown>;
  }) {
    setMessage(null);
    setTestMapBusy(true);
    try {
      const res = await testMapPosTemplate(id, input);
      setMessage(`Test map: ${JSON.stringify(res, null, 2)}`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Test map failed");
    } finally {
      setTestMapBusy(false);
    }
  }

  async function onTestConnection() {
    setMessage(null);
    try {
      const res = await testConnectionPosTemplate(id, {
        endpoint_key: endpointKey,
      });
      setMessage(`Test connection: ${JSON.stringify(res, null, 2)}`);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Test connection failed",
      );
    }
  }

  async function onDeactivate() {
    if (!confirm("Deactivate this template?")) return;
    setMessage(null);
    try {
      await deletePosTemplate(id);
      await queryClient.invalidateQueries({ queryKey: ["pos"] });
      appToast.success("Template deactivated.");
      router.push("/pos");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Delete failed";
      setMessage(msg);
      appToast.error(msg);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !template) {
    return (
      <PageShell>
        <ErrorState
          message={error ?? "Not found"}
          onRetry={() => void load()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBarSlot>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/pos" />}
        >
          <ArrowLeftIcon className="size-3.5" />
          POS
        </Button>
        <StatusBadge status={template.is_active ? "active" : "inactive"} />
        <span className="hidden truncate text-sm font-medium sm:inline">
          {template.name}
        </span>
      </TopBarSlot>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {template.name}
            </h1>
            <CopyButton
              value={String(template.name ?? "")}
              iconOnly
              size={14}
              label="Copy template name"
              className="size-7 p-0"
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.provider ?? "—"} · {template.connector_type ?? "—"}
            {template.lane ? ` · ${template.lane}` : ""}
            {template.version ? ` · v${template.version}` : ""}
            {template.is_system ? " · system" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void onClone()}>
            <CopyIcon className="size-3.5" />
            Clone
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void onTestMap({
                mapping_section: POS_TEST_MAP_DEFAULT_SECTION,
                sample_payload: {
                  id: "POS-1001",
                  vno: "B-1001",
                  customer: { name: "Ali", phone: "+971501234567" },
                  items: [{ itn: "Shawarma", qty: 2 }],
                },
              })
            }
            disabled={testMapBusy}
          >
            <FlaskConicalIcon className="size-3.5" />
            Test map
          </Button>
          <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1">
            <Select
              value={endpointKey}
              onValueChange={(value) => {
                if (value) setEndpointKey(value as PosEndpointKey);
              }}
            >
              <SelectTrigger className="h-7 w-36 border-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {endpointKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => void onTestConnection()}
            >
              <PlugZapIcon className="size-3.5" />
              Test
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void onDeactivate()}
          >
            <PowerIcon className="size-3.5" />
            Deactivate
          </Button>
        </div>
      </div>

      {message ? (
        <pre className="mb-6 max-h-48 overflow-auto rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          {message}
        </pre>
      ) : null}

      <div className="mb-8">
        <PosPlaybook
          playbook={POS_TEMPLATE_DETAIL_PLAYBOOK}
          callout={
            template.provider && POS_TEMPLATE_LANE_CALLOUTS[template.provider]
              ? POS_TEMPLATE_LANE_CALLOUTS[template.provider]
              : undefined
          }
        />
      </div>

      <form onSubmit={onSave} className="space-y-12">
        <Section
          title="Template details"
          description="Identity fields are fixed. Version and description can be updated."
        >
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Name" hint="Immutable template key">
              <Input value={template.name ?? ""} disabled readOnly />
            </Field>
            <Field label="Provider">
              <Input value={template.provider ?? ""} disabled readOnly />
            </Field>
            <Field label="Version">
              <Input
                value={form.version}
                onChange={(e) =>
                  setForm({ ...form, version: e.target.value })
                }
              />
            </Field>
            <Field label="Connector type">
              <Input
                value={template.connector_type ?? ""}
                disabled
                readOnly
              />
            </Field>
            <Field label="Lane">
              <Input value={template.lane ?? ""} disabled readOnly />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea
                  className="min-h-24"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          <label className="mt-6 flex max-w-md cursor-pointer items-start gap-3 border-t pt-5">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            <span>
              <span className="block text-sm font-medium">Active</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Inactive templates cannot be attached to new shops.
              </span>
            </span>
          </label>
        </Section>

        <Section
          title="Connector configuration"
          description="Use the section tabs below — no need to edit raw JSON unless you open Advanced."
        >
          <PosConfigStructuredEditor
            provider={template.provider ?? "generic"}
            config={config}
            onChange={setConfig}
            onTestMap={onTestMap}
            testMapBusy={testMapBusy}
          />
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t pt-6">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save template"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Only description, version, active flag, and config are sent to the
            API.
          </p>
        </div>
      </form>
    </PageShell>
  );
}
