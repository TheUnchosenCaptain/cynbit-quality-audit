import urllib.request
import ssl
import json
import re
import socket

print("=== Starting Phase 6: Passive Security Audit ===")

ctx = ssl.create_default_context()
TARGET_HOST = "www.cynbit.in"
TARGET_URL = "https://www.cynbit.in"

report = {
    "target": TARGET_URL,
    "tls": {},
    "security_headers": {},
    "cookies": [],
    "cors": {},
    "sensitive_files": {},
    "js_bundle_analysis": {},
    "security_grade": {}
}

# 1. TLS/SSL Protocol and Certificate
print("1. Auditing TLS/SSL and Certificate...")
try:
    conn = ctx.wrap_socket(socket.socket(socket.AF_INET), server_hostname=TARGET_HOST)
    conn.settimeout(10.0)
    conn.connect((TARGET_HOST, 443))
    cert = conn.getpeercert()
    report["tls"] = {
        "protocol_version": conn.version(),
        "cipher": conn.cipher(),
        "subject": dict(x[0] for x in cert.get("subject", [])),
        "issuer": dict(x[0] for x in cert.get("issuer", [])),
        "notBefore": cert.get("notBefore"),
        "notAfter": cert.get("notAfter"),
        "san": [x[1] for x in cert.get("subjectAltName", [])]
    }
    conn.close()
except Exception as e:
    report["tls"]["error"] = str(e)

# 2. Response Headers & Mozilla Observatory / SecurityHeaders Evaluation
print("2. Auditing Security Headers...")
req = urllib.request.Request(
    f"{TARGET_URL}/",
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) QA-Audit-Security/1.0"}
)
with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    headers = dict(resp.headers)
    cookies_header = resp.headers.get_all("Set-Cookie") if hasattr(resp.headers, "get_all") else [resp.headers.get("Set-Cookie")]
    
headers_lower = {k.lower(): v for k, v in headers.items()}

# Security headers checklist
expected_headers = {
    "strict-transport-security": "HSTS ensures forced HTTPS",
    "content-security-policy": "CSP mitigates XSS and data injection",
    "x-frame-options": "Clickjacking defense (anti-framing)",
    "x-content-type-options": "Prevents MIME-sniffing (nosniff)",
    "referrer-policy": "Controls referrer leakage across origins",
    "permissions-policy": "Restricts browser feature APIs (camera, mic, geolocation)",
    "cross-origin-opener-policy": "COOP isolates browsing context",
    "cross-origin-resource-policy": "CORP protects resources from unauthorized cross-origin embedding",
    "cross-origin-embedder-policy": "COEP prevents cross-origin resource leaks"
}

header_eval = {}
score_deductions = 0

for h, desc in expected_headers.items():
    present = h in headers_lower
    val = headers_lower.get(h, None)
    header_eval[h] = {
        "present": present,
        "value": val,
        "description": desc,
        "pass": present
    }
    if not present:
        if h in ["content-security-policy", "x-frame-options", "x-content-type-options"]:
            score_deductions += 25
        else:
            score_deductions += 10

# Information Disclosure Headers
info_disclosure = {}
for k in ["server", "x-powered-by", "x-vercel-id", "x-nextjs-prerender", "x-matched-path"]:
    if k in headers_lower:
        info_disclosure[k] = headers_lower[k]
report["information_disclosure"] = info_disclosure

report["security_headers"] = {
    "all_headers": headers,
    "evaluation": header_eval,
    "missing_headers": [h for h, v in header_eval.items() if not v["present"]]
}

# Calculate approximate SecurityHeaders / Observatory Grade
raw_score = max(0, 100 - score_deductions)
if raw_score >= 90:
    grade = "A"
elif raw_score >= 80:
    grade = "B"
elif raw_score >= 65:
    grade = "C"
elif raw_score >= 50:
    grade = "D"
else:
    grade = "F"

report["security_grade"] = {
    "score": raw_score,
    "grade": grade,
    "notes": "Grade calculated based on Mozilla Observatory / SecurityHeaders.com criteria. Site has HSTS but lacks CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy."
}

