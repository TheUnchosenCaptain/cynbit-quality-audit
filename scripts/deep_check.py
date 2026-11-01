import urllib.request
import re
import json
import sys

print("=== 1. Checking /blog category hrefs ===", flush=True)
req = urllib.request.Request('https://www.cynbit.in/blog', headers={'User-Agent': 'Mozilla/5.0'})
html_blog = urllib.request.urlopen(req, timeout=6).read().decode('utf-8', 'ignore')

category_links = re.findall(r'href=[\'"]([^\'"]*category=[^\'"]*)[\'"]', html_blog)
print(f"Found {len(category_links)} category hrefs:", flush=True)
for c in category_links:
    print("  ", repr(c), flush=True)

pills = re.findall(r'href=[\'"][^\'"]*category=[^\'"]*[\'"][^>]*>(.*?)</a>', html_blog, re.DOTALL)
print("Pill texts:", [re.sub(r'<[^>]+>', '', p).strip() for p in pills], flush=True)

print("\n=== 2. Checking source page for /blog/ai-agents-transforming-business ===", flush=True)
il = json.load(open('cynbit-audit/logs/internal_links_check.json'))
target_link = 'https://www.cynbit.in/blog/ai-agents-transforming-business'
matches = [x for x in il if x['url'] == target_link]
print("Matches in internal_links_check.json:", matches, flush=True)

# Find which page in page_inventory has this href
inv = json.load(open('cynbit-audit/logs/page_inventory.json'))
for p in inv:
    if 'transforming-business' in p.get('body', ''):
        print(f"FOUND 'transforming-business' in page: {p['url']}", flush=True)

# Also check live pages
for test_url in ['https://www.cynbit.in/', 'https://www.cynbit.in/blog', 'https://www.cynbit.in/services']:
    try:
        page_h = urllib.request.urlopen(urllib.request.Request(test_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=6).read().decode('utf-8', 'ignore')
        if 'transforming-business' in page_h:
            print(f"Found 'transforming-business' on {test_url}", flush=True)
    except Exception as e:
        pass

print("\n=== 3. Checking Contact info on /contact vs footer ===", flush=True)
req_c = urllib.request.Request('https://www.cynbit.in/contact', headers={'User-Agent': 'Mozilla/5.0'})
contact_html = urllib.request.urlopen(req_c, timeout=6).read().decode('utf-8', 'ignore')

footer_start = contact_html.find('<footer')
if footer_start != -1:
    contact_body = contact_html[:footer_start]
    footer_body = contact_html[footer_start:]
else:
    contact_body = contact_html
    footer_body = ""

print("Contact body phones:", set(re.findall(r'\+91[\s\d\-]{10,15}', contact_body)), flush=True)
print("Contact body emails:", set(re.findall(r'[a-zA-Z0-9._%+-]+@cynbit\.in', contact_body)), flush=True)

print("Footer phones:", set(re.findall(r'\+91[\s\d\-]{10,15}', footer_body)), flush=True)
print("Footer emails:", set(re.findall(r'[a-zA-Z0-9._%+-]+@cynbit\.in', footer_body)), flush=True)

print("\n=== 4. Checking /case-studies 99.99% and 99.9% ===", flush=True)
req_cs = urllib.request.Request('https://www.cynbit.in/case-studies', headers={'User-Agent': 'Mozilla/5.0'})
cs_html = urllib.request.urlopen(req_cs, timeout=6).read().decode('utf-8', 'ignore')

# Print surrounding context for all 99.9% occurrences
for m in re.finditer(r'99\.9[0-9]*%', cs_html):
    start = max(0, m.start() - 100)
    end = min(len(cs_html), m.end() + 100)
    snippet = re.sub(r'<[^>]+>', ' ', cs_html[start:end])
    snippet = ' '.join(snippet.split())
    print(f"Stat: '{m.group(0)}' in context: {snippet}", flush=True)

print("\nDone!", flush=True)
