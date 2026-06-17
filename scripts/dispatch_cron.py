#!/usr/bin/env python3
"""
Deterministic Designer Leads dispatcher.

Reads queued outreach rows from Supabase and sends via Unipile.
Marks sent only after Unipile returns a real provider/tracking id.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT, ".env.local")
SUPABASE_URL = "https://kgfassqqjkmaqrrezefh.supabase.co"


def load_env():
    if not os.path.exists(ENV_PATH):
        print(f"ERROR: env missing: {ENV_PATH}")
        sys.exit(1)
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


load_env()
ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
UNIPILE_DSN = os.environ.get("UNIPILE_DSN", "api23.unipile.com:15330")
UNIPILE_KEY = os.environ.get("UNIPILE_API_KEY")
GMAIL_ACCOUNT_ID = os.environ.get("UNIPILE_GMAIL_ACCOUNT_ID")
LINKEDIN_ACCOUNT_ID = os.environ.get("UNIPILE_LINKEDIN_ACCOUNT_ID")
WHATSAPP_ACCOUNT_ID = os.environ.get("UNIPILE_WHATSAPP_ACCOUNT_ID")
INSTAGRAM_ACCOUNT_ID = os.environ.get("UNIPILE_INSTAGRAM_ACCOUNT_ID")
UNIPILE_BASE = f"https://{UNIPILE_DSN}/api/v1"

if not ANON_KEY:
    print("ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY missing")
    sys.exit(1)
if not UNIPILE_KEY:
    print("ERROR: UNIPILE_API_KEY missing")
    sys.exit(1)

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")


def supabase_get(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def supabase_patch(table, item_id, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{item_id}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status


def mark_failed(outreach_id, reason):
    supabase_patch("outreach", outreach_id, {"status": "failed", "error": reason})


def mark_sent(outreach_id, lead_id, provider_id):
    supabase_patch("outreach", outreach_id, {
        "status": "sent",
        "sent_at": now,
        "error": None,
        "provider_id": provider_id,
    })
    supabase_patch("leads", lead_id, {
        "status": "sent",
        "contacted_at": now,
    })


def parse_email_body(raw_body):
    parts = raw_body.split("\n\n", 1)
    subject = parts[0].replace("Subject: ", "") if parts and parts[0].startswith("Subject:") else ""
    body = parts[1] if len(parts) > 1 else raw_body
    return subject.strip() or "3D/CG Designer - unreal.ae", body.strip()


def curl_json(args):
    proc = subprocess.run(args, capture_output=True, text=True, timeout=60)
    out = proc.stdout.strip()
    err = proc.stderr.strip()
    try:
        body = json.loads(out) if out else {}
    except Exception:
        body = {"raw": out}
    return proc.returncode, body, err


def unipile_send_email(to_name, to_email, subject, body):
    """Send via Unipile email API. Docs require multipart/form-data."""
    url = f"{UNIPILE_BASE}/emails"
    args = [
        "curl", "-sS", "--request", "POST", url,
        "--header", f"X-API-KEY: {UNIPILE_KEY}",
        "--header", "accept: application/json",
        "--form", f"account_id={GMAIL_ACCOUNT_ID}",
        "--form", f"subject={subject}",
        "--form", f"body={body}",
        "--form", f"to[0][display_name]={to_name}",
        "--form", f"to[0][identifier]={to_email}",
    ]
    code, resp, err = curl_json(args)
    if code != 0:
        raise RuntimeError(f"curl failed: {err or resp}")
    provider_id = resp.get("provider_id") or resp.get("tracking_id")
    if not provider_id:
        raise RuntimeError(f"Unipile email did not return provider_id/tracking_id: {resp}")
    return resp


def unipile_get_linkedin_provider_id(public_identifier):
    url = f"{UNIPILE_BASE}/users/{urllib.parse.quote(public_identifier)}?account_id={urllib.parse.quote(LINKEDIN_ACCOUNT_ID)}"
    req = urllib.request.Request(url, headers={
        "X-API-KEY": UNIPILE_KEY,
        "accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        return None, f"LinkedIn user resolution failed HTTP {e.code}: {body[:500]}"
    provider_id = data.get("provider_id")
    if not provider_id:
        return None, f"LinkedIn user resolution returned no provider_id: {str(data)[:500]}"
    return provider_id, None


def unipile_start_chat(account_id, attendee_id, text):
    url = f"{UNIPILE_BASE}/chats"
    args = [
        "curl", "-sS", "--request", "POST", url,
        "--header", f"X-API-KEY: {UNIPILE_KEY}",
        "--header", "accept: application/json",
        "--form", f"account_id={account_id}",
        "--form", f"text={text}",
        "--form", f"attendees_ids={attendee_id}",
    ]
    code, resp, err = curl_json(args)
    if code != 0:
        return False, f"curl failed: {err or resp}", None
    if resp.get("status") in (400, 401, 403) or resp.get("type", "").startswith("errors/"):
        return False, str(resp)[:700], None
    ref = resp.get("chat_id") or resp.get("id") or resp.get("provider_id")
    if not ref:
        return False, f"Unipile chat did not return id: {resp}", None
    return True, None, ref


def process_item(item):
    lead_id = item["lead_id"]
    outreach_id = item["id"]
    channel = item["channel"]
    lead = item.get("lead") or {}
    lead_name = lead.get("name", f"Lead {lead_id}")

    if channel == "email":
        contact = lead.get("contact_email")
        if not contact:
            return False, "No contact_email on lead record"
        subject, body = parse_email_body(item["message_body"])
        result = unipile_send_email(lead_name, contact, subject, body)
        return True, result.get("provider_id") or result.get("tracking_id")

    if channel == "linkedin":
        contact = lead.get("contact_linkedin")
        if not contact:
            return False, "No contact_linkedin on lead record"
        provider_id, err = unipile_get_linkedin_provider_id(contact)
        if err:
            return False, err
        ok, send_err, ref = unipile_start_chat(LINKEDIN_ACCOUNT_ID, provider_id, item["message_body"])
        return (True, ref) if ok else (False, send_err)

    if channel == "whatsapp":
        contact = lead.get("contact_phone")
        if not contact:
            return False, "No contact_phone on lead record"
        phone = re.sub(r"\D", "", contact)
        ok, err, ref = unipile_start_chat(WHATSAPP_ACCOUNT_ID, f"{phone}@s.whatsapp.net", item["message_body"])
        return (True, ref) if ok else (False, err)

    if channel == "instagram":
        contact = lead.get("contact_instagram")
        if not contact:
            return False, "No contact_instagram on lead record"
        ok, err, ref = unipile_start_chat(INSTAGRAM_ACCOUNT_ID, contact, item["message_body"])
        return (True, ref) if ok else (False, err)

    return False, f"Unknown channel: {channel}"


def main():
    endpoint = "outreach?status=eq.queued&select=id,lead_id,channel,message_body,lead:leads(id,name,contact_email,contact_linkedin,contact_phone)&order=prepared_at.asc"
    items = supabase_get(endpoint)
    if not items:
        return

    print("=== Designer Leads Dispatcher ===")
    print(f"Time: {now}")
    print(f"Queued items: {len(items)}")

    sent = []
    failed = []
    for item in items:
        lead = item.get("lead") or {}
        label = f"id={item['id']} lead={lead.get('name')} channel={item.get('channel')}"
        try:
            ok, detail = process_item(item)
            if ok:
                mark_sent(item["id"], item["lead_id"], detail)
                print(f"  [SENT] {label} provider={detail}")
                sent.append(label)
            else:
                mark_failed(item["id"], detail)
                print(f"  [FAILED] {label} reason={detail}")
                failed.append(f"{label}: {detail}")
        except Exception as e:
            reason = str(e)[:700]
            mark_failed(item["id"], reason)
            print(f"  [ERROR] {label} reason={reason}")
            failed.append(f"{label}: {reason}")

    print("=== SUMMARY ===")
    print(json.dumps({"queued": len(items), "sent": len(sent), "failed": len(failed), "sent_items": sent, "failed_items": failed}, indent=2))


if __name__ == "__main__":
    main()
