import urllib.request
import urllib.parse
import ssl
import json
import time
import socket
import re
from xml.etree import ElementTree

SITE_URL = "https://www.cynbit.in"
ALT_SITE_URL = "https://cynbit.in"

ctx = ssl.create_default_context()

def fetch_url(url, method="GET", timeout=12, headers=None):
    if headers is None:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CynbitQA-Audit/1.0"
        }
    req = urllib.request.Request(url, headers=headers, method=method)
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            dur = time.time() - start
            data = resp.read()
            return {
                "url": url,
                "final_url": resp.geturl(),
                "status": resp.status,
                "reason": resp.reason,
                "headers": dict(resp.headers),
                "duration_ms": round(dur * 1000, 2),
                "size_bytes": len(data),
                "body": data.decode("utf-8", errors="replace"),
                "error": None
            }
    except urllib.error.HTTPError as e:
        dur = time.time() - start
        try:
            body = e.read().decode("utf-8", errors="replace")
        except:
            body = ""
        return {
            "url": url,
            "final_url": e.geturl() if hasattr(e, "geturl") else url,
            "status": e.code,
            "reason": e.reason,
            "headers": dict(e.headers) if hasattr(e, "headers") else {},
            "duration_ms": round(dur * 1000, 2),
            "size_bytes": len(body),
            "body": body,
            "error": f"HTTPError {e.code}"
        }
    except Exception as e:
        dur = time.time() - start
        return {
            "url": url,
            "final_url": url,
            "status": 0,
            "reason": str(e),
            "headers": {},
            "duration_ms": round(dur * 1000, 2),
            "size_bytes": 0,
            "body": "",
            "error": str(e)
        }

print("1. Fetching Sitemap...")
sitemap_res = fetch_url("https://www.cynbit.in/sitemap.xml")
sitemap_urls = []
if sitemap_res["status"] == 200:
    try:
        root = ElementTree.fromstring(sitemap_res["body"])
        for child in root:
            loc = child.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
            if loc is not None and loc.text:
                sitemap_urls.append(loc.text.strip())
    except Exception as e:
        print("Sitemap parse error:", e)

print(f"Found {len(sitemap_urls)} URLs in sitemap.xml")

# Page inventory
inventory = []
all_internal_links = set()
all_external_links = set()
all_images = set()

# Normalize sitemap URLs to include www.cynbit.in if sitemap has cynbit.in
normalized_sitemap_urls = [u.replace("https://cynbit.in", "https://www.cynbit.in") for u in sitemap_urls]

print("2. Crawling inventory pages...")
for i, url in enumerate(normalized_sitemap_urls):
    print(f"[{i+1}/{len(normalized_sitemap_urls)}] Crawling: {url}")
    res = fetch_url(url)
    title = ""
    desc = ""
    canonical = ""
    og_title = ""
    og_desc = ""
    
    if res["body"]:
        # extract title
        tm = re.search(r"<title[^>]*>(.*?)</title>", res["body"], re.IGNORECASE | re.DOTALL)
        if tm:
            title = tm.group(1).strip()
        # extract meta description
        dm = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', res["body"], re.IGNORECASE)
        if dm:
            desc = dm.group(1).strip()
        # extract canonical
        cm = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', res["body"], re.IGNORECASE)
        if cm:
            canonical = cm.group(1).strip()
        # og tags
        og_t = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', res["body"], re.IGNORECASE)
        if og_t:
            og_title = og_t.group(1).strip()
        og_d = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']', res["body"], re.IGNORECASE)
        if og_d:
            og_desc = og_d.group(1).strip()

        # extract hrefs
        hrefs = re.findall(r'<a\s+[^>]*href=["\'](.*?)["\']', res["body"], re.IGNORECASE)
        for h in hrefs:
            h = h.strip()
            if not h or h.startswith("#") or h.startswith("mailto:") or h.startswith("tel:") or h.startswith("javascript:"):
                continue
            full_link = urllib.parse.urljoin(url, h)
            if "cynbit.in" in full_link:
                all_internal_links.add(full_link)
            else:
                all_external_links.add(full_link)

        # extract images
        imgs = re.findall(r'<img\s+[^>]*src=["\'](.*?)["\']', res["body"], re.IGNORECASE)
        for img in imgs:
            full_img = urllib.parse.urljoin(url, img.strip())
            all_images.add(full_img)

    inventory.append({
        "url": url,
        "status": res["status"],
        "duration_ms": res["duration_ms"],
        "size_bytes": res["size_bytes"],
        "title": title,
        "description": desc,
        "canonical": canonical,
        "og_title": og_title,
        "og_desc": og_desc,
        "headers": {k: v for k, v in res["headers"].items() if k.lower() in [
            "server", "content-type", "strict-transport-security", "content-security-policy",
            "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "cache-control"
        ]}
    })

