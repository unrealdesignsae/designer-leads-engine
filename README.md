# Designer Leads Engine

Automated lead scanner, outreach prep queue, and dashboard for finding creative and 3D opportunities in the UAE.

## Operating Model

- Scanner runtime: recommend `Hermes` only. One scheduler is easier to reason about than split cron ownership.
- Dispatcher runtime: recommend `local` only until live-send is explicitly approved. It keeps the dry-run boundary closest to the operator.
- Best LLM for lead reasoning and message personalization: `Claude Sonnet 4.6`. Strong judgment for fit-scoring at daily volume and reliable brand-voice message drafting, while keeping the whole stack on one provider (Claude + Hermes). Since every message is operator-reviewed before sending, Opus-tier spend is unnecessary; reserve `Claude Opus 4.8` only for future fully-autonomous, no-review generation, and `Claude Haiku 4.5` as the high-volume fallback.
- Multi-profile model: every profile is its own campaign with separate scan queries, templates, portfolio links, outreach queue, and dashboard context.
- Outreach lifecycle: `new -> selected -> queued -> ready_to_send -> sent -> replied -> interested/declined/failed`.
- Dry-run guardrail: TypeScript defaults to `const DRY_RUN = process.env.DISPATCH_LIVE !== 'true'`. Python defaults to `DRY_RUN = True`.
- Enabling live sending: TypeScript requires `DISPATCH_LIVE=true`. Python requires manually setting `DRY_RUN = False`. Neither path is active by default in this build.
