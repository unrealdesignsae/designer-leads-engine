#!/usr/bin/env python3
"""
Designer Leads Engine - Database initialization
"""

import json
import os
import sqlite3

DB_PATH = os.path.expandvars(r"E:\unreal brain\Projects\designer-leads-engine\data\leads.db")

DEFAULT_PROFILE = {
    "name": "3D Designer Jobs (UAE)",
    "slug": "3d-designer-uae",
    "description": "UAE hiring pipeline for 3D designer, creative director, events, exhibition, and spatial design roles.",
    "icp_keywords": [
        "3D designer",
        "creative director",
        "art director",
        "events",
        "exhibition",
        "spatial design",
        "Unreal Engine",
        "Dubai",
        "Abu Dhabi",
    ],
    "scan_queries": [
        "site:linkedin.com hiring 3d designer OR 3d artist dubai uae freelance 2026",
        "site:linkedin.com creative director OR art director events hiring dubai 2026",
        "site:linkedin.com freelance 3D dubai event exhibition designer artist",
        "site:linkedin.com/jobs 3d designer OR 3d artist OR CG generalist dubai 2026",
        "site:linkedin.com/jobs creative director OR art director dubai events 2026",
        "dubai creative director OR art director hiring 3D OR CG freelance events 2026",
        "uae 3D designer OR 3D artist event exhibition freelance hiring 2026",
    ],
    "message_templates": {
        "linkedin": "Hey {name},\n\nSaw your post about looking for a {role_seeking} at {company}.\nI'm Black, Creative Technology & CG Director at unreal.ae in Dubai.\nI specialize in real-time 3D, Unreal Engine, and experiential design for events and exhibitions.\n\nPortfolio: {portfolio_url}\nFull CV/PDF: {pdf_url}\n\nWould love to chat if you're still looking. Available for freelance and project-based work.\n\nBest,\nBlack",
        "email": "Subject: 3D/CG Designer - Saw your post about {role_seeking}\n\nHi {name},\n\nI came across your post looking for a {role_seeking} at {company}.\n\nI'm Black, Creative Technology & CG Director at unreal.ae in Dubai.\nI specialize in real-time 3D, Unreal Engine, and experiential design for events, exhibitions, and brand experiences.\n\nPortfolio (password-protected): {portfolio_url}\nFull CV/PDF: {pdf_url}\n\nI'm available for freelance and project-based engagements.\nWould love to connect and see if there's a fit.\n\nBest,\nBlack\nunreal.ae",
        "whatsapp": "Hey {name}, saw your post about looking for a {role_seeking} at {company}. I'm Black, Creative Technology & CG Director at unreal.ae in Dubai. I specialize in real-time 3D and Unreal Engine for events and exhibitions. Portfolio: {portfolio_url}. Full CV: {pdf_url}. Available for freelance work if useful.",
    },
    "portfolio_url": "https://aries-black-portfolio.vercel.app/",
    "pdf_url": "https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view?usp=sharing",
    "accent_color": "#3ecf8e",
}

SCHEMA = """
create table if not exists profiles (
    id integer primary key autoincrement,
    name text not null,
    slug text not null unique,
    description text not null default '',
    icp_keywords text not null default '[]',
    scan_queries text not null default '[]',
    message_templates text not null default '{}',
    portfolio_url text not null default '',
    pdf_url text not null default '',
    accent_color text not null default '#3ecf8e',
    created_at text default (datetime('now')),
    is_active integer not null default 1
);

create table if not exists leads (
    id integer primary key autoincrement,
    profile_id integer references profiles(id),
    name text,
    title text,
    company text,
    role_seeking text,
    location text,
    post_url text,
    post_date text,
    salary text,
    source text,
    contact_email text,
    contact_phone text,
    contact_linkedin text,
    channels_available text default '["linkedin"]',
    status text default 'new',
    rating integer default 3,
    notes text,
    content_hash text unique,
    discovered_at text default (datetime('now')),
    contacted_at text,
    replied_at text,
    vault_path text
);

create table if not exists outreach (
    id integer primary key autoincrement,
    lead_id integer not null references leads(id),
    profile_id integer not null references profiles(id),
    channel text not null,
    message_body text not null,
    status text not null default 'ready_to_send',
    prepared_at text not null default (datetime('now')),
    sent_at text,
    replied_at text,
    reply_snippet text,
    error text
);

create table if not exists daily_scans (
    id integer primary key autoincrement,
    profile_id integer references profiles(id),
    scan_date text unique,
    leads_found integer default 0,
    new_leads integer default 0,
    dms_sent integer default 0,
    replies_received integer default 0,
    vault_report_path text,
    status text default 'completed'
);
"""


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    seed_default_profile(conn)
    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DB_PATH}")
    return DB_PATH


def seed_default_profile(conn):
    cursor = conn.cursor()
    cursor.execute("select id from profiles where slug = ?", (DEFAULT_PROFILE["slug"],))
    row = cursor.fetchone()

    if row:
        profile_id = row[0]
    else:
        cursor.execute(
            """
            insert into profiles (
                name, slug, description, icp_keywords, scan_queries, message_templates,
                portfolio_url, pdf_url, accent_color, is_active
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                DEFAULT_PROFILE["name"],
                DEFAULT_PROFILE["slug"],
                DEFAULT_PROFILE["description"],
                json.dumps(DEFAULT_PROFILE["icp_keywords"]),
                json.dumps(DEFAULT_PROFILE["scan_queries"]),
                json.dumps(DEFAULT_PROFILE["message_templates"]),
                DEFAULT_PROFILE["portfolio_url"],
                DEFAULT_PROFILE["pdf_url"],
                DEFAULT_PROFILE["accent_color"],
            ),
        )
        profile_id = cursor.lastrowid

    cursor.execute("update leads set profile_id = ? where profile_id is null", (profile_id,))


if __name__ == "__main__":
    init_db()
