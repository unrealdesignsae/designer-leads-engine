---
type: spec
date: 2026-06-17
project: designer-leads-engine
status: active
tags: [spec, leads, automation, architecture]
---

# Designer Leads Engine — System Spec

## Prompt Enhanced Summary

**Original request:** Daily automated system that scans for Creative Director / 3D Designer / Art Director leads in UAE, saves them to a database, prepares a checkbox-style list for Black to review, sends personalized DMs via Unipile (LinkedIn + Email + WhatsApp where applicable) using Black's portfolio and Google Drive PDF, tracks replies, reports failed DMs, and surfaces interested replies. Vercel dashboard connected to database. GitHub repo. Vault integration.

**Enhanced as:**

> Deploy **Designer Leads Engine** — a fully autonomous daily pipeline that discovers, qualifies, and contacts potential clients for unreal.ae's 3D/CG design services across UAE. The system runs as a Hermes cron job each morning: scans LinkedIn and web sources for individuals posting about hiring Creative Directors, Art Directors, or 3D designers in Dubai/Abu Dhabi/UAE. Each lead is deduplicated, scored for recency and relevance, and stored in a local SQLite database synced to Supabase for Vercel dashboard access. Leads appear in a checkbox-style dashboard where Black selects which to contact. On selection, the system dispatches personalized outreach via the most relevant channel: LinkedIn DM through Unipile MCP (default), email if an email address was found, WhatsApp if a phone number was mentioned. Every message includes the portfolio link (https://aries-black-portfolio.vercel.app/, password-protected) and Google Drive PDF (https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view). Failed DMs are flagged for manual follow-up. Replies expressing interest are surfaced immediately. All leads and contact history are journaled to the Unreal Brain Obsidian vault for Claude context continuity.

## System Components

### 1. Daily Scanner (`cron: designer-leads-scanner`)
- Schedule: every day at 8:00 AM GST
- Searches: LinkedIn posts, web results, job boards
- Filters: UAE/Dubai/Abu Dhabi, Creative Director/Art Director/3D Designer, events/experiential focus
- Deduplication: content hash + URL match
- Output: saves to SQLite `leads` table, writes daily vault report

### 2. Local Database (SQLite)
- File: `E:\unreal brain\Projects\designer-leads-engine\data\leads.db`
- Tables: `leads`, `contact_attempts`, `daily_scans`
- Syncs to Supabase for dashboard access

### 3. Vercel Dashboard (Next.js + Supabase)
- Checkbox list of new leads
- Select → "Send DM" button
- Status columns: new / selected / contacted / replied / interested / declined / failed
- Filter by date, status, channel

### 4. DM Dispatcher
- Channels: LinkedIn DM (Unipile MCP), Email (SMTP/API), WhatsApp (Unipile MCP)
- Templates: personalized per lead using their post context
- Portfolio: https://aries-black-portfolio.vercel.app/ (password-protected)
- PDF: https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view?usp=sharing

### 5. Vault Integration
- Daily lead reports saved to `Intelligence/leads/YYYY-MM-DD.md`
- Linked from `Daily/YYYY-MM-DD.md`
- Status updates reflected in vault

### 6. GitHub Repo
- Repo: `unreal-ae/designer-leads-engine`
- Contains: dashboard code, database schema, cron scripts, docs

## Database Schema

```sql
CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    title TEXT,
    company TEXT,
    role_seeking TEXT,
    location TEXT,
    post_url TEXT,
    post_date TEXT,
    salary TEXT,
    source TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_linkedin TEXT,
    channels_available TEXT, -- JSON: ["linkedin","email","whatsapp"]
    status TEXT DEFAULT 'new',
    notes TEXT,
    content_hash TEXT UNIQUE,
    discovered_at TEXT DEFAULT (datetime('now')),
    contacted_at TEXT,
    replied_at TEXT,
    vault_path TEXT
);

CREATE TABLE contact_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id),
    channel TEXT, -- linkedin_dm, email, whatsapp
    message_sent TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending',
    response TEXT,
    responded_at TEXT,
    error TEXT
);

CREATE TABLE daily_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_date TEXT UNIQUE,
    leads_found INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    dms_sent INTEGER DEFAULT 0,
    replies_received INTEGER DEFAULT 0,
    vault_report_path TEXT,
    status TEXT DEFAULT 'completed'
);
```

## Status Flow

```
new → selected → contacted → replied → interested
                 ↘ failed (manual retry)
                 ↘ declined

interested → opportunity (if project confirmed)
```

## DM Message Template

```
Hey {{name}},

Saw your post about looking for a {{role_seeking}} at {{company}}. 
I'm Black, Creative Technology & CG Director at unreal.ae in Dubai — 
I specialize in real-time 3D, Unreal Engine, and experiential design 
for events and exhibitions.

My portfolio (password-protected): https://aries-black-portfolio.vercel.app/
Full CV/PDF: https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view?usp=sharing

Would love to chat if you're still looking. Available for freelance 
and project-based work.

Best,
Black
```

## Phased Build Order

**Phase 1** (today): Database + Scanner Cron + Vault integration
**Phase 2** (today): GitHub repo + Dashboard scaffold
**Phase 3** (tomorrow): DM dispatcher (needs Unipile MCP reload)
**Phase 4** (this week): Supabase sync + Vercel deploy
