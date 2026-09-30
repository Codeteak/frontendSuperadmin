export type PosPlaybookSeverity = "config_only" | "needs_code" | "partial";

export type PosPlaybookStep = {
  title: string;
  detail?: string;
};

/**
 * Every field answers the 5Ws + How in simple words for fresh users.
 * what / why / who / when / where / how are required.
 */
export type PosPlaybookField = {
  name: string;
  /** One-line summary on the closed card */
  meaning: string;
  /** What is this field? */
  what: string;
  /** Why does it matter in the real workflow? */
  why: string;
  /** Who fills it / who uses the result? */
  who: string;
  /** When do you set or change it? */
  when: string;
  /** Where do you find it on screen / in the journey? */
  where: string;
  /** How to fill, check, analyse, and update it */
  how: string;
  /** Short real-life story of the work day */
  workflow: string;
  example: string;
  exampleAlt?: string;
  commonMistakes?: string;
};

export type PosPlaybookExample = {
  title: string;
  situation: string;
  whatToDo: string;
  values: { field: string; value: string }[];
};

export type PosPlaybookFaq = {
  q: string;
  a: string;
};

export type PosPlaybookDef = {
  title: string;
  description?: string;
  steps: PosPlaybookStep[];
  fields?: PosPlaybookField[];
  examples?: PosPlaybookExample[];
  faqs?: PosPlaybookFaq[];
};

export type PosScenarioRow = {
  scenario: string;
  configOnly: string;
  needsCode: string;
  severity: PosPlaybookSeverity;
};

