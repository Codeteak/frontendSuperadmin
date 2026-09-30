"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleXIcon, PlusIcon, SearchIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { PosPlaybook } from "@/components/pos/pos-playbook";
import { PosScenarioMatrix } from "@/components/pos/pos-scenario-matrix";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/shared/states";
import { POS_LANE_CHOOSER_PLAYBOOK } from "@/lib/pos/playbook-copy";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  connectorsForProvider,
  createPosTemplate,
  defaultConnectorForProvider,
  defaultPosTemplateConfig,
  defaultPullPosTemplateConfig,
  isPullPosProfile,
  POS_PROVIDER_LABELS,
  POS_PROVIDERS,
  POS_TEMPLATE_NAME_PATTERN,
  slugifyPosTemplateName,
  type PosConnectorType,
  type PosProvider,
} from "@/lib/api/pos";
import { posShopLinksQuery, posTemplatesQuery } from "@/lib/queries/pos";
import type { PosShopLink, PosTemplateSummary } from "@/types/api";

type PosView = "templates" | "links";

const NEW_PULL_PROVIDER = "__new_pull__";

const templateColumns: ColumnDef<PosTemplateSummary>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => row.original.provider ?? "—",
    meta: { label: "Provider" },
  },
  {
    id: "connector",
    accessorFn: (row) => row.connector_type ?? "",
    header: "Connector",
    cell: ({ row }) => row.original.connector_type ?? "—",
    meta: { label: "Connector" },
  },
  {
    id: "lane",
    accessorFn: (row) => row.lane ?? "",
    header: "Lane",
    cell: ({ row }) => row.original.lane ?? "—",
    meta: { label: "Lane" },
  },
  {
    accessorKey: "version",
    header: "Version",
    cell: ({ row }) => row.original.version ?? "—",
    meta: { label: "Version" },
  },
  {
    id: "capabilities",
    accessorFn: (row) =>
      row.capabilities
        ? `${row.capabilities.catalog ?? ""}/${row.capabilities.orders_out ?? ""}`
        : "",
    header: "Capabilities",
    cell: ({ row }) => {
      const caps = row.original.capabilities;
      if (!caps) return "—";
      return (
        <span className="text-xs text-muted-foreground">
          cat:{caps.catalog ?? "—"} · out:{caps.orders_out ?? "—"} · in:
          {caps.orders_in ?? "—"}
        </span>
      );
    },
    meta: { label: "Capabilities" },
  },
  {
    id: "status",
    accessorFn: (row) => (row.is_active ? "active" : "inactive"),
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.is_active ? "active" : "inactive"} />
    ),
    meta: { label: "Status" },
  },
];

const linkColumns: ColumnDef<PosShopLink>[] = [
  {
    id: "shop",
    accessorFn: (row) => String(row.shop_id ?? ""),
    header: "Shop",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {String(row.original.shop_id ?? "") || "—"}
      </span>
    ),
    meta: { label: "Shop" },
  },
  {
    id: "template",
    accessorFn: (row) =>
      String(row.mapping_profile_name ?? row.mapping_profile_id ?? ""),
    header: "Template",
    cell: ({ row }) =>
      String(
        row.original.mapping_profile_name ??
          row.original.mapping_profile_id ??
          "—",
      ),
    meta: { label: "Template" },
  },
  {
    id: "provider",
    accessorFn: (row) =>
      `${row.provider ?? ""}/${row.connector_type ?? ""}`,
    header: "Provider",
    cell: ({ row }) =>
      `${row.original.provider ?? "—"} / ${row.original.connector_type ?? "—"}`,
    meta: { label: "Provider" },
  },
  {
    id: "lane",
    accessorFn: (row) => row.lane ?? "",
    header: "Lane",
    cell: ({ row }) => row.original.lane ?? "—",
    meta: { label: "Lane" },
  },
  {
    id: "features",
    accessorFn: (row) =>
      [
        row.catalog_sync_enabled ? "catalog" : null,
        row.order_push_enabled ? "push" : null,
        row.order_pull_enabled ? "pull" : null,
      ]
        .filter(Boolean)
        .join(", "),
    header: "Features",
    cell: ({ row }) => {
      const features = [
        row.original.catalog_sync_enabled ? "catalog" : null,
        row.original.order_push_enabled ? "push" : null,
        row.original.order_pull_enabled ? "pull" : null,
      ]
        .filter(Boolean)
        .join(", ");
      return (
        <span className="text-xs text-muted-foreground">{features || "—"}</span>
      );
    },
    meta: { label: "Features" },
  },
  {
    id: "status",
    accessorFn: (row) => (row.is_active ? "active" : "inactive"),
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.is_active ? "active" : "inactive"} />
    ),
    meta: { label: "Status" },
  },
];

export default function PosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<PosView>("templates");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    provider: "cratis" as PosProvider | typeof NEW_PULL_PROVIDER,
    pull_provider: "",
    version: "1",
    connector_type: "cratis" as PosConnectorType,
    description: "",
  });

  const templatesQuery = useQuery(posTemplatesQuery({ page: 1, limit: 100 }));
  const linksQuery = useQuery(posShopLinksQuery({ page: 1, limit: 100 }));
  const items = templatesQuery.data?.items ?? [];
  const links = linksQuery.data?.items ?? [];
  const loading =
    view === "templates" ? templatesQuery.isPending : linksQuery.isPending;

  const isNewPull = form.provider === NEW_PULL_PROVIDER;
  const connectorOptions = useMemo(() => {
    if (form.provider === NEW_PULL_PROVIDER) {
      return ["saleculator_pull"] as const;
    }
    return connectorsForProvider(form.provider);
  }, [form.provider]);

  const createMutation = useMutation({
    mutationFn: () => {
      const name = slugifyPosTemplateName(form.name);
      if (!POS_TEMPLATE_NAME_PATTERN.test(name)) {
        throw new ApiError(
          400,
          "Name must start with a letter/number and only use letters, numbers, - or _",
        );
      }
      const provider = isNewPull
        ? form.pull_provider.trim().toLowerCase()
        : form.provider;
      if (isNewPull && !isPullPosProfile(provider, "saleculator_pull")) {
        throw new ApiError(
          400,
          "Use a new provider name (letters, numbers, - or _). Cratis, Saleculator, Generic, Gravity, and Topas stay on their own connectors.",
        );
      }
      return createPosTemplate({
        name,
        provider,
        version: form.version.trim(),
        connector_type: isNewPull ? "saleculator_pull" : form.connector_type,
        description: form.description.trim() || undefined,
        is_system: false,
        is_active: true,
        config: isNewPull
          ? defaultPullPosTemplateConfig()
          : defaultPosTemplateConfig(form.provider as PosProvider),
      });
    },
    onSuccess: (created) => {
      setOpen(false);
      setFormError(null);
      setForm({
        name: "",
        provider: "cratis",
        pull_provider: "",
        version: "1",
        connector_type: "cratis",
        description: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["pos"] });
      appToast.success("POS template created.");
      router.push(`/pos/${created.id}`);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Create failed";
      setFormError(msg);
      appToast.error(msg);
    },
  });

  const listError =
    view === "templates"
      ? templatesQuery.error
        ? templatesQuery.error instanceof Error
          ? templatesQuery.error.message
          : "Failed to load templates"
        : null
      : linksQuery.error
        ? linksQuery.error instanceof Error
          ? linksQuery.error.message
          : "Failed to load shop links"
        : null;

  const load = () =>
    void (view === "templates"
      ? templatesQuery.refetch()
      : linksQuery.refetch());

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }

  return (
    <PageShell>
      <TopBarSlot>
        <div className="relative w-full max-w-sm min-w-0">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className={search ? "h-8 pr-9 pl-9" : "h-8 pl-9"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              view === "templates"
                ? "Search templates…"
                : "Search shop links…"
            }
            aria-label={
              view === "templates"
                ? "Search templates"
                : "Search shop links"
            }
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <CircleXIcon className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {view === "templates" ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => setOpen(true)}
          >
            <PlusIcon className="size-4" />
            Create template
          </Button>
        ) : null}
      </TopBarSlot>

      <div className="mb-6 space-y-3">
        <PosPlaybook playbook={POS_LANE_CHOOSER_PLAYBOOK} />
        <PosScenarioMatrix />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 border-b">
          {(
            [
              { id: "templates", label: "Templates" },
              { id: "links", label: "Shop links" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setView(tab.id);
                setSearch("");
              }}
              className={`px-3 py-2 text-sm ${
                view === tab.id
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === "templates" ? (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setFormError(null);
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create POS template</DialogTitle>
              </DialogHeader>
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Tip: match the provider to the lane guide above. If your case is
                marked “Needs developer” in the scenario table, do not create a
                fake generic template — open an engineering ticket instead.
              </p>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pos-name">Name</Label>
                  <Input
                    id="pos-name"
                    required
                    pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                    title="Letters, numbers, hyphen or underscore only"
                    placeholder="cratis-v1"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    onBlur={() =>
                      setForm((current) => ({
                        ...current,
                        name: slugifyPosTemplateName(current.name),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use letters, numbers, `-` or `_` only (no spaces).
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={form.provider}
                      onValueChange={(value) => {
                        if (!value) return;
                        if (value === NEW_PULL_PROVIDER) {
                          setForm({
                            ...form,
                            provider: NEW_PULL_PROVIDER,
                            connector_type: "saleculator_pull",
                          });
                          return;
                        }
                        const provider = value as PosProvider;
                        setForm({
                          ...form,
                          provider,
                          connector_type: defaultConnectorForProvider(provider),
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POS_PROVIDERS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {POS_PROVIDER_LABELS[value]}
                          </SelectItem>
                        ))}
                        <SelectItem value={NEW_PULL_PROVIDER}>
                          New pull POS (same APIs)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Connector type</Label>
                    <Select
                      value={form.connector_type}
                      disabled={isNewPull}
                      onValueChange={(value) => {
                        if (!value || isNewPull) return;
                        setForm({
                          ...form,
                          connector_type: value as PosConnectorType,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {connectorOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isNewPull ? (
                  <div className="space-y-2">
                    <Label htmlFor="pos-pull-provider">Provider name</Label>
                    <Input
                      id="pos-pull-provider"
                      required
                      pattern="[A-Za-z][A-Za-z0-9_-]*"
                      title="Start with a letter. Letters, numbers, hyphen or underscore."
                      placeholder="acme"
                      value={form.pull_provider}
                      onChange={(e) =>
                        setForm({ ...form, pull_provider: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      This name is stored on the shop. Connector stays
                      saleculator_pull. Fill catalog field names on the template
                      after create. Saleculator, Cratis, Gravity, and Topas are
                      unchanged.
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="pos-version">Version</Label>
                  <Input
                    id="pos-version"
                    required
                    maxLength={20}
                    value={form.version}
                    onChange={(e) =>
                      setForm({ ...form, version: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pos-description">Description</Label>
                  <Textarea
                    id="pos-description"
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                {formError ? (
                  <p className="text-sm text-destructive">{formError}</p>
                ) : null}
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {loading ? <LoadingState /> : null}
      {listError ? (
        <ErrorState message={listError} onRetry={() => void load()} />
      ) : null}

      {view === "templates" ? (
        <>
          {!loading && !listError && items.length === 0 ? (
            <EmptyState
              title="No POS templates"
              description="Create a mapping profile to attach shops."
            />
          ) : null}

          {items.length > 0 ? (
            <DataTable
              columns={templateColumns}
              data={items}
              hideSearch
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search templates…"
              emptyMessage="No templates match your search."
              initialPageSize={10}
              getRowId={(row) => String(row.id)}
              onRowClick={(row) => router.push(`/pos/${row.id}`)}
            />
          ) : null}
        </>
      ) : (
        <>
          {!loading && !listError && links.length === 0 ? (
            <EmptyState
              title="No shop links"
              description="Attach a POS template from a shop’s POS tab."
            />
          ) : null}

          {links.length > 0 ? (
            <DataTable
              columns={linkColumns}
              data={links}
              hideSearch
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search shop links…"
              emptyMessage="No shop links match your search."
              initialPageSize={10}
              getRowId={(row, index) =>
                `${String(row.shop_id ?? "")}-${String(row.mapping_profile_id ?? index)}`
              }
              onRowClick={(row) => {
                const shopId = String(row.shop_id ?? "");
                if (shopId) router.push(`/shops/${shopId}?tab=pos`);
              }}
            />
          ) : null}
        </>
      )}
    </PageShell>
  );
}