with open("cynbit-audit/logs/page_inventory.json", "w", encoding="utf-8") as f:
    json.dump(inventory, f, indent=2)

print(f"Inventory saved. Found {len(all_internal_links)} unique internal links, {len(all_external_links)} external links, {len(all_images)} images.")

# Check TLS/SSL
print("3. Checking SSL/TLS Certificate...")
hostname = "www.cynbit.in"
ssl_info = {}
try:
    conn = ctx.wrap_socket(socket.socket(socket.AF_INET), server_hostname=hostname)
    conn.settimeout(5.0)
    conn.connect((hostname, 443))
    cert = conn.getpeercert()
    ssl_info = {
        "version": conn.version(),
        "cipher": conn.cipher(),
        "subject": dict(x[0] for x in cert.get("subject", [])),
        "issuer": dict(x[0] for x in cert.get("issuer", [])),
        "notBefore": cert.get("notBefore"),
        "notAfter": cert.get("notAfter"),
        "san": [x[1] for x in cert.get("subjectAltName", [])]
    }
    conn.close()
except Exception as e:
    ssl_info = {"error": str(e)}

with open("cynbit-audit/logs/ssl_cert_info.json", "w", encoding="utf-8") as f:
    json.dump(ssl_info, f, indent=2)

# Check HTTP to HTTPS redirect
print("4. Checking HTTP redirect...")
http_check = fetch_url("http://cynbit.in")
http_www_check = fetch_url("http://www.cynbit.in")
https_bare_check = fetch_url("https://cynbit.in")

redirect_checks = {
    "http://cynbit.in": {"status": http_check["status"], "final_url": http_check["final_url"]},
    "http://www.cynbit.in": {"status": http_www_check["status"], "final_url": http_www_check["final_url"]},
    "https://cynbit.in": {"status": https_bare_check["status"], "final_url": https_bare_check["final_url"]}
}
with open("cynbit-audit/logs/redirect_checks.json", "w", encoding="utf-8") as f:
    json.dump(redirect_checks, f, indent=2)

# Check Sensitive Paths
print("5. Checking sensitive paths...")
sensitive_paths = [
    "/.env", "/.git/HEAD", "/admin", "/portal", "/api", "/api/v1",
    "/wp-login.php", "/.DS_Store", "/package.json", "/server.js",
    "/robots.txt", "/sitemap.xml", "/security.txt", "/.well-known/security.txt"
]
sensitive_results = []
for p in sensitive_paths:
    u = f"https://www.cynbit.in{p}"
    r = fetch_url(u, method="GET")
    sensitive_results.append({
        "path": p,
        "url": u,
        "status": r["status"],
        "reason": r["reason"],
        "size_bytes": r["size_bytes"],
        "snippet": r["body"][:200] if r["body"] else ""
    })
with open("cynbit-audit/logs/sensitive_paths_check.json", "w", encoding="utf-8") as f:
    json.dump(sensitive_results, f, indent=2)

# Sample check internal & external links
print("6. Checking internal links...")
internal_link_results = []
for l in list(all_internal_links):
    r = fetch_url(l, method="HEAD")
    if r["status"] == 405 or r["status"] == 0:
        r = fetch_url(l, method="GET")
    internal_link_results.append({
        "url": l,
        "status": r["status"],
        "final_url": r["final_url"],
        "duration_ms": r["duration_ms"],
        "error": r["error"]
    })
with open("cynbit-audit/logs/internal_links_check.json", "w", encoding="utf-8") as f:
    json.dump(internal_link_results, f, indent=2)

print("7. Checking external links (sample up to 25)...")
external_link_results = []
for l in list(all_external_links)[:25]:
    r = fetch_url(l, method="GET", timeout=8)
    external_link_results.append({
        "url": l,
        "status": r["status"],
        "final_url": r["final_url"],
        "duration_ms": r["duration_ms"],
        "error": r["error"]
    })
with open("cynbit-audit/logs/external_links_check.json", "w", encoding="utf-8") as f:
    json.dump(external_link_results, f, indent=2)

print("8. Checking images/assets (sample up to 30)...")
image_results = []
for im in list(all_images)[:30]:
    r = fetch_url(im, method="HEAD")
    if r["status"] == 405 or r["status"] == 0:
        r = fetch_url(im, method="GET")
    image_results.append({
        "url": im,
        "status": r["status"],
        "duration_ms": r["duration_ms"],
        "error": r["error"]
    })
with open("cynbit-audit/logs/images_check.json", "w", encoding="utf-8") as f:
    json.dump(image_results, f, indent=2)

print("Recon crawl completed successfully!")
