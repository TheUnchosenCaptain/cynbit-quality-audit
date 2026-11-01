import json
import glob
import os

AXE_DIR = "cynbit-audit/axe"
LOGS_DIR = "cynbit-audit/logs"

wcag_mapping = {
    "color-contrast": {"sc": "1.4.3", "name": "Contrast (Minimum)", "level": "AA"},
    "target-size": {"sc": "2.5.8", "name": "Target Size (Minimum)", "level": "AA"},
    "button-name": {"sc": "4.1.2", "name": "Name, Role, Value", "level": "A"},
    "select-name": {"sc": "4.1.2", "name": "Name, Role, Value", "level": "A"},
    "list": {"sc": "1.3.1", "name": "Info and Relationships", "level": "A"},
    "listitem": {"sc": "1.3.1", "name": "Info and Relationships", "level": "A"},
    "image-alt": {"sc": "1.1.1", "name": "Non-text Content", "level": "A"},
    "link-name": {"sc": "4.1.2", "name": "Name, Role, Value", "level": "A"},
    "landmark-one-main": {"sc": "1.3.1", "name": "Info and Relationships", "level": "A"},
    "region": {"sc": "1.3.1", "name": "Info and Relationships", "level": "A"}
}

files = glob.glob(os.path.join(AXE_DIR, "*.json"))
page_summaries = []
catalog = {}

for f in files:
    with open(f, "r", encoding="utf-8") as jf:
        data = json.load(jf)
    page_name = os.path.basename(f).replace("axe_", "").replace(".json", "")
    violations = data.get("violations", [])
    passes = data.get("passes", [])
    incomplete = data.get("incomplete", [])

    page_summary = {
        "page": page_name,
        "url": data.get("url", ""),
        "total_violations": len(violations),
        "total_passes": len(passes),
        "total_incomplete": len(incomplete),
        "violations": []
    }

    for v in violations:
        vid = v.get("id")
        impact = v.get("impact")
        desc = v.get("description")
        help_text = v.get("help")
        help_url = v.get("helpUrl")
        nodes = v.get("nodes", [])

        wcag_info = wcag_mapping.get(vid, {"sc": "Unknown", "name": vid, "level": "A/AA"})

        page_summary["violations"].append({
            "id": vid,
            "impact": impact,
            "wcag_sc": wcag_info["sc"],
            "wcag_name": wcag_info["name"],
            "wcag_level": wcag_info["level"],
            "description": desc,
            "nodes_count": len(nodes),
            "sample_target": nodes[0].get("target", []) if nodes else []
        })

        if vid not in catalog:
            catalog[vid] = {
                "id": vid,
                "impact": impact,
                "wcag_sc": wcag_info["sc"],
                "wcag_name": wcag_info["name"],
                "wcag_level": wcag_info["level"],
                "help": help_text,
                "help_url": help_url,
                "total_occurrences": 0,
                "affected_pages": []
            }
        catalog[vid]["total_occurrences"] += len(nodes)
        catalog[vid]["affected_pages"].append({
            "page": page_name,
            "count": len(nodes),
            "sample_html": [n.get("html", "")[:120] for n in nodes[:2]],
            "failure_summary": nodes[0].get("failureSummary", "") if nodes else ""
        })

    page_summaries.append(page_summary)

out_data = {
    "summary": page_summaries,
    "violation_catalog": list(catalog.values())
}

with open(os.path.join(LOGS_DIR, "axe_summary_report.json"), "w", encoding="utf-8") as f:
    json.dump(out_data, f, indent=2)

print(f"Accessibility report compiled from {len(files)} files. Total distinct violation types: {len(catalog)}.")