/** Shop → POS attach fields */
export const POS_SHOP_FIELD_GLOSSARY: PosPlaybookField[] = [
  {
    name: "Template",
    meaning: "Which shared POS “recipe” this shop will follow.",
    what: "A saved recipe for one POS brand: API paths, field mappings, and which events send orders. Many shops of the same brand share one template.",
    why: "Without a template, Yaadro does not know how to talk to that POS. The template is the common rulebook; the shop only adds its own address and passwords.",
    who: "Super Admin / ops creates or picks the template. Shop managers usually only select it when attaching a shop. Developers create a new template only when the POS shape is new.",
    when: "Pick it when you first connect a shop. Change it only if you switch POS brand, or ops published a new recipe (e.g. gravity-v2) for a different API.",
    where: "Shop → POS tab → Template dropdown. List of templates also lives under main menu → POS.",
    how: "1) Ask “which POS brand is this shop?” 2) Open the dropdown. 3) Choose the matching name (cratis-v1, saleculator-pull-v1, gravity-v1…). 4) If unsure, open that template’s Beginner guide first. 5) After save, confirm Current link shows the same template name.",
    workflow:
      "Monday: vendor says “we are on Gravity”. You open POS list, confirm gravity-v1 exists and was tested. Tuesday: on the shop POS tab you select gravity-v1 — you do not rebuild mappings for every shop.",
    example: "cratis-v1",
    exampleAlt: "gravity-uae-v1",
    commonMistakes:
      "Choosing “generic” for Cratis or Saleculator. Those brands already have their own lane — wrong template breaks orders.",
  },
  {
    name: "Vendor base URL",
    meaning: "The POS website address Yaadro will call for this shop.",
    what: "The https:// host of this shop’s POS API (the front door). Paths like /orders stay on the template; here you only put the host.",
    why: "Orders and menu sync must reach the correct store’s POS server. Wrong URL = silence or errors; right URL = messages arrive at the kitchen POS.",
    who: "Ops / Super Admin pastes it. Vendor support usually emails or portals the URL. Yaadro worker uses it every time it pushes or pulls.",
    when: "At first attach, and again if the vendor migrates servers or gives a new subdomain for this branch.",
    where: "Shop → POS → Vendor base URL (shown when the lane needs push/catalog).",
    how: "1) Ask vendor for “API base URL”. 2) It must start with https://. 3) Remove trailing /api/orders if they pasted a full path. 4) Save. 5) Analyse: if Sync status shows connection errors, re-check spelling and https. 6) Update by pasting the new host and saving — no template change needed if only the host changed.",
    workflow:
      "Branch Marina opens. Vendor sends https://marina.gravity-pos.ae. You paste that on the shop, keep the shared gravity template. Downtown branch gets a different URL on its own shop card.",
    example: "https://pos.cratis.example.com",
    exampleAlt: "https://api.gravity-pos.ae",
    commonMistakes:
      "Pasting the full order path into this box. Keep only the host; paths belong in template endpoints.",
  },
  {
    name: "Auth type",
    meaning: "Which “password style” Yaadro uses to prove itself to the POS.",
    what: "A choice: none, bearer (API key in a header), integration_token, or oauth2_client_credentials (login to get a short-lived token).",
    why: "Most POS systems reject calls without the right auth. Wrong type = 401 errors and orders stuck.",
    who: "Ops sets it from vendor docs. Saleculator pull customers mainly use Features Integration token instead of this for pull. Worker applies auth on every outbound call.",
    when: "At attach, and if the vendor moves from API key to OAuth (or the reverse).",
    where: "Shop → POS → Auth type (and template default api.auth.type).",
    how: "1) Read vendor “Authentication” page. 2) Static key → bearer (or integration_token if they name that header). 3) Client id + secret + token URL → oauth2_client_credentials. 4) No auth in sandbox → none (rare in production). 5) Analyse failed sync: 401/403 usually means type or credentials mismatch — fix type first, then secret.",
    workflow:
      "Vendor PDF says “Send Bearer token in Authorization”. You set auth type = bearer, header = Authorization, paste the key in Credentials. Later they move to OAuth — you switch type and add token URL.",
    example: "bearer",
    exampleAlt: "oauth2_client_credentials",
    commonMistakes:
      "Using shop Credentials for Saleculator’s link_token. That secret is created under Features and pasted into Saleculator as link_token for POST /api/v1/pos/links.",
  },
  {
    name: "Header name",
    meaning: "Which HTTP header carries the secret when we call the POS.",
    what: "The label on the envelope, e.g. Authorization or X-Integration-Token. The value inside is your credential.",
    why: "If the POS looks in X-Api-Key but you send Authorization, it ignores your key and rejects the call.",
    who: "Ops types the exact name from vendor docs. Template can set a default; shop can override.",
    when: "When vendor docs name a non-standard header, or when they change it.",
    where: "Template api.auth.headerName or shop auth override fields (when shown).",
    how: "1) Copy header name exactly (spelling and capitals). 2) Common: Authorization. 3) Some vendors: X-Api-Key, X-Integration-Token. 4) Analyse: auth errors with a “valid” key often mean wrong header name. 5) Update only the header string — keep the same token unless they rotated it too.",
    workflow:
      "Support chat: “Put the key in header X-Store-Key”. You change header name from Authorization to X-Store-Key, save, retry Test connection.",
    example: "Authorization",
    exampleAlt: "X-Integration-Token",
    commonMistakes: "Changing header without matching auth type to vendor docs.",
  },
  {
    name: "Credentials",
    meaning: "The secret key or OAuth client JSON for this shop.",
    what: "The password Yaadro stores encrypted and opens only when sending to the POS. Can be a raw token or JSON like {\"token\":\"…\"} or {\"client_id\":\"…\",\"client_secret\":\"…\"}.",
    why: "Without the correct secret, the POS will not accept orders or menu calls. Leaving blank on update keeps the old secret (safe when you only change URL).",
    who: "Ops pastes from vendor portal. Never put production secrets in chat/docs. Worker reads them at send time.",
    when: "First attach, and whenever the vendor rotates keys. Leave empty if you are only editing other fields and the old key still works.",
    where: "Shop → POS → Credentials (plaintext) box.",
    how: "1) Get the key from vendor. 2) For bearer: paste key or {\"token\":\"key\"}. 3) For OAuth: paste {\"client_id\":\"…\",\"client_secret\":\"…\"}. 4) Save once — UI will not show the secret again. 5) Analyse: after rotate, if errors continue, confirm you saved new credentials and auth type still matches. 6) Update: paste new secret, save; blank = keep previous.",
    workflow:
      "Vendor emails “new API key from Friday”. Friday morning you open the shop POS tab, paste the new key into Credentials, save, watch Sync status go clean.",
    example: '{"token":"sk_live_abc123"}',
    exampleAlt: '{"client_id":"yaadro-app","client_secret":"s3cret"}',
    commonMistakes:
      "Pasting Saleculator link_token into Credentials. That belongs on Features, then into Saleculator’s link_token field.",
  },
  {
    name: "Webhook secret",
    meaning: "Shared password so we trust messages the POS sends to us.",
    what: "A long string both sides know. When Gravity/Topas/generic POS sends a webhook into Yaadro, we can check this secret.",
    why: "Stops random internet traffic from creating fake orders. Protects inbound Lane C flows.",
    who: "Ops agrees the string with the vendor and configures both sides. Yaadro checks it on inbound webhooks.",
    when: "When enabling inbound webhooks, or when rotating after a leak.",
    where: "Shop → POS → Webhook secret (Lane C providers).",
    how: "1) Generate a long random string (8+ chars). 2) Paste same value in Yaadro and in vendor webhook settings. 3) Analyse inbound failures: mismatched secret is a common cause. 4) Update both sides together — changing only Yaadro breaks webhooks.",
    workflow:
      "You and Gravity support pick whsec_shop42_…. You save it on the shop; they paste it on their webhook config. Test order from POS appears in Yaadro.",
    example: "whsec_shop42_gravity_9f3a",
    commonMistakes: "Setting it only in Yaadro and forgetting the vendor portal.",
  },
  {
    name: "menuTenant.account / location",
    meaning: "Branch codes used when fetching this shop’s menu from the POS.",
    what: "Two codes the POS uses to mean “this store’s catalog”: account (company/chain) and location (branch).",
    why: "Wrong codes pull another branch’s menu — customers see wrong items/prices. Right codes keep Marina’s menu on Marina’s shop.",
    who: "Ops copies from vendor back-office for that branch. Catalog sync job sends them on menu calls.",
    when: "At attach for every shop. Update if the vendor renumbers branches or you fix a mix-up.",
    where: "Shop overrides / template api.menuTenant (account + location).",
    how: "1) Open vendor portal → store settings. 2) Copy account and location exactly (case matters). 3) Paste into menuTenant. 4) Often same as orderTenant — still fill both. 5) Analyse: empty/wrong menu after sync → re-check these codes. 6) Update on the shop only; do not put live codes into the shared template if many shops share it.",
    workflow:
      "Vendor sheet: Marina = ACC001 / DXB-MARINA. You set menuTenant to those values on Marina’s shop. Downtown shop gets ACC001 / DXB-DT.",
    example: 'account = "ACC001", location = "DXB-MARINA"',
    exampleAlt: 'account = "10045", location = "LOC-12"',
    commonMistakes: "Leaving template demo codes (ACC001/LOC001) on a live shop.",
  },
  {
    name: "orderTenant.account / location",
    meaning: "Branch codes sent with orders so the POS knows which store kitchen should cook.",
    what: "Same idea as menuTenant, but for order create/status calls. Account + location identify the store on the POS.",
    why: "If orderTenant is wrong, tickets print in the wrong branch or the POS rejects the order.",
    who: "Ops sets per shop. Outbound order worker attaches these when pushing.",
    when: "At attach, and when orders land in the wrong store or vendor changes codes.",
    where: "Shop overrides / template api.orderTenant.",
    how: "1) Confirm with vendor which codes apply to orders (sometimes same as menu). 2) Paste account + location. 3) Place a test order. 4) Analyse: wrong kitchen → fix orderTenant first. 5) Update shop values; keep template as demo defaults only.",
    workflow:
      "Test order appears in Downtown POS by mistake. You compare orderTenant on Marina shop, fix location to DXB-MARINA, send another test — ticket prints in Marina.",
    example: 'account = "ACC001", location = "DXB-MARINA"',
    commonMistakes: "Updating menuTenant but forgetting orderTenant (or the reverse).",
  },
  {
    name: "Catalog sync",
    meaning: "Switch: pull menu/products from the POS into Yaadro.",
    what: "On/off flag. On means Yaadro may sync catalog from the POS for this shop.",
    why: "Keeps Yaadro menu aligned with the POS. Off if menu is managed only in Yaadro or the lane does not support pull.",
    who: "Ops toggles when unlocked. Some lanes (Cratis/Saleculator) lock this to a preset.",
    when: "Turn on when POS is the menu source. Turn off for Saleculator-style or menu-only-in-Yaadro shops.",
    where: "Shop → POS → Catalog sync checkbox.",
    how: "1) Check lane: Cratis often on; Saleculator usually off/locked. 2) Ensure template has menu endpoints. 3) Toggle, save. 4) Analyse: after sync, compare a few products. 5) Update flag only when the business changes menu ownership.",
    workflow:
      "New Cratis shop: catalog sync already on. You run sync, spot-check three items against POS. Saleculator shop: leave catalog off — not that lane’s job.",
    example: "On for Cratis; Off for Saleculator",
    commonMistakes: "Fighting a locked checkbox — lane preset owns it.",
  },
  {
    name: "Order push",
    meaning: "Switch: Yaadro sends orders to the POS.",
    what: "On = we push new/updated orders out. Off = we do not push (e.g. Saleculator pulls instead).",
    why: "This is how kitchen gets Yaadro orders on push lanes. Wrong setting = kitchen never sees the order, or you push when you should not.",
    who: "Usually locked by lane. Ops only changes it on unlocked Lane C templates.",
    when: "Follow lane defaults. Change only if product/eng says this Lane C shop should stop/start pushing.",
    where: "Shop → POS → Order push checkbox.",
    how: "1) Cratis/Lane C push → expect On. 2) Saleculator → Off. 3) Analyse missing tickets: confirm push On, link active, credentials OK. 4) Do not force On for pull-only vendors.",
    workflow:
      "Customer orders on the app → Yaadro creates order → with Order push On, worker sends it to Cratis → kitchen screen lights up.",
    example: "On for Cratis",
    commonMistakes: "Turning push on for Saleculator.",
  },
  {
    name: "Order pull",
    meaning: "Switch: POS is allowed to fetch orders from Yaadro.",
    what: "On = Saleculator-style: POS calls Yaadro to download orders. Off on push lanes.",
    why: "Pull lane cannot work without this (and the Features token). Push lanes should keep it off.",
    who: "Lane preset usually locks it. Ops enables Integration on Features for Saleculator.",
    when: "When attaching Saleculator. Rarely changed afterward.",
    where: "Shop → POS → Order pull checkbox.",
    how: "1) Saleculator: Features token first (link_token), then attach saleculator-pull-v1 with pull On. 2) Analyse: vendor cannot list orders → check Integration enabled + token + fingerprint (rotate once) + pull On. 3) Do not use pull to “fake” a new pull POS — that needs engineering.",
    workflow:
      "Saleculator till links with POST /api/v1/pos/links using the Features token as link_token, then pulls open orders with the Bearer JWT.",
    example: "On for Saleculator",
    commonMistakes: "Expecting Yaadro to push when only pull is on.",
  },
  {
    name: "Link active",
    meaning: "Master on/off for this shop’s POS connection.",
    what: "When Off, Yaadro pauses POS sync for the shop without deleting history.",
    why: "Safe way to pause during outages or cutovers without losing the configuration.",
    who: "Ops toggles. Support may ask you to turn Off while vendor fixes their API.",
    when: "Live shops stay On. Turn Off to pause; turn On when ready again.",
    where: "Shop → POS → Link active.",
    how: "1) Uncheck to pause. 2) Fix URL/credentials as needed. 3) Check On and save. 4) Analyse with Sync status. 5) Detach only when changing brand — Off is enough for a pause.",
    workflow:
      "Vendor announces 2-hour maintenance. You set Link active Off. After maintenance, On again and confirm sync times update.",
    example: "On",
  },
  {
    name: "Integration token (Features tab)",
    meaning: "One-time secret = Saleculator link_token.",
    what: "A secret created under Shop → Features → Integration. Shown once. For Saleculator this plaintext is the Inmenu-compatible link_token used on POST /api/v1/pos/links.",
    why: "Lane B security door. Without it, Saleculator cannot link or poll Yaadro. It is not the same as Cratis bearer credentials.",
    who: "Ops creates/rotates on Features. Saleculator configures it as link_token. Never store it in the POS template JSON.",
    when: "Before first Saleculator attach, and whenever you rotate for security or the vendor lost the token (till must re-link after rotate).",
    where: "Shop → Features → Integration (not on the POS template page).",
    how: "1) Enable Integration. 2) Create/rotate token. 3) Copy immediately (link_token). 4) Send securely to Saleculator. 5) Attach saleculator-pull-v1 on POS tab. 6) Analyse poll failures → rotate token, update till link_token, re-link. 7) Update = rotate (old token dies).",
    workflow:
      "Day 1 Features: create token, give to Saleculator as link_token. Day 1 POS tab: attach saleculator-pull-v1. Day 2: till links via /pos/links and shows Yaadro orders.",
    example: "(token shown once — copy immediately as link_token)",
    commonMistakes: "Searching for this token inside template config JSON, or expecting Yaadro exchange instead of /pos/links.",
  },
];

