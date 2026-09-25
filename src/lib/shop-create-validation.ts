import type { CreateShopInput, ShopAddress } from "@/types/api";
import { humanizeApiMessage } from "@/lib/api-form-error";
import { cascadeVenueMasterFlagsSnake, validateVenueMasterFlagsSnake } from "@/lib/venue-feature-flags";
import { isPolicyPhoneValid, toE164Phone } from "@yaadro/phone-kit";

/** Matches admin-api / Postman create-shop contract. Cache-bust: wizard-step-valid-v2 */
export const SHOP_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/;
export const ECOM_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SHOP_USER_ID_MIN = 100000;
export const SHOP_USER_ID_MAX = 999999;

export const SHOP_NAME_MAX_LENGTH = 50;

export type CreateShopFormValues = {
  shop_name: string;
  second_name: string;
  shop_id: string;
  password: string;
  user_id: string;
  phone: string;
  contact_person_number: string;
  email: string;
  ecom_slug: string;
  ecom_enabled: boolean;
  ecom_order_confirmation_enabled: boolean;
  scheduled_order: boolean;
  pre_booking_enabled: boolean;
  nightly_stock_reset_enabled: boolean;
  merge_order: boolean;
  return_option: boolean;
  customer_ticket: boolean;
  venue_management_enabled: boolean;
  qr_ordering_enabled: boolean;
  table_ordering_enabled: boolean;
  room_service_enabled: boolean;
  pickup_ordering_enabled: boolean;
  drive_thru_enabled: boolean;
  is_msg_activated: boolean;
  single_msg: boolean;
  address_line_1: string;
  address_line_2: string;
  locality: string;
  city: string;
  latitude: string;
  longitude: string;
  contact_number: string;
};

export type CreateShopField =
  | keyof CreateShopFormValues
  | "form";

export type FieldErrors = Partial<Record<CreateShopField, string>>;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneInput(value: string) {
  return toE164Phone(value, "contact") ?? value.trim();
}

export function isValidPhone(value: string, mode: "mobile" | "contact" = "contact") {
  return isPolicyPhoneValid(value, mode);
}

function hasMeaningfulContactPhone(value: string) {
  return Boolean(toE164Phone(value, "contact"));
}

export function normalizeShopId(value: string) {
  return value.trim();
}

export function normalizeEcomSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function slugFromShopId(shopId: string) {
  return normalizeEcomSlug(shopId);
}

export function parseUserId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < SHOP_USER_ID_MIN || n > SHOP_USER_ID_MAX) {
    return null;
  }
  return n;
}

