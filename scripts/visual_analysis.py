import json
import os
from PIL import Image

SCREENSHOTS_DIR = "cynbit-audit/screenshots"
LOGS_DIR = "cynbit-audit/logs"

def analyze_screenshots():
    print("=== Analyzing Captured Screenshots ===")
    matrix_file = os.path.join(LOGS_DIR, "responsive_matrix_results.json")
    if not os.path.exists(matrix_file):
        print("Matrix results file not ready yet.")
        return

    with open(matrix_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    analysis_results = []
    issues_found = []

    for r in records:
        s_file = r.get("screenshot")
        if not s_file:
            continue
        s_path = os.path.join(SCREENSHOTS_DIR, s_file)
        if not os.path.exists(s_path):
            continue

        try:
            with Image.open(s_path) as im:
                w, h = im.size
                # check if image is entirely blank / solid color
                extrema = im.convert("L").getextrema()
                is_blank = (extrema[0] == extrema[1])

                analysis_results.append({
                    "id": r["id"],
                    "page": r["page"],
                    "browser": r["browser"],
                    "viewport": r["viewport"],
                    "category": r["category"],
                    "img_width": w,
                    "img_height": h,
                    "is_blank": is_blank,
                    "hasHorizontalScroll": r.get("hasHorizontalScroll", False),
                    "scrollDelta": r.get("scrollDelta", 0),
                    "smallTargetsCount": r.get("smallTargetsCount", 0),
                    "consoleErrors": r.get("consoleErrors", [])
                })

                if r.get("hasHorizontalScroll"):
                    issues_found.append({
                        "id": r["id"],
                        "issue": f"Horizontal scroll overflow by {r.get('scrollDelta')}px",
                        "page": r["page"],
                        "browser": r["browser"],
                        "viewport": r["viewport"],
                        "screenshot": s_file
                    })

                if is_blank:
                    issues_found.append({
                        "id": r["id"],
                        "issue": "Render failure: screenshot is blank solid color",
                        "page": r["page"],
                        "browser": r["browser"],
                        "viewport": r["viewport"],
                        "screenshot": s_file
                    })

        except Exception as e:
            print(f"Error analyzing {s_file}:", e)

    out = {
        "total_analyzed": len(analysis_results),
        "issues_detected": len(issues_found),
        "issues": issues_found,
        "details": analysis_results
    }

    with open(os.path.join(LOGS_DIR, "visual_analysis_summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print(f"Visual analysis complete. Analyzed {len(analysis_results)} screenshots. Found {len(issues_found)} layout/rendering issues.")

if __name__ == "__main__":
    analyze_screenshots()
