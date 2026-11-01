import json
import re
import urllib.request
import urllib.parse
import ssl

print("=== Starting Phase 7: SEO and Content Quality Audit ===")

ctx = ssl.create_default_context()
with open("cynbit-audit/logs/page_inventory.json", "r", encoding="utf-8") as f:
    inventory = json.load(f)

seo_report = {
    "total_pages_audited": len(inventory),
    "title_issues": [],
    "meta_description_issues": [],
    "canonical_issues": [],
    "og_issues": [],
    "structured_data_issues": [],
    "content_quality_findings": [],
    "image_alt_summary": {
        "total_images_scanned": 0,
        "images_missing_alt": 0,
        "sample_missing_alt": []
    }
}

canonical_domain_mismatches = 0
missing_titles = 0
missing_descriptions = 0
missing_og_images = 0

sample_pages_for_deep_scan = inventory[:15] # Top 15 key pages

for item in inventory:
    url = item["url"]
    title = item.get("title", "")
    desc = item.get("description", "")
    canonical = item.get("canonical", "")
    og_title = item.get("og_title", "")
    og_desc = item.get("og_desc", "")

    # Check Title
    if not title:
        missing_titles += 1
        seo_report["title_issues"].append({"url": url, "issue": "Missing <title> tag"})
    elif len(title) < 20:
        seo_report["title_issues"].append({"url": url, "issue": f"Title too short ({len(title)} chars): '{title}'"})
    elif len(title) > 70:
        seo_report["title_issues"].append({"url": url, "issue": f"Title exceeds 70 chars ({len(title)} chars): '{title}'"})

    # Check Meta Description
    if not desc:
        missing_descriptions += 1
        seo_report["meta_description_issues"].append({"url": url, "issue": "Missing meta description"})
    elif len(desc) < 70:
        seo_report["meta_description_issues"].append({"url": url, "issue": f"Meta description too short ({len(desc)} chars)"})
    elif len(desc) > 165:
        seo_report["meta_description_issues"].append({"url": url, "issue": f"Meta description too long ({len(desc)} chars)"})

    # Check Canonical
    if not canonical:
        seo_report["canonical_issues"].append({"url": url, "issue": "Missing rel=canonical"})
    else:
        # Check if canonical uses non-www while request uses www
        if "https://cynbit.in" in canonical and "www.cynbit.in" in url:
            canonical_domain_mismatches += 1
            if len(seo_report["canonical_issues"]) < 10:
                seo_report["canonical_issues"].append({
                    "url": url,
                    "canonical": canonical,
                    "issue": "Canonical mismatch: page served on www.cynbit.in points canonical to bare cynbit.in"
                })

    # Check OG
    if not og_title or not og_desc:
        if len(seo_report["og_issues"]) < 10:
            seo_report["og_issues"].append({"url": url, "issue": "Incomplete OpenGraph tags"})

# Deep inspect sample pages for structured data, image alts, placeholder text
print("Scanning top pages for structured data and content quality...")
for item in sample_pages_for_deep_scan:
    u = item["url"]
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "QA-SEO/1.0"})
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            html = resp.read().decode("utf-8", "replace")

            # Structured Data JSON-LD
            json_lds = re.findall(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', html, re.DOTALL)
            parsed_ld = []
            for j in json_lds:
                try:
                    parsed_ld.append(json.loads(j.strip()))
                except Exception as err:
                    seo_report["structured_data_issues"].append({"url": u, "error": f"Invalid JSON-LD: {str(err)}"})

            if not json_lds:
                seo_report["structured_data_issues"].append({"url": u, "issue": "No JSON-LD structured data found"})

            # Image Alt Checks
            img_tags = re.findall(r'<img\s+([^>]+)>', html, re.IGNORECASE)
            seo_report["image_alt_summary"]["total_images_scanned"] += len(img_tags)
            for tag in img_tags:
                src_m = re.search(r'src=["\']([^"\']+)["\']', tag)
                alt_m = re.search(r'alt=["\']([^"\']*)["\']', tag)
                src = src_m.group(1) if src_m else "unknown"
                if not alt_m or not alt_m.group(1).strip():
                    seo_report["image_alt_summary"]["images_missing_alt"] += 1
                    if len(seo_report["image_alt_summary"]["sample_missing_alt"]) < 10:
                        seo_report["image_alt_summary"]["sample_missing_alt"].append({
                            "page": u,
                            "img_src": src[:80],
                            "alt_attr": alt_m.group(0) if alt_m else "missing"
                        })

            # Placeholder / Lorem Ipsum / Dev comments check
            placeholders = ["lorem ipsum", "dolor sit amet", "todo:", "fixme", "temp text", "placeholder"]
            for ph in placeholders:
                if ph in html.lower():
                    seo_report["content_quality_findings"].append({
                        "url": u,
                        "type": "Placeholder Text Found",
                        "keyword": ph
                    })

    except Exception as e:
        print(f"Error scanning {u}:", e)

seo_report["summary"] = {
    "total_pages": len(inventory),
    "missing_titles_count": missing_titles,
    "missing_descriptions_count": missing_descriptions,
    "canonical_domain_mismatches_count": canonical_domain_mismatches,
    "total_images_missing_alt": seo_report["image_alt_summary"]["images_missing_alt"]
}

with open("cynbit-audit/logs/seo_content_audit_report.json", "w", encoding="utf-8") as f:
    json.dump(seo_report, f, indent=2)

print("\nPhase 7 SEO & Content audit complete! Saved to cynbit-audit/logs/seo_content_audit_report.json.")
