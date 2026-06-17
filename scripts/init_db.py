#!/usr/bin/env python3
"""
Designer Leads Engine — Database Initialization
Creates the SQLite database and tables for the lead tracking system.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.expandvars(r"E:\unreal brain\Projects\designer-leads-engine\data\leads.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
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
    channels_available TEXT DEFAULT '["linkedin"]',
    status TEXT DEFAULT 'new',
    notes TEXT,
    content_hash TEXT UNIQUE,
    discovered_at TEXT DEFAULT (datetime('now')),
    contacted_at TEXT,
    replied_at TEXT,
    vault_path TEXT
);

CREATE TABLE IF NOT EXISTS contact_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id),
    channel TEXT,
    message_sent TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending',
    response TEXT,
    responded_at TEXT,
    error TEXT
);

CREATE TABLE IF NOT EXISTS daily_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_date TEXT UNIQUE,
    leads_found INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    dms_sent INTEGER DEFAULT 0,
    replies_received INTEGER DEFAULT 0,
    vault_report_path TEXT,
    status TEXT DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_hash ON leads(content_hash);
CREATE INDEX IF NOT EXISTS idx_leads_date ON leads(discovered_at);
CREATE INDEX IF NOT EXISTS idx_attempts_lead ON contact_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_scans_date ON daily_scans(scan_date);
"""

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DB_PATH}")
    return DB_PATH

if __name__ == "__main__":
    init_db()