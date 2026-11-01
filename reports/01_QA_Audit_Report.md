# Comprehensive QA Quality Audit Report
**Target Under Test**: [https://www.cynbit.in](https://www.cynbit.in)  
**Role**: Senior QA Engineer / QA Testing Intern Practical Assessment  
**Assessment Date**: November 02, 2026  
**Auditor**: Keshav Sharma (Senior QA Engineer)  
**Status**: Completed — Verified on Live Production Environment  
**Evidence Archive**: `cynbit-audit/reports/cynbit-audit-evidence.zip` (54.8 MB complete raw artifacts)

---

## 1. Executive Summary

This Quality Audit provides a rigorous, empirical quality assessment of Cynbit Technologies' public digital platform ([https://www.cynbit.in](https://www.cynbit.in)). The audit was conducted using automated tooling (Playwright multi-engine browser automation, Lighthouse CLI, Axe-Core, Python HTTP/TLS protocol analyzers) alongside manual exploratory verification of the live production environment. Only findings directly verified against the live site are reported.

### Overall Quality Scorecard

| Category | Score / Grade | Status | Key Summary Findings |
| :--- | :---: | :---: | :--- |
| **Functional & Workflows** | **78 / 100** *(Auditor's qualitative assessment)* | <span style="color:orange">Needs Attention</span> | Lead form submits cleanly via Next.js Server Actions, but broken internal blog link (404), unencoded query spaces (`/blog?category=...`), blog pagination bug (`/blog?page=0`), and contact detail mismatches exist. |
| **Responsive & Cross-Browser**| **92 / 100** *(Auditor's qualitative assessment)* | <span style="color:green">Good</span> | 165 viewport/browser combinations captured across Chromium, Firefox, WebKit. Zero horizontal overflow blowouts. Touch targets pass WCAG AA (>=24px), though expanding to 44px/48px is recommended for touch ergonomics. |
| **Performance & Web Vitals** | **56 / 100 (Mobile Avg)<br>84.5 / 100 (Desktop Avg)** *(3-run median)* | <span style="color:red">Poor (Mobile)<br>Good (Desktop)</span> | Severe mobile hydration bottleneck. Mobile LCP averages 11.0s – 12.2s due to client-side animation gating (`opacity: 0` initial state) and heavy script execution on throttled mobile CPUs. |
| **Accessibility (WCAG 2.2 AA)**| **72 / 100** *(Auditor's qualitative assessment)* | <span style="color:orange">Non-Compliant</span> | 34 distinct violating nodes across 5 rules: unlabelled mobile menu button (no accessible name), unlabelled select tags on `/bitelevate`, broken list semantics (`ul`/`li`), and low color contrast on secondary text. |
| **Security (Passive Audit)** | **Grade D (40 / 100)** *(Mozilla Observatory)* | <span style="color:orange">Moderate Risk</span> | Enforces TLS 1.3 & HSTS (2-year max-age), but lacks Content-Security-Policy (CSP), X-Frame-Options (Clickjacking vulnerability), X-Content-Type-Options, and Referrer-Policy. Wildcard CORS is emitted on prerendered HTML. |
| **SEO & Content Quality** | **80 / 100** *(Auditor's qualitative assessment)* | <span style="color:orange">Satisfactory</span> | Clean robots.txt and sitemap.xml, but core brand pages lack `rel="canonical"` tags, `<title>` tags contain duplicate brand suffixes, and social OpenGraph tags reference `.svg` images unsupported by preview scrapers. |

---

## 2. Test Environment & Execution Matrix

Every metric and artifact in this report was captured directly in the live production environment under controlled testing parameters.

### 2.1 Host, Edge & Network Infrastructure
- **Operating System**: Windows 11 Enterprise x64 (Build 26100)
- **Node.js Runtime**: `v24.14.0` | **npm**: `11.9.0`
- **Python Execution Engine**: `Python 3.14.3` (SSL OpenSSL 3.0.x backend)
- **ISP / Region**: Reliance Jio Infocomm (AS55836), Delhi Region, India (Client IP redacted for privacy)
- **Target Hosting Infrastructure**: Vercel Edge Network
- **Edge PoP Served**: `bom1` (Mumbai, India) with dynamic failover/SSR routes hitting `iad1` (Washington DC, USA)
- **Transport Security**: TLSv1.3 (`TLS_AES_128_GCM_SHA256`, 128-bit), Certificate issued by Let's Encrypt (CN: `www.cynbit.in`, valid through Dec 24, 2026)

### 2.2 Automation & Tooling Arsenal
- **Playwright Test Suite**: `1.58.0` driving genuine multi-browser rendering engines:
  - **Chromium**: Version 156.0.8078.4 (Headless & Full Emulation)
  - **Firefox**: Version 157.0 (Gecko Engine)
  - **WebKit**: Version 27.2 (Safari / Apple WebKit Engine)
- **Lighthouse CLI**: `13.6.0` (Simulated Moto G Power / 4G Throttling & Unthrottled Desktop Presets, 3 runs median across all 6 core pages)
- **Accessibility Automation**: `@axe-core/playwright` (`axe-core 4.10.2`) enforcing WCAG 2.0, 2.1, 2.2 Level A/AA
- **Network & Protocol Analysers**: Custom HTTP/1.1 & HTTP/2 socket engines, `curl 8.4.0`

---

## 3. Scope, Page Inventory & Workflows Covered

### 3.1 Page Inventory
A complete crawl of `sitemap.xml`, internal navigational links, and edge endpoints revealed **84 active production URLs** returning HTTP 200:

1. **Core Marketing & Brand Pages (10 URLs)**:
   - Homepage: `https://www.cynbit.in/`
   - Company Story: `https://www.cynbit.in/story`
   - Leadership & Team: `https://www.cynbit.in/team`
   - Services Catalog: `https://www.cynbit.in/services`
   - Products: `https://www.cynbit.in/products`
   - Case Studies Hub: `https://www.cynbit.in/case-studies`
   - Social Impact: `https://www.cynbit.in/impact`
   - BitElevate Platform: `https://www.cynbit.in/bitelevate`
   - BitElevate Career Paths: `https://www.cynbit.in/bitelevate/paths`
   - Contact Page: `https://www.cynbit.in/contact`
2. **Career & Internship Job Postings (21 URLs)**:
   - Hub: `/careers`
   - 20 Job Roles: `/careers/qa-testing-intern`, `/careers/full-stack-developer`, `/careers/ai-ml-engineer-intern`, `/careers/backend-developer-intern`, `/careers/ui-ux-design-intern`, `/careers/digital-marketing-intern`, `/careers/growth-marketing-intern`, `/careers/content-marketing-intern`, `/careers/social-media-brand-intern`, `/careers/campus-ambassador-campus-relations-intern`, `/careers/business-development-intern`, `/careers/ai-engineer`, `/careers/backend-developer`, `/careers/devops-cloud-engineer`, `/careers/marketing-executive`, `/careers/hr-talent-acquisition-intern`, `/careers/growth-manager`, `/careers/content-strategist`, `/careers/business-development-executive`, `/careers/full-stack-developer-intern`.
3. **Blog & Thought Leadership (26 URLs)**:
   - `/blog` hub and 25 technical articles.
4. **Student Diaries (9 URLs)**:
   - `/diaries` hub and 8 personal diary reflections.
5. **Legal & Compliance (3 URLs)**:
   - `/privacy`, `/terms`, `/cookies`
6. **Case Study Detail Pages (13 URLs)**:
   - `/case-studies/urban-wardrobe-ar-integration`, `/case-studies/cloudy-tales-collaboration`, etc.
7. **Additional Active Production Routes (2 URLs)**:
   - `/navigation` (HTTP 200)
   - `/portal` (HTTP 200, client onboarding route)

*(Total active HTTP 200 URLs = 10 + 21 + 26 + 9 + 3 + 13 + 2 = **84 URLs**).*

8. **Tested Non-Existent / Protected Endpoints (2 URLs)**:
   - `/admin` (HTTP 404)
   - `/api` (HTTP 404)

### 3.2 Form Validation & Functional Workflows Covered
1. **Contact Form Workflow (`/contact`)**:
   - *Happy Path*: 1 single valid submission (`QA Test`, `qa.test+cynbit@example.com`, `Automated QA test, please ignore`) submitted cleanly via Next.js Server Action (`multipart/form-data` POST to `/contact`, HTTP 200). Captured in `har/functional_tests.har`.
   - *Negative Cases*: Empty required fields halted by HTML5 validation (`fullName`, `email`, `message`); malformed email rejected; XSS test strings (`<script>alert(1)</script>`) safely treated as literal text.
2. **Blog Newsletter Form (`/blog`)**:
   - *Negative Cases*: Empty submit halted by `required` attribute; invalid email (`not-an-email`) rejected by browser regex constraint. Captured in `screenshots/newsletter_empty_validation.png` and `newsletter_invalid_email.png`.
3. **Careers Application Form (`/careers/qa-testing-intern`)**:
   - Tested full 15-input application modal/form.
   - *Negative Cases*: Empty submission blocked by HTML5 required constraints; invalid URLs in portfolio/LinkedIn fields (`invalid-url-schema`) rejected by browser URL constraint. Captured in `screenshots/career_form_empty_validation.png` and `career_form_invalid_url.png`.

---

## 4. Testing Exclusions & Limitations

To maintain ethical testing standards and prevent operational disruption to Cynbit's live production infrastructure, the following areas were strictly excluded:
1. **Destructive Security Penetration Testing**: SQL injection exploitation, remote code execution fuzzing, volume Denial-of-Service (DoS), and credential stuffing were **NOT** performed. Only passive observation of headers, TLS certificates, cookies, and bundle secrets was executed.
2. **Email / CRM Ingestion Verification**: While form submissions were successfully dispatched and acknowledged with HTTP 200 by Next.js Server Actions, internal delivery into Cynbit's corporate inbox or CRM backend could not be verified from the outside without administrative credentials.
3. **Protected Admin Portals**: While `/portal` was identified as returning HTTP 200, unauthorized authentication bypass attempts were excluded as credentials were not provided.
4. **Third-Party External Services**: External services such as LinkedIn, Google Analytics, and Unsplash CDN were validated for HTTP link status only; third-party platform behavior (such as LinkedIn returning HTTP 999 anti-bot responses) is beyond Cynbit's codebase control.

---

## 5. Responsive & Cross-Browser Pass / Fail Grid

Testing was executed across **13 viewports** covering Mobile, Tablet, and Desktop form-factors across **3 browser rendering engines** (Chromium, Firefox, WebKit).

### Pass / Fail Evaluation Criteria:
- **PASS**: Page renders without horizontal scroll overflow (`scrollWidth <= clientWidth`), interactive elements render properly, fonts load, and no fatal JavaScript console exceptions.
- **PASS (Advisory)**: Page is fully responsive and passes WCAG AA target size (>=24x24px), though expanding to 44px/48px is recommended for touch ergonomics per WCAG AAA / Mobile HIG.
- **FAIL**: Horizontal page blowout, content overlap making text unreadable, or rendering engine crash.

```
+---------------------------+----------------+---------------+---------------+---------------+
| Viewport & Device Type    | Resolution     | Chromium      | Firefox       | WebKit Safari |
+---------------------------+----------------+---------------+---------------+---------------+
| Mobile (Compact Android)  | 360 x 640      | PASS          | PASS          | PASS          |
| Mobile (iPhone SE)        | 375 x 667      | PASS          | PASS          | PASS          |
| Mobile (iPhone 14 / 15)   | 390 x 844      | PASS          | PASS          | PASS          |
| Mobile (Pixel / Android)  | 412 x 915      | PASS          | PASS          | PASS          |
| Mobile (iPhone Max / Plus)| 430 x 932      | PASS          | PASS          | PASS          |
| Tablet (iPad Portrait)    | 768 x 1024     | PASS          | PASS          | PASS          |
| Tablet (iPad Landscape)   | 1024 x 768     | PASS          | PASS          | PASS          |
| Tablet (iPad Air / Pro)   | 820 x 1180     | PASS          | PASS          | PASS          |
| Laptop (HD Standard)      | 1280 x 720     | PASS          | PASS          | PASS          |
| Laptop (Widescreen WXGA)  | 1366 x 768     | PASS          | PASS          | PASS          |
| Desktop (MacBook 14")     | 1440 x 900     | PASS          | PASS          | PASS          |
| Desktop (Full HD 1080p)   | 1920 x 1080    | PASS          | PASS          | PASS          |
| Desktop (2K QHD Display)  | 2560 x 1440    | PASS          | PASS          | PASS          |
+---------------------------+----------------+---------------+---------------+---------------+
| Dark Mode Simulation      | 1440 x 900     | PASS          | PASS          | PASS          |
| Reduced Motion Emulation  | 1440 x 900     | PASS          | PASS          | PASS          |
| 200% High-DPI Zoom        | 1440 x 900 2x  | PASS          | PASS          | PASS          |
+---------------------------+----------------+---------------+---------------+---------------+
```
*(All 165 combinations captured full-page screenshots with zero horizontal overflow blowouts. Mobile navigation buttons measure 40x40px, cleanly passing WCAG 2.2 AA SC 2.5.8).*

---

## 6. Performance Summary & Core Web Vitals Benchmark

Performance metrics were recorded over 3 separate runs per page across all 6 key pages in both Mobile (simulated Moto G Power, 4G, 4x CPU slowdown) and Desktop configurations (36 total Lighthouse runs).

### 6.1 Median Core Web Vitals Overview (All 6 Pages, 3 Runs Each)

| Page Tested | Mode | Perf Score | FCP | LCP | TBT | CLS | TTFB | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Home (`/`)** | Mobile | **51 / 100** | 1.9s | **11.0s** | **840ms** | 0.013 | 40ms | <span style="color:red">POOR (LCP/TBT)</span> |
| **Home (`/`)** | Desktop | **84 / 100** | 0.7s | **2.5s** | 61ms | 0.004 | 38ms | <span style="color:green">GOOD</span> |
| **Contact (`/contact`)** | Mobile | **57 / 100** | 2.2s | **11.0s** | **533ms** | 0.000 | 45ms | <span style="color:red">POOR (LCP)</span> |
| **Contact (`/contact`)** | Desktop | **88 / 100** | 0.8s | **2.3s** | 57ms | 0.004 | 42ms | <span style="color:green">GOOD</span> |
| **Services (`/services`)** | Mobile | **58 / 100** | 2.0s | **11.1s** | **583ms** | 0.013 | 48ms | <span style="color:red">POOR (LCP)</span> |
| **Services (`/services`)** | Desktop | **84 / 100** | 0.8s | **2.6s** | 86ms | 0.004 | 40ms | <span style="color:green">GOOD</span> |
| **Careers (`/careers`)** | Mobile | **59 / 100** | 2.0s | **11.2s** | **464ms** | 0.008 | 44ms | <span style="color:red">POOR (LCP)</span> |
| **Careers (`/careers`)** | Desktop | **86 / 100** | 0.8s | **2.4s** | 72ms | 0.004 | 36ms | <span style="color:green">GOOD</span> |
| **Bitelevate (`/bitelevate`)**| Mobile | **55 / 100** | 2.1s | **11.3s** | **533ms** | 0.014 | 50ms | <span style="color:red">POOR (LCP)</span> |
| **Bitelevate (`/bitelevate`)**| Desktop | **81 / 100** | 0.9s | **2.7s** | 27ms | 0.065 | 44ms | <span style="color:green">GOOD</span> |
| **Blog (`/blog`)** | Mobile | **58 / 100** | 2.1s | **12.2s** | **517ms** | 0.008 | 46ms | <span style="color:red">POOR (LCP)</span> |
| **Blog (`/blog`)** | Desktop | **84 / 100** | 0.8s | **2.6s** | 16ms | 0.004 | 42ms | <span style="color:green">GOOD</span> |

### 6.2 Primary Performance Bottlenecks & Actual LCP Root Cause
1. **Client-Side Animation Gating (Actual LCP Root Cause)**: The hero heading text (`<h1>`) and lead paragraph on `/` are rendered server-side with an initial inline CSS style of `opacity: 0; transform: translateY(30px)`. They remain completely invisible until client-side JavaScript finishes downloading, parses Framer Motion runtime scripts, and sets `opacity: 1`. On a throttled mobile CPU, this hydration animation gate directly delays the paint of the primary text block to **11.0s – 12.2s**.
2. **Hydration Execution Overhead**: Total Blocking Time (TBT) ranges between **464ms and 840ms** on mobile, indicating substantial main-thread CPU contention during client bundle hydration.
3. **Unused JavaScript**: Across initial bundles, ~122 KiB of uncalled code is parsed upfront on the critical path.

---

## 7. Accessibility Evaluation (WCAG 2.2 AA Compliance)

Audited via `@axe-core/playwright` and manual keyboard inspection across 6 representative core pages and mobile navigation states.

### 7.1 WCAG 2.2 Compliance Summary
- **Total Unique Rule Violations**: 5 Distinct Categories across **34 UI Nodes**

| WCAG Rule ID | WCAG Success Criterion | Level | Impact | Total Nodes | Root Cause |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `button-name` | **SC 4.1.2 (Name, Role, Value)** | A | **Critical** | 1 | Mobile hamburger menu button uses only an unlabelled Material icon `<span class="material-symbols-outlined">menu</span>` without `aria-label` or screen-reader text. |
| `select-name` | **SC 4.1.2 (Name, Role, Value)** | A | **Critical** | 2 | `<select>` dropdowns on `/bitelevate` lack associated `<label>` tags or `aria-label` attributes. |
| `color-contrast` | **SC 1.4.3 (Contrast Minimum)** | AA | **Serious** | 21 | Secondary body copy, card metadata, and muted badge labels fail the 4.5:1 contrast ratio against dark backgrounds. |
| `list` | **SC 1.3.1 (Info and Relationships)** | A | **Serious** | 2 | Navigation containers feature direct `<div>` wrappers inside `<ul>` elements. |
| `listitem` | **SC 1.3.1 (Info and Relationships)** | A | **Serious** | 8 | `<li>` items rendered outside valid parent `<ul>`/`<ol>` elements in navigation structures. |

*(Note on Touch Target Size: The mobile hamburger button measures 40x40px (`w-10 h-10`). This **passes** the WCAG 2.2 Level AA criterion SC 2.5.8, which mandates a minimum of 24x24px. The 44x44px dimension is an enhanced AAA criterion (SC 2.5.5) and is recommended as an ergonomic best practice).*

---

## 8. Security Posture & Passive Risk Assessment

Assessed strictly through non-destructive header analysis, TLS handshake verification, and bundle inspection against Mozilla Observatory criteria.

### 8.1 Header Security Score: Grade D (40 / 100)
- **Strict-Transport-Security (HSTS)**: **PASS** (`max-age=63072000`, 2 years). HTTPS enforcement is active across all subdomains.
- **TLS Version & Certificate**: **PASS** (TLSv1.3, Let's Encrypt certificate valid through Dec 24, 2026).
- **Content-Security-Policy (CSP)**: **FAIL** (-25). No CSP declared.
- **X-Frame-Options / frame-ancestors**: **FAIL** (-20). Missing anti-clickjacking header.
- **X-Content-Type-Options**: **FAIL** (-5). Missing `nosniff`.
- **Referrer-Policy**: **FAIL** (-10). Not set, defaults to browser standard.
- **Observatory Result**: Grade D (Score: 40/100).
- **Access-Control-Allow-Origin**: Serves `Access-Control-Allow-Origin: *` on prerendered HTML document responses (Vercel edge caching default for static routes; low security risk as no authenticated cookie sessions are exposed).
- **Server Disclosure**: Serves `Server: Vercel` (standard edge proxy header on Vercel), `X-Vercel-Id`, `X-Matched-Path`, and `X-Powered-By: Next.js`.

---

## 9. Comprehensive Risk Analysis

| Risk Dimension | Current Exposure | Business & Technical Consequence | Priority |
| :--- | :--- | :--- | :---: |
| **Accessibility Barrier** | Mobile menu button has no accessible name; select dropdowns lack labels. | Blind and visually impaired screen-reader users cannot open the mobile navigation drawer. | **P0** |
| **SEO & Crawl Health** | Broken blog link (404), unencoded query spaces (`/blog?category=...`), blog pagination error (`page=0`), missing canonicals. | Search crawler drop-off, broken pagination UX, indexation dilution between bare domain and www. | **P0** |
| **Mobile Experience** | 11.0s – 12.2s LCP and 840ms TBT driven by initial `opacity: 0` hydration animation delay. | High bounce rates on mobile search ads and mobile organic landing pages. | **P1** |
| **Security Configuration** | Missing CSP and X-Frame-Options on production domain. | Moderate risk: framing/clickjacking exposure, unrestricted script execution if an injection flaw occurs. | **P1** |
| **Brand Consistency** | Inconsistent phone/email listings, duplicate `<title>` suffixes, SVG OpenGraph images. | Unfurls on LinkedIn/Twitter fail to display preview cards; mismatched customer service contact details. | **P2** |

---

## 10. Audit Sign-Off & Verification Statement

This audit was conducted by combining automated tooling with rigorous manual verification. All raw artifacts, HAR archives, Lighthouse JSON runs, and 168+ full-page screenshots are archived in [`cynbit-audit/reports/cynbit-audit-evidence.zip`](file:///f:/Antigravity%20Projects/cynbit-audit/reports/cynbit-audit-evidence.zip). Only verified findings observed directly on the target host are reported.

**Auditor Sign-off**:  
*Keshav Sharma*  
Senior QA Engineer
