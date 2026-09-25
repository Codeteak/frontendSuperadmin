import type { CreateShopFormValues } from "@/lib/shop-create-validation";

const DRAFT_KEY = "yaadro:shop-create-draft";
const DRAFT_VERSION = 5;

export type ShopCreateWizardStep = 0 | 1 | 2 | 3;

export type ShopCreateDraftMeta = {
  currentStep: ShopCreateWizardStep;
  shopIdEdited: boolean;
  slugEdited: boolean;
  shopIdUniquePart: string;
};

export type ShopCreateDraft = {
  version: number;
  savedAt: string;
  form: Omit<CreateShopFormValues, "password">;
  meta: ShopCreateDraftMeta;
};

export const INITIAL_CREATE_SHOP_FORM: CreateShopFormValues = {
  shop_name: "",
  second_name: "",
  shop_id: "",
  password: "",
  user_id: "",
  phone: "",
  contact_person_number: "",
  email: "",
  ecom_slug: "",
  ecom_enabled: true,
  ecom_order_confirmation_enabled: false,
  scheduled_order: false,
  pre_booking_enabled: false,
  nightly_stock_reset_enabled: false,
  merge_order: false,
  return_option: false,
  customer_ticket: false,
  venue_management_enabled: false,
  qr_ordering_enabled: false,
  table_ordering_enabled: false,
  room_service_enabled: false,
  pickup_ordering_enabled: false,
  drive_thru_enabled: false,
  is_msg_activated: false,
  single_msg: false,
  address_line_1: "",
  address_line_2: "",
  locality: "",
  city: "",
  latitude: "",
  longitude: "",
  contact_number: "",
};

export function createShopIdUniquePart() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function loadShopCreateDraft(): ShopCreateDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ShopCreateDraft>;
    if (parsed.version !== DRAFT_VERSION || !parsed.form || !parsed.meta) {
      return null;
    }

    const { password: _password, ...initialWithoutPassword } =
      INITIAL_CREATE_SHOP_FORM;

    return {
      version: DRAFT_VERSION,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
      form: {
        ...initialWithoutPassword,
        ...parsed.form,
      },
      meta: {
        currentStep: parsed.meta.currentStep ?? 0,
        shopIdEdited: Boolean(parsed.meta.shopIdEdited),
        slugEdited: Boolean(parsed.meta.slugEdited),
        shopIdUniquePart:
          parsed.meta.shopIdUniquePart || createShopIdUniquePart(),
      },
    };
  } catch {
    return null;
  }
}

export function saveShopCreateDraft(
  form: CreateShopFormValues,
  meta: ShopCreateDraftMeta,
) {
  if (typeof window === "undefined") return;

  const { password: _password, ...rest } = form;
  const draft: ShopCreateDraft = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    form: rest,
    meta,
  };

  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearShopCreateDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}
