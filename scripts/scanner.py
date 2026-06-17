#!/usr/bin/env python3
"""
Designer Leads Scanner — Daily Cron Job
Searches for Creative Director / 3D Designer / Art Director leads in UAE.
Deduplicates against existing DB, saves new leads, writes vault report.
"""

import sqlite3
import json
import hashlib
import os
import re
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import quote

DB_PATH = os.path.expandvars(r"E:\unreal brain\Projects\designer-leads-engine\data\leads.db")
VAULT_LEADS_DIR = os.path.expandvars(r"E:\unreal brain\Intelligence\leads")
VAULT_DAILY = os.path.expandvars(r"E:\unreal brain\Daily")

# Search queries
QUERIES = [
    # LinkedIn posts from individuals hiring
    'site:linkedin.com/posts "hiring" OR "looking for" "3d designer" OR "3d artist" OR "CG artist" dubai OR uae freelance OR "AED" 2026',
    'site:linkedin.com/posts "creative director" OR "art director" "events" OR "experiential" hiring looking dubai salary 2026',
    'site:linkedin.com/posts "freelance" "3D" dubai event OR exhibition OR experiential designer artist',
    # Job listings
    'site:linkedin.com/jobs "3d designer" OR "3d artist" OR "CG generalist" dubai OR "united arab emirates" 2026',
    'site:linkedin.com/jobs "creative director" OR "art director" dubai events OR experiential 2026',
    # Web results
    'dubai "creative director" OR "art director" hiring "3D" OR "CG" freelance OR fulltime events 2026',
    'uae "3D designer" OR "3D artist" event exhibition freelance hiring 2026',
]

def search_web(query, limit=10):
    """Use web search tool from Hermes — this is a stub that the agent fills in."""
    # In production, this is called via Hermes's web_search tool
    # For cron, the agent handles the actual search
    return []

def compute_hash(name, url, role):
    """Create unique content hash for dedup."""
    raw = f"{name or ''}|{url or ''}|{role or ''}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]

def extract_contact_info(text):
    """Extract email and phone from post text."""
    email = None
    phone = None
    
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        email = email_match.group(0)
    
    phone_match = re.search(r'\+?[\d\s\-\(\)]{7,15}', text)
    if phone_match:
        phone = phone_match.group(0).strip()
    
    return email, phone

def determine_channels(email, phone, linkedin_url):
    """Determine available contact channels."""
    channels = []
    if linkedin_url:
        channels.append("linkedin")
    if email:
        channels.append("email")
    if phone:
        channels.append("whatsapp")
    return channels or ["linkedin"]

def insert_lead(conn, lead_data):
    """Insert lead if not already in DB."""
    content_hash = lead_data.get("content_hash")
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM leads WHERE content_hash = ?", (content_hash,))
    existing = cursor.fetchone()
    if existing:
        return None  # duplicate
    
    cursor.execute("""
        INSERT INTO leads (name, title, company, role_seeking, location, 
                          post_url, post_date, salary, source, contact_email,
                          contact_phone, contact_linkedin, channels_available, 
                          status, notes, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    """, (
        lead_data.get("name"),
        lead_data.get("title"),
        lead_data.get("company"),
        lead_data.get("role_seeking"),
        lead_data.get("location"),
        lead_data.get("post_url"),
        lead_data.get("post_date"),
        lead_data.get("salary"),
        lead_data.get("source"),
        lead_data.get("contact_email"),
        lead_data.get("contact_phone"),
        lead_data.get("contact_linkedin"),
        json.dumps(lead_data.get("channels_available", ["linkedin"])),
        lead_data.get("notes", ""),
        content_hash
    ))
    conn.commit()
    return cursor.lastrowid

def write_vault_report(leads, scan_date):
    """Write daily lead report to Obsidian vault."""
    os.makedirs(VAULT_LEADS_DIR, exist_ok=True)
    
    report_path = os.path.join(VAULT_LEADS_DIR, f"{scan_date}.md")
    
    lines = [
        "---",
        f"date: {scan_date}",
        "tags: [leads, designer-leads, daily-scan]",
        "type: intelligence",
        "project: designer-leads-engine",
        "---",
        "",
        f"# Designer Leads — {scan_date}",
        "",
        f"Leads found: {len(leads)}",
        "",
    ]
    
    if leads:
        lines.append("| # | Name | Title | Company | Role | Location | Channels | Link |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for i, lead in enumerate(leads, 1):
            ch = ", ".join(lead.get("channels_available", ["linkedin"]))
            url = lead.get("post_url", "N/A")
            url_display = f"[post]({url})" if url != "N/A" else "N/A"
            lines.append(
                f"| {i} | {lead.get('name', 'N/A')} | {lead.get('title', 'N/A')} | "
                f"{lead.get('company', 'N/A')} | {lead.get('role_seeking', 'N/A')} | "
                f"{lead.get('location', 'N/A')} | {ch} | {url_display} |"
            )
        
        lines.append("")
        lines.append("## Details")
        for i, lead in enumerate(leads, 1):
            lines.append(f"### {i}. {lead.get('name', 'Unknown')} — {lead.get('role_seeking', 'Unknown Role')}")
            lines.append(f"- **Title:** {lead.get('title', 'N/A')}")
            lines.append(f"- **Company:** {lead.get('company', 'N/A')}")
            lines.append(f"- **Location:** {lead.get('location', 'N/A')}")
            lines.append(f"- **Post:** {lead.get('post_url', 'N/A')}")
            if lead.get("salary"):
                lines.append(f"- **Salary:** {lead.get('salary')}")
            lines.append(f"- **Channels:** {', '.join(lead.get('channels_available', ['linkedin']))}")
            if lead.get("notes"):
                lines.append(f"- **Notes:** {lead.get('notes')}")
            lines.append("")
    else:
        lines.append("No new leads found today.")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    
    return report_path

def record_scan(conn, scan_date, leads_found, new_count, report_path):
    """Record the daily scan in the database."""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO daily_scans (scan_date, leads_found, new_leads, vault_report_path)
        VALUES (?, ?, ?, ?)
    """, (scan_date, leads_found, new_count, report_path))
    conn.commit()

def run_scan():
    """Main scan function."""
    scan_date = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    
    all_leads = []
    new_count = 0
    
    print(f"=== Designer Leads Scanner — {scan_date} ===")
    print(f"Running {len(QUERIES)} search queries...")
    
    # In production, this is where the Hermes agent does web_search calls
    # For now, this is the framework that the cron job will use
    # The agent will populate results via the search tool
    
    # Placeholder: process any leads the agent found
    # (The actual cron job will inject results here)
    
    leads_found = len(all_leads)
    
    # Record the scan
    report_path = write_vault_report(all_leads, scan_date)
    record_scan(conn, scan_date, leads_found, new_count, report_path)
    
    conn.close()
    
    print(f"✓ Scan complete: {leads_found} found, {new_count} new")
    print(f"✓ Report: {report_path}")
    
    return {
        "scan_date": scan_date,
        "leads_found": leads_found,
        "new_leads": new_count,
        "report_path": report_path
    }

if __name__ == "__main__":
    run_scan()