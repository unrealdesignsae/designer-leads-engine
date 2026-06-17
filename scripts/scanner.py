#!/usr/bin/env python3
"""
Lead scanner — reads Firecrawl, scores with Claude, writes to Supabase.
Usage: python scanner.py [profile_slug_or_id] [--count N] [--quality N] [--days N]
"""
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env.local")


def _load_env(path):
    """Load KEY=VALUE pairs from .env.local. Uses python-dotenv if present,
    else a minimal parser so the scanner runs with zero pip installs (Hermes-safe)."""
    try:
        from dotenv import load_dotenv

        load_dotenv(path)
        return
    except ImportError:
        pass
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


_load_env(_ENV_PATH)

FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v1/search"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

DEFAULT_QUERIES = [
    "site:linkedin.com/posts hiring \"3d designer\" OR \"3d artist\" dubai OR abu dhabi freelance 2026",
    "site:linkedin.com/posts \"looking for\" \"3d designer\" OR \"creative director\" dubai events OR exhibition 2026",
    "site:linkedin.com/posts recruiter \"3d designer\" OR \"art director\" dubai freelance OR events 2026",
    "site:linkedin.com/posts \"need a\" designer OR artist 3D OR CG dubai OR uae freelance OR contract",
    "site:linkedin.com/in recruiter OR hiring \"creative director\" OR \"art director\" dubai events 3D",
    "site:linkedin.com/jobs \"3d designer\" OR \"3d artist\" OR \"CG artist\" dubai posted last 30 days",
    "site:linkedin.com/jobs \"creative director\" OR \"art director\" OR \"lead designer\" dubai events 3D",
    "dubai creative director OR art director hiring freelance 3D OR CG events exhibition 2026 -jobs -indeed -glassdoor",
    "uae \"senior 3d designer\" OR \"lead 3d artist\" freelance OR contract events OR exhibition OR experiential",
    "\"3d designer\" OR \"3d artist\" dubai \"freelance\" OR \"contract\" events OR exhibition OR experiential 2026",
]

FIT_SCORE_PROMPT = """\
You are scoring lead quality for a freelance 3D designer / creative production studio based in Dubai.

Profile context: {profile_description}

Lead:
  Name: {name}
  Title: {title}
  Company: {company}
  Notes: {notes}

Score the fit 1-5:
  5 = Perfect — actively hiring / looking for exactly this service, clear decision-maker
  4 = Strong — relevant role, likely needs this kind of work
  3 = Possible — adjacent, unclear if they hire externally
  2 = Weak — tangentially relevant
  1 = Not relevant

Respond with ONLY valid JSON: {{"rating": <int 1-5>, "fit_reason": "<one sentence>"}}"""


@dataclass
class ScanConfig:
    target_count: int = 20
    results_per_query: int = 10
    min_quality: int = 1
    recency_days: int = 30
    location: str = "UAE"
    must_include: list = field(default_factory=list)
    must_exclude: list = field(default_factory=list)
    score_with_llm: bool = True


