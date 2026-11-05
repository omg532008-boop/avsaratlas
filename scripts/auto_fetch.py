import os
import json
import re
import datetime
import urllib.request
import xml.etree.ElementTree as ET

# Authentic Public Employment / Alert RSS Feeds
FEEDS = [
    {
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1",
        "category": "govt",
        "default_state": "All India",
        "org": "Govt of India (PIB Updates)"
    },
    {
        "url": "https://www.freejobalert.com/feed",
        "category": "mixed",
        "default_state": "All India",
        "org": "National Career Alert"
    }
]

JOBS_PATH = "data/jobs.json"
UPDATES_PATH = "data/updates.json"

def clean_text(raw_html):
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    text = re.sub(cleanr, '', raw_html)
    return ' '.join(text.split()).strip()

def load_json_safe(path):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def detect_type(title):
    lower = title.lower()
    if any(k in lower for k in ["result", "merit list", "cutoff", "cut-off", "marks"]):
        return "result"
    elif any(k in lower for k in ["admit card", "hall ticket", "call letter", "exam date"]):
        return "admit_card"
    elif any(k in lower for k in ["answer key", "response sheet", "objection"]):
        return "answer_key"
    return "job"

def run():
    existing_jobs = load_json_safe(JOBS_PATH)
    existing_updates = load_json_safe(UPDATES_PATH)

    seen_job_links = {j.get("link") for j in existing_jobs if "link" in j}
    seen_update_links = {u.get("link") for u in existing_updates if "link" in u}

    new_jobs = []
    new_updates = []
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    req_headers = {'User-Agent': 'Mozilla/5.0 (compatible; AvsarAtlasBot/1.0)'}

    for src in FEEDS:
        try:
            req = urllib.request.Request(src["url"], headers=req_headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                tree = ET.fromstring(resp.read())

            for item in tree.findall('.//item'):
                title = clean_text(item.findtext('title', ''))
                link = clean_text(item.findtext('link', ''))
                desc = clean_text(item.findtext('description', ''))

                if not title or not link:
                    continue

                item_type = detect_type(title)

                if item_type == "job":
                    if link in seen_job_links:
                        continue
                    seen_job_links.add(link)

                    new_jobs.append({
                        "id": f"job-{abs(hash(link)) % 10000000}",
                        "title_en": title,
                        "title_hi": title,
                        "org": src["org"],
                        "sector": "govt" if "govt" in title.lower() or src["category"] == "govt" else "regular",
                        "state": src["default_state"],
                        "qualification": "Refer Official Notification",
                        "last_verified_date": today_str,
                        "link": link,
                        "summary_en": desc[:250] + "..." if len(desc) > 250 else desc,
                        "summary_hi": desc[:250] + "..." if len(desc) > 250 else desc,
                        "is_auto": True
                    })
                else:
                    if link in seen_update_links:
                        continue
                    seen_update_links.add(link)

                    new_updates.append({
                        "id": f"upd-{abs(hash(link)) % 10000000}",
                        "title_en": title,
                        "title_hi": title,
                        "org": src["org"],
                        "type": item_type,
                        "date_published": today_str,
                        "link": link,
                        "summary_en": desc[:250] + "..." if len(desc) > 250 else desc,
                        "summary_hi": desc[:250] + "..." if len(desc) > 250 else desc,
                        "is_auto": True
                    })
        except Exception as e:
            print(f"Error fetching {src['url']}: {e}")

    final_jobs = (new_jobs + existing_jobs)[:100]
    final_updates = (new_updates + existing_updates)[:100]

    save_json(JOBS_PATH, final_jobs)
    save_json(UPDATES_PATH, final_updates)
    print(f"Sync finished: Added {len(new_jobs)} jobs, {len(new_updates)} updates.")

if __name__ == "__main__":
    run()