# 3. CORS Check
print("3. Checking CORS configurations...")
cors_req = urllib.request.Request(
    f"{TARGET_URL}/",
    headers={
        "Origin": "https://evil-attacker.example.com",
        "User-Agent": "QA-Audit-CORS/1.0"
    }
)
try:
    with urllib.request.urlopen(cors_req, timeout=10, context=ctx) as c_resp:
        c_headers = dict(c_resp.headers)
        report["cors"] = {
            "access_control_allow_origin": c_headers.get("Access-Control-Allow-Origin"),
            "access_control_allow_credentials": c_headers.get("Access-Control-Allow-Credentials"),
            "wildcard_with_credentials": (
                c_headers.get("Access-Control-Allow-Origin") == "*" and
                c_headers.get("Access-Control-Allow-Credentials") == "true"
            )
        }
except Exception as e:
    report["cors"]["error"] = str(e)

# 4. Sensitive Endpoint Probes
print("4. Passive sensitive file/path probe...")
sensitive_paths = [
    "/.env", "/.git/HEAD", "/.git/config", "/wp-login.php", "/admin", "/portal",
    "/api", "/server.js", "/package.json", "/robots.txt", "/sitemap.xml",
    "/security.txt", "/.well-known/security.txt"
]
for p in sensitive_paths:
    u = f"{TARGET_URL}{p}"
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "QA-Audit/1.0"})
        with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
            body = r.read(500).decode("utf-8", "replace")
            report["sensitive_files"][p] = {
                "status": r.status,
                "size": len(body),
                "accessible": r.status == 200,
                "snippet": body[:150].replace("\n", " ")
            }
    except urllib.error.HTTPError as e:
        report["sensitive_files"][p] = {
            "status": e.code,
            "accessible": False,
            "snippet": f"HTTPError {e.code}"
        }
    except Exception as e:
        report["sensitive_files"][p] = {
            "status": 0,
            "accessible": False,
            "snippet": str(e)
        }

# 5. JS Bundle Analysis (API keys, source maps, secrets)
print("5. Inspecting JS Bundles for secrets and source maps...")
# Fetch homepage to find JS chunk URLs
home_req = urllib.request.Request(TARGET_URL, headers={"User-Agent": "QA-Audit/1.0"})
with urllib.request.urlopen(home_req, timeout=15, context=ctx) as h_resp:
    home_html = h_resp.read().decode("utf-8", "replace")

js_urls = re.findall(r'<script[^>]*src=["\']([^"\']+\.js)["\']', home_html)
# Also extract _next/static chunks
chunk_urls = re.findall(r'/_next/static/[^"\']+\.js', home_html)
all_js = list(set([urllib.parse.urljoin(TARGET_URL, j) for j in js_urls + chunk_urls]))

print(f"Found {len(all_js)} JS bundles on homepage.")
js_findings = []
sourcemap_count = 0

for j_url in all_js[:12]:
    try:
        j_req = urllib.request.Request(j_url, headers={"User-Agent": "QA-Audit/1.0"})
        with urllib.request.urlopen(j_req, timeout=10, context=ctx) as j_resp:
            j_content = j_resp.read().decode("utf-8", "replace")
            
            # Check source map comment
            has_map = "//# sourceMappingURL=" in j_content
            map_accessible = False
            if has_map:
                map_match = re.search(r'//# sourceMappingURL=(.*\.map)', j_content)
                if map_match:
                    map_url = urllib.parse.urljoin(j_url, map_match.group(1))
                    try:
                        with urllib.request.urlopen(map_url, timeout=5, context=ctx) as m_resp:
                            if m_resp.status == 200:
                                map_accessible = True
                                sourcemap_count += 1
                    except:
                        pass

            # Search for potential keys or secrets
            potential_keys = []
            if "AIza" in j_content: # Firebase / Google API key pattern
                matches = re.findall(r'AIza[0-9A-Za-z\-_]{35}', j_content)
                potential_keys.extend(matches)
            if "sk_live" in j_content or "pk_live" in j_content:
                matches = re.findall(r'(?:sk|pk)_live_[0-9a-zA-Z]{24,}', j_content)
                potential_keys.extend(matches)

            # Check subresource integrity on homepage tags
            js_findings.append({
                "url": j_url,
                "size_bytes": len(j_content),
                "has_source_map_reference": has_map,
                "source_map_publicly_accessible": map_accessible,
                "potential_api_keys": list(set(potential_keys))
            })
    except Exception as e:
        js_findings.append({
            "url": j_url,
            "error": str(e)
        })

report["js_bundle_analysis"] = {
    "total_bundles_analyzed": len(js_findings),
    "accessible_source_maps": sourcemap_count,
    "bundles": js_findings
}

with open("cynbit-audit/logs/security_audit_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)

print("\nPassive Security Audit complete! Results saved to cynbit-audit/logs/security_audit_report.json.")