/** Template config fields */
export const POS_TEMPLATE_FIELD_GLOSSARY: PosPlaybookField[] = [
  {
    name: "Name",
    meaning: "Permanent ID of this POS recipe.",
    what: "A short code name for the template (letters, numbers, - or _). You will see it in lists and shop dropdowns forever.",
    why: "Teams need a stable name to talk about (“use gravity-v1”). Changing identity later is not allowed — avoids breaking shops.",
    who: "Ops/eng choose at create time. Everyone else only reads it.",
    when: "Only when creating. After that it is locked.",
    where: "POS → Create template dialog. Read-only on the template page.",
    how: "1) Pick a clear name: brand + version. 2) No spaces. 3) Create. 4) If wrong name, create a new template and deactivate the old one — do not fight the lock.",
    workflow:
      "You create gravity-v1 once. Six shops attach gravity-v1. Nobody renames it; a breaking API change becomes gravity-v2 as a new template.",
    example: "cratis-v1",
    exampleAlt: "gravity-marina-v2",
    commonMistakes: "Spaces or symbols → create validation error.",
  },
  {
    name: "Provider + Connector + Lane",
    meaning: "Which brand, which backend code, which lane (A/B/C).",
    what: "Provider = brand label. Connector = which Yaadro code path runs. Lane A Cratis, B Saleculator, C JSON plug-and-play.",
    why: "Picking the wrong trio sends traffic through the wrong engine. That is the #1 beginner mistake.",
    who: "Ops selects on create. Eng owns new providers. Locked afterward.",
    when: "At create only. Wrong choice → new template, not an edit.",
    where: "Create dialog; read-only on template header.",
    how: "1) Match vendor brand. 2) Accept suggested connector. 3) Confirm lane in the Beginner guide. 4) Analyse odd behaviour: verify provider/lane before editing config for hours.",
    workflow:
      "Email: “We use Cratis”. You create/use cratis + Lane A — never a generic clone. Email: “JSON like Gravity” → Lane C gravity/generic.",
    example: "provider=gravity, connector=generic_json, lane=C",
  },
  {
    name: "1. API & auth → Base URL",
    meaning: "Default POS host stored on the template.",
    what: "Optional default https host. Real shops usually override with their own Vendor base URL.",
    why: "Handy for demos/tests. Dangerous if you put one live shop’s URL here and attach many shops without overrides.",
    who: "Template editor sets default. Shop attach should override per branch.",
    when: "When creating a template for docs/sandbox. Prefer shop-level URL for production branches.",
    where: "Template page → section 1. API & auth → Base URL.",
    how: "1) Set a placeholder host for documentation. 2) On each shop, set Vendor base URL. 3) Analyse: all shops hitting one host → check they overrode base URL. 4) Update shop URLs for moves; only change template default if all shops share one host on purpose.",
    workflow:
      "Template keeps https://pos-vendor.example.com as a sample. Marina shop overrides to https://marina…. Downtown overrides to https://dt….",
    example: "https://pos-vendor.example.com",
  },
  {
    name: "1. API & auth → Login style",
    meaning: "Default login style for shops using this template.",
    what: "Auth type dropdown plus optional header name and token URL for OAuth.",
    why: "Shops inherit a sensible default so ops only pastes secrets per shop.",
    who: "Template owner sets type/header/tokenUrl. Shop owner pastes credentials.",
    when: "When the brand’s auth method is known; update if vendor changes auth for all shops on this recipe.",
    where: "Template page → section 1. API & auth → Auth type, header name, token URL.",
    how: "1) Pick type from the dropdown from vendor docs. 2) Fill header name when needed. 3) For OAuth add token URL. 4) Do not put live client_secret in the shared template if shops differ — put secrets on the shop. 5) Analyse 401s across all shops → template auth type/header wrong. One shop only → that shop’s credentials.",
    workflow:
      "All Gravity shops use bearer. You set Auth type = bearer once on the template. Each shop pastes its own token in Credentials.",
    example: "Auth type: bearer, Header: Authorization",
    exampleAlt:
      "Auth type: oauth2_client_credentials, Token URL: https://pos.example.com/oauth/token",
  },
  {
    name: "1. API & auth → Default branch codes",
    meaning: "Default account/location codes on the recipe.",
    what: "Demo or shared defaults for account + location. Live shops should override.",
    why: "Template needs a valid shape; shops need real branch codes so tickets and menus hit the right store.",
    who: "Template editor sets placeholders. Shop ops sets real codes.",
    when: "Placeholders at template create. Real values at every shop attach.",
    where: "Template page → section 1. API & auth → Menu tenant / Order tenant.",
    how: "1) Leave ACC001/LOC001 style demos on template. 2) On shop, replace with vendor codes. 3) Analyse wrong-store issues → shop tenants first. 4) Update per shop when branches change.",
    workflow:
      "Template shows sample tenants for training. Production Marina shop overrides to ACC001/DXB-MARINA before go-live.",
    example: "Account ACC001, Location LOC001",
  },
  {
    name: "2. Endpoints",
    meaning: "Which URL paths to call for menu, create order, status, etc.",
    what: "Each action has an enable toggle plus HTTP method and path (e.g. POST /api/orders).",
    why: "Yaadro must hit the vendor’s real paths. Wrong path = 404 and no orders.",
    who: "Ops/eng copy from vendor API docs onto the template. Shops usually do not change paths.",
    when: "When building the template, and when vendor version upgrades paths.",
    where: "Template page → section 2. Endpoints.",
    how: "1) From vendor docs, enable only actions you turned on in capabilities. 2) Set method + path per row. 3) Test connection per key. 4) Analyse 404 → path typo. 5) Update template paths once; all shops inherit.",
    workflow:
      "Docs say create order is POST /v1/orders. You enable orderCreate, set POST + /v1/orders, Test connection, then attach shops.",
    example: "orderCreate: POST /api/orders",
    exampleAlt:
      "menu: GET /api/menu, menuCategories: GET /api/menu/categories",
  },
  {
    name: "3. Capabilities",
    meaning: "What this POS is allowed to do in Yaadro’s eyes.",
    what: "Dropdowns/flags for catalog, orders out/in, status, riders — e.g. push vs none, webhook vs none.",
    why: "Turns features on only when the vendor supports them. Avoids calling endpoints that do not exist.",
    who: "Template owner. Lane presets may constrain Cratis/Saleculator.",
    when: "At template setup; again when vendor enables a new feature (e.g. webhooks).",
    where: "Template page → section 3. Capabilities.",
    how: "1) Ask vendor what they support. 2) Set matching modes in the form. 3) Add matching endpoints/mappings. 4) Analyse: capability on but endpoint missing → failures. 5) Update carefully and re-test.",
    workflow:
      "Gravity can push orders and send webhooks, no catalog. You set orders_out=push, orders_in=webhook, catalog=none.",
    example:
      "Catalog: none, Orders out: push, Orders in: webhook",
  },
  {
    name: "4. Events",
    meaning: "Which Yaadro moments trigger a push to the POS.",
    what: "Checkbox lists for order_create_on and status_out_on. Only applies when push capabilities are enabled.",
    why: "Controls timing: send when customer orders, or later when kitchen accepts — business choice.",
    who: "Ops with product. Eng if new event names are required (may need code).",
    when: "After capabilities enable push; tweak when ops wants different timing.",
    where: "Template page → section 4. Events (tick the events you want).",
    how: "1) Prefer blank_created for Cratis KOT. 2) Save and place a test ecom order. 3) If the shop has ecom order confirmation ON, Yaadro still lists blank_created but PosPolicy waits for Accept before the first create POST. 4) Analyse: push too early/late → check confirmation setting first, then event checkboxes. 5) Saleculator ignores these (pull lane).",
    workflow:
      "Shop turns on ecom order confirmation. Customer checkout no longer prints on Cratis until the shop (or till) Accepts the blank — then the first POS create runs.",
    example: "Order create on: blank_created (deferred to Accept when confirmation is on)",
  },
  {
    name: "5. Mappings → Order sent to POS",
    meaning: "Build the vendor-specific request body from Yaadro order fields.",
    what: "Rows where the left field is the vendor body name and the selected source is a Yaadro field. Line items have their own array and item-field rows.",
    why: "The vendor may expect OrderNo, CustomerName and Lines while Yaadro stores client_order_ref, customer_name and items.",
    who: "Ops can configure it from the vendor’s create-order API example; eng is needed only for unsupported nested or non-JSON bodies.",
    when: "When Orders out = push. Update when the vendor changes its create-order request contract.",
    where: "Template → 5. Mappings → Order sent to POS.",
    how: "1) Paste the vendor’s expected request-body example. 2) Click Add body fields from sample. 3) For each vendor field choose its Yaadro source. 4) Set the Yaadro array source to items and map each vendor line field. 5) Use defaults/optional only when the vendor contract says so. 6) Test map, then test one order.",
    workflow:
      "Vendor expects OrderNo and Lines[].PLU. Paste its example, map OrderNo ← client_order_ref and PLU ← pos_product_id, then test the generated body.",
    example: "OrderNo ← client_order_ref; Lines[].PLU ← items[].pos_product_id",
    commonMistakes: "Putting Yaadro names on the left. For outbound, the left side must use the vendor’s exact body field names and case.",
  },
  {
    name: "5. Mappings → Order inbound",
    meaning: "Translator from POS webhook JSON → Yaadro order fields.",
    what: "Labeled fields for external order id, status, lines, etc. — each maps a vendor JSON path.",
    why: "Every POS names fields differently. Mapping is how Lane C understands their webhook without new code.",
    who: "Ops/eng on the template. Test map is your lab. Shops do not each keep a mapping.",
    when: "When orders_in=webhook; update when vendor renames fields.",
    where: "Template page → section 5. Mappings → Order inbound + section 7. Test map.",
    how: "1) Paste one real webhook in the mapping card. 2) Add a Yaadro field. 3) Select the matching vendor path suggestion. 4) Set the vendor items array path and map its fields. 5) Open Test map (tab 7) and verify id, status and lines. 6) Save. 7) If inbound later fails, compare the latest payload and update this template once for all attached shops.",
    workflow:
      "POS upgrade renames order.id to orderCode. Inbound breaks. You paste new sample into Test map, point External order id to the new path, save — all Gravity shops work again.",
    example:
      "Bill / external order ID ← order.id; Status ← order.state; Items array ← order.items",
    commonMistakes: "Never running Test map before go-live.",
  },
  {
    name: "5. Mappings → Categories and products",
    meaning: "Translate POS menu responses into Yaadro catalog fields.",
    what: "Combined mode maps categories and products from one response. Split mode provides separate Category response and Product response cards.",
    why: "POS systems use different array and field names for IDs, names, prices, PLUs and category links.",
    who: "Ops/eng with one real menu response from the vendor.",
    when: "When Catalog is pull_combined or pull_split. It is not needed when Catalog = none.",
    where: "Template → 5. Mappings → Combined category + product response, Category response, or Product response.",
    how: "1) Match the card to the Catalog capability. 2) Paste a real response. 3) Set each vendor array path. 4) Add required fields marked *. 5) Select vendor paths for category name/ID and product name/PLU/price/category ID. 6) Test map before the first catalog sync.",
    workflow:
      "The vendor returns data.groups and data.menuItems. Map Categories array ← data.groups and Products array ← data.menuItems, then map fields inside one row.",
    example: "Product name ← title; PLU ← sku; Price ← unitPrice; POS category ID ← groupId",
    commonMistakes: "Using pull_split while configuring only the combined card, or omitting the product-to-category ID.",
  },
  {
    name: "5. Mappings → Riders received from POS",
    meaning: "Translate a POS rider list into Yaadro riders.",
    what: "One rider array path with code, name and optional phone mappings.",
    why: "Yaadro requires a stable rider code and name; vendor field names vary.",
    who: "Ops/eng with a real rider-list response.",
    when: "Only when Riders = inbound.",
    where: "Template → 5. Mappings → Riders received from POS.",
    how: "1) Paste a rider response. 2) Set the riders array path. 3) Map Code and Name (required *). 4) Map Phone if supplied. 5) Test map and check every row has code + name.",
    workflow:
      "Vendor returns data.drivers[]. Map Riders array ← data.drivers, Code ← driverId, Name ← fullName and Phone ← mobile.",
    example: "Riders ← data.drivers; Code ← driverId; Name ← fullName",
    commonMistakes: "Mapping a display name as code; codes must remain stable across syncs.",
  },
  {
    name: "5. Mappings → Value translation maps",
    meaning: "Translate coded vendor values into Yaadro-friendly strings.",
    what: "Named tables such as diet_type: vendor 1 → veg, vendor 0 → non-veg. Referenced from a mapping row via Value map name.",
    why: "Vendors often send flags or codes instead of readable diet/payment/status strings.",
    who: "Ops/eng when catalog or order fields use coded values.",
    when: "Optional, usually for catalog products or order lines with diet_type.",
    where: "Template → 5. Mappings → Value translation maps.",
    how: "1) Add map name diet_type. 2) Add vendor value → Yaadro value rows. 3) On the product/line mapping field set Value map name = diet_type. 4) Test map with a real coded sample.",
    workflow:
      "Vendor sends vegFlag: \"1\". You create diet_type map 1 → veg, then point diet_type mapping field to vegFlag with Value map name diet_type.",
    example: "diet_type: 1 → veg, 0 → non-veg",
  },
  {
    name: "6. Status codes",
    meaning: "Map status names between Yaadro and the POS.",
    what: "Key → value rows: Yaadro status on the left, vendor status string on the right.",
    why: "Vendors use different words (e.g. PREPARING vs in_kitchen). Mapping keeps sync consistent.",
    who: "Ops/eng on the template when status push or webhook is enabled.",
    when: "During template setup and when vendor renames status values.",
    where: "Template page → section 6. Status codes.",
    how: "1) List vendor status strings from their docs or a sample webhook. 2) Add a row per Yaadro status. 3) Save and test a status change. 4) Analyse mismatches → add or fix rows here.",
    workflow:
      "Vendor sends READY but Yaadro expects ready_for_pickup. You add a row mapping ready_for_pickup → READY, save, retest.",
    example: "ready_for_pickup → READY, cancelled → CANCELLED",
  },
  {
    name: "Advanced → Raw JSON",
    meaning: "Power-user view of the full config object.",
    what: "Collapsed editor at the bottom of the config card. Same data as tabs 1–6, in JSON form.",
    why: "Rare edge keys or copy/paste from eng — normal onboarding should not need this.",
    who: "Eng or advanced ops only after trying the section tabs.",
    when: "Debugging, bulk paste from vendor, or keys not yet in the form.",
    where: "Template page → Config card → Advanced → Edit raw JSON.",
    how: "1) Prefer sections 1–7 first. 2) Open Advanced only if eng asks or a field is missing. 3) Invalid JSON blocks save — fix syntax before saving.",
    workflow:
      "Eng sends a starter config file. You paste in Advanced once, verify tabs look right, then use forms for day-to-day edits.",
    example: "(open Advanced → Edit raw JSON at the bottom of the config card)",
    commonMistakes: "Editing JSON while also changing tabs — save often; tabs and JSON stay in sync on save.",
  },
  {
    name: "Test map",
    meaning: "Safe practice tool: sample JSON in → Yaadro shape out.",
    what: "A dry-run. It does not call the vendor; it only checks your mapping.",
    why: "Lets a fresh user learn mappings without breaking production.",
    who: "Anyone configuring the template. Do this before attaching shops.",
    when: "After every mapping edit, and before go-live.",
    where: "Template page → section 7. Test map (or Test map panel on the config card).",
    how: "1) Paste vendor sample. 2) Run. 3) Read output — missing fields mean fix mapping. 4) Repeat until complete. 5) Then save template.",
    workflow:
      "Before Friday launch you spend 20 minutes with Test map and one sample file from the vendor until the preview looks like a normal Yaadro order.",
    example: "Paste {\"order\":{\"id\":\"P-99\",…}} into Test map",
  },
  {
    name: "Test connection",
    meaning: "Live ping to the vendor using a shop’s URL and credentials.",
    what: "Real HTTP call to an endpoint key (menu, orderCreate, …), optionally as a shop.",
    why: "Proves network, URL, and auth work before customers order.",
    who: "Ops on template page with a test shop_id.",
    when: "After auth/URL filled; before production attach.",
    where: "Template page → endpoint dropdown → Test.",
    how: "1) Pick endpoint. 2) Provide test shop_id if asked. 3) Run. 4) Analyse failures: URL, auth type, credentials, path. 5) Fix, re-test, then attach real shops.",
    workflow:
      "You attach a sandbox shop, Test connection on menu, get 200, then attach the live Marina shop with confidence.",
    example: "endpoint=menu, shop_id=<test shop uuid>",
  },
];

