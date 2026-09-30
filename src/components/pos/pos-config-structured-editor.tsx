"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, GitBranchIcon } from "lucide-react";

import { PosAuthFields, type PosAuthFieldsValue } from "@/components/pos/pos-auth-fields";
import { PosCapabilitiesForm } from "@/components/pos/pos-capabilities-form";
import { PosEndpointsForm } from "@/components/pos/pos-endpoints-form";
import { PosEventsForm } from "@/components/pos/pos-events-form";
import { PosGuidedMappingsEditor } from "@/components/pos/pos-guided-mappings-editor";
import { PosMappingSectionEditor } from "@/components/pos/pos-mapping-section-editor";
import { PosStatusMapsEditor } from "@/components/pos/pos-status-maps-editor";
import { PosTenantFields } from "@/components/pos/pos-tenant-fields";
import { PosTestMapPanel } from "@/components/pos/pos-test-map-panel";
import { PosValueMapsEditor } from "@/components/pos/pos-value-maps-editor";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseTemplateConfig,
  serializeTemplateConfig,
  type PosTemplateConfigModel,
} from "@/lib/pos/config-model";
import {
  POS_STATUS_UPDATE_MODES,
  type PosStatusUpdateMode,
} from "@/lib/pos/contract";

type ConfigSectionId =
  | "api"
  | "endpoints"
  | "capabilities"
  | "events"
  | "mappings"
  | "status"
  | "test";

const SECTIONS: {
  id: ConfigSectionId;
  label: string;
  description: string;
}[] = [
  {
    id: "api",
    label: "1. API & auth",
    description: "Base URL, login style, default branch codes",
  },
  {
    id: "endpoints",
    label: "2. Endpoints",
    description: "Which paths to call for menu, orders, status",
  },
  {
    id: "capabilities",
    label: "3. Capabilities",
    description: "What this POS can do (catalog, push, webhook, …)",
  },
  {
    id: "events",
    label: "4. Events",
    description: "When Yaadro should push orders or status",
  },
  {
    id: "mappings",
    label: "5. Mappings",
    description: "Translate vendor JSON ↔ Yaadro fields",
  },
  {
    id: "status",
    label: "6. Status codes",
    description: "Map status names between Yaadro and POS",
  },
  {
    id: "test",
    label: "7. Test map",
    description: "Try a sample webhook before attaching shops",
  },
];

function ConfigPanel({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <>
              <ChevronUpIcon className="size-3.5" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDownIcon className="size-3.5" />
              Open
            </>
          )}
        </Button>
      </div>
      {open ? <div className="border-t px-4 py-4">{children}</div> : null}
    </div>
  );
}

