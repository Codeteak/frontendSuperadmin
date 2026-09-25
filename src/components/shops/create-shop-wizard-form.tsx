"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { TopBarSlot } from "@/components/layout/top-bar-slot";
import { CreateShopFlowDialog, type CreateShopFlowPhase } from "@/components/shops/create-shop-flow-dialog";
import { ShopPhotoDropzone } from "@/components/shops/shop-photo-dropzone";
import {
  ShopLocationPicker,
  type ShopLocationPickerValue,
} from "@/components/shops/shop-location-picker";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternationalPhoneInput } from "@/components/ui/international-phone-input";
import { PhoneValue } from "@/components/shared/phone-value";
import { Label } from "@/components/ui/label";
import { StepProgress } from "@/components/ui/step-progress";
import { ApiError } from "@/lib/api";
import { appToast } from "@/lib/app-toast";
import {
  createShop,
  isShopIdAvailable,
  patchShopPhoto,
  suggestNextShopUserId,
} from "@/lib/api/shops";
import {
  clearShopCreateDraft,
  createShopIdUniquePart,
  INITIAL_CREATE_SHOP_FORM,
  loadShopCreateDraft,
  saveShopCreateDraft,
  type ShopCreateWizardStep,
} from "@/lib/shop-create-draft";
import {
  buildCreateShopPayload,
  isCreateShopFormValid,
  mapApiErrorsToFields,
  normalizeEcomSlug,
  normalizeShopId,
  SHOP_NAME_MAX_LENGTH,
  validateCreateShopField,
  validateCreateShopForm,
  type CreateShopFormValues,
  type FieldErrors,
} from "@/lib/shop-create-validation";
import {
  revokeShopPhotoPreview,
  type ShopPhotoSelection,
} from "@/lib/shop-photo";
import { cascadeVenueMasterFlagsSnake, hasQrCapableServiceSnake, venueEcomSyncHint } from "@/lib/venue-feature-flags";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 0,
    title: "Basics",
    description: "Name, login, and contact details",
  },
  {
    id: 1,
    title: "Address",
    description: "Required shop location and map pin",
  },
  {
    id: 2,
    title: "Features",
    description: "Choose what this shop can do",
  },
  {
    id: 3,
    title: "Review",
    description: "Confirm and create",
  },
] as const;

function formatShopIdDatePart(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function shopIdFromName(name: string, uniquePart: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) return "";
  const datePart = formatShopIdDatePart(new Date());
  const suffix = `${datePart}_${uniquePart}`;
  const maxBaseLength = Math.max(0, 50 - suffix.length - 1);
  const trimmedBase = base.slice(0, maxBaseLength);
  return trimmedBase ? `${trimmedBase}_${suffix}` : "";
}

function FormFieldsGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-12",
        className,
      )}
    >
      {children}
    </div>
  );
}

function WizardSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("w-full min-w-0", className)}>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  meta,
  action,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const showFooter = Boolean(hint || error || meta || action);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </Label>
      {children}
      {showFooter ? (
        <div className="flex min-h-5 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : hint ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
            {meta}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function FeatureToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  error?: string | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 border-b border-border/60 py-3.5 last:border-b-0",
        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-muted/30",
        error && "border-destructive/40",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
        {error ? (
          <span className="mt-1 block text-xs text-destructive">{error}</span>
        ) : null}
      </span>
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">
        {value || <span className="font-normal text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function isUserIdTakenError(err: unknown) {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const body = err.body as { code?: string; field?: string } | null;
  if (body?.code === "user_id_taken" || body?.field === "user_id") return true;
  return /user_id/i.test(err.message);
}

function toLocationValue(form: CreateShopFormValues): ShopLocationPickerValue {
  return {
    address_line_1: form.address_line_1,
    address_line_2: form.address_line_2,
    locality: form.locality,
    city: form.city,
    contact_number: form.contact_number,
    latitude: form.latitude,
    longitude: form.longitude,
  };
}

const STEP_FIELDS: Record<
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
    "is_msg_activated",
    "single_msg",
  ],
  3: [],
};

function validateWizardStep(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of STEP_FIELDS[step]) {
    const message = validateCreateShopField(field, form);
    if (message) errors[field] = message;
  }
  return errors;
}

function isWizardStepValid(
  step: ShopCreateWizardStep,
  form: CreateShopFormValues,
) {
  return Object.keys(validateWizardStep(step, form)).length === 0;
}