def _supabase_request(method, path, payload=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE env vars not set")
    url = SUPABASE_URL.rstrip("/") + "/rest/v1/" + path.lstrip("/")
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(
        url,
        data=body,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method=method,
    )
    with urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else []


def supabase_select(table, params=""):
    return _supabase_request("GET", "%s?%s" % (table, params))


def supabase_upsert(table, payload, on_conflict="content_hash"):
    path = "%s?on_conflict=%s" % (table, on_conflict)
    req = Request(
        SUPABASE_URL.rstrip("/") + "/rest/v1/" + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=representation",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else []


def supabase_insert(table, payload):
    req = Request(
        SUPABASE_URL.rstrip("/") + "/rest/v1/" + table,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else []


def search_web(query, limit=10):
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        print("[scanner] WARNING: FIRECRAWL_API_KEY not set — skipping")
        return []
    payload = json.dumps({"query": query, "limit": limit}).encode("utf-8")
    req = Request(
        FIRECRAWL_SEARCH_URL,
        data=payload,
        headers={"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        print("[scanner] HTTP %s" % e.code)
        return []
    except (URLError, Exception) as e:
        print("[scanner] error: %s" % e)
        return []

    results = data.get("data") or data.get("results") or []
    leads = []
    for item in results:
        url = item.get("url") or ""
        title = item.get("title") or ""
        description = item.get("description") or item.get("snippet") or item.get("markdown") or ""
        full_text = title + " " + description

        # Skip non-hiring posts: must contain hiring-intent language
        if not _is_hiring_post(full_text):
            continue

        # Extract name from LinkedIn post title: "John Doe's Post" → "John Doe"
        name = _extract_name_from_title(title, url)
        # Extract company from description or URL
        company = _extract_company(full_text, url)
        # Extract role from description
        role_seeking = _extract_role(full_text)
        # Extract LinkedIn handle
        linkedin_handle = None
        if "linkedin.com/in/" in url:
            linkedin_handle = url.split("linkedin.com/in/")[-1].split("/")[0].split("?")[0]
        elif "linkedin.com/posts/" in url:
            # For posts, extract the author's handle from URL: linkedin.com/posts/handle_slug/path
            parts = url.split("linkedin.com/posts/")
            if len(parts) > 1:
                linkedin_handle = parts[1].split("/")[0].split("-")[0] if "-" in parts[1] else None

        email, phone = _extract_contact(full_text)
        channels = _channels(email, phone, linkedin_handle)
        pub_date = (item.get("date") or item.get("publishedDate") or datetime.now().strftime("%Y-%m-%d"))[:10]
        leads.append({
            "name": name,
            "title": title,
            "company": company,
            "role_seeking": role_seeking or title,
            "location": "UAE",
            "post_url": url,
            "post_date": pub_date,
            "salary": None,
            "source": "Firecrawl/Web",
            "contact_email": email,
            "contact_phone": phone,
            "contact_linkedin": linkedin_handle,
            "channels_available": channels,
            "notes": description[:500],
            "content_hash": _hash(name, url, title),
        })
    return leads


def _is_hiring_post(text):
    """Return True if the text contains hiring-intent language."""
    text_lower = text.lower()
    hiring_signals = [
        "hiring", "looking for", "seeking", "we need", "join our team",
        "send your cv", "apply now", "job opening", "we're hiring",
        "immediate hiring", "urgent requirement", "vacancy", "position open",
        "dm me", "reach out", "drop your portfolio", "send portfolio",
    ]
    score = sum(1 for signal in hiring_signals if signal in text_lower)
    return score >= 1


def _extract_name_from_title(title, url):
    """Extract person name from LinkedIn post titles like 'John Doe's Post - LinkedIn'."""
    # Try: "Name's Post - LinkedIn" pattern
    m = re.search(r"^(.+?)'s Post", title)
    if m:
        name = m.group(1).strip()
        if name and len(name) < 80 and not name.startswith("http"):
            return name
    # Try: linkedin.com/in/handle from URL
    if "linkedin.com/in/" in url:
        handle = url.split("linkedin.com/in/")[-1].split("/")[0].split("?")[0]
        # Convert handle to name: john-doe-123 → John Doe
        name_part = handle.split("-")[0]
        if len(handle.split("-")) > 1 and not handle.split("-")[1].isdigit():
            name_part = " ".join(handle.split("-")[:2])
        name_part = name_part.replace("-", " ").title()
        if name_part:
            return name_part
    # Fallback: first 60 chars of title
    return title[:60].strip() if title else ""


def _extract_company(text, url):
    """Try to extract company name from description text or URL."""
    # Common patterns in hiring posts
    patterns = [
        r"at\s+([\w\s&.'-]{2,50}?)(?:\.|,|\s+in\s+Dubai|\s+is\s+(?:looking|hiring)|\s+we\s+are|\n|\r)",
        r"([\w\s&.'-]{3,50}?)\s+is\s+(?:looking|hiring|seeking)",
        r"(?:join|at)\s+([\w\s&.'-]{3,50}?)(?:\.|\s+in\s+|$)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            company = m.group(1).strip()
            if len(company) >= 2 and not company.lower() in ("a", "an", "the", "and"):
                return company
    # Look for company name in LinkedIn URL
    if "linkedin.com/company/" in url:
        parts = url.split("linkedin.com/company/")
        if len(parts) > 1:
            return parts[1].split("/")[0].replace("-", " ").title()
    return ""


def _extract_role(text):
    """Extract the role being hired from description."""
    patterns = [
        r"(?:hiring|looking for|seeking|need(?:s)?)\s+(?:a|an|for\s+(?:a|an))?\s*(.+?)(?:\.|,|\n|\r|in\s+Dubai|in\s+Abu\s+Dhabi|in\s+UAE|apply|send|$)",
        r"(?:position|role|job)\s+(?:of|for|:)\s+(.+?)(?:\.|,|\n|\r|$)",
        r"(?:recruit(?:ing|ment)\s+(?:for|a|an))\s+(.+?)(?:\.|,|\n|\r|$)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            role = m.group(1).strip()
            if 3 < len(role) < 100 and not role.lower().startswith("http"):
                return role
    return ""


def score_lead_llm(lead, profile_description):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return 3, "LLM scoring skipped (no API key)"

    prompt = FIT_SCORE_PROMPT.format(
        profile_description=profile_description or "Freelance 3D design studio in Dubai",
        name=lead.get("name", ""),
        title=lead.get("title", ""),
        company=lead.get("company", ""),
        notes=(lead.get("notes") or "")[:400],
    )
    payload = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 100,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = Request(
        ANTHROPIC_API_URL,
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["content"][0]["text"].strip()
        parsed = json.loads(text)
        rating = max(1, min(5, int(parsed.get("rating", 3))))
        reason = str(parsed.get("fit_reason", ""))
        return rating, reason
    except Exception as e:
        print("[scanner] LLM scoring error: %s" % e)
        return 3, "Scoring error"


def resolve_profile(profile_hint):
    try:
        if profile_hint:
            rows = supabase_select(
                "profiles",
                "select=id,slug,description,scan_queries&or=(slug.eq.%s,id.eq.%s)&limit=1" % (profile_hint, profile_hint),
            )
        else:
            rows = supabase_select("profiles", "select=id,slug,description,scan_queries&order=created_at.asc&limit=1")

        if rows:
            r = rows[0]
            queries = r.get("scan_queries") or []
            if isinstance(queries, str):
                queries = json.loads(queries)
            return {"id": r["id"], "slug": r.get("slug"), "description": r.get("description", ""), "scan_queries": queries}
    except Exception as e:
        print("[scanner] resolve_profile error: %s" % e)

    return {"id": None, "slug": None, "description": "", "scan_queries": DEFAULT_QUERIES}


def _passes_filters(lead, config, cutoff_date):
    post_date = lead.get("post_date", "")
    if post_date and post_date < cutoff_date:
        return False

    text = ((lead.get("title") or "") + " " + (lead.get("notes") or "") + " " + (lead.get("company") or "")).lower()

    for kw in config.must_include:
        if kw.lower() not in text:
            return False
    for kw in config.must_exclude:
        if kw.lower() in text:
            return False

    return True


def lead_exists(content_hash):
    try:
        rows = supabase_select("leads", "select=id&content_hash=eq.%s&limit=1" % content_hash)
        return len(rows) > 0
    except Exception:
        return False


def insert_lead(lead_data, profile_id, rating=3, fit_reason=""):
    notes = lead_data.get("notes", "") or ""
    if fit_reason:
        notes = "[Fit: %s] %s" % (fit_reason, notes)

    record = {
        "profile_id": profile_id,
        "name": lead_data.get("name"),
        "title": lead_data.get("title"),
        "company": lead_data.get("company"),
        "role_seeking": lead_data.get("role_seeking"),
        "location": lead_data.get("location"),
        "post_url": lead_data.get("post_url"),
        "post_date": lead_data.get("post_date"),
        "salary": lead_data.get("salary"),
        "source": lead_data.get("source"),
        "contact_email": lead_data.get("contact_email"),
        "contact_phone": lead_data.get("contact_phone"),
        "contact_linkedin": lead_data.get("contact_linkedin"),
        "channels_available": lead_data.get("channels_available", ["linkedin"]),
        "status": "new",
        "rating": rating,
        "notes": notes[:1000],
        "content_hash": lead_data.get("content_hash"),
    }
    try:
        result = supabase_upsert("leads", [record], on_conflict="content_hash")
        return len(result) > 0
    except Exception as e:
        print("[scanner] insert_lead error: %s" % e)
        return False


def record_scan(scan_date, profile_id, leads_found, new_count, config):
    record = {
        "profile_id": profile_id,
        "scan_date": scan_date,
        "leads_found": leads_found,
        "new_leads": new_count,
        "dms_sent": 0,
        "replies_received": 0,
        "status": "completed",
        "vault_report_path": None,
        "scan_config": {
            "target_count": config.target_count,
            "min_quality": config.min_quality,
            "recency_days": config.recency_days,
            "location": config.location,
            "must_include": config.must_include,
            "must_exclude": config.must_exclude,
        },
    }
    try:
        # Upsert on (profile_id, scan_date): re-running a scan the same day
        # updates the existing row's counts instead of colliding on the unique index.
        req = Request(
            SUPABASE_URL.rstrip("/") + "/rest/v1/daily_scans?on_conflict=profile_id,scan_date",
            data=json.dumps([record]).encode("utf-8"),
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
            method="POST",
        )
        with urlopen(req, timeout=30) as resp:
            resp.read()
    except Exception as e:
        print("[scanner] record_scan error: %s" % e)


def run_scan(profile_hint=None, config: ScanConfig = None):
    if config is None:
        config = ScanConfig()

    scan_date = datetime.now().strftime("%Y-%m-%d")
    cutoff_date = (datetime.now() - timedelta(days=config.recency_days)).strftime("%Y-%m-%d")

    print("[scanner] Starting scan — target=%d, min_quality=%d, recency=%dd" % (
        config.target_count, config.min_quality, config.recency_days))

    profile = resolve_profile(profile_hint)
    print("[scanner] Profile: %s (%s)" % (profile.get("slug"), profile.get("id")))

    queries = profile["scan_queries"] or DEFAULT_QUERIES
    all_leads = []
    seen_hashes = set()
    new_count = 0

    for query in queries:
        if new_count >= config.target_count:
            print("[scanner] Target reached (%d), stopping early" % new_count)
            break

        print("[scanner] Query: %s" % query[:80])
        results = search_web(query, limit=config.results_per_query)

        for lead in results:
            content_hash = lead.get("content_hash")
            if not content_hash or content_hash in seen_hashes:
                continue
            seen_hashes.add(content_hash)

            if not _passes_filters(lead, config, cutoff_date):
                continue

            if lead_exists(content_hash):
                continue

            rating = 3
            fit_reason = ""
            if config.score_with_llm:
                rating, fit_reason = score_lead_llm(lead, profile.get("description", ""))
                print("[scanner] %s — rating %d: %s" % (lead.get("name") or "?", rating, fit_reason[:60]))

            if rating < config.min_quality:
                print("[scanner] Skipping (rating %d < min %d)" % (rating, config.min_quality))
                continue

            if insert_lead(lead, profile["id"], rating, fit_reason):
                new_count += 1
                all_leads.append(lead)

        if new_count >= config.target_count:
            break

    record_scan(scan_date, profile["id"], len(all_leads), new_count, config)

    print("[scanner] Done — %d new leads inserted" % new_count)
    return {
        "scan_date": scan_date,
        "profile_id": profile["id"],
        "profile_slug": profile.get("slug"),
        "leads_found": len(all_leads),
        "new_leads": new_count,
    }


def _hash(name, url, role):
    raw = "%s|%s|%s" % (name or "", url or "", role or "")
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _extract_contact(text):
    email = phone = None
    m = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    if m:
        email = m.group(0)
    m = re.search(r"\+?[\d\s\-\(\)]{7,15}", text)
    if m:
        phone = m.group(0).strip()
    return email, phone


def _channels(email, phone, linkedin):
    c = []
    if linkedin:
        c.append("linkedin")
    if email:
        c.append("email")
    if phone:
        c.append("whatsapp")
    return c or ["linkedin"]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run lead scanner")
    parser.add_argument("profile", nargs="?", help="Profile slug or ID")
    parser.add_argument("--count", type=int, default=20, help="Target new leads (default 20)")
    parser.add_argument("--quality", type=int, default=1, help="Min quality rating 1-5 (default 1 = keep all)")
    parser.add_argument("--days", type=int, default=365, help="Only leads posted within N days (default 365)")
    parser.add_argument("--location", default="UAE", help="Location filter (default UAE)")
    parser.add_argument("--include", nargs="*", default=[], help="Keywords that must appear")
    parser.add_argument("--exclude", nargs="*", default=[], help="Keywords to reject")
    parser.add_argument("--no-score", action="store_true", help="Skip LLM scoring (faster, all rating=3)")
    args = parser.parse_args()

    cfg = ScanConfig(
        target_count=args.count,
        min_quality=args.quality,
        recency_days=args.days,
        location=args.location,
        must_include=args.include or [],
        must_exclude=args.exclude or [],
        score_with_llm=not args.no_score,
    )

    result = run_scan(args.profile, cfg)
    print(json.dumps(result, indent=2))