const LANE_FIELD_EXTRAS: PosPlaybookField[] = [
  {
    name: "Lane A — Cratis",
    meaning: "Dedicated Yaadro↔Cratis connector (push + catalog).",
    what: "A ready-made path for Cratis only. Not a generic JSON toy.",
    why: "Cratis has special behaviour. Using generic will fail in subtle ways.",
    who: "Ops attaches cratis template per shop. Eng maintains the connector.",
    when: "Whenever the vendor is Cratis.",
    where: "Main POS guide + shop attach with cratis template.",
    how: "Use seeded cratis template. Fill shop URL, bearer, tenants. Do not clone generic. If shop ecom confirmation is ON, first order create POST waits until Accept.",
    workflow:
      "Cratis brand onboards → pick cratis-v1 → per store URL + codes → with confirmation off, checkout prints immediately; with confirmation on, Accept then prints.",
    example: "Template cratis-v1 + shop https://online.cratis.live…",
  },
  {
    name: "Lane B — Saleculator",
    meaning: "POS links with link_token, then pulls orders from Yaadro.",
    what: "Pull lane (Inmenu-compatible): till calls POST /api/v1/pos/links, then fetches orders / posts status. We do not push orders out.",
    why: "Matches how Saleculator works in real stores — including ecom confirmation (Pending blanks stay visible on poll so the till can accept).",
    who: "Ops creates Features token (link_token); vendor configures till; ops attaches saleculator-pull-v1.",
    when: "Saleculator (or approved same-lane) vendors only.",
    where: "Shop → Features then Shop → POS.",
    how: "Token on Features first (= link_token), then attach saleculator-pull-v1. No base URL needed for classic pull. Do not expect Yaadro to POST create — PosPolicy always skips this lane.",
    workflow:
      "Enable Integration → copy token as link_token → attach saleculator-pull-v1 → till POST /pos/links → polls Pending blanks → POS accept API marks Accepted in Yaadro.",
    example: "Features token + template saleculator-pull-v1",
  },
  {
    name: "Lane C — generic / gravity / topas",
    meaning: "Configurable JSON over HTTP with mappings.",
    what: "Plug-and-play lane: you configure paths and field maps in Super Admin.",
    why: "Many POS brands share similar JSON; you onboard without waiting for a new connector — until the scenario table says needs developer.",
    who: "Ops configures template + shops. Eng only if XML/HMAC/new brand.",
    when: "JSON HTTP vendors close to our mapping engine.",
    where: "POS templates + shop attach overrides.",
    how: "Edit template endpoints/mappings → Test map → attach shops with URL/auth/tenants.",
    workflow:
      "New Gravity branch: reuse gravity-v1, only change shop URL and location codes.",
    example: "gravity-v1 + shop URL/tenants",
  },
];