export function validateCreateShopField(
  field: keyof CreateShopFormValues,
  form: CreateShopFormValues,
): string | null {
  const value = form[field];

  switch (field) {
    case "shop_name": {
      const name = String(value).trim();
      if (!name) return "Shop name is required";
      if (name.length > SHOP_NAME_MAX_LENGTH) {
        return `Shop name must be at most ${SHOP_NAME_MAX_LENGTH} characters`;
      }
      return null;
    }
    case "second_name": {
      const name = String(value).trim();
      if (!name) return null;
      if (name.length > SHOP_NAME_MAX_LENGTH) {
        return `Second name must be at most ${SHOP_NAME_MAX_LENGTH} characters`;
      }
      return null;
    }
    case "shop_id": {
      const id = normalizeShopId(String(value));
      if (!id) return "Shop ID is required";
      if (id.length < 3 || id.length > 50) {
        return "Shop ID must be 3–50 characters";
      }
      if (!SHOP_ID_RE.test(id)) {
        return "Use letters, numbers, _ or - only (must start with letter/number)";
      }
      return null;
    }
    case "user_id": {
      if (!String(value).trim()) return "Shop login ID (user_id) is required";
      if (parseUserId(String(value)) == null) {
        return "Must be a 6-digit number between 100000 and 999999";
      }
      return null;
    }
    case "password": {
      const password = String(value);
      if (!password) return "Password is required";
      if (password.length < 8 || password.length > 128) {
        return "Password must be 8–128 characters";
      }
      return null;
    }
    case "phone": {
      const raw = String(value).trim();
      if (!raw) return "Shop phone is required";
      if (!isPolicyPhoneValid(raw, "contact")) {
        return "Enter a valid mobile or landline number";
      }
      return null;
    }
    case "contact_person_number": {
      const raw = String(value).trim();
      if (!raw) return null;
      if (!isPolicyPhoneValid(raw, "contact")) {
        return "Enter a valid mobile or landline number";
      }
      return null;
    }
    case "email": {
      const email = String(value).trim();
      if (!email) return null;
      if (email.length > 254 || !EMAIL_RE.test(email)) {
        return "Enter a valid email address";
      }
      return null;
    }
    case "ecom_slug": {
      const slug = String(value).trim();
      if (!slug) return null;
      if (!ECOM_SLUG_RE.test(slug)) {
        return "Slug must be lowercase letters, numbers, and hyphens";
      }
      if (slug.length > 80) return "Slug must be at most 80 characters";
      return null;
    }
    case "ecom_order_confirmation_enabled":
    case "customer_ticket": {
      if (value === true && !form.ecom_enabled) {
        return "Requires ecom to be enabled";
      }
      return null;
    }
    case "venue_management_enabled":
    case "qr_ordering_enabled":
    case "table_ordering_enabled":
    case "room_service_enabled":
    case "pickup_ordering_enabled":
    case "drive_thru_enabled": {
      const venueError = validateVenueMasterFlagsSnake({
        ecom_enabled: form.ecom_enabled,
        venue_management_enabled: form.venue_management_enabled,
        qr_ordering_enabled: form.qr_ordering_enabled,
        table_ordering_enabled: form.table_ordering_enabled,
        room_service_enabled: form.room_service_enabled,
        pickup_ordering_enabled: form.pickup_ordering_enabled,
        drive_thru_enabled: form.drive_thru_enabled,
      });
      if (!venueError) return null;
      // Only attach the error to the field that is currently on and invalid.
      if (value !== true) return null;
      if (venueError.includes(String(field))) return humanizeApiMessage(venueError);
      return null;
    }
    case "single_msg": {
      if (value === true && !form.is_msg_activated) {
        return "Requires messaging to be activated";
      }
      return null;
    }
    case "latitude": {
      const raw = String(value).trim();
      if (!raw) return "Location pin or latitude is required";
      const n = Number(raw);
      if (!Number.isFinite(n) || n < -90 || n > 90) {
        return "Latitude must be between -90 and 90";
      }
      return null;
    }
    case "longitude": {
      const raw = String(value).trim();
      if (!raw) return "Location pin or longitude is required";
      const n = Number(raw);
      if (!Number.isFinite(n) || n < -180 || n > 180) {
        return "Longitude must be between -180 and 180";
      }
      return null;
    }
    case "contact_number": {
      const raw = String(value).trim();
      if (!raw) {
        return "Address phone is required";
      }
      if (!isPolicyPhoneValid(raw, "contact")) {
        return "Enter a valid mobile or landline number";
      }
      return null;
    }
    case "address_line_1": {
      const text = String(value).trim();
      if (!text) return "Address line 1 is required";
      if (text.length > 200) return "Must be at most 200 characters";
      return null;
    }
    case "city": {
      const text = String(value).trim();
      if (!text) return "City is required";
      if (text.length > 200) return "Must be at most 200 characters";
      return null;
    }
    case "address_line_2":
    case "locality": {
      const text = String(value).trim();
      if (text.length > 200) return "Must be at most 200 characters";
      return null;
    }
    default:
      return null;
  }
}

export function validateCreateShopForm(
  form: CreateShopFormValues,
): FieldErrors {
  const fields: Array<keyof CreateShopFormValues> = [
    "shop_name",
    "second_name",
    "shop_id",
    "user_id",
    "password",
    "phone",
    "contact_person_number",
    "email",
    "ecom_slug",
    "ecom_order_confirmation_enabled",
    "customer_ticket",
    "venue_management_enabled",
    "qr_ordering_enabled",
    "table_ordering_enabled",
    "room_service_enabled",
    "pickup_ordering_enabled",
    "drive_thru_enabled",
    "is_msg_activated",
    "single_msg",
    "address_line_1",
    "address_line_2",
    "locality",
    "city",
    "latitude",
    "longitude",
    "contact_number",
  ];
  const errors: FieldErrors = {};
  for (const field of fields) {
    const message = validateCreateShopField(field, form);
    if (message) errors[field] = message;
  }
  return errors;
}