export function PosConfigStructuredEditor({
  provider,
  config,
  onChange,
  onTestMap,
  testMapBusy,
}: {
  provider: string;
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  onTestMap: (input: {
    mapping_section: string;
    sample_payload: Record<string, unknown>;
  }) => Promise<void>;
  testMapBusy?: boolean;
}) {
  const [section, setSection] = useState<ConfigSectionId>("api");
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [advancedText, setAdvancedText] = useState("");
  const [advancedError, setAdvancedError] = useState<string | null>(null);

  const model = useMemo(
    () => parseTemplateConfig(config, provider),
    [config, provider],
  );

  const mappingSections = useMemo(
    () => Object.keys(model.mappings).filter(Boolean),
    [model.mappings],
  );

  function commit(next: PosTemplateConfigModel) {
    onChange(serializeTemplateConfig(next));
  }

  function patchModel(patch: Partial<PosTemplateConfigModel>) {
    commit({ ...model, ...patch });
  }

  function authValue(): PosAuthFieldsValue {
    return {
      type: model.api.auth.type,
      headerName: model.api.auth.headerName,
      tokenUrl: model.api.auth.tokenUrl,
    };
  }

  function applyAdvancedJson() {
    try {
      const parsed = JSON.parse(advancedText) as Record<string, unknown>;
      onChange(parsed);
      setAdvancedError(null);
      setShowAdvancedJson(false);
    } catch {
      setAdvancedError("Invalid JSON — fix syntax before applying.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant={section === s.id ? "default" : "outline"}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="min-h-[16rem]">
        {section === "api" ? (
          <ConfigPanel
            title="API & authentication defaults"
            description="Shops usually override URL and secrets on attach. These are template defaults."
          >
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Default base URL (optional)
                </Label>
                <Input
                  value={model.api.baseUrl}
                  onChange={(e) =>
                    patchModel({
                      api: { ...model.api, baseUrl: e.target.value },
                    })
                  }
                  placeholder="https://pos-vendor.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Most shops set their own URL on Shop → POS. Leave blank if
                  every shop differs.
                </p>
              </div>
              <PosAuthFields
                value={authValue()}
                onChange={(auth) =>
                  patchModel({
                    api: {
                      ...model.api,
                      auth: {
                        type: auth.type,
                        headerName: auth.headerName,
                        tokenUrl: auth.tokenUrl,
                      },
                    },
                  })
                }
                showCredentialsHint="Put live secrets on each shop — not in the shared template."
              />
              <PosTenantFields
                menuTenant={model.api.menuTenant}
                orderTenant={model.api.orderTenant}
                onMenuTenantChange={(menuTenant) =>
                  patchModel({ api: { ...model.api, menuTenant } })
                }
                onOrderTenantChange={(orderTenant) =>
                  patchModel({ api: { ...model.api, orderTenant } })
                }
              />
            </div>
          </ConfigPanel>
        ) : null}

        {section === "endpoints" ? (
          <ConfigPanel
            title="Vendor API endpoints"
            description="Enable each action and set HTTP method + path."
          >
            <PosEndpointsForm
              value={model.api.endpoints}
              onChange={(endpoints) =>
                patchModel({ api: { ...model.api, endpoints } })
              }
            />
          </ConfigPanel>
        ) : null}

        {section === "capabilities" ? (
          <ConfigPanel
            title="Capabilities"
            description="Turn features on only if the vendor supports them."
          >
            <PosCapabilitiesForm
              value={model.capabilities}
              onChange={(capabilities) => patchModel({ capabilities })}
            />
          </ConfigPanel>
        ) : null}

        {section === "events" ? (
          <ConfigPanel
            title="Push triggers (events)"
            description="Select checkboxes — no need to type comma lists."
          >
            <PosEventsForm
              value={model.events}
              onChange={(events) => patchModel({ events })}
            />
          </ConfigPanel>
        ) : null}

        {section === "mappings" ? (
          <div className="space-y-4">
            <ConfigPanel
              title="Guided body & field mappings"
              description="Choose a data flow, paste a vendor sample, and add fields without writing JSON."
            >
              <PosGuidedMappingsEditor
                capabilities={model.capabilities}
                mappings={model.mappings}
                valueMapNames={Object.keys(model.value_maps)}
                onChange={(mappings) => patchModel({ mappings })}
              />
            </ConfigPanel>
            <ConfigPanel
              title="Value translation maps"
              description="Translate coded vendor values (for example diet flags) before they land in Yaadro fields."
              defaultOpen={false}
            >
              <PosValueMapsEditor
                value={model.value_maps}
                onChange={(value_maps) => patchModel({ value_maps })}
              />
            </ConfigPanel>
            <ConfigPanel
              title="Developer mapping JSON"
              description="Advanced fallback for unsupported vendor shapes. Normal onboarding should use the guided editor above."
              defaultOpen={false}
            >
              <PosMappingSectionEditor
                mappings={model.mappings}
                onChange={(mappings) => patchModel({ mappings })}
              />
            </ConfigPanel>
          </div>
        ) : null}

        {section === "status" ? (
          <ConfigPanel
            title="Status code maps & update mode"
            description="Map status names and choose how status updates work."
          >
            <div className="space-y-6">
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                Use <strong>Outbound</strong> for Yaadro status → vendor code and{" "}
                <strong>Inbound</strong> for vendor code → Yaadro status. If the
                vendor requires a custom status request body, configure{" "}
                <strong>5. Mappings → Status sent to POS</strong>.
              </div>
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Status update mode
                </Label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={model.status_update.mode}
                  onChange={(e) =>
                    patchModel({
                      status_update: {
                        mode: e.target.value as PosStatusUpdateMode,
                      },
                    })
                  }
                >
                  {POS_STATUS_UPDATE_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <PosStatusMapsEditor
                value={model.status_maps}
                onChange={(status_maps) => patchModel({ status_maps })}
              />
            </div>
          </ConfigPanel>
        ) : null}

        {section === "test" ? (
          <ConfigPanel
            title="Test map (dry run)"
            description="Paste a sample vendor payload — does not call the live POS."
          >
            <PosTestMapPanel
              sections={
                mappingSections.length
                  ? mappingSections
                  : ["order_inbound"]
              }
              onTest={onTestMap}
              busy={testMapBusy}
            />
          </ConfigPanel>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <GitBranchIcon className="size-4 text-muted-foreground" />
            <span className="font-medium">Advanced — full config JSON</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (!showAdvancedJson) {
                setAdvancedText(JSON.stringify(config, null, 2));
                setAdvancedError(null);
              }
              setShowAdvancedJson((v) => !v);
            }}
          >
            {showAdvancedJson ? "Hide JSON" : "Edit raw JSON"}
          </Button>
        </div>
        {showAdvancedJson ? (
          <div className="space-y-3 border-t px-4 py-4">
            <div className="flex justify-end">
              <CopyButton
                value={advancedText}
                label="Copy config JSON"
                size={13}
              />
            </div>
            <Textarea
              className="min-h-64 font-mono text-xs"
              value={advancedText}
              onChange={(e) => setAdvancedText(e.target.value)}
              spellCheck={false}
            />
            {advancedError ? (
              <p className="text-sm text-destructive">{advancedError}</p>
            ) : null}
            <Button type="button" size="sm" onClick={applyAdvancedJson}>
              Apply JSON to form
            </Button>
            <p className="text-xs text-muted-foreground">
              Use only if structured sections cannot express your case. Applying
              replaces the whole config.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { parseTemplateConfig, serializeTemplateConfig };