const LANE_EXAMPLES: PosPlaybookExample[] = [
  {
    title: "New Cratis shop (UI only)",
    situation: "Vendor is Cratis. Template cratis-v1 already exists.",
    whatToDo:
      "Do not create a new template. Shop → POS → attach cratis-v1 → fill URL, bearer, tenants → save → test order.",
    values: [
      { field: "Template", value: "cratis-v1" },
      { field: "Vendor base URL", value: "https://api.cratis.example.com" },
      { field: "Auth type", value: "bearer" },
      { field: "Credentials", value: '{"token":"cratis-shop-key"}' },
      { field: "orderTenant", value: "account=ACC778 location=DXB-01" },
      { field: "Order push", value: "On (usually locked on)" },
    ],
  },
  {
    title: "New Saleculator shop (UI only)",
    situation: "POS links with link_token then pulls orders from Yaadro.",
    whatToDo:
      "Features → Integration → create/rotate token (copy as link_token) → POS tab → attach saleculator-pull-v1 → give link_token to Saleculator for POST /api/v1/pos/links.",
    values: [
      { field: "Features → Integration", value: "Enabled" },
      { field: "Integration token", value: "(copy once = Saleculator link_token)" },
      { field: "Template", value: "saleculator-pull-v1" },
      { field: "Order pull", value: "On" },
      { field: "Order push / Catalog", value: "Off" },
      { field: "Device auth", value: "POST /api/v1/pos/links → Bearer JWT" },
    ],
  },
  {
    title: "Gravity shop, same JSON as template (UI only)",
    situation: "New branch; same Gravity API; different URL and location.",
    whatToDo: "Reuse gravity template. Override shop URL + tenants (+ credentials if needed).",
    values: [
      { field: "Template", value: "gravity-v1" },
      { field: "Vendor base URL", value: "https://branch2.gravity.example.com" },
      { field: "menuTenant / orderTenant", value: "ACC001 / BR-02" },
      { field: "Webhook secret", value: "same string on Yaadro and vendor portal" },
    ],
  },
  {
    title: "Vendor renamed webhook fields (UI only)",
    situation: "Inbound mapping broke after POS upgrade.",
    whatToDo:
      "Template → mappings.order_inbound → Test map with new sample → Save. Shops keep same URL if unchanged.",
    values: [
      {
        field: "mappings.order_inbound.bill_no",
        value: "was order.id → now payload.orderCode",
      },
      { field: "Test map", value: "Paste new sample until output is complete" },
    ],
  },
  {
    title: "XML / HMAC / brand-new POS (needs developer)",
    situation: "Not JSON HTTP, or brand not in the list.",
    whatToDo:
      "Stop. Do not fake generic. Open eng ticket with docs + samples. See Scenarios panel.",
    values: [
      { field: "Super Admin action", value: "None for connector work" },
      { field: "Ticket should include", value: "sample payloads, auth docs, sandbox URL" },
    ],
  },
];

