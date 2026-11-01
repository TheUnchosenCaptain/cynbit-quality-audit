# Quality Engineering Audit & Automated Test Suite — Cynbit Technologies

**Target System**: [https://www.cynbit.in](https://www.cynbit.in)  
**Role**: QA Testing Intern Practical Assessment  
**Lead QA Engineer**: Keshav Sharma (Senior QA Engineer)  
**Date**: November 02, 2026  
**Status**: 100% Empirically Verified on Live Production Host  

---

## 📋 Required Deliverables Quick Links

| Deliverable | Description | PDF Document | Markdown Document |
| :--- | :--- | :---: | :---: |
| **1. QA Audit Report** | Full methodology, crawl inventory (84 active URLs), responsive matrix across 13 viewports & 3 browser engines, Lighthouse Web Vitals (36 runs median), WCAG 2.2 AA accessibility scan, and passive security posture. | [01_QA_Audit_Report.pdf](./reports/01_QA_Audit_Report.pdf) | [01_QA_Audit_Report.md](./reports/01_QA_Audit_Report.md) |
| **2. Bug & Issue Report** | 18 empirically reproduced defects sorted by severity (2 High, 11 Medium, 5 Low) with step-by-step reproduction, actual vs expected results, DOM evidence, and logs. | [02_Bug_and_Issue_Report.pdf](./reports/02_Bug_and_Issue_Report.pdf) | [02_Bug_and_Issue_Report.md](./reports/02_Bug_and_Issue_Report.md) |
| **3. Improvement Recommendations** | Actionable engineering roadmap prioritizing P0 blockers, P1 architectural fixes (CSP, LCP hydration optimization), P2 content sync, sample Playwright CI specs, and pre-release checklist. | [03_Improvement_Recommendations.pdf](./reports/03_Improvement_Recommendations.pdf) | [03_Improvement_Recommendations.md](./reports/03_Improvement_Recommendations.md) |
| **📦 Evidence Archive** | 52.3 MB complete raw test artifacts (168+ screenshots, 72 Lighthouse JSON/HTML reports, Axe JSON scans, HAR file, crawl logs). | [cynbit-audit-evidence.zip](./reports/cynbit-audit-evidence.zip) | — |

---

## 📊 Executive Quality Scorecard

| Category | Score / Grade | Status | Key Highlights |
| :--- | :---: | :---: | :--- |
| **Functional & Workflows** | **78 / 100** *(Auditor assessment)* | Needs Attention | Core lead forms submit cleanly via Next.js Server Actions (`HTTP 200`). Dead-end 404 link on 4 blog posts, blog pagination page 0 defect, unencoded query whitespace, and contact detail mismatches. |
| **Responsive & Cross-Browser**| **92 / 100** *(Auditor assessment)* | Good | 165 combinations tested across Chromium, Firefox, WebKit. Zero horizontal overflow blowouts. Touch targets pass WCAG AA (>=24px; 40px mobile hamburger meets baseline). |
| **Performance & Web Vitals** | **56 / 100 (Mobile Avg)<br>84.5 / 100 (Desktop Avg)** | Poor (Mobile)<br>Good (Desktop) | Severe mobile hydration bottleneck. Mobile LCP averages 11.0s – 12.2s due to SSR `opacity: 0` animation gating and client script hydration delays. |
| **Accessibility (WCAG 2.2 AA)**| **72 / 100** *(Auditor assessment)* | Non-Compliant | 34 violating nodes across 5 rules: unlabelled mobile hamburger button (`button-name`), unlabelled select tags on `/bitelevate` (`select-name`), 21 low-contrast nodes, and broken list semantics. |
| **Security (Passive Audit)** | **Grade D (40 / 100)** *(Observatory)* | Moderate Risk | TLS 1.3 & HSTS active. Missing CSP, X-Frame-Options (Clickjacking vulnerability), X-Content-Type-Options, and Referrer-Policy. Prerendered HTML emits wildcard CORS. |
| **SEO & Content Quality** | **80 / 100** *(Auditor assessment)* | Satisfactory | Sitemap and robots.txt valid. Missing canonical tags on core brand pages, duplicate brand title suffixes, and `.svg` OpenGraph preview images unsupported by social scrapers. |

---

## 🛠️ Test Environment & Tooling Arsenal

- **Runtime**: Node.js `v24.14.0`, npm `11.9.0`, Python `3.14.3` on Windows 11 Enterprise x64
- **Browser Automation**: Playwright `1.58.0` driving genuine Chromium (`156.0`), Firefox (`157.0`), WebKit Safari (`27.2`)
- **Performance Benchmarking**: Google Lighthouse CLI `13.6.0` (3 runs median on mobile & desktop across 6 core pages = 36 runs)
- **Accessibility Engine**: `@axe-core/playwright` (`axe-core 4.10.2`) enforcing WCAG 2.0, 2.1, 2.2 Level A/AA
- **Target Infrastructure**: Vercel Edge Network (`bom1` PoP, Let's Encrypt TLS 1.3)

---

## 📁 Repository Directory Structure

```text
cynbit-audit/
├── reports/
│   ├── 01_QA_Audit_Report.pdf
│   ├── 01_QA_Audit_Report.md
│   ├── 02_Bug_and_Issue_Report.pdf
│   ├── 02_Bug_and_Issue_Report.md
│   ├── 03_Improvement_Recommendations.pdf
│   ├── 03_Improvement_Recommendations.md
│   └── cynbit-audit-evidence.zip       # 52.3 MB complete artifact archive
├── scripts/
│   ├── recon_crawler.py                # Crawls sitemap & builds 84-URL inventory
│   ├── functional_test.js              # Playwright form submission & HAR capture
│   ├── additional_forms_test.js        # Newsletter & career modal validation
│   ├── matrix_runner.js                # 165 cross-browser responsive screenshots
│   ├── visual_analysis.py              # Visual inspection of screenshots
│   ├── lighthouse_runner.js            # Automated 36 Lighthouse mobile/desktop runs
│   ├── axe_audit.js                    # Axe-core WCAG 2.2 evaluation
│   ├── axe_aggregate.py                # Rule & node aggregation
│   ├── security_audit.py               # Headers, TLS, CORS, cookies verification
│   ├── seo_content_audit.py            # Metadata, OpenGraph, title consistency
│   └── export_reports_to_pdf.js        # Markdown to publication-quality A4 PDF
├── screenshots/                        # 168+ full-page responsive screenshots
├── lighthouse/                         # 72 raw JSON & HTML reports
├── axe/                                # Automated WCAG violation JSON exports
├── har/                                # Captured network HAR streams
└── logs/                               # Structured JSON audit results
```

---

## 🚀 How to Reproduce & Execute the Automation Suite

1. **Clone repository**:
   ```bash
   git clone https://github.com/<your-username>/cynbit-quality-audit.git
   cd cynbit-quality-audit
   ```

2. **Install dependencies**:
   ```bash
   npm install
   npx playwright install chromium firefox webkit
   ```

3. **Run automated functional & accessibility tests**:
   ```bash
   node scripts/functional_test.js
   node scripts/axe_audit.js
   ```

4. **Re-generate PDF reports**:
   ```bash
   node scripts/export_reports_to_pdf.js
   ```
