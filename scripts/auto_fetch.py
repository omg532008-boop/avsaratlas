import os
import json
import re
import datetime
import urllib.request
import xml.etree.ElementTree as ET

# Live Indian Feeds: Board Results, 10th/12th Jobs, Central & State Exams
FEEDS = [
    {
        "url": "https://www.freejobalert.com/feed",
        "category": "mixed",
        "default_state": "All India",
        "org": "National Career Alert"
    },
    {
        "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1",
        "category": "govt",
        "default_state": "All India",
        "org": "Govt of India (Official PIB)"
    },
    {
        "url": "https://www.jagranjosh.com/rss/josh/results_rss.xml",
        "category": "result",
        "default_state": "All India",
        "org": "Board & Competitive Results"
    },
    {
        "url": "https://www.jagranjosh.com/rss/josh/government_jobs.xml",
        "category": "govt",
        "default_state": "All India",
        "org": "Govt Employment News"
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

def detect_type(title):
    lower = title.lower()
    if any(k in lower for k in ["result", "merit list", "cutoff", "cut-off", "marks", "10th result", "12th result", "scorecard"]):
        return "result"
    elif any(k in lower for k in ["admit card", "hall ticket", "call letter", "exam date", "city slip"]):
        return "admit_card"
    elif any(k in lower for k in ["answer key", "response sheet", "objection", "key link"]):
        return "answer_key"
    return "job"

def run():
    new_jobs = []
    new_updates = []
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    seen_links = set()

    req_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

    for src in FEEDS:
        try:
            req = urllib.request.Request(src["url"], headers=req_headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                xml_data = resp.read()
                tree = ET.fromstring(xml_data)

            for item in tree.findall('.//item'):
                title = clean_text(item.findtext('title', ''))
                link = clean_text(item.findtext('link', ''))
                desc = clean_text(item.findtext('description', ''))

                if not title or not link or link in seen_links:
                    continue

                seen_links.add(link)
                item_type = detect_type(title)

                if item_type == "job":
                    # Tag qualifications automatically
                    qual = "Refer Notification"
                    if "10th" in title or "10th" in desc or "Matric" in title:
                        qual = "10th Pass"
                    elif "12th" in title or "12th" in desc or "Inter" in title:
                        qual = "12th Pass"
                    elif "Graduate" in title or "Degree" in title:
                        qual = "Graduate"

                    new_jobs.append({
                        "id": f"job-{abs(hash(link)) % 10000000}",
                        "title_en": title,
                        "title_hi": title,
                        "org": src["org"],
                        "sector": "govt",
                        "state": src["default_state"],
                        "qualification": qual,
                        "last_verified_date": today_str,
                        "link": link,
                        "summary_en": desc[:250] + "..." if len(desc) > 250 else desc,
                        "summary_hi": desc[:250] + "..." if len(desc) > 250 else desc
                    })
                else:
                    new_updates.append({
                        "id": f"upd-{abs(hash(link)) % 10000000}",
                        "title_en": title,
                        "title_hi": title,
                        "org": src["org"],
                        "type": item_type,
                        "date_published": today_str,
                        "link": link,
                        "summary_en": desc[:250] + "..." if len(desc) > 250 else desc,
                        "summary_hi": desc[:250] + "..." if len(desc) > 250 else desc
                    })
        except Exception as e:
            print(f"Skipping {src['url']} due to: {e}")

    # Keep top 120 most recent entries
    os.makedirs("data", exist_ok=True)
    with open(JOBS_PATH, "w", encoding="utf-8") as f:
        json.dump(new_jobs[:120], f, ensure_ascii=False, indent=2)

    with open(UPDATES_PATH, "w", encoding="utf-8") as f:
        json.dump(new_updates[:120], f, ensure_ascii=False, indent=2)

    print(f"Loaded {len(new_jobs)} jobs and {len(new_updates)} updates!")

if __name__ == "__main__":
    run()