const LANE_FAQS: PosPlaybookFaq[] = [
  {
    q: "What are the 5Ws on each field?",
    a: "What (is it), Why (it matters), Who (sets/uses it), When (to set/change), Where (on screen / in the journey). How explains fill, check, analyse, and update. Open Fields & values → Open 5Ws on a field.",
  },
  {
    q: "I am new — where do I start?",
    a: "1) Overview. 2) Examples — find your vendor story. 3) Fields & values — open 5Ws for each box you will fill. 4) If Scenarios says needs developer, stop and ticket eng.",
  },
  {
    q: "Template vs shop — what goes where?",
    a: "Template = shared recipe (paths, mappings, events). Shop = this branch’s URL, secrets, account/location. Think: recipe book vs one restaurant’s address and keys.",
  },
  {
    q: "Orders not reaching POS?",
    a: "Check Link active, Order push, base URL, Credentials, orderTenant, then Sync status error text. Use each field’s How → analyse tips.",
  },
  {
    q: "How do I analyse if a value is wrong?",
    a: "Sync status + Test connection + Test map. One shop broken → shop fields. All shops on a template broken → template auth/endpoints/mappings.",
  },
];

export const POS_LANE_CHOOSER_PLAYBOOK: PosPlaybookDef = {
  title: "POS beginner guide — 5Ws, lanes, and when to call eng",
  description:
    "Fresh user path: Overview → Examples (pick your story) → Fields & values (open 5Ws on each field) → Steps. Use simple words: template = recipe, shop = one store’s address and keys. If Scenarios says “Needs developer”, stop.",
  steps: [
    {
      title: "Name the vendor (Cratis / Saleculator / Gravity / Topas / other)",
    },
    {
      title: "Open Examples page — copy the value table for that story",
    },
    {
      title: "Open Fields & values — read 5Ws before typing",
      detail: "What / Why / Who / When / Where / How + workflow story.",
    },
    {
      title: "If needs developer — ticket eng; else configure template then shop",
    },
  ],
  fields: [...LANE_FIELD_EXTRAS, ...POS_SHOP_FIELD_GLOSSARY.slice(0, 6)],
  examples: LANE_EXAMPLES,
  faqs: LANE_FAQS,
};