export function isCreateShopFormValid(form: CreateShopFormValues) {
  return Object.keys(validateCreateShopForm(form)).length === 0;
}

export type ShopCreateWizardStep = 0 | 1 | 2 | 3;

export const SHOP_CREATE_STEP_FIELDS: Record<
  ShopCreateWizardStep,
  Array<keyof CreateShopFormValues>
> = {
  0: [
    "shop_name",
    "second_name",
    "shop_id",
    "user_id",
    "password",
    "phone",
    "contact_person_number",
    "email",
    "ecom_slug",
  ],
  1: [
    "address_line_1",
    "address_line_2",
    "locality",
    "city",
    "latitude",
    "longitude",
    "contact_number",
  ],
  2: [
    "ecom_order_confirmation_enabled",
    "customer_ticket",
    "venue_management_enabled",
    "qr_ordering_enabled",
    "table_ordering_enabled",
    "room_service_enabled",
    "pickup_ordering_enabled",
    "drive_thru_enabled",
    "is_msg_activated",
    "single_msg",
  ],
  3: [],
};

export function validateCreateShopStep(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of SHOP_CREATE_STEP_FIELDS[step]) {
    const message = validateCreateShopField(field, form);
    if (message) errors[field] = message;
  }
  return errors;
}

export function isCreateShopStepValid(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
) {
  return Object.keys(validateCreateShopStep(step, form)).length === 0;
}

function buildAddress(form: CreateShopFormValues): ShopAddress | undefined {
  const address_line_1 = form.address_line_1.trim() || undefined;
  const address_line_2 = form.address_line_2.trim() || undefined;
  const locality = form.locality.trim() || undefined;
  const city = form.city.trim() || undefined;
  const contact_number = hasMeaningfulContactPhone(form.contact_number)
    ? normalizePhoneInput(form.contact_number)
    : undefined;
  const latitudeRaw = form.latitude.trim();
  const longitudeRaw = form.longitude.trim();
  const latitude = latitudeRaw ? Number(latitudeRaw) : undefined;
  const longitude = longitudeRaw ? Number(longitudeRaw) : undefined;

  const address: ShopAddress = {};
  if (address_line_1) address.address_line_1 = address_line_1;
  if (address_line_2) address.address_line_2 = address_line_2;
  if (locality) address.locality = locality;
  if (city) address.city = city;
  if (contact_number) address.contact_number = contact_number;
  if (latitude != null && Number.isFinite(latitude)) address.latitude = latitude;
  if (longitude != null && Number.isFinite(longitude)) {
    address.longitude = longitude;
  }

  return Object.keys(address).length > 0 ? address : undefined;
}

