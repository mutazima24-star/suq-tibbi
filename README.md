# سوق طبي — marketplace demo

`index.html` is the Respark intro page: a short project overview with a 15-second countdown that hands over to the marketplace at `/market`.

`market.html` (served at `/market`) is an Arabic RTL classified-ads marketplace demo (mobile, tablet and desktop) for medical devices, supplies, clinics, jobs, services and donations. Its layout follows the familiar Saudi classifieds pattern: category tabs, sub-category chips, city and sort filters, a list feed, ad pages with replies, posting, favorites, messages and an account page.

All listings, users and prices are fictional demo data (`assets/data.js`); product images are original SVG illustrations (`assets/illustrations.js`). Logins, posts, replies, favorites and chats are stored only in the visitor's browser (`localStorage`). No real trading, calls or messages occur.

The earlier concept presentation and its feedback form now live at `/concept.html`.

## Development and checks

Static HTML/CSS/JavaScript plus a Vercel Node function. No frontend build is needed.

- `node --test tests/feedback.test.cjs`: mocked delivery/storage tests; no real submissions or notifications.
- `node --check assets/app.js assets/market.js assets/data.js assets/illustrations.js assets/intro.js assets/feedback.js`
- `node --test tests/*.cjs`
- Vercel serves `index.html`, `market.html`, `concept.html`, `assets/`, `api/feedback.js` and `api/market-feedback.js` using `vercel.json`.
- The "ملاحظاتك" widget on market pages posts to `api/market-feedback.js`, which files the note as a client request (`client_task_requests`) on the Souq Tibbi page of the Respark dashboard using `SUPABASE_SERVICE_ROLE_KEY`; the browser also emails a copy to mutaz@respark-os.com through FormSubmit (the address must confirm FormSubmit's one-time activation email).

## Feedback configuration

The visible form uses the documented FormSubmit browser AJAX endpoint, preserving the email destination observed on the existing production site. Server-to-provider requests were rejected with HTTP 403 during the authorized delivery test. It verifies the provider's JSON success response rather than showing success on a timer. Provider acceptance does not prove inbox delivery. Activation, if required, is managed by the email owner.

The separate `/api/feedback` endpoint is not called by the visible form. Its prior Supabase path remains available only when explicitly selected with `FEEDBACK_PROVIDER=supabase`. Set `SUPABASE_SERVICE_ROLE_KEY` in the deployment environment; optional `SUPABASE_URL` overrides the existing project URL. Never commit credentials. The expected `suq_tibbi_feedback` schema is unchanged. No automatic provider fallback is used, avoiding duplicate submissions after ambiguous failures.

The optional API (not the direct browser route) validates field types/lengths, checks browser origin, uses an 8-second upstream timeout, rejects the honeypot, and limits bursts in each function instance. The in-memory limiter is not a global or durable limit; use a shared limiter or platform firewall before a public launch. Errors retain the draft in the page. A successful response opens an accessible dismissible dialog without redirecting.

## Deployment provenance

At the start of this review, production was deployed through CLI and contained uncommitted FormSubmit changes, while GitHub still contained a Supabase form. This revision reconciles that difference by preserving the live email route and retaining the database option explicitly. Deploy a Git commit and verify its assets and interactions before promotion. Live form submissions send a real notification; automated tests must mock the providers.

## Mobile and provider follow-up

The desktop navigation selector had higher CSS specificity than the mobile hiding rule. Mobile rules now target `.topbar .nav` explicitly. Flex items that must remain visible do not shrink and grid children can shrink to their available width.

The browser sends standard `name`/`message` fields and checks both HTTP status and FormSubmit JSON success. Failed or ambiguous responses retain the draft; no timed success or automatic retries are used. Provider acceptance and inbox delivery must be verified separately.
