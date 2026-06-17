# Designer Leads Engine

Automated lead scanner, outreach prep queue, and dashboard for finding creative and 3D opportunities in the UAE.

## Operating Model

- Scanner runtime: recommend `Hermes` only. One scheduler is easier to reason about than split cron ownership.
- Dispatcher runtime: recommend `local` only until live-send is explicitly approved. It keeps the dry-run boundary closest to the operator.
- Best LLM for lead reasoning and message personalization: `Claude Sonnet 4.6`. Strong judgment for fit-scoring at daily volume and reliable brand-voice message drafting, while keeping the whole stack on one provider (Claude + Hermes). Since every message is operator-reviewed before sending, Opus-tier spend is unnecessary; reserve `Claude Opus 4.8` only for future fully-autonomous, no-review generation, and `Claude Haiku 4.5` as the high-volume fallback.
- Multi-profile model: every profile is its own campaign with separate scan queries, templates, portfolio links, outreach queue, and dashboard context.
- Outreach lifecycle: `new -> selected -> queued -> ready_to_send -> sent -> replied -> interested/declined/failed`.
- Live sending (dashboard): the `Send` button on `/outreach` delivers the message for real through its channel provider, with a per-send confirm, then marks it sent only on a confirmed provider response. Failed sends record the error on the row and stay `ready_to_send`.
- Channel providers (set in env, server-side / Vercel):
  - Email: `RESEND_API_KEY`, `RESEND_FROM` (verified sender), optional `RESEND_SUBJECT`.
  - LinkedIn: `UNIPILE_DSN`, `UNIPILE_API_KEY`, `UNIPILE_LINKEDIN_ACCOUNT_ID` (LinkedIn must be connected inside your Unipile account).
  - WhatsApp: `UNIPILE_DSN`, `UNIPILE_API_KEY`, `UNIPILE_WHATSAPP_ACCOUNT_ID`.
- If a provider's env is missing, `Send` returns a precise "not configured" error instead of sending. Nothing is sent without connected credentials.
- The Python `dispatcher.py` remains dry-run (`DRY_RUN = True`) and is not the live path; live sending happens through the dashboard `Send` action.
