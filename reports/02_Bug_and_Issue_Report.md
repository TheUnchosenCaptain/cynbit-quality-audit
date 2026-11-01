# Bug & Issue Report
**Target System**: [https://www.cynbit.in](https://www.cynbit.in)  
**Lead QA Engineer**: Keshav Sharma (Senior QA Engineer)  
**Audit Date**: November 02, 2026  
**Total Verified Issues**: 18 Distinct Defects  
**Verification Method**: Automated tooling (Playwright, Lighthouse, Axe-Core) combined with direct manual verification on the live production environment.  
**Evidence Archive**: `cynbit-audit/reports/cynbit-audit-evidence.zip` (54.8 MB)

---

## 1. Executive Summary Table

All issues below have been verified on the live production environment. Issues are sorted strictly by Severity (**High -> Medium -> Low**).

| Bug ID | Severity | Category | Affected Page(s) | Issue Title | Confidence |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **BUG-01** | **High** | Accessibility | Global Mobile (<1280px) | Mobile navigation hamburger toggle button lacks accessible name (`aria-label`). | Confirmed |
| **BUG-05** | **High** | Performance | Global Mobile (Core Pages) | Severe mobile LCP bottleneck (11.0s – 12.2s) caused by initial `opacity: 0` animation gating. | Confirmed |
| **BUG-02** | **Medium** | Functional / Navigation | `/blog` (Pagination) | Page 1 "Previous Page" anchor links to `/blog?page=0`, rendering empty state. | Confirmed |
| **BUG-03** | **Medium** | Functional / Broken Link | 4 Related Blog Postings | Broken internal anchor returning HTTP 404 in "Related Articles" section. | Confirmed |
| **BUG-06** | **Medium** | Security / Headers | Global (All Endpoints) | Absence of defensive HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options). | Confirmed |
| **BUG-07** | **Medium** | Accessibility | `/bitelevate` | Interactive `<select>` course filters lack accessible programmatic labels (WCAG SC 4.1.2). | Confirmed |
| **BUG-08** | **Medium** | Accessibility | Global (Home, Blog, BitElevate) | Color contrast failure (below 4.5:1) on 21 distinct secondary text and badge nodes. | Confirmed |
| **BUG-09** | **Medium** | Accessibility / Semantics | Global (Navigation Structures) | Semantic list structure violations (direct `<div>` inside `<ul>`, unparented `<li>` nodes). | Confirmed |
| **BUG-10** | **Medium** | SEO / Branding | Global (`/`, `/careers`, `/contact`, `/blog`) | Duplicate brand suffix rendered in document `<title>` tags. | Confirmed |
| **BUG-11** | **Medium** | SEO / Metadata | `/case-studies` | Case studies hub reuses homepage title and meta description verbatim. | Confirmed |
| **BUG-12** | **Medium** | SEO / Social Sharing | Global (All Pages) | OpenGraph image references `.svg` logo unsupported by major social card scrapers. | Confirmed |
| **BUG-14** | **Medium** | Functional / UX | `/non-existent-qa-page` | Custom 404 page fails to update document `<title>`, retaining generic homepage title. | Confirmed |
| **BUG-15** | **Medium** | SEO / Canonical | `/`, `/story`, `/team` | Absence of `rel="canonical"` tags across core brand landing pages. | Confirmed |
| **BUG-04** | **Low** | Functional / Standards | `/blog` (Category Navigation) | Unencoded whitespace in category query parameters (`IT Strategy`, `Cloud Architecture`). | Confirmed |
| **BUG-13** | **Low** | Functional / Routing | `/contact` | Likely unintended routing: "Our impact" CTA button links to `/case-studies` instead of `/impact`. | Confirmed |
| **BUG-16** | **Low** | Content Consistency | `/contact` vs Global Footer | Inconsistent contact telephone numbers (2 on page vs 3 in footer) and email listings. | Confirmed |
| **BUG-17** | **Low** | Content Quality | `/case-studies` | Inconsistent SLA uptime claims across case study cards (Hero 99.99% vs Bottom 99.9%). | Confirmed |
| **BUG-18** | **Low** | Security / Infrastructure | Dynamic Routes & Global | Prerendered HTML emits wildcard CORS, and headers disclose `X-Powered-By: Next.js`. | Confirmed |