/** Fields allowed on POST /v2/shops (creates owners + delivery + ecom rows). */
export function buildCreateShopPayload(
  form: CreateShopFormValues,
): CreateShopInput {
  const user_id = parseUserId(form.user_id);
  if (user_id == null) {
    throw new Error("Invalid user_id");
  }

  const shop_id = normalizeShopId(form.shop_id);
  const ecom_enabled = form.ecom_enabled;
  const venueFlags = cascadeVenueMasterFlagsSnake({
    ecom_enabled,
    venue_management_enabled: form.venue_management_enabled,
    qr_ordering_enabled: form.qr_ordering_enabled,
    table_ordering_enabled: form.table_ordering_enabled,
    room_service_enabled: form.room_service_enabled,
    pickup_ordering_enabled: form.pickup_ordering_enabled,
    drive_thru_enabled: form.drive_thru_enabled,
  });
  const payload: CreateShopInput = {
    shop_name: form.shop_name.trim(),
    shop_id,
    password: form.password,
    user_id,
    ecom_enabled,
    ecom_order_confirmation_enabled: ecom_enabled
      ? form.ecom_order_confirmation_enabled
      : false,
    scheduled_order: form.scheduled_order,
    pre_booking_enabled: form.pre_booking_enabled,
      nightly_stock_reset_enabled: form.nightly_stock_reset_enabled,
    merge_order: form.merge_order,
    return_option: form.return_option,
    customer_ticket: ecom_enabled ? form.customer_ticket : false,
    venue_management_enabled: venueFlags.venue_management_enabled,
    qr_ordering_enabled: venueFlags.qr_ordering_enabled,
    table_ordering_enabled: venueFlags.table_ordering_enabled,
    room_service_enabled: venueFlags.room_service_enabled,
    pickup_ordering_enabled: venueFlags.pickup_ordering_enabled,
    drive_thru_enabled: venueFlags.drive_thru_enabled,
    // Integration is only enabled from shop edit (Features tab).
    integration_enabled: false,
    is_msg_activated: form.is_msg_activated,
    single_msg: form.is_msg_activated ? form.single_msg : false,
  };

  const second_name = form.second_name.trim();
  if (second_name) payload.second_name = second_name;

  const phone = hasMeaningfulContactPhone(form.phone)
    ? normalizePhoneInput(form.phone)
    : "";
  if (phone) payload.phone = phone;

  const contact_person_number = hasMeaningfulContactPhone(form.contact_person_number)
    ? normalizePhoneInput(form.contact_person_number)
    : "";
  if (contact_person_number) {
    payload.contact_person_number = contact_person_number;
  }

  const email = form.email.trim();
  if (email) payload.email = email;

  const slug = form.ecom_slug.trim()
    ? normalizeEcomSlug(form.ecom_slug)
    : normalizeEcomSlug(form.shop_name);
  if (slug) payload.ecom_slug = slug;

  const address = buildAddress(form);
  if (!address?.address_line_1 || !address.city) {
    throw new Error("Address is required");
  }
  if (address.latitude == null || address.longitude == null) {
    throw new Error("Address location is required");
  }
  payload.address = address;

  return payload;
}

/** Map Nest/Zod API error body onto form field keys. */
export function mapApiErrorsToFields(err: {
  message?: string;
  body?: unknown;
}): FieldErrors {
  const errors: FieldErrors = {};
  const body = err.body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : "";
    const field = typeof record.field === "string" ? record.field : "";

    if (code === "shop_exists" || field === "shop_id") {
      errors.shop_id = err.message || "Shop ID already exists";
    } else if (code === "user_id_taken" || field === "user_id") {
      errors.user_id = err.message || "User ID already taken";
    } else if (code === "ecom_slug_taken" || field === "ecom_slug") {
      errors.ecom_slug = err.message || "Ecom slug already taken";
    } else if (code === "shop_license_taken" || field === "shop_license_no") {
      errors.form = err.message || "Shop license already taken";
    } else if (code === "domain_taken" || field === "domain") {
      errors.form = err.message || "Domain already taken";
    } else if (code === "group_not_found" || field === "group_id") {
      errors.form = err.message || "Group not found";
    }

    if (Array.isArray(record.errors)) {
      for (const issue of record.errors) {
        if (!issue || typeof issue !== "object") continue;
        const row = issue as Record<string, unknown>;
        const path = typeof row.path === "string" ? row.path : "";
        const msg = typeof row.message === "string" ? row.message : "";
        if (!path || !msg) continue;
        const key = path.split(".")[0];
        const friendly = humanizeApiMessage(
          path && msg.includes(path) ? msg : `${path}: ${msg}`,
        );
        if (key === "address") {
          const nested = path.split(".")[1] as CreateShopField | undefined;
          if (nested) errors[nested] = friendly;
          else errors.address_line_1 = friendly;
        } else {
          errors[key as CreateShopField] = friendly;
        }
      }
    }
  }

  if (Object.keys(errors).length === 0 && err.message) {
    errors.form = humanizeApiMessage(err.message);
  }
  return errors;
}
