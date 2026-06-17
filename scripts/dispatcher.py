#!/usr/bin/env python3
"""
Dry-run outreach preparation only.
"""

import json
import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.expandvars(r"E:\unreal brain\Projects\designer-leads-engine\data\leads.db")
DRY_RUN = True

PORTFOLIO_URL = "https://aries-black-portfolio.vercel.app/"
PORTFOLIO_NOTE = "(password-protected -- ask me for access)"
PDF_URL = "https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view?usp=sharing"

TEMPLATES = {
    "linkedin": """Hey {name},

Saw your post about looking for a {role_seeking} at {company}.
I'm Black, Creative Technology & CG Director at unreal.ae in Dubai.

Portfolio {PORTFOLIO_NOTE}: {PORTFOLIO_URL}
Full CV/PDF: {PDF_URL}

Best,
Black""",
    "email": """Subject: 3D/CG Designer - Saw your post about {role_seeking}

Hi {name},

I came across your post looking for a {role_seeking} at {company}.

Portfolio (password-protected): {PORTFOLIO_URL}
Full CV/PDF: {PDF_URL}

Best,
Black""",
    "whatsapp": "Hey {name}, saw your post about {role_seeking} at {company}. Portfolio: {PORTFOLIO_URL}. CV: {PDF_URL}.",
}


def generate_message(channel, lead):
    template = TEMPLATES.get(channel, TEMPLATES["linkedin"])
    return template.format(
        name=lead.get("name") or "there",
        role_seeking=lead.get("role_seeking") or "creative role",
        company=lead.get("company") or "your team",
        PORTFOLIO_URL=PORTFOLIO_URL,
        PORTFOLIO_NOTE=PORTFOLIO_NOTE,
        PDF_URL=PDF_URL,
    ).strip()


def write_outreach_row(conn, lead, channel, message):
    timestamp = datetime.utcnow().isoformat()
    cursor = conn.cursor()
    cursor.execute(
        """
        insert into outreach (
            lead_id, profile_id, channel, message_body, status, prepared_at
        ) values (?, ?, ?, ?, 'ready_to_send', ?)
        """,
        (lead["id"], lead.get("profile_id"), channel, message, timestamp),
    )
    conn.commit()
    return cursor.lastrowid


def dispatch_selected():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("select * from leads where status in ('selected', 'queued')")
    selected = cursor.fetchall()
    results = []
    for lead in selected:
        lead_dict = dict(lead)
        channels = json.loads(lead_dict.get("channels_available", "[]") or "[]")
        for channel in channels:
            message = generate_message(channel, lead_dict)
            write_outreach_row(conn, lead_dict, channel, message)
        cursor.execute(
            "update leads set status = 'ready_to_send', contacted_at = ? where id = ?",
            (datetime.utcnow().isoformat(), lead_dict["id"]),
        )
        conn.commit()
        results.append({"lead_id": lead_dict["id"], "name": lead_dict.get("name"), "channels_used": channels})
    conn.close()
    return {"prepared": len(results), "dry_run": DRY_RUN, "results": results}


if __name__ == "__main__":
    dispatch_selected()
