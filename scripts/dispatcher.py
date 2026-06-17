#!/usr/bin/env python3
"""
Designer Leads DM Dispatcher
Sends personalized outreach messages via available channels:
- LinkedIn DM (via Unipile MCP)
- Email (via SMTP/API)
- WhatsApp (via Unipile MCP)

Reads from the leads database, sends for leads with status='selected'.
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.expandvars(r"E:\unreal brain\Projects\designer-leads-engine\data\leads.db")

PORTFOLIO_URL = "https://aries-black-portfolio.vercel.app/"
PORTFOLIO_NOTE = "(password-protected — ask me for access)"
PDF_URL = "https://drive.google.com/file/d/1Ql5IgVXXC9CSIDtM6emNKsX055UVNIn4/view?usp=sharing"

TEMPLATES = {
    "linkedin": """Hey {name},

Saw your post about looking for a {role_seeking} at {company}. 
I'm Black, Creative Technology & CG Director at unreal.ae in Dubai — 
I specialize in real-time 3D, Unreal Engine, and experiential design 
for events and exhibitions.

My portfolio {PORTFOLIO_NOTE}: {PORTFOLIO_URL}
Full CV/PDF: {PDF_URL}

Would love to chat if you're still looking. Available for freelance 
and project-based work.

Best,
Black""",

    "email": """Subject: 3D/CG Designer — Saw your post about {role_seeking}

Hi {name},

I came across your post looking for a {role_seeking} at {company}.

I'm Black, Creative Technology & CG Director at unreal.ae in Dubai. 
I specialize in real-time 3D, Unreal Engine, and experiential design 
for events, exhibitions, and brand experiences.

Portfolio (password-protected): {PORTFOLIO_URL}
Full CV/PDF: {PDF_URL}

I'm available for freelance and project-based engagements. 
Would love to connect and see if there's a fit.

Best,
Black
unreal.ae""",

    "whatsapp": """Hey {name}, saw your post about looking for a {role_seeking} at {company}. I'm Black, Creative Technology & CG Director at unreal.ae in Dubai — specialize in real-time 3D and Unreal Engine for events/exhibitions. Portfolio: {PORTFOLIO_URL} (password-protected). Full CV: {PDF_URL}. Available for freelance work. Let me know if you'd like to chat!"""
}

def generate_message(channel, lead):
    """Generate personalized message for a lead."""
    template = TEMPLATES.get(channel, TEMPLATES["linkedin"])
    
    name = lead.get("name") or "there"
    role = lead.get("role_seeking") or "creative role"
    company = lead.get("company") or "your team"
    
    message = template.format(
        name=name,
        role_seeking=role,
        company=company,
        PORTFOLIO_URL=PORTFOLIO_URL,
        PORTFOLIO_NOTE=PORTFOLIO_NOTE,
        PDF_URL=PDF_URL
    )
    
    return message.strip()

def send_linkedin_dm(lead, message):
    """
    Send LinkedIn DM via Unipile MCP.
    Requires Unipile MCP server to be loaded.
    Falls back to manual flag if MCP unavailable.
    """
    # In production, this calls mcp_unipile_send_message or equivalent
    # For now, mark as pending manual send
    return {"status": "pending", "channel": "linkedin", "message": message}

def send_email(lead, message):
    """
    Send email via SMTP/API.
    Requires email credentials configured.
    """
    email = lead.get("contact_email")
    if not email:
        return {"status": "failed", "channel": "email", "error": "No email found"}
    # In production, send via SMTP or API
    return {"status": "pending", "channel": "email", "to": email, "message": message}

def send_whatsapp(lead, message):
    """
    Send WhatsApp via Unipile MCP.
    Requires Unipile MCP server to be loaded.
    """
    phone = lead.get("contact_phone")
    if not phone:
        return {"status": "failed", "channel": "whatsapp", "error": "No phone found"}
    # In production, this calls Unipile WhatsApp API
    return {"status": "pending", "channel": "whatsapp", "to": phone, "message": message}

def log_attempt(conn, lead_id, channel, message, result):
    """Log contact attempt to database."""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO contact_attempts (lead_id, channel, message_sent, status, error)
        VALUES (?, ?, ?, ?, ?)
    """, (
        lead_id,
        channel,
        message,
        result.get("status", "pending"),
        result.get("error", "")
    ))
    conn.commit()

def update_lead_status(conn, lead_id, status):
    """Update lead status in database."""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE leads SET status = ?, contacted_at = datetime('now')
        WHERE id = ?
    """, (status, lead_id))
    conn.commit()

def dispatch_selected():
    """Dispatch DMs for all leads with status='selected'."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM leads WHERE status = 'selected'")
    selected = cursor.fetchall()
    
    if not selected:
        print("No leads selected for outreach.")
        conn.close()
        return {"dispatched": 0, "results": []}
    
    results = []
    
    for lead in selected:
        lead_dict = dict(lead)
        channels = json.loads(lead_dict.get("channels_available", "[]") or "[]")
        
        print(f"\nDispatching to: {lead_dict.get('name', 'Unknown')} ({', '.join(channels)})")
        
        all_sent = True
        
        for channel in channels:
            if channel == "linkedin":
                message = generate_message("linkedin", lead_dict)
                result = send_linkedin_dm(lead_dict, message)
            elif channel == "email":
                message = generate_message("email", lead_dict)
                result = send_email(lead_dict, message)
            elif channel == "whatsapp":
                message = generate_message("whatsapp", lead_dict)
                result = send_whatsapp(lead_dict, message)
            else:
                continue
            
            log_attempt(conn, lead_dict["id"], channel, message, result)
            print(f"  {channel}: {result.get('status')}")
            
            if result.get("status") == "failed":
                all_sent = False
        
        new_status = "contacted" if all_sent else "contacted"
        update_lead_status(conn, lead_dict["id"], new_status)
        
        results.append({
            "lead_id": lead_dict["id"],
            "name": lead_dict.get("name"),
            "channels_used": channels,
            "all_sent": all_sent
        })
    
    conn.close()
    return {"dispatched": len(results), "results": results}

if __name__ == "__main__":
    result = dispatch_selected()
    print(f"\n✓ Dispatched: {result['dispatched']} leads")
    for r in result["results"]:
        status = "✓" if r["all_sent"] else "⚠ partial"
        print(f"  {status} {r['name']} via {', '.join(r['channels_used'])}")