import urllib.request
import re
import json

def check_live():
    print("=== Checking User Items on Live Site ===")
    
    # 1. Titles & Duplicate Suffix
    urls = [
        'https://www.cynbit.in/',
        'https://www.cynbit.in/careers',
        'https://www.cynbit.in/contact',
        'https://www.cynbit.in/blog',
        'https://www.cynbit.in/case-studies',
        'https://www.cynbit.in/careers/growth-manager'
    ]
    for u in urls:
        try:
            req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 QA/1.0'})
            html = urllib.request.urlopen(req).read().decode('utf-8', 'ignore')
            tm = re.search(r'<title[^>]*>(.*?)</title>', html, re.I)
            dm = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html, re.I)
            og_img = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', html, re.I)
            og_url = re.search(r'<meta\s+property=["\']og:url["\']\s+content=["\'](.*?)["\']', html, re.I)
            print(f"URL: {u}")
            print(f"  Title: {tm.group(1) if tm else 'MISSING'}")
            print(f"  Desc:  {dm.group(1)[:80] if dm else 'MISSING'}...")
            print(f"  OG Img: {og_img.group(1) if og_img else 'MISSING'}")
            print(f"  OG URL: {og_url.group(1) if og_url else 'MISSING'}")
        except Exception as e:
            print(f"URL: {u} Error: {e}")

    # 2. Blog Pagination page=0
    print("\n=== Checking Blog Pagination page=0 ===")
    try:
        p0_url = 'https://www.cynbit.in/blog?page=0'
        req = urllib.request.Request(p0_url, headers={'User-Agent': 'Mozilla/5.0 QA/1.0'})
        p0_html = urllib.request.urlopen(req).read().decode('utf-8', 'ignore')
        no_insights = "No insights matching your criteria were found" in p0_html or "No insights" in p0_html
        print(f"/blog?page=0 renders 'No insights': {no_insights}")
        
        # Check Previous Page button on /blog
        blog_html = urllib.request.urlopen('https://www.cynbit.in/blog').read().decode('utf-8', 'ignore')
        prev_link = re.findall(r'<a[^>]*href=["\']([^"\']*page=0[^"\']*)["\']', blog_html)
        print(f"Previous page links with page=0 on /blog: {prev_link}")
    except Exception as e:
        print("Blog page=0 check error:", e)

    # 3. Contact page vs Footer: Phones and Emails
    print("\n=== Checking Contact Page vs Footer Contact Info ===")
    try:
        contact_html = urllib.request.urlopen('https://www.cynbit.in/contact').read().decode('utf-8', 'ignore')
        phones = re.findall(r'\+91[\s\d\-]{10,15}', contact_html)
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@cynbit\.in', contact_html)
        print("Phones found on /contact:", list(set(phones)))
        print("Emails found on /contact:", list(set(emails)))
    except Exception as e:
        print("Contact info error:", e)

    # 4. Check 'Our impact' button on /contact
    print("\n=== Checking 'Our impact' button on /contact ===")
    try:
        impact_btns = re.findall(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>[^<]*impact[^<]*</a>', contact_html, re.I)
        print("Impact buttons on /contact:", impact_btns)
        # Search all anchors on /contact mentioning impact
        all_anchors = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', contact_html, re.I | re.DOTALL)
        for href, text in all_anchors:
            if 'impact' in text.lower():
                print(f"Anchor text '{text.strip()}' -> href: '{href}'")
    except Exception as e:
        print("Impact button check error:", e)

    # 5. Check /case-studies stats: 99.99% vs 99.9%
    print("\n=== Checking Case Studies Stats ===")
    try:
        cs_html = urllib.request.urlopen('https://www.cynbit.in/case-studies').read().decode('utf-8', 'ignore')
        matches = re.findall(r'99\.9[0-9]*%?', cs_html)
        print("Uptime mentions in case studies:", matches)
    except Exception as e:
        print("Case studies check error:", e)

    # 6. Check /navigation route
    print("\n=== Checking /navigation route ===")
    try:
        req = urllib.request.Request('https://www.cynbit.in/navigation', headers={'User-Agent': 'Mozilla/5.0 QA/1.0'})
        res = urllib.request.urlopen(req)
        print(f"/navigation status: {res.status}")
    except urllib.error.HTTPError as e:
        print(f"/navigation status: {e.code}")
    except Exception as e:
        print(f"/navigation error: {e}")

    # 7. Check Careers roles count
    print("\n=== Checking Careers roles count ===")
    try:
        careers_html = urllib.request.urlopen('https://www.cynbit.in/careers').read().decode('utf-8', 'ignore')
        role_links = list(set(re.findall(r'/careers/([a-zA-Z0-9\-]+)', careers_html)))
        print(f"Found {len(role_links)} roles on /careers: {role_links}")
    except Exception as e:
        print("Careers role count error:", e)

check_live()
