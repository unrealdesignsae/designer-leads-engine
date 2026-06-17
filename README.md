# Designer Leads Engine

Automated daily lead scanner + DM sender + dashboard for finding Creative Directors / 3D Designers in UAE.

> Built for unreal.ae — Black's automated outreach pipeline.

## How It Works

1. **Daily Scan** (8 AM GST) — Searches LinkedIn + web for leads
2. **Deduplication** — Content hash + URL matching
3. **Vault Report** — Saved to Obsidian Second Brain
4. **Dashboard** — Checkbox UI to select leads
5. **DM Dispatch** — LinkedIn (Unipile) + Email + WhatsApp
6. **Reply Tracking** — Interested replies surfaced immediately

## Architecture

```
Hermes Cron → Scanner → SQLite DB → Supabase → Vercel Dashboard
                         ↓
                    Unipile MCP → LinkedIn DM
                         ↓
                    Email SMTP
                         ↓
                    WhatsApp (Unipile)
```

## Project Structure

```
designer-leads-engine/
├── data/              # SQLite database
├── scripts/
│   ├── init_db.py     # Database initialization
│   ├── scanner.py     # Daily lead scanner
│   └── dispatcher.py  # DM sender
├── dashboard/         # Next.js Vercel dashboard
├── vault/             # Obsidian vault integration
└── README.md
```

## Setup

```bash
# Init database
python scripts/init_db.py

# Run scanner
python scripts/scanner.py

# Dispatch selected leads
python scripts/dispatcher.py
```

## Cron Job

```
hermes cron create "every day 8am" \
  --name "designer-leads-scanner" \
  --prompt "Run the designer leads scanner..." \
  --skills designer-leads-scanner
```

## Portfolio Links

- Website: https://aries-black-portfolio.vercel.app/ (password-protected)
- PDF: https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view?usp=sharing

## Status Flow

```
new → selected → contacted → replied → interested
                 ↘ failed
                 ↘ declined
```