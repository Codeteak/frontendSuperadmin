export type ShopWhatsAppStatus = {
  connected: boolean;
  enabled: boolean;
  transactional_enabled: boolean;
  token_status: "active" | "revoked" | "disconnected";
  has_token: boolean;
  provider: "none" | "chazt";
  org_id: string | null;
  org_name: string | null;
  token_uuid: string | null;
  token_name: string | null;
  token_prefix: string | null;
  allowed_origins: unknown;
  permissions: unknown;
  widget_config: unknown;
  widget_script_url: string;
  connected_at: string | null;
  disconnected_at: string | null;
  last_validated_at: string | null;
  sender_mode: "platform" | "shop";
  display_phone_e164: string | null;
  bsp_channel_id: string | null;
  has_bsp_channel: boolean;
  has_meta_phone_number: boolean;
};

export type ShopPageAccessStatus = {
  password_configured: boolean;
};

export type ConnectShopWhatsAppInput = {
  widget_token: string;
  allowed_origins?: string[];
  token_uuid?: string | null;
  token_name?: string | null;
  org_id?: string | null;
  org_name?: string | null;
  enabled?: boolean;
  display_phone_e164?: string | null;
};

export type SetShopWhatsAppSenderInput = {
  sender_mode: "platform" | "shop";
  display_phone_e164?: string | null;
  bsp_channel_id?: string | null;
  bsp_access_token?: string | null;
  clear_bsp_access_token?: boolean;
  meta_waba_id?: string | null;
  meta_phone_number_id?: string | null;
  meta_access_token?: string | null;
  clear_meta_access_token?: boolean;
  meta_token_expires_at?: string | null;
};