---

## 2. Detailed Bug Descriptions

---

### BUG-01: Mobile Navigation Toggle Lacks Accessible Name (`aria-label`)
- **Bug ID**: `BUG-01`
- **Severity**: **High**
- **Category**: Accessibility (WCAG 2.2 Level A)
- **Page URL**: `https://www.cynbit.in/` (and all routes on viewports < 1280px)
- **Environment**: Mobile / Tablet (360x640, 375x667, 390x844, 412x915, 768x1024), Chromium, Firefox, WebKit
- **Confidence**: **Confirmed** (Verified in mobile browser viewport)
- **WCAG Mapping**: SC 4.1.2: Name, Role, Value (Level A)

#### Steps to Reproduce:
1. Emulate a mobile device (e.g. iPhone 14, 390x844) in Playwright or DevTools. (Note: The button is hidden on desktop via `xl:hidden` at >=1280px).
2. Navigate to `https://www.cynbit.in/`.
3. Inspect the DOM element responsible for opening the navigation drawer:
   ```html
   <button class="xl:hidden w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface active:scale-90 hover:bg-surface-container-high transition-all duration-200">
     <span class="material-symbols-outlined">menu</span>
   </button>
   ```
4. Run screen-reader software (VoiceOver / NVDA) or inspect the browser accessibility tree.

#### Expected Result:
The button must declare an accessible name via `aria-label="Toggle navigation menu"` and indicate its expanded state via `aria-expanded="false"`.

#### Actual Result:
The accessible name is empty (`""`). Screen readers announce only "button" with no contextual clue regarding its function. Automated testing attempting to locate the button by accessible name fails.
*(Note on Target Size: The button measures 40x40px, which **passes** the WCAG 2.2 AA SC 2.5.8 requirement of 24x24px. Expanding to 44x44px is an enhanced AAA / Mobile HIG ergonomic best practice).*

#### Evidence:
- **Mobile Screenshot**: `screenshots/home_chromium_390x844.png`
- **Mobile Axe Audit**: `axe/axe_mobile_menu_open.json` (Rule `button-name`)

---

### BUG-05: Severe Mobile LCP Bottleneck (11.0s – 12.2s) Caused by Animation Gating
- **Bug ID**: `BUG-05`
- **Severity**: **High**
- **Category**: Performance / Core Web Vitals
- **Page URL**: `https://www.cynbit.in/` (and `/contact`, `/services`, `/careers`, `/bitelevate`, `/blog`)
- **Environment**: Simulated Mobile 4G / 4x CPU Throttling
- **Confidence**: **Confirmed** (Median of 3 consecutive runs across 6 pages)

#### Steps to Reproduce:
1. Run Google Lighthouse CLI on `https://www.cynbit.in/` with `--form-factor=mobile`.
2. Inspect the rendered DOM at initial server delivery vs post-hydration.

#### Expected Result:
- Largest Contentful Paint (LCP) <= 2.5s
- Total Blocking Time (TBT) <= 200ms

#### Actual Result:
- **Mobile LCP**: **11.0s – 12.2s** (Over 4x the acceptable threshold)
- **Mobile TBT**: **464ms – 840ms**
- **Root Cause**: The hero heading text (`<h1>`) and lead paragraph are output in server HTML with inline style `opacity: 0; transform: translateY(30px)`. They remain completely invisible until client-side JavaScript downloads, parses Framer Motion runtime scripts, and executes the fade-in animation. On throttled mobile CPUs, this hydration delay blocks the first visible text paint for over 11 seconds.

#### Evidence:
- **Lighthouse JSON**: `lighthouse/home_mobile_median.report.json`
- **DOM Snippet**: `<div style="height:100%;opacity:0;transform:translateY(30px)"><p ...>Cynbit Technologies architects the digital future...</p></div>`

---

### BUG-02: Blog Pagination Page 1 Links to `/blog?page=0`, Rendering Empty Error State
- **Bug ID**: `BUG-02`
- **Severity**: **Medium**
- **Category**: Functional / Navigation
- **Page URL**: `https://www.cynbit.in/blog`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Directly verified on live site)

#### Steps to Reproduce:
1. Navigate to `https://www.cynbit.in/blog`.
2. Scroll to the bottom pagination controls on page 1.
3. Observe the "Previous Page" link element.
4. Click or navigate directly to `https://www.cynbit.in/blog?page=0`.

#### Expected Result:
On page 1, the "Previous Page" button should either be disabled (`aria-disabled="true"`, pointer-events-none) or omitted. If requested, `page=0` should normalize or redirect to `/blog`.

#### Actual Result:
The "Previous Page" anchor remains active with `href="/blog?page=0"`. Navigating to it displays a broken empty state:
`"No insights matching your criteria were found."`

#### Evidence:
- **Direct Live Response**: `https://www.cynbit.in/blog?page=0`
- **DOM Snippet**: `<a href="/blog?page=0">Previous</a>`

---

### BUG-03: Broken Internal Link (HTTP 404) in "Related Articles" on 4 Published Blog Posts
- **Bug ID**: `BUG-03`
- **Severity**: **Medium**
- **Category**: Functional / Broken Navigation
- **Page URL**:
  - `https://www.cynbit.in/blog/future-ai-customer-support`
  - `https://www.cynbit.in/blog/ai-automation-trends-2026`
  - `https://www.cynbit.in/blog/why-startups-need-custom-dashboards`
  - `https://www.cynbit.in/blog/ai-chatbots-vs-human-support`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Verified via cURL and link crawler)

#### Steps to Reproduce:
1. Navigate to any of the 4 blog posts listed above.
2. Scroll down to the "Related Articles" grid at the bottom.
3. Locate the card titled "Transforming Business Through Custom Software" linking to `/blog/transforming-business-through-custom-software`.
4. Click the link or inspect the HTTP response:
   ```bash
   curl.exe -I https://www.cynbit.in/blog/transforming-business-through-custom-software
   ```

#### Expected Result:
Link should resolve with HTTP 200 OK and render the expected technical article.

#### Actual Result:
Vercel Edge server returns HTTP 404 Not Found (`X-Matched-Path: /blog/[slug]`). The intended published article is located at `/blog/transforming-businesses-through-custom-software` (note plural "businesses"), indicating a slug typo in the article relationship data.

#### Evidence:
- **Log File**: `logs/internal_links_check.json` (HTTP 404 on `/blog/transforming-business-through-custom-software`)

---

### BUG-06: Missing Defensive HTTP Security Headers
- **Bug ID**: `BUG-06`
- **Severity**: **Medium**
- **Category**: Security (Passive Configuration)
- **Page URL**: Global (All Endpoints)
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Verified via cURL and socket inspection)

#### Steps to Reproduce:
1. Issue an HTTP GET/HEAD request to `https://www.cynbit.in/`.
2. Inspect response headers.

#### Expected Result:
Production web applications should declare defensive headers (`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).

#### Actual Result:
Defensive headers are missing. The site scores **Grade D (40 / 100)** on Mozilla Observatory:
- HSTS: PASS (`max-age=63072000`)
- CSP: FAIL (-25 pts)
- X-Frame-Options: FAIL (-20 pts, allowing iframe embedding / Clickjacking)
- X-Content-Type-Options: FAIL (-5 pts)
- Referrer-Policy: FAIL (-10 pts)
*(Rated Medium severity as this is an informational marketing site without authenticated user sessions).*

#### Evidence:
- **Log File**: `logs/security_audit_report.json`

---

### BUG-07: Interactive `<select>` Elements Missing Labels on `/bitelevate`
- **Bug ID**: `BUG-07`
- **Severity**: **Medium**
- **Category**: Accessibility (WCAG 2.2 Level A)
- **Page URL**: `https://www.cynbit.in/bitelevate`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Axe-Core automated detection)
- **WCAG Mapping**: SC 4.1.2: Name, Role, Value (Level A)

#### Steps to Reproduce:
1. Navigate to `https://www.cynbit.in/bitelevate`.
2. Locate the curriculum/track `<select>` dropdown controls.

#### Expected Result:
Every form `<select>` must have an associated `<label for="...">` or `aria-label`.

#### Actual Result:
2 `<select>` dropdown controls lack any accessible name (`select-name` violation), preventing screen-reader users from identifying the control.

#### Evidence:
- **Axe Report**: `axe/axe_bitelevate_desktop.json` (Tag `select-name`, 2 nodes)

---

### BUG-08: Color Contrast Below 4.5:1 on 21 Secondary Typography Nodes
- **Bug ID**: `BUG-08`
- **Severity**: **Medium**
- **Category**: Accessibility (WCAG 2.2 Level AA)
- **Page URL**: Global (`/`, `/bitelevate`, `/blog`, `/contact`)
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Axe-Core contrast algorithm)
- **WCAG Mapping**: SC 1.4.3: Contrast (Minimum) (Level AA)