export function CreateShopWizard() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState<ShopCreateWizardStep>(0);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [checkingShopId, setCheckingShopId] = useState(false);
  const [form, setForm] = useState<CreateShopFormValues>(INITIAL_CREATE_SHOP_FORM);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [userIdHint, setUserIdHint] = useState<string | null>(null);
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [createPhase, setCreatePhase] = useState<CreateShopFlowPhase>("confirm");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);
  const [shopPhoto, setShopPhoto] = useState<ShopPhotoSelection | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [shopIdStatus, setShopIdStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const shopIdCheckRef = useRef(0);
  const slugEditedRef = useRef(false);
  const shopIdEditedRef = useRef(false);
  const shopIdUniquePartRef = useRef(createShopIdUniquePart());
  const backgroundModeRef = useRef(false);
  const createInFlightRef = useRef(false);
  const slowTimerRef = useRef<number | null>(null);

  const liveErrors = useMemo(() => validateCreateShopForm(form), [form]);
  const canSubmit =
    isCreateShopFormValid(form) &&
    shopIdStatus !== "taken" &&
    shopIdStatus !== "checking" &&
    !suggesting;

  useEffect(() => {
    const draft = loadShopCreateDraft();
    if (draft) {
      setForm((prev) => ({ ...prev, ...draft.form, password: "" }));
      setCurrentStep(draft.meta.currentStep);
      slugEditedRef.current = draft.meta.slugEdited;
      shopIdUniquePartRef.current = draft.meta.shopIdUniquePart;
      // Keep auto-gen unlocked unless the saved shop_id clearly diverged
      // from the auto suffix (avoids blur-only "edited" locking drafts).
      const unique = draft.meta.shopIdUniquePart;
      const savedId = String(draft.form.shop_id ?? "");
      shopIdEditedRef.current = Boolean(
        draft.meta.shopIdEdited &&
          savedId &&
          unique &&
          !savedId.endsWith(`_${unique}`),
      );
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveShopCreateDraft(form, {
      currentStep,
      shopIdEdited: shopIdEditedRef.current,
      slugEdited: slugEditedRef.current,
      shopIdUniquePart: shopIdUniquePartRef.current,
    });
  }, [form, currentStep, hydrated]);

  function showError(field: keyof CreateShopFormValues) {
    if (!touched[field] && !fieldErrors[field]) return null;
    return fieldErrors[field] ?? liveErrors[field] ?? null;
  }

  function markTouched(field: keyof CreateShopFormValues) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function setFieldError(field: keyof CreateShopFormValues, message: string | null) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function update<K extends keyof CreateShopFormValues>(
    key: K,
    value: CreateShopFormValues[K],
    options?: { manualShopId?: boolean },
  ) {
    setFormError(null);
    if (key === "user_id") setUserIdHint(null);
    if (key === "ecom_slug") slugEditedRef.current = true;
    if (key === "shop_id" && options?.manualShopId !== false) {
      shopIdEditedRef.current = true;
    }
    if (key === "shop_name" && !String(value).trim()) {
      // Clearing the name unlocks auto shop-id generation again.
      shopIdEditedRef.current = false;
    }

    setForm((prev) => {
      let next = { ...prev, [key]: value };
      if (key === "ecom_enabled" && value === false) {
        next.ecom_order_confirmation_enabled = false;
        next.customer_ticket = false;
      }
      if (key === "is_msg_activated" && value === false) {
        next.single_msg = false;
      }
      const cascaded = cascadeVenueMasterFlagsSnake({
        ecom_enabled: next.ecom_enabled,
        venue_management_enabled: next.venue_management_enabled,
        qr_ordering_enabled: next.qr_ordering_enabled,
        table_ordering_enabled: next.table_ordering_enabled,
        room_service_enabled: next.room_service_enabled,
        pickup_ordering_enabled: next.pickup_ordering_enabled,
        drive_thru_enabled: next.drive_thru_enabled,
      });
      next = { ...next, ...cascaded };
      if (key === "shop_name") {
        next.shop_name = String(value).slice(0, SHOP_NAME_MAX_LENGTH);
        const trimmedName = next.shop_name.trim();
        if (!trimmedName) {
          next.shop_id = "";
          if (!slugEditedRef.current) next.ecom_slug = "";
        } else {
          if (!shopIdEditedRef.current) {
            next.shop_id = shopIdFromName(
              next.shop_name,
              shopIdUniquePartRef.current,
            );
          }
          if (!slugEditedRef.current) {
            // Spaces / special chars become "-" (e.g. "Marina Cafe" → "marina-cafe").
            next.ecom_slug = normalizeEcomSlug(next.shop_name);
          }
        }
      }
      if (key === "second_name") {
        next.second_name = String(value).slice(0, SHOP_NAME_MAX_LENGTH);
      }
      if (key === "phone") {
        // Keep address phone in sync with shop phone.
        next.contact_number = String(value);
      }
      return next;
    });

    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function updateLocation(value: ShopLocationPickerValue) {
    setForm((prev) => ({
      ...prev,
      address_line_1: value.address_line_1,
      address_line_2: value.address_line_2,
      locality: value.locality,
      city: value.city,
      contact_number: value.contact_number,
      latitude: value.latitude,
      longitude: value.longitude,
    }));
    setFormError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of [
        "address_line_1",
        "address_line_2",
        "locality",
        "city",
        "contact_number",
        "latitude",
        "longitude",
      ] as const) {
        delete next[key];
      }
      delete next.form;
      return next;
    });
  }

  async function fillNextUserId(opts?: { silent?: boolean }) {
    setSuggesting(true);
    if (!opts?.silent) setFormError(null);
    try {
      const next = await suggestNextShopUserId();
      setForm((prev) => ({ ...prev, user_id: String(next) }));
      setTouched((prev) => ({ ...prev, user_id: true }));
      setFieldError("user_id", null);
      setUserIdHint(`Suggested next free login ID: ${next}`);
      return next;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not suggest user ID";
      if (!opts?.silent) setFormError(message);
      setForm((prev) =>
        prev.user_id ? prev : { ...prev, user_id: "100000" },
      );
      setUserIdHint(null);
      return null;
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => {
    if (!hydrated || form.user_id) return;
    void fillNextUserId({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, form.user_id]);

  useEffect(() => {
    const shopId = normalizeShopId(form.shop_id);
    const formatError = validateCreateShopField("shop_id", form);
    if (!shopId || formatError) {
      setShopIdStatus("idle");
      setCheckingShopId(false);
      return;
    }

    const checkId = ++shopIdCheckRef.current;
    setShopIdStatus("checking");
    setCheckingShopId(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const available = await isShopIdAvailable(shopId);
          if (checkId !== shopIdCheckRef.current) return;
          if (available) {
            setShopIdStatus("available");
            setFieldError("shop_id", null);
          } else {
            setShopIdStatus("taken");
            setFieldError("shop_id", "Shop ID already exists");
          }
        } catch {
          if (checkId !== shopIdCheckRef.current) return;
          setShopIdStatus("error");
        } finally {
          if (checkId === shopIdCheckRef.current) setCheckingShopId(false);
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.shop_id]);

  function validateStep(step: ShopCreateWizardStep) {
    const errors = validateWizardStep(step, form);
    if (step === 0 && shopIdStatus === "taken") {
      errors.shop_id = "Shop ID already exists";
    }
    return errors;
  }

  function markStepTouched(step: ShopCreateWizardStep) {
    const fields = [
      "shop_name",
      "second_name",
      "shop_id",
      "user_id",
      "password",
      "phone",
      "contact_person_number",
      "email",
      "ecom_slug",
      "address_line_1",
      "address_line_2",
      "locality",
      "city",
      "latitude",
      "longitude",
      "contact_number",
      "ecom_order_confirmation_enabled",
      "customer_ticket",
      "is_msg_activated",
      "single_msg",
      "ecom_order_confirmation_enabled",
    ] as const;

    const stepFields: Record<ShopCreateWizardStep, readonly string[]> = {
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
        "is_msg_activated",
        "single_msg",
      ],
      3: fields,
    };

    setTouched((prev) => {
      const next = { ...prev };
      for (const field of stepFields[step]) {
        next[field] = true;
      }
      return next;
    });
  }

  function goNext() {
    setFormError(null);

    let nextForm = form;
    if (currentStep === 0) {
      // Address phone follows shop phone when entering the address step.
      nextForm = {
        ...form,
        contact_number: form.phone,
      };
      setForm(nextForm);
    }

    markStepTouched(currentStep);
    const errors = validateWizardStep(currentStep, nextForm);
    if (currentStep === 0 && shopIdStatus === "taken") {
      errors.shop_id = "Shop ID already exists";
    }
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    if (Object.keys(errors).length > 0 || shopIdStatus === "checking") {
      setFormError("Fix the highlighted fields before continuing.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3) as ShopCreateWizardStep);
  }

  function goBack() {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0) as ShopCreateWizardStep);
  }

  function handleCancel() {
    revokeShopPhotoPreview(shopPhoto);
    clearShopCreateDraft();
    router.push("/shops");
  }

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      revokeShopPhotoPreview(shopPhoto);
    };
  }, [shopPhoto]);

  function handleShopPhotoChange(next: ShopPhotoSelection | null) {
    revokeShopPhotoPreview(shopPhoto);
    setShopPhoto(next);
  }

  function validateForCreate() {
    setFormError(null);
    markStepTouched(3);

    const errors = validateCreateShopForm(form);
    if (shopIdStatus === "taken") {
      errors.shop_id = "Shop ID already exists";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || shopIdStatus === "checking") {
      setFormError("Fix the highlighted fields before creating the shop.");
      return false;
    }
    return true;
  }

  function openCreateConfirm() {
    if (!validateForCreate()) return;
    setCreateError(null);
    setCreatedShopId(null);
    backgroundModeRef.current = false;
    setCreatePhase("confirm");
    setCreateFlowOpen(true);
  }

  function handleRunInBackground() {
    backgroundModeRef.current = true;
    setCreateFlowOpen(false);
    appToast.info("Creating shop in the background…");
  }

  function handleViewCreatedShop() {
    const id = createdShopId;
    setCreateFlowOpen(false);
    if (id) router.push(`/shops/${encodeURIComponent(id)}`);
  }

  function handleCreateFlowOpenChange(open: boolean) {
    if (!open && (createPhase === "creating" || createPhase === "slow")) return;
    setCreateFlowOpen(open);
    if (!open && createPhase === "confirm") {
      setCreateError(null);
    }
  }

  async function handleCreateApiError(err: unknown) {
    if (isUserIdTakenError(err)) {
      const taken = form.user_id;
      const next = await fillNextUserId({ silent: true });
      setFieldErrors({
        user_id:
          next != null
            ? `User ID ${taken} is taken. Suggested ${next} — submit again.`
            : err instanceof ApiError
              ? err.message
              : "User ID already taken",
      });
      const msg = "User ID conflict — review the suggested ID and retry.";
      setFormError(msg);
      setCurrentStep(0);
      return msg;
    }

    if (err instanceof ApiError) {
      const mapped = mapApiErrorsToFields({
        message: err.message,
        body: err.body,
      });
      setFieldErrors(mapped);
      const msg = mapped.form ?? err.message;
      setFormError(msg);
      if (mapped.shop_id) {
        setShopIdStatus("taken");
        setCurrentStep(0);
      }
      return msg;
    }

    const msg = err instanceof Error ? err.message : "Failed to create shop";
    setFormError(msg);
    return msg;
  }

  async function executeCreate() {
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setCreatePhase("creating");
    setLoading(true);

    slowTimerRef.current = window.setTimeout(() => {
      if (!backgroundModeRef.current) {
        setCreatePhase((prev) => (prev === "creating" ? "slow" : prev));
      }
    }, 5000);

    try {
      const payload = buildCreateShopPayload(form);

      try {
        const available = await isShopIdAvailable(payload.shop_id);
        if (!available) {
          setShopIdStatus("taken");
          setFieldErrors({ shop_id: "Shop ID already exists" });
          const msg = "Shop ID already exists — choose another.";
          setFormError(msg);
          setCurrentStep(0);
          if (backgroundModeRef.current) {
            appToast.error(msg);
          } else {
            setCreateError(msg);
            setCreatePhase("error");
            setCreateFlowOpen(true);
          }
          return;
        }
      } catch {
        // Proceed — server will still enforce uniqueness
      }

      const shop = await createShop(payload);
      const id = String(shop?.shop_id || payload.shop_id);

      if (shopPhoto) {
        try {
          await patchShopPhoto(id, {
            photo_base64: shopPhoto.base64,
            photo_content_type: shopPhoto.contentType,
          });
        } catch (photoErr) {
          const photoMsg =
            photoErr instanceof ApiError
              ? photoErr.message
              : "Shop created, but profile photo could not be uploaded.";
          appToast.error(photoMsg);
        }
      }

      revokeShopPhotoPreview(shopPhoto);
      setShopPhoto(null);
      clearShopCreateDraft();
      setCreatedShopId(id);
      appToast.success(
        `Shop "${form.shop_name || id}" created successfully.`,
      );

      if (backgroundModeRef.current) {
        setCreateFlowOpen(false);
        router.push(`/shops/${encodeURIComponent(id)}`);
      } else {
        setCreatePhase("success");
        setCreateFlowOpen(true);
      }
    } catch (err) {
      const msg = await handleCreateApiError(err);
      if (backgroundModeRef.current) {
        appToast.error(msg);
      } else {
        setCreateError(msg);
        setCreatePhase("error");
        setCreateFlowOpen(true);
      }
    } finally {
      if (slowTimerRef.current) {
        window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setLoading(false);
      createInFlightRef.current = false;
    }
  }

  function handleCreateConfirm() {
    void executeCreate();
  }

  function handleRetryCreate() {
    setCreateError(null);
    setCreatePhase("confirm");
  }

  const featureLabels: Array<{ key: keyof CreateShopFormValues; label: string }> = [
    { key: "ecom_enabled", label: "Ecom enabled" },
    {
      key: "ecom_order_confirmation_enabled",
      label: "Ecom order confirmation",
    },
    { key: "scheduled_order", label: "Scheduled orders" },
    { key: "pre_booking_enabled", label: "Pre-booking" },
    { key: "nightly_stock_reset_enabled", label: "Nightly stock reset" },
    { key: "merge_order", label: "Merge orders" },
    { key: "return_option", label: "Return option" },
    { key: "customer_ticket", label: "Customer tickets" },
    { key: "venue_management_enabled", label: "Venue management" },
    { key: "table_ordering_enabled", label: "Table ordering" },
    { key: "room_service_enabled", label: "Room service" },
    { key: "qr_ordering_enabled", label: "QR ordering" },
    { key: "pickup_ordering_enabled", label: "Pickup ordering" },
    { key: "drive_thru_enabled", label: "Drive-thru" },
    { key: "is_msg_activated", label: "Messaging activated" },
    { key: "single_msg", label: "Single message" },
  ];

  const activeStep = STEPS[currentStep];

  const stepProgressItems = useMemo(
    () =>
      STEPS.map((step) => ({
        id: String(step.id),
        label: step.title,
        description: step.description,
      })),
    [],
  );

  return (
    <PageShell className="w-full max-w-none">
      <TopBarSlot>
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </TopBarSlot>

      <div className="mb-8 w-full">
        <h1 className="text-2xl font-semibold tracking-tight">Create shop</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeStep.description}. Progress is saved automatically.
        </p>
      </div>

      <StepProgress
        className="mb-10"
        steps={stepProgressItems}
        currentStep={currentStep}
        progress={1}
        orientation="horizontal"
        onStepClick={(index) => {
          if (index < currentStep) {
            setFormError(null);
            setCurrentStep(index as ShopCreateWizardStep);
          }
        }}
      />

      <form
        id="create-shop-form"
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="w-full max-w-none space-y-10 pb-28"
      >
        {currentStep === 0 ? (
          <div className="w-full space-y-12">
            <WizardSection
              title="Profile photo"
              description="Optional logo or storefront image shown on the shop profile."
            >
              <div className="max-w-xl">
                <ShopPhotoDropzone
                  value={shopPhoto}
                  onChange={handleShopPhotoChange}
                  disabled={loading}
                />
              </div>
            </WizardSection>

            <WizardSection
              title="Account"
              description="Login credentials for the shop owner."
            >
              <FormFieldsGrid>
                <FormField
                  label="Shop name"
                  htmlFor="shop_name"
                  required
                  hint={`${form.shop_name.length}/${SHOP_NAME_MAX_LENGTH}`}
                  error={showError("shop_name")}
                  className="sm:col-span-2 xl:col-span-6"
                >
                  <Input
                    id="shop_name"
                    value={form.shop_name}
                    maxLength={SHOP_NAME_MAX_LENGTH}
                    aria-invalid={Boolean(showError("shop_name"))}
                    onBlur={() => markTouched("shop_name")}
                    onChange={(e) => update("shop_name", e.target.value)}
                    placeholder="Marina Cafe"
                  />
                </FormField>

                <FormField
                  label="Second name"
                  htmlFor="second_name"
                  hint={`${form.second_name.length}/${SHOP_NAME_MAX_LENGTH}`}
                  error={showError("second_name")}
                  className="sm:col-span-2 xl:col-span-6"
                >
                  <Input
                    id="second_name"
                    value={form.second_name}
                    maxLength={SHOP_NAME_MAX_LENGTH}
                    aria-invalid={Boolean(showError("second_name"))}
                    onBlur={() => markTouched("second_name")}
                    onChange={(e) => update("second_name", e.target.value)}
                    placeholder="Arabic or alternate name"
                  />
                </FormField>

                <FormField
                  label="Shop ID"
                  htmlFor="shop_id"
                  required
                  hint="Auto-built from name + date + unique code."
                  error={showError("shop_id")}
                  meta={
                    <>
                      {checkingShopId ? (
                        <p className="text-xs text-muted-foreground">
                          Checking availability…
                        </p>
                      ) : null}
                      {shopIdStatus === "available" && !showError("shop_id") ? (
                        <p className="text-xs text-emerald-700">
                          Shop ID is available
                        </p>
                      ) : null}
                    </>
                  }
                  className="xl:col-span-6"
                >
                  <Input
                    id="shop_id"
                    value={form.shop_id}
                    aria-invalid={Boolean(showError("shop_id"))}
                    className="font-mono text-xs"
                    onBlur={() => {
                      markTouched("shop_id");
                      update("shop_id", normalizeShopId(form.shop_id), {
                        manualShopId: false,
                      });
                    }}
                    onChange={(e) =>
                      update("shop_id", e.target.value, { manualShopId: true })
                    }
                    placeholder="MARINA_CAFE_20260727_A1B2"
                  />
                </FormField>

                <FormField
                  label="Login ID"
                  htmlFor="user_id"
                  required
                  hint={
                    userIdHint && !showError("user_id")
                      ? userIdHint
                      : "6-digit shop login ID."
                  }
                  error={showError("user_id")}
                  action={
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      disabled={suggesting || loading}
                      onClick={() => void fillNextUserId()}
                    >
                      {suggesting ? "Suggesting…" : "Next ID"}
                    </Button>
                  }
                  className="xl:col-span-6"
                >
                  <Input
                    id="user_id"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={form.user_id}
                    aria-invalid={Boolean(showError("user_id"))}
                    className="font-mono text-xs"
                    onBlur={() => markTouched("user_id")}
                    onChange={(e) =>
                      update(
                        "user_id",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="100000"
                  />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="password"
                  required
                  hint="Not saved locally. Copy it before you leave."
                  error={showError("password")}
                  className="sm:col-span-2 xl:col-span-8"
                >
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        aria-invalid={Boolean(showError("password"))}
                        className="pr-10"
                        onBlur={() => markTouched("password")}
                        onChange={(e) => update("password", e.target.value)}
                        placeholder="Min 8 characters"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </Button>
                    </div>
                    <CopyButton
                      value={form.password}
                      disabled={!form.password}
                      className="shrink-0"
                    />
                  </div>
                </FormField>
              </FormFieldsGrid>
            </WizardSection>

            <WizardSection
              title="Contact"
              description="Shop phone is required. Contact number is optional."
            >
              <FormFieldsGrid>
                <FormField
                  label="Shop phone"
                  htmlFor="phone"
                  required
                  hint="Mobile or landline; UAE is selected by default."
                  error={showError("phone")}
                  className="xl:col-span-6"
                >
                  <InternationalPhoneInput
                    id="phone"
                    mode="contact"
                    value={form.phone}
                    aria-invalid={Boolean(showError("phone"))}
                    onChange={(value) => update("phone", value)}
                    placeholder="Phone number"
                  />
                </FormField>

                <FormField
                  label="Contact number"
                  htmlFor="contact_person_number"
                  hint="Optional mobile or landline."
                  error={showError("contact_person_number")}
                  className="xl:col-span-6"
                >
                  <InternationalPhoneInput
                    id="contact_person_number"
                    mode="contact"
                    value={form.contact_person_number}
                    aria-invalid={Boolean(showError("contact_person_number"))}
                    onChange={(value) => update("contact_person_number", value)}
                    placeholder="Phone number"
                  />
                </FormField>

                <FormField
                  label="Email"
                  htmlFor="email"
                  error={showError("email")}
                  className="xl:col-span-4"
                >
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    aria-invalid={Boolean(showError("email"))}
                    onBlur={() => markTouched("email")}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="ops@marina.ae"
                  />
                </FormField>

                <FormField
                  label="Ecom slug"
                  htmlFor="ecom_slug"
                  hint="Auto from shop name. Spaces become -."
                  error={showError("ecom_slug")}
                  className="sm:col-span-2 xl:col-span-6"
                >
                  <Input
                    id="ecom_slug"
                    value={form.ecom_slug}
                    aria-invalid={Boolean(showError("ecom_slug"))}
                    className="font-mono text-xs"
                    onBlur={() => {
                      markTouched("ecom_slug");
                      if (form.ecom_slug.trim()) {
                        update("ecom_slug", normalizeEcomSlug(form.ecom_slug));
                      }
                    }}
                    onChange={(e) => update("ecom_slug", e.target.value)}
                    placeholder="marina-cafe"
                  />
                </FormField>
              </FormFieldsGrid>
            </WizardSection>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <WizardSection
            title="Shop location"
            description="Address and map pin are required. Address phone is filled from the shop phone."
          >
            <ShopLocationPicker
              value={toLocationValue(form)}
              onChange={updateLocation}
              onFieldBlur={(field) => markTouched(field)}
              fieldErrors={{
                address_line_1: showError("address_line_1"),
                locality: showError("locality"),
                city: showError("city"),
                latitude: showError("latitude"),
                longitude: showError("longitude"),
                contact_number: showError("contact_number"),
              }}
            />
          </WizardSection>
        ) : null}

        {currentStep === 2 ? (
          <WizardSection
            title="Feature flags"
            description="You can change these later from the shop profile."
          >
            <div className="w-full rounded-xl border bg-card px-4">
              <FeatureToggleRow
                id="ecom_enabled"
                label="Ecom enabled"
                description="Master switch for online ecommerce."
                checked={form.ecom_enabled}
                onChange={(v) => update("ecom_enabled", v)}
              />
              <FeatureToggleRow
                id="ecom_order_confirmation_enabled"
                label="Ecom order confirmation"
                description="Shop must accept/reject online orders. Requires ecom."
                checked={form.ecom_order_confirmation_enabled}
                disabled={!form.ecom_enabled}
                error={showError("ecom_order_confirmation_enabled")}
                onChange={(v) => update("ecom_order_confirmation_enabled", v)}
              />
              <FeatureToggleRow
                id="scheduled_order"
                label="Scheduled orders"
                description="Enables scheduled-order APIs in the shop DMS."
                checked={form.scheduled_order}
                onChange={(v) => update("scheduled_order", v)}
              />
              <FeatureToggleRow
                id="pre_booking_enabled"
                label="Pre-booking"
                description="Enables food pre-booking events and orders in the shop DMS and customer storefront."
                checked={form.pre_booking_enabled}
                onChange={(v) => update("pre_booking_enabled", v)}
              />
              <FeatureToggleRow
                id="nightly_stock_reset_enabled"
                label="Nightly stock reset"
                description="At 03:00 Asia/Dubai, restore all out-of-stock products to in stock for this shop."
                checked={form.nightly_stock_reset_enabled}
                onChange={(v) => update("nightly_stock_reset_enabled", v)}
              />
              <FeatureToggleRow
                id="merge_order"
                label="Merge orders"
                description="Enables order merge and customer credit in the shop DMS."
                checked={form.merge_order}
                onChange={(v) => update("merge_order", v)}
              />
              <FeatureToggleRow
                id="return_option"
                label="Return option"
                description="Allow returns for this shop."
                checked={form.return_option}
                onChange={(v) => update("return_option", v)}
              />
              <FeatureToggleRow
                id="customer_ticket"
                label="Customer tickets"
                description="Customer support tickets. Requires ecom."
                checked={form.customer_ticket}
                disabled={!form.ecom_enabled}
                error={showError("customer_ticket")}
                onChange={(v) => update("customer_ticket", v)}
              />
              <FeatureToggleRow
                id="venue_management_enabled"
                label="Venue management"
                description="Dining areas, serve locations, and QR setup."
                checked={form.venue_management_enabled}
                disabled={!form.ecom_enabled}
                error={showError("venue_management_enabled")}
                onChange={(v) => update("venue_management_enabled", v)}
              />
              <FeatureToggleRow
                id="table_ordering_enabled"
                label="Table ordering"
                description="Dine-in / table service. Requires venue + ecom."
                checked={form.table_ordering_enabled}
                disabled={!form.ecom_enabled || !form.venue_management_enabled}
                error={showError("table_ordering_enabled")}
                onChange={(v) => update("table_ordering_enabled", v)}
              />
              <FeatureToggleRow
                id="room_service_enabled"
                label="Room service"
                description="In-room ordering. Requires venue + ecom."
                checked={form.room_service_enabled}
                disabled={!form.ecom_enabled || !form.venue_management_enabled}
                error={showError("room_service_enabled")}
                onChange={(v) => update("room_service_enabled", v)}
              />
              <FeatureToggleRow
                id="qr_ordering_enabled"
                label="QR ordering"
                description="Public QR deep links. Requires venue + at least one service below. Enables guest checkout for table/room/drive-thru when saved."
                checked={form.qr_ordering_enabled}
                disabled={
                  !form.ecom_enabled ||
                  !form.venue_management_enabled ||
                  !hasQrCapableServiceSnake(form)
                }
                error={showError("qr_ordering_enabled")}
                onChange={(v) => update("qr_ordering_enabled", v)}
              />
              <FeatureToggleRow
                id="pickup_ordering_enabled"
                label="Pickup ordering"
                description="Customer pickup. Requires ecom."
                checked={form.pickup_ordering_enabled}
                disabled={!form.ecom_enabled}
                error={showError("pickup_ordering_enabled")}
                onChange={(v) => update("pickup_ordering_enabled", v)}
              />
              <FeatureToggleRow
                id="drive_thru_enabled"
                label="Drive-thru"
                description="Drive-thru lanes. Requires ecom."
                checked={form.drive_thru_enabled}
                disabled={!form.ecom_enabled}
                error={showError("drive_thru_enabled")}
                onChange={(v) => update("drive_thru_enabled", v)}
              />
              {venueEcomSyncHint(form) ? (
                <p className="text-muted-foreground col-span-full text-sm">
                  {venueEcomSyncHint(form)}
                </p>
              ) : null}
              <FeatureToggleRow
                id="is_msg_activated"
                label="Messaging activated"
                description="Enable shop messaging / notification channel."
                checked={form.is_msg_activated}
                onChange={(v) => update("is_msg_activated", v)}
              />
              <FeatureToggleRow
                id="single_msg"
                label="Single message"
                description="Send a single consolidated message instead of per-event messages. Requires messaging."
                checked={form.single_msg}
                disabled={!form.is_msg_activated}
                error={showError("single_msg")}
                onChange={(v) => update("single_msg", v)}
              />
            </div>
          </WizardSection>
        ) : null}

        {currentStep === 3 ? (
          <div className="grid w-full gap-10 xl:grid-cols-2">
            <WizardSection title="Summary" description="Review before creating the shop.">
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-4 flex items-start gap-4 border-b pb-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-full border bg-muted">
                    {shopPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={shopPhoto.previewUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <span className="text-xs">No photo</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{form.shop_name || "Untitled shop"}</p>
                    {form.second_name ? (
                      <p className="text-sm text-muted-foreground">
                        {form.second_name}
                      </p>
                    ) : null}
                    <p className="font-mono text-xs text-muted-foreground">
                      {form.shop_id || "—"}
                    </p>
                  </div>
                </div>
                <dl>
                  <PreviewRow label="Login ID" value={form.user_id} />
                  <PreviewRow
                    label="Shop phone"
                    value={<PhoneValue value={form.phone} copyable={false} />}
                  />
                  <PreviewRow
                    label="Contact number"
                    value={
                      <PhoneValue
                        value={form.contact_person_number}
                        copyable={false}
                      />
                    }
                  />
                  <PreviewRow label="Email" value={form.email} />
                  <PreviewRow label="Ecom slug" value={form.ecom_slug} />
                  <PreviewRow
                    label="Address"
                    value={[
                      form.address_line_1,
                      form.address_line_2,
                      form.locality,
                      form.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <PreviewRow
                    label="Coordinates"
                    value={
                      form.latitude && form.longitude
                        ? `${form.latitude}, ${form.longitude}`
                        : ""
                    }
                  />
                  <PreviewRow
                    label="Address phone"
                    value={
                      <PhoneValue value={form.contact_number} copyable={false} />
                    }
                  />
                </dl>
              </div>
            </WizardSection>

            <WizardSection title="Enabled features">
              <div className="flex flex-wrap gap-2">
                {featureLabels.map((item) => {
                  const on = Boolean(form[item.key]);
                  return (
                    <span
                      key={item.key}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        on
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Creating will provision this shop with the login ID and password.
                Make sure the password is copied first.
              </p>
            </WizardSection>
          </div>
        ) : null}

        {formError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
      </form>

      <div className="sticky bottom-0 z-20 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          ) : (
            <div aria-hidden className="size-9" />
          )}

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={
                checkingShopId ||
                (currentStep === 0 && !isWizardStepValid(0, form)) ||
                suggesting
              }
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={openCreateConfirm}
              disabled={loading || !canSubmit}
            >
              Create shop
            </Button>
          )}
        </div>
      </div>

      <CreateShopFlowDialog
        open={createFlowOpen}
        phase={createPhase}
        shopName={form.shop_name}
        shopId={form.shop_id}
        errorMessage={createError}
        onOpenChange={handleCreateFlowOpenChange}
        onConfirm={handleCreateConfirm}
        onRunInBackground={handleRunInBackground}
        onViewShop={handleViewCreatedShop}
        onRetry={handleRetryCreate}
      />
    </PageShell>
  );
}