export const POS_TEMPLATE_DETAIL_PLAYBOOK: PosPlaybookDef = {
  title: "Template guide — every config field with 5Ws",
  description:
    "This screen edits the shared recipe. Work through section tabs 1–7 on the config card; read 5Ws on each field before saving. Shop passwords and live branch codes belong on Shop → POS. Raw JSON is only under Advanced.",
  steps: [
    { title: "Confirm provider / connector / lane (locked)" },
    {
      title: "Open Fields & values — 5Ws for each section tab (API, endpoints, mappings, …)",
    },
    {
      title: "Fill tabs 1–4: API & auth, Endpoints, Capabilities, Events (use checkboxes for events)",
    },
    {
      title: "Fill tabs 5–6: Mappings and Status codes; run tab 7 Test map",
    },
    { title: "Test connection (live) then Save — attach shops only after tests look good" },
  ],
  fields: POS_TEMPLATE_FIELD_GLOSSARY,
  examples: [
    {
      title: "First-time Gravity template",
      situation: "New Lane C vendor, JSON HTTP, webhooks + order push.",
      whatToDo:
        "Create gravity template. Use tabs 1–5: auth, endpoints, capabilities, events, order_inbound. Test map (tab 7). Save.",
      values: [
        {
          field: "1. API & auth → Login style",
          value: "Auth type: bearer, Header: Authorization",
        },
        {
          field: "2. Endpoints → orderCreate",
          value: "POST /v1/orders",
        },
        {
          field: "3. Capabilities",
          value: "Orders out: push, Orders in: webhook, Catalog: none",
        },
        {
          field: "4. Events → Order create on",
          value: "customer_order_created (checked)",
        },
      ],
    },
    {
      title: "OAuth2 vendor on Lane C",
      situation: "Client id/secret + token URL; refresh on 401.",
      whatToDo:
        "Tab 1: set oauth2_client_credentials + token URL. Seal client JSON on shop credentials.",
      values: [
        { field: "1. API & auth → Auth type", value: "oauth2_client_credentials" },
        {
          field: "1. API & auth → Token URL",
          value: "https://pos.example.com/oauth/token",
        },
        {
          field: "Shop credentials",
          value: '{"client_id":"…","client_secret":"…"}',
        },
      ],
    },
    LANE_EXAMPLES[3]!,
    LANE_EXAMPLES[4]!,
  ],
  faqs: [
    {
      q: "Do I put the shop password in the template config?",
      a: "No for multi-shop templates. Secrets on Shop → POS → Credentials. Template tab 1 holds auth type + header defaults only.",
    },
    {
      q: "When should I use Advanced → raw JSON?",
      a: "Only when eng gives you a full config to paste, or a key is not in the section tabs yet. Day-to-day edits use tabs 1–7.",
    },
    {
      q: "How do I know mapping is good enough?",
      a: "Test map output must show external id, status, and lines. If any are empty, keep editing 5Ws→How on mappings.order_inbound.",
    },
    ...LANE_FAQS,
  ],
};

export const POS_TEMPLATE_LANE_CALLOUTS: Record<string, string> = {
  cratis:
    "Lane A — seeded Cratis. Shop: URL + bearer + tenants. Do not use generic for Cratis.",
  saleculator:
    "Lane B — Features integration token = Saleculator link_token. Attach saleculator-pull-v1 after token exists. Device uses POST /api/v1/pos/links.",
  generic:
    "Lane C — endpoints + mappings are the main work. Use section tabs 1–7 + Fields → Open 5Ws + Test map.",
  gravity:
    "Lane C — shop overrides URL/tenants; template holds paths/mappings. Use tabs 2–5; read 5Ws before saving.",
  topas:
    "Lane C — shop overrides URL/tenants; template holds paths/mappings. Use tabs 2–5; read 5Ws before saving.",
};

export const POS_SCENARIO_MATRIX: PosScenarioRow[] = [
  {
    scenario:
      "New shop on existing Cratis / Saleculator / Gravity / Topas / generic template",
    configOnly: "Yes — attach + URL / tenants / token (see Examples + field 5Ws)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Same JSON shape, different URL / header / account-location",
    configOnly: "Yes — shop overrides only",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Webhook field names changed",
    configOnly: "Yes — mappings.order_inbound + Test map",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Change when we push (created vs accepted)",
    configOnly: "Yes — template events",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Catalog one URL vs split category/product URLs",
    configOnly: "Yes — capabilities + endpoints (HTTP JSON)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Static bearer / integration_token header",
    configOnly: "Yes — auth type + headerName + credentials",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "OAuth2 / login JWT with refresh-on-401",
    configOnly: "Partly — tokenUrl + sealed client JSON",
    needsCode: "Maybe — first new OAuth vendor may need eng",
    severity: "partial",
  },
  {
    scenario: "XML, multipart, or non-JSON body",
    configOnly: "No",
    needsCode: "Yes — new mapper/adapter",
    severity: "needs_code",
  },
  {
    scenario: "HMAC / mTLS / custom challenge",
    configOnly: "No",
    needsCode: "Yes",
    severity: "needs_code",
  },
  {
    scenario: "Identity beyond menuTenant/orderTenant query support",
    configOnly: "No",
    needsCode: "Yes — connector change",
    severity: "needs_code",
  },
  {
    scenario: "Brand-new POS name not in provider list",
    configOnly: "No",
    needsCode: "Yes — registry + contracts + FE lists",
    severity: "needs_code",
  },
  {
    scenario: "Another pull-from-Yaadro POS (not Saleculator)",
    configOnly: "No — do not fake with generic",
    needsCode: "Yes — new pull connector",
    severity: "needs_code",
  },
  {
    scenario: "Another brand with Cratis-like special rules",
    configOnly: "No",
    needsCode: "Yes — dedicated Lane A-style connector",
    severity: "needs_code",
  },
  {
    scenario: "Multi-POS per shop / non-HTTP transport",
    configOnly: "No",
    needsCode: "Yes — out of hybrid scope",
    severity: "needs_code",
  },
];