#### Steps to Reproduce:
1. Inspect secondary metadata text and muted category tags across `/blog` and `/bitelevate`.
2. Measure foreground/background color luminance ratio.

#### Expected Result:
Normal text must maintain a minimum contrast ratio of 4.5:1 against its background.

#### Actual Result:
21 distinct nodes (e.g. muted gray classes `text-zinc-500` / `text-gray-400` rendered against dark `#09090b` backgrounds) achieve only 3.1:1 to 3.4:1 contrast ratio, failing WCAG AA.

#### Evidence:
- **Axe Report**: `axe/axe_bitelevate_desktop.json`, `axe/axe_blog_desktop.json` (Tag `color-contrast`, 21 nodes)

---

### BUG-09: Semantic List Structure Violations (Direct `<div>` Inside `<ul>`, Unparented `<li>`)
- **Bug ID**: `BUG-09`
- **Severity**: **Medium**
- **Category**: Accessibility / HTML Semantics
- **Page URL**: Global (Header and Footer Navigation)
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Axe-Core validation)
- **WCAG Mapping**: SC 1.3.1: Info and Relationships (Level A)

#### Steps to Reproduce:
1. Inspect navigation markup in header mega-menu and footer.

#### Expected Result:
`<ul>` containers must only directly contain `<li>`, `<script>`, or `<template>` elements.

#### Actual Result:
- 2 `<ul>` containers feature direct `<div>` children (`list` violation).
- 8 `<li>` elements are rendered without a valid parent list element (`listitem` violation).
Total: 10 violating semantic nodes impacting screen-reader list announcements.

#### Evidence:
- **Axe Summary**: `logs/axe_summary_report.json` (Tags `list` and `listitem`, 10 nodes)

---

### BUG-10: Duplicate Brand Suffix in Document `<title>` Tags
- **Bug ID**: `BUG-10`
- **Severity**: **Medium**
- **Category**: SEO / Brand Hygiene
- **Page URL**: `/`, `/careers`, `/contact`, `/blog`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Live DOM evaluation)

#### Steps to Reproduce:
1. View source or document title on `/`, `/careers`, `/contact`, or `/blog`.

#### Expected Result:
Title should feature the brand name exactly once (e.g. `Careers | Cynbit Technologies`).

#### Actual Result:
Title template duplication causes redundant double-branding:
- `/`: `Cynbit Technologies | AI Automation & Software Solutions Jaipur | Cynbit Technologies`
- `/careers`: `Careers | Cynbit Technologies | Cynbit Technologies`
- `/contact`: `Contact Us | Cynbit Technologies - AI & Software Solutions | Cynbit Technologies`
- `/blog`: `Insights & Ideas | Cynbit Technologies | Cynbit Technologies`
*(Root cause: Root `layout.tsx` applies `%s | Cynbit Technologies`, while page components append `| Cynbit Technologies` manually).*

#### Evidence:
- **Live DOM Header Dump**: `cynbit-audit/logs/page_inventory.json`

---

### BUG-11: `/case-studies` Reuses Homepage Title and Meta Description Verbatim
- **Bug ID**: `BUG-11`
- **Severity**: **Medium**
- **Category**: SEO / Metadata
- **Page URL**: `https://www.cynbit.in/case-studies`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Live DOM evaluation)

#### Steps to Reproduce:
1. Compare `<title>` and `<meta name="description">` of `/` vs `/case-studies`.

#### Expected Result:
`/case-studies` should have bespoke metadata highlighting client case studies and project success stories.

