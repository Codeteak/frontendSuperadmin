import { ApiError } from "@/lib/api";

/** Human labels for shop / feature API field names. */
export const SHOP_FIELD_LABELS: Record<string, string> = {
  shop_id: "Shop ID",
  user_id: "User ID",
  shop_name: "Shop name",
  second_name: "Second name",
  phone: "Phone",
  email: "Email",
  password: "Password",
  status: "Status",
  status_reason: "Status reason",
  shop_license_no: "Shop license no",
  contact_person_number: "Contact person number",
  contact_person_email: "Contact person email",
  upi_id: "UPI ID",
  vat: "VAT %",
  vat_enabled: "VAT enabled",
  enable_promotion: "Enable promotion",
  ecom_enabled: "Ecom enabled",
  ecom_slug: "Ecom slug",
  ecom_order_confirmation_enabled: "Ecom order confirmation",
  marketplace_enabled: "Marketplace enabled",
  scheduled_order: "Scheduled orders",
  pre_booking_enabled: "Pre-booking",
  nightly_stock_reset_enabled: "Nightly stock reset",
  merge_order: "Merge orders",
  return_option: "Return option",
  customer_ticket: "Customer tickets",
  venue_management_enabled: "Venue management",
  qr_ordering_enabled: "QR ordering",
  table_ordering_enabled: "Table ordering",
  room_service_enabled: "Room service",
  pickup_ordering_enabled: "Pickup ordering",
  drive_thru_enabled: "Drive-thru",
  integration_enabled: "Integration enabled",
  integration_rate_limit: "Integration rate limit",
  is_msg_activated: "Messaging activated",
  single_msg: "Single message",
  delivery_time: "Delivery time",
  self_assigned: "Self assigned",
  pickup_disabled: "Skip rider picked-up status",
  preparing_status_enabled: "Preparing status enabled",
  ready_status_enabled: "Ready status enabled",
  bonus_penalty: "Bonus / penalty",
  bonus_penalty_start_status: "Bonus penalty start status",
  dp_commission_enabled: "DP item commission",
  dp_commission_percent: "DP commission percent",
  common_penalty_enabled: "Common penalty enabled",
  common_penalty_idle_minutes: "Common penalty idle minutes",
  common_penalty_min_online_minutes: "Common penalty min online minutes",
  promotion_header: "Promotion header",
  promotion_content: "Promotion content",
  promotion_link: "Promotion link",
  promotion_image_s3_key: "Promotion image",
  is_marketing_enabled: "Marketing enabled",
  service_configs: "Service configs",
  allow_anonymous_table_orders: "Guest QR checkout",
  table_session_policy: "Table session policy",
  min_order_amount: "Min order amount",
  delivery_charge: "Delivery charge",
  free_delivery_above_amount: "Free delivery above",
  delivery_radius_km: "Delivery radius",
  address_line_1: "Address line 1",
  address_line_2: "Address line 2",
  locality: "Locality",
  city: "City",
  latitude: "Latitude",
  longitude: "Longitude",
  contact_number: "Contact number",
  start_date: "Start date",
  end_date: "End date",
  amount: "Amount",
  last_payment_date: "Last payment date",
};

export type ParsedApiFormError = {
  /** Short user-facing summary for toast / banner */
  message: string;
  /** Per-field friendly messages */
  fields: Record<string, string>;
  /** Fields to highlight (primary dependency first) */
  highlightFields: string[];
};