function shopPlaybook(
  title: string,
  description: string,
  steps: PosPlaybookStep[],
  examples: PosPlaybookExample[],
): PosPlaybookDef {
  return {
    title,
    description,
    steps,
    fields: POS_SHOP_FIELD_GLOSSARY,
    examples,
    faqs: LANE_FAQS,
  };
}

export const POS_SHOP_PLAYBOOK: Record<string, PosPlaybookDef> = {
  cratis: shopPlaybook(
    "Shop POS — Cratis (Lane A) with full 5Ws",
    "Open Fields & values → Open 5Ws on Template, URL, Auth, Credentials, tenants. Follow Examples for copy-paste values.",
    [
      { title: "Select Cratis template" },
      { title: "Paste vendor base URL (https host only)" },
      { title: "Auth bearer + Credentials token" },
      { title: "Set menuTenant and orderTenant for this branch" },
      { title: "Save → Sync status → test order" },
    ],
    [LANE_EXAMPLES[0]!],
  ),
  saleculator: shopPlaybook(
    "Shop POS — Saleculator (Lane B) with full 5Ws",
    "Read 5Ws on Integration token first (Features — that plaintext is link_token). Then attach saleculator-pull-v1. Device links via POST /api/v1/pos/links.",
    [
      { title: "Features → Integration → create/rotate token → copy as link_token" },
      { title: "Give link_token to Saleculator; point base URL at DMS /api/v1/pos" },
      { title: "POS tab → saleculator-pull-v1 → Save" },
      { title: "Confirm till links (POST /pos/links) and can pull orders" },
    ],
    [LANE_EXAMPLES[1]!],
  ),
  generic: shopPlaybook(
    "Shop POS — Lane C generic with full 5Ws",
    "Template must be tested first. Here you only set this store’s address, keys, and branch codes — open 5Ws on each.",
    [
      { title: "Confirm template Test map passed" },
      { title: "Template → URL → auth → credentials" },
      { title: "menuTenant & orderTenant for this branch" },
      { title: "Webhook secret if inbound → Save" },
    ],
    [LANE_EXAMPLES[2]!, LANE_EXAMPLES[3]!],
  ),
  gravity: shopPlaybook(
    "Shop POS — Gravity with full 5Ws",
    "Same as Lane C. Open 5Ws for URL and tenants; reuse gravity template mappings.",
    [
      { title: "Select gravity template" },
      { title: "Set base URL + auth + tenants" },
      { title: "Save and verify sync / webhook" },
    ],
    [LANE_EXAMPLES[2]!, LANE_EXAMPLES[3]!],
  ),
  topas: shopPlaybook(
    "Shop POS — Topas with full 5Ws",
    "Same as Lane C. Open 5Ws for URL and tenants; reuse topas template mappings.",
    [
      { title: "Select topas template" },
      { title: "Set base URL + auth + tenants" },
      { title: "Save and verify sync / webhook" },
    ],
    [LANE_EXAMPLES[2]!, LANE_EXAMPLES[3]!],
  ),
};

export function pullShopPlaybook(providerName: string): PosPlaybookDef {
  const name = providerName.trim() || "POS";
  return shopPlaybook(
    `Shop POS — ${name}`,
    `Enable Integration and rotate the token (that plaintext is link_token), then attach the ${name} template. The till links with POST /api/v1/pos/links and polls /api/v1/pos.`,
    [
      {
        title:
          "Features → Integration → create/rotate token → copy as link_token",
      },
      {
        title: `Give link_token to ${name}; point base URL at DMS /api/v1/pos`,
      },
      { title: "POS tab → select that template → Save" },
      { title: "Confirm the till links (POST /pos/links) and can pull orders" },
    ],
    [LANE_EXAMPLES[1]!],
  );
}

export const POS_SHOP_FALLBACK_PLAYBOOK: PosPlaybookDef = {
  title: "Shop POS — pick a template, then read 5Ws",
  description:
    "Select a template below. The guide switches to that lane. Until then, browse Fields & values 5Ws to learn each box.",
  steps: [
    { title: "Choose a template that matches the vendor" },
    { title: "Open Fields & values → Open 5Ws before typing" },
    { title: "Copy values from Examples for your story" },
  ],
  fields: POS_SHOP_FIELD_GLOSSARY,
  examples: LANE_EXAMPLES,
  faqs: LANE_FAQS,
};

export const POS_SHOP_OPERATE_PLAYBOOK: PosPlaybookDef = {
  title: "After attach — operate with 5Ws",
  description:
    "Day-2: rotate secrets, read sync errors, pause vs detach. Open 5Ws on Link active, Credentials, Integration token.",
  steps: [
    { title: "Rotate credentials / Integration token when vendor rotates keys" },
    {
      title: "Use Sync status",
      detail: "Last sync + error text — first place to analyse.",
    },
    {
      title: "Link active Off to pause; Detach only when changing brand",
    },
  ],
  fields: POS_SHOP_FIELD_GLOSSARY.filter((f) =>
    ["Link active", "Credentials", "Integration token (Features tab)"].includes(
      f.name,
    ),
  ),
  examples: [
    {
      title: "Orders stuck / sync error",
      situation: "Sync status shows auth or tenant error.",
      whatToDo:
        "Re-check base URL, credentials, orderTenant using each field’s How → analyse. Re-save rotated credentials.",
      values: [
        { field: "Sync error", value: "Read exact message on this tab" },
        { field: "Credentials", value: "Re-paste rotated key, save" },
      ],
    },
  ],
  faqs: LANE_FAQS,
};

export const POS_TEMPLATE_DETAIL_STEPS: PosPlaybookStep[] =
  POS_TEMPLATE_DETAIL_PLAYBOOK.steps;

export const POS_GENERAL_LANE_STEPS: PosPlaybookStep[] =
  POS_LANE_CHOOSER_PLAYBOOK.steps;

export const POS_SHOP_OPERATE_STEPS: PosPlaybookStep[] =
  POS_SHOP_OPERATE_PLAYBOOK.steps;