#### Actual Result:
Both `<title>` and `<meta name="description">` on `/case-studies` are identical copy-pastes of the homepage:
- Title: `Cynbit Technologies | AI Automation & Software Solutions Jaipur`
- Description: `Cynbit Technologies is a premier software solutions company in Jaipur, Rajasthan...`

#### Evidence:
- **DOM Evaluation**: `scripts/verify_findings.py` log

---

### BUG-12: Social OpenGraph Image Uses SVG Format Unsupported by Social Preview Cards
- **Bug ID**: `BUG-12`
- **Severity**: **Medium**
- **Category**: SEO / Social Sharing
- **Page URL**: Global (All 84 pages)
- **Environment**: Social Crawlers (LinkedIn Post Inspector, Twitter Card Validator, Facebook Open Graph)
- **Confidence**: **Confirmed** (Live DOM evaluation)

#### Steps to Reproduce:
1. Inspect `<meta property="og:image">` across any page.

#### Expected Result:
`og:image` must reference a raster image format (`.png`, `.jpg`, `.webp`) at least 1200x630px.

#### Actual Result:
All pages specify `<meta property="og:image" content="https://cynbit.in/logo.svg">`. Major social platforms (LinkedIn, Twitter/X, WhatsApp) refuse to render `.svg` images in unfurl link cards, resulting in blank preview thumbnails. Concurrently, `og:url` is hardcoded to the bare domain `https://cynbit.in` on all pages.

#### Evidence:
- **DOM Metadata**: `logs/page_inventory.json`

---

### BUG-14: Custom 404 Error Page Retains Homepage Title Tag
- **Bug ID**: `BUG-14`
- **Severity**: **Medium**
- **Category**: Functional / SEO / UX
- **Page URL**: `https://www.cynbit.in/non-existent-qa-page`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Live Playwright evaluation)

#### Steps to Reproduce:
1. Navigate to a non-existent URL.
2. Inspect the browser tab `<title>`.

#### Expected Result:
Title should clearly state the error (e.g. `404: Page Not Found | Cynbit Technologies`).

#### Actual Result:
The page renders heading "Node Not Found.", but the document `<title>` remains:
`<title>Cynbit Technologies | AI Automation & Software Solutions Jaipur</title>`.

#### Evidence:
- **Screenshot**: `screenshots/404_page.png`
- **Log**: `logs/functional_test_results.json`

---

### BUG-15: Missing `rel="canonical"` Link Tags Across Core Brand Landing Pages
- **Bug ID**: `BUG-15`
- **Severity**: **Medium**
- **Category**: SEO / Indexation
- **Page URL**: `https://www.cynbit.in/`, `/story`, `/team`
- **Environment**: All Browsers / Crawlers
- **Confidence**: **Confirmed** (Live DOM evaluation)

#### Steps to Reproduce:
1. Inspect the `<head>` of `/`, `/story`, and `/team`.

#### Expected Result:
Every indexable page must contain a self-referential canonical tag (`<link rel="canonical" href="https://www.cynbit.in/...">`).

#### Actual Result:
No canonical link tag is present on core brand landing pages, while `robots.txt` specifies bare domain `https://cynbit.in/sitemap.xml`, creating ambiguous indexing signals.

#### Evidence:
- **Log**: `logs/seo_content_audit_report.json`

---

### BUG-04: Raw Unencoded Spaces in Category Filter URLs on `/blog`
- **Bug ID**: `BUG-04`
- **Severity**: **Low**
- **Category**: Functional / Web Standards
- **Page URL**: `https://www.cynbit.in/blog`
- **Environment**: All Browsers / Strict HTTP Clients
- **Confidence**: **Confirmed** (Verified in raw HTML)

#### Steps to Reproduce:
1. Navigate to `https://www.cynbit.in/blog`.
2. Inspect the category filter pills in the DOM: `IT Strategy`, `Marketing`, `Education`, `Cloud Architecture`, `Community`.

#### Expected Result:
Category parameters must be percent-encoded: `/blog?category=IT%20Strategy` and `/blog?category=Cloud%20Architecture`.

#### Actual Result:
The raw HTML contains literal unencoded ASCII space characters in `href`:
- `href="/blog?category=IT Strategy"`
- `href="/blog?category=Cloud Architecture"`

Strict HTTP clients and older proxies flag unencoded whitespace in URIs as a specification violation.