function labelFor(field: string): string {
  if (SHOP_FIELD_LABELS[field]) return SHOP_FIELD_LABELS[field];
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFieldKeys(text: string): string[] {
  const keys = new Set<string>();
  const known = Object.keys(SHOP_FIELD_LABELS).sort((a, b) => b.length - a.length);
  for (const key of known) {
    if (text.includes(key)) keys.add(key);
  }
  // snake_case tokens that look like API fields
  const matches = text.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? [];
  for (const m of matches) keys.add(m);
  return [...keys];
}

/** Turn raw API / Zod text into a readable sentence. */
export function humanizeApiMessage(raw: string): string {
  const text = raw.trim();
  if (!text) return "Something went wrong. Please try again.";

  if (/^integration_disabled$/i.test(text)) {
    return "Integration is not enabled. Enable integration first, then rotate the token.";
  }

  // "X requires Y to be true"
  const requiresTrue = text.match(
    /^([a-z0-9_.]+)\s+requires\s+([a-z0-9_.]+)\s+to\s+be\s+true$/i,
  );
  if (requiresTrue) {
    const dependent = labelFor(requiresTrue[1].split(".").pop()!);
    const required = labelFor(requiresTrue[2].split(".").pop()!);
    return `${dependent} can only be turned on when ${required} is enabled. Turn on ${required} first, or turn off ${dependent}.`;
  }

  // "X requires Y to be false"
  const requiresFalse = text.match(
    /^([a-z0-9_.]+)\s+requires\s+([a-z0-9_.]+)\s+to\s+be\s+false$/i,
  );
  if (requiresFalse) {
    const dependent = labelFor(requiresFalse[1].split(".").pop()!);
    const required = labelFor(requiresFalse[2].split(".").pop()!);
    return `${dependent} requires ${required} to be off.`;
  }

  // "X must be …"
  const mustBe = text.match(/^([a-z0-9_.]+)\s+must\s+be\s+(.+)$/i);
  if (mustBe) {
    return `${labelFor(mustBe[1].split(".").pop()!)} must be ${mustBe[2]}.`;
  }

  // "X is required"
  const isRequired = text.match(/^([a-z0-9_.]+)\s+is\s+required$/i);
  if (isRequired) {
    return `${labelFor(isRequired[1].split(".").pop()!)} is required.`;
  }

  // Replace known snake_case field names inside the message
  let out = text;
  const known = Object.keys(SHOP_FIELD_LABELS).sort((a, b) => b.length - a.length);
  for (const key of known) {
    if (!out.includes(key)) continue;
    out = out.split(key).join(labelFor(key));
  }

  // Soften common technical prefixes
  out = out
    .replace(/^Validation failed[:\s-]*/i, "")
    .replace(/^Bad Request[:\s-]*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!out) return "Something went wrong. Please try again.";
  // Capitalize first letter
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function collectRawIssues(err: unknown): Array<{ path?: string; message: string }> {
  const issues: Array<{ path?: string; message: string }> = [];

  if (!(err instanceof ApiError)) {
    if (err instanceof Error && err.message) {
      issues.push({ message: err.message });
    } else {
      issues.push({ message: "Something went wrong. Please try again." });
    }
    return issues;
  }

  const body = err.body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    if (typeof record.field === "string" && record.field) {
      issues.push({
        path: record.field,
        message:
          typeof record.message === "string" && record.message
            ? record.message
            : err.message,
      });
    }

    if (Array.isArray(record.errors)) {
      for (const issue of record.errors) {
        if (!issue || typeof issue !== "object") continue;
        const row = issue as Record<string, unknown>;
        const path =
          typeof row.path === "string"
            ? row.path
            : Array.isArray(row.path)
              ? row.path.map(String).join(".")
              : undefined;
        const msg =
          typeof row.message === "string"
            ? row.message
            : typeof row.msg === "string"
              ? row.msg
              : "";
        if (msg) issues.push({ path, message: msg });
      }
    }

    // Nest sometimes returns message as string[]
    if (Array.isArray(record.message)) {
      for (const item of record.message) {
        if (typeof item === "string" && item.trim()) {
          issues.push({ message: item });
        }
      }
    }
  }

  if (issues.length === 0 && err.message) {
    // Split combined "a; b" messages from parseError
    for (const part of err.message.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const pathPrefixed = trimmed.match(/^([a-z0-9_.]+)\s*:\s*(.+)$/i);
      if (pathPrefixed) {
        issues.push({ path: pathPrefixed[1], message: pathPrefixed[2] });
      } else {
        issues.push({ message: trimmed });
      }
    }
  }

  if (issues.length === 0) {
    issues.push({ message: "Something went wrong. Please try again." });
  }

  return issues;
}

/**
 * Parse any API / thrown error into a friendly summary + field highlights.
 */
export function parseApiFormError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedApiFormError {
  const issues = collectRawIssues(err);
  const fields: Record<string, string> = {};
  const highlight = new Set<string>();

  const summaries: string[] = [];

  for (const issue of issues) {
    const friendly = humanizeApiMessage(issue.message);
    summaries.push(friendly);

    const fromPath = issue.path
      ? issue.path.split(".").filter(Boolean)
      : [];
    const fromText = extractFieldKeys(issue.message);
    const keys = [...fromPath, ...fromText]
      .map((k) => k.split(".").pop()!)
      .filter(Boolean);

    for (const key of keys) {
      highlight.add(key);
      if (!fields[key]) {
        fields[key] = friendly;
      }
    }

    // Dependency rule: highlight both sides; put the required parent first
    const requiresTrue = issue.message.match(
      /^([a-z0-9_.]+)\s+requires\s+([a-z0-9_.]+)\s+to\s+be\s+true$/i,
    );
    if (requiresTrue) {
      const dependent = requiresTrue[1].split(".").pop()!;
      const required = requiresTrue[2].split(".").pop()!;
      highlight.add(required);
      highlight.add(dependent);
      fields[required] =
        fields[required] ??
        `Turn on ${labelFor(required)} to use ${labelFor(dependent)}.`;
      fields[dependent] =
        fields[dependent] ??
        `${labelFor(dependent)} needs ${labelFor(required)} enabled.`;
    }
  }

  // Prefer a single clear summary
  const message =
    summaries.find(Boolean) ||
    (err instanceof ApiError ? humanizeApiMessage(err.message) : fallback);

  // Order: required dependency fields (ecom_enabled etc.) first when present
  const priority = ["ecom_enabled", "status", "shop_id", "user_id"];
  const highlightFields = [...highlight].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return { message, fields, highlightFields };
}

/** Scroll the first highlighted field into view. */
export function focusHighlightedField(fieldIds: string[], idPrefix = "") {
  if (typeof document === "undefined") return;
  for (const field of fieldIds) {
    const id = `${idPrefix}${field}`;
    const el =
      document.getElementById(id) ??
      document.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!el) continue;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof el.focus === "function") {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
    return;
  }
}