#### Evidence:
- **Raw HTML Attribute**: `<a href="/blog?category=IT Strategy">`

---

### BUG-13: Likely Unintended Routing on `/contact` Where "Our impact" CTA Button Links to `/case-studies`
- **Bug ID**: `BUG-13`
- **Severity**: **Low**
- **Category**: Functional / Routing
- **Page URL**: `https://www.cynbit.in/contact`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Live DOM evaluation)

#### Steps to Reproduce:
1. Navigate to `https://www.cynbit.in/contact`.
2. Scroll to the "Our impact" CTA button.
3. Click the button or inspect its wrapping anchor tag.

#### Expected Result:
Clicking "Our impact" should route to `/impact`. Furthermore, the markup should not nest an interactive `<button>` inside an anchor `<a>` tag, which is invalid HTML5.

#### Actual Result:
The CTA button links to `/case-studies` instead of `/impact` (likely an unintended route assignment):
`<a href="/case-studies"><button class="...">Our impact</button></a>`.

#### Evidence:
- **Live DOM Snippet**: `<a href="/case-studies"><button ...>Our impact</button></a>`

---

### BUG-16: Discrepant Contact Phone Numbers and Email Addresses
- **Bug ID**: `BUG-16`
- **Severity**: **Low**
- **Category**: Content Consistency / Trust
- **Page URL**: `/contact` vs Global Footer
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Live content comparison)

#### Steps to Reproduce:
1. Compare phone numbers and email addresses on `/contact` with the global footer.

#### Expected Result:
Company contact details should be identical across all touchpoints.

#### Actual Result:
- On `/contact`: Displays 2 phone numbers (`+91 89479 62667` and `+91 78912 09777`) and 2 email addresses (`opportunities@cynbit.in` and `support@cynbit.in`).
- In Global Footer: Displays 3 phone numbers (displaying `+91 89479 62667`, `+91 78912 09777`, and adding `+91 83023 37367`) and only 1 email address (`opportunities@cynbit.in`, omitting `support@cynbit.in`).

#### Evidence:
- **Live Site Comparison**:
  - `/contact`: `+91 89479 62667`, `+91 78912 09777` | `opportunities@cynbit.in`, `support@cynbit.in`
  - Footer: `+91 89479 62667`, `+91 78912 09777`, `+91 83023 37367` | `opportunities@cynbit.in`

---

### BUG-17: Inconsistent SLA Uptime Claims Across `/case-studies`
- **Bug ID**: `BUG-17`
- **Severity**: **Low**
- **Category**: Content Quality
- **Page URL**: `https://www.cynbit.in/case-studies`
- **Environment**: All Browsers
- **Confidence**: **Confirmed** (Live content audit)

#### Steps to Reproduce:
1. Navigate to `https://www.cynbit.in/case-studies`.
2. Observe the uptime metric in the top hero floating card vs the bottom CTA section.

#### Expected Result:
Infrastructure reliability statistics should maintain consistent representation across the page.

#### Actual Result:
- In the top hero section floating card, the stat displays: `Uptime 99.99%`.
- In the bottom CTA section highlight card, the stat displays: `99.9% Uptime`.
The discrepancy in precision (four nines vs three nines) represents an internal content mismatch.

#### Evidence:
- **Live DOM Strings**: Hero card shows `99.99%`, bottom callout shows `99.9%`.

---

### BUG-18: Prerendered HTML Emits Wildcard CORS Header & Discloses Framework Metadata
- **Bug ID**: `BUG-18`
- **Severity**: **Low**
- **Category**: Security Hygiene
- **Page URL**: Global
- **Environment**: All HTTP Requests
- **Confidence**: **Confirmed** (Vercel edge responses)

#### Steps to Reproduce:
1. Issue an HTTP GET request to any static page.
2. Inspect response headers.

#### Expected Result:
CORS headers should be reserved for APIs, and runtime framework headers should be suppressed.

#### Actual Result:
- Emits `Access-Control-Allow-Origin: *` on standard HTML documents (standard Vercel edge default for prerendered routes; low risk since no authenticated state is leaked).
- Emits `X-Powered-By: Next.js` on dynamic SSR routes.

#### Evidence:
- **Log**: `logs/security_audit_report.json`
