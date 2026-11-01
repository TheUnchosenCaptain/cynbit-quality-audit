# Improvement Recommendations & Engineering Roadmap
**Target System**: [https://www.cynbit.in](https://www.cynbit.in)  
**Lead QA Engineer**: Keshav Sharma (Senior QA Engineer)  
**Audit Date**: November 02, 2026  
**Audience**: Engineering Leads, Frontend Developers, DevOps & QA Teams  
**Evidence Archive**: `cynbit-audit/reports/cynbit-audit-evidence.zip` (54.8 MB)

---

## 1. Prioritized Development Fixes

This roadmap prioritizes fixes based on business risk, accessibility compliance, SEO integrity, and mobile performance. Each recommendation includes an effort estimate (**S**: <1 day, **M**: 2-3 days, **L**: 1-2 weeks), expected impact, and an actionable implementation recipe.

### Priority P0: Critical Quality & Accessibility Blockers

---

#### 1.1 Add Accessible Name to Mobile Hamburger Button
- **Related Bug**: `BUG-01`
- **Effort Estimate**: **S (Small — 1 Hour)**
- **Expected Impact**: Immediate WCAG 2.2 Level A compliance for mobile navigation; screen-reader users can successfully discover and operate the navigation drawer.
- **Root Cause**: Mobile button uses only an unlabelled Material icon `<span class="material-symbols-outlined">menu</span>` without `aria-label` or accessible text.
- **Suggested Fix**:
  Update the mobile button in the global navigation component:
  ```tsx
  // Before:
  <button className="xl:hidden w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface active:scale-90 hover:bg-surface-container-high transition-all duration-200">
    <span className="material-symbols-outlined">menu</span>
  </button>

  // After:
  <button 
    type="button"
    aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
    aria-expanded={isMenuOpen}
    aria-controls="mobile-navigation-drawer"
    className="xl:hidden w-11 h-11 md:w-12 md:h-12 min-w-[44px] min-h-[44px] rounded-full bg-surface-container flex items-center justify-center text-on-surface active:scale-90 hover:bg-surface-container-high transition-all duration-200"
    onClick={toggleMenu}
  >
    <span className="material-symbols-outlined" aria-hidden="true">
      {isMenuOpen ? 'close' : 'menu'}
    </span>
  </button>
  ```
  *(Note on Target Size: Sizing to 44x44px provides enhanced touch ergonomics per Apple HIG and Android Material guidelines, though 40x40px already meets WCAG 2.2 AA SC 2.5.8's 24x24px baseline).*

---

#### 1.2 Fix Blog Pagination Link & Server Slug Resolution
- **Related Bug**: `BUG-02`, `BUG-03`, `BUG-04`
- **Effort Estimate**: **S (Small — 2 Hours)**
- **Expected Impact**: Restores seamless blog navigation, eliminates dead-end 404 links, and stops URI control character exceptions.
- **Suggested Fix**:
  1. **Fix Pagination Link**:
     On page 1, conditionally disable or omit the "Previous Page" anchor so it does not render `href="/blog?page=0"`:
     ```tsx
     {currentPage > 1 ? (
       <Link href={`/blog?page=${currentPage - 1}`} className="btn-pagination">Previous</Link>
     ) : (
       <span className="btn-pagination opacity-40 cursor-not-allowed" aria-disabled="true">Previous</span>
     )}
     ```
  2. **Add 301 Redirect for Broken Article Link**:
     Fix the slug typo in the 4 related blog posts, and add a server redirect in `next.config.js`:
     ```javascript
     async redirects() {
       return [
         {
           source: '/blog/transforming-business-through-custom-software',
           destination: '/blog/transforming-businesses-through-custom-software',
           permanent: true
         }
       ];
     }
     ```
  3. **URL-Encode Category Parameters**:
     Ensure dynamic category links safely encode whitespace:
     ```tsx
     <Link href={`/blog?category=${encodeURIComponent(category.name)}`}>
     ```

---

#### 1.3 Eliminate LCP Animation Gating & Optimize Mobile Hydration
- **Related Bug**: `BUG-05`
- **Effort Estimate**: **M (Medium — 2 Days)**
- **Expected Impact**: Reduces Mobile LCP from **11.0s – 12.2s down to <2.5s**; reduces Total Blocking Time (TBT) by 50%; lifts mobile Performance scores from 50s into the 80s.
- **Root Cause**: The hero text heading and paragraph are initially emitted in SSR HTML with inline `opacity: 0; transform: translateY(30px)`. They remain completely invisible until client-side Framer Motion scripts hydrate and fire, creating a severe 11-second paint delay on throttled mobile devices.
- **Suggested Fix**:
  Render the primary above-the-fold text as visible by default in SSR HTML, using progressive CSS keyframe enhancements rather than hiding text behind JavaScript hydration:
  ```tsx
  // Before (Blocks LCP on client JS execution):
  <div style={{ height: '100%', opacity: 0, transform: 'translateY(30px)' }}>
    <p>Cynbit Technologies architects the digital future...</p>
  </div>

  // After (Immediate LCP paint in initial HTML, animated via lightweight CSS):
  <div className="opacity-100 transition-opacity duration-500">
    <p className="text-base md:text-lg lg:text-xl text-on-surface-variant max-w-2xl font-body leading-relaxed font-medium text-left">
      Cynbit Technologies architects the digital future with autonomous AI agents...
    </p>
  </div>
  ```

---

### Priority P1: Architecture, Security & SEO Integrity

---

#### 1.4 Implement Defensive HTTP Security Headers
- **Related Bug**: `BUG-06`, `BUG-18`
- **Effort Estimate**: **S (Small — 3 Hours)**
- **Expected Impact**: Elevates Mozilla Observatory score from **Grade D (40/100) to Grade B**, eliminates Clickjacking vulnerability, suppresses framework metadata disclosure.
- **Suggested Fix**:
  Configure defensive headers in `next.config.js`:
  ```javascript
  // next.config.js
  const securityHeaders = [
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://analytics.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://images.unsplash.com https://*.cynbit.in https://i.pravatar.cc; connect-src 'self' https://analytics.google.com https://*.google-analytics.com; frame-ancestors 'none';"
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()'
    }
  ];

  module.exports = {
    poweredByHeader: false, // Suppresses X-Powered-By: Next.js
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders
        }
      ];
    }
  };
  ```
  *(Platform Note: The `Server: Vercel` header is injected by Vercel edge reverse proxies and cannot be modified. The wildcard `Access-Control-Allow-Origin: *` is Vercel's default for static edge prerendered assets and presents minimal risk on public marketing pages. Note that achieving a strict Grade A+ requires transitioning from `'unsafe-inline'` to nonce-based or hash-based CSP).*

---

#### 1.5 Standardize Metadata Template to Eliminate Duplicate Brand Suffixes
- **Related Bug**: `BUG-10`, `BUG-11`, `BUG-14`, `BUG-15`
- **Effort Estimate**: **S (Small — 3 Hours)**
- **Expected Impact**: Clean, professional `<title>` tags across all pages; unique metadata on `/case-studies`; accurate 404 title without duplicate suffixes; unified canonical indexing.
- **Suggested Fix**:
  1. **Root Layout Template (`app/layout.tsx`)**:
     ```typescript
     export const metadata: Metadata = {
       metadataBase: new URL('https://www.cynbit.in'),
       title: {
         default: 'Cynbit Technologies | AI Automation & Software Solutions Jaipur',
         template: '%s | Cynbit Technologies'
       },
       alternates: {
         canonical: './'
       }
     };
     ```
  2. **Page Child Metadata Exports (Strip Manual Brand Suffix)**:
     - In `app/careers/page.tsx`: Export `title: 'Careers'` (Renders as `Careers | Cynbit Technologies`).
     - In `app/contact/page.tsx`: Export `title: 'Contact Us - AI & Software Solutions'`.
     - In `app/blog/page.tsx`: Export `title: 'Insights & Ideas'`.
     - In `app/case-studies/page.tsx`: Export bespoke metadata:
       ```typescript
       export const metadata: Metadata = {
         title: 'Case Studies & Enterprise Impact',
         description: 'Explore how Cynbit delivers digital transformation, custom software, and autonomous AI automation for enterprise clients.'
       };
       ```
     - In `app/not-found.tsx`: Export title without manually appending brand suffix so the root template appends it cleanly:
       ```typescript
       export const metadata: Metadata = {
         title: '404 - Page Not Found',
         description: 'The requested page could not be located on Cynbit Technologies servers.',
         robots: { index: false, follow: true }
       };
       // Output: <title>404 - Page Not Found | Cynbit Technologies</title>
       ```

---

#### 1.6 Fix Social OpenGraph Image Format
- **Related Bug**: `BUG-12`
- **Effort Estimate**: **S (Small — 2 Hours)**
- **Expected Impact**: Social link previews unfurl correctly with high-resolution visual branding on LinkedIn, Twitter/X, and WhatsApp.
- **Suggested Fix**:
  Generate a dedicated 1200x630px raster image (`public/og-image.png`) and update root metadata:
  ```typescript
  openGraph: {
    title: 'Cynbit Technologies | AI Automation & Software Solutions',
    description: 'Premier software solutions and autonomous AI agents company based in Jaipur.',
    url: 'https://www.cynbit.in',
    siteName: 'Cynbit Technologies',
    images: [
      {
        url: 'https://www.cynbit.in/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cynbit Technologies Platform Preview'
      }
    ],
    locale: 'en_IN',
    type: 'website'
  }
  ```

---

#### 1.7 Add Labels to `<select>` Controls & Fix Semantic Lists
- **Related Bug**: `BUG-07`, `BUG-09`
- **Effort Estimate**: **S (Small — 3 Hours)**
- **Expected Impact**: Resolves all automated Axe-Core structural violations; achieves full semantic markup compliance.
- **Suggested Fix**:
  1. Add labels to course filter dropdowns on `/bitelevate`:
     ```tsx
     <label htmlFor="track-filter" className="sr-only">Filter Learning Paths</label>
     <select id="track-filter" aria-label="Filter Learning Paths" ...>
     ```
  2. Fix list containers in header and footer: Replace direct child `<div>` wrappers inside `<ul>` with standard `<li>` elements, or change container from `<ul>` to `<div>` or `<nav>`.

---

#### 1.8 Remediate Color Contrast Deficiencies on Dark Backgrounds
- **Related Bug**: `BUG-08`
- **Effort Estimate**: **S (Small — 2 Hours)**
- **Expected Impact**: Restores WCAG 2.2 AA SC 1.4.3 compliance across 21 UI nodes on dark surfaces, improving readability for low-vision users.
- **Root Cause**: Secondary text, metadata timestamps, and category pills utilize subdued Tailwind classes (`text-zinc-500`, `text-gray-400`) which achieve only 3.1:1 to 3.4:1 contrast ratios against dark `#09090b` / `#121214` backgrounds (below the 4.5:1 AA requirement).
- **Suggested Fix**:
  Elevate muted text color tokens across components from `text-zinc-500` / `text-gray-400` to `text-zinc-300` / `text-gray-200` (which delivers a compliant contrast ratio of >= 7.0:1):
  ```tsx
  // Before (Fails SC 1.4.3 with ~3.2:1 contrast against dark surface):
  <span className="text-zinc-500 text-xs font-medium">14 Min Read</span>
  <p className="text-gray-400 text-sm">Published on Jan 26, 2026</p>

  // After (Complies with SC 1.4.3 with > 7.0:1 contrast):
  <span className="text-zinc-300 text-xs font-medium">14 Min Read</span>
  <p className="text-gray-300 text-sm">Published on Jan 26, 2026</p>
  ```

---

### Priority P2: Content Consistency & Routing Polish

---

#### 1.9 Synchronize Contact Details Across Touchpoints & Correct CTA Link
- **Related Bug**: `BUG-13`, `BUG-16`, `BUG-17`
- **Effort Estimate**: **S (Small — 2 Hours)**
- **Expected Impact**: Eliminates customer service confusion; ensures "Our impact" CTA routes to `/impact` using valid HTML.
- **Suggested Fix**:
  1. **Update CTA Link on `/contact`**:
     Replace invalid button-in-anchor nesting with a properly styled Next.js `<Link>`:
     ```tsx
     // Before (Invalid HTML - button nested inside anchor):
     <a href="/case-studies"><button className="...">Our impact</button></a>

     // After (Valid HTML5 Next.js Link styled with button classes):
     <Link 
       href="/impact" 
       className="inline-flex items-center justify-center px-6 py-3 rounded-full font-bold bg-primary text-white hover:bg-primary-hover transition-all duration-200"
     >
       Our impact
     </Link>
     ```
  2. **Align Contact Information**:
     Synchronize `/contact` and the global footer to show identical details:
     - Phone numbers: `+91 89479 62667`, `+91 78912 09777`, `+91 83023 37367`.
     - Email addresses: `opportunities@cynbit.in` and `support@cynbit.in`.
  3. **Standardize Uptime Statistics on `/case-studies`**:
     Standardize hero card and bottom section to a single verified SLA metric (e.g. `99.9%`).

---

## 2. Recommended Automated QA Testing Strategy

To safeguard regressions over future releases, the dev team should deploy a continuous 4-tier testing pipeline.

```
       / \
      / E2E \       Playwright End-to-End User Workflows
     /-------\
    / Visual  \     Playwright Visual Regression Snapshot Testing
   /-----------\
  / Access/Perf \   Lighthouse CI Budgets & Axe-Core Automated Scans
 /---------------\
/ Unit/Component  \ Vitest / React Testing Library Component Tests
-------------------
```

### 2.1 Playwright End-to-End Test Suite
Automate critical user journeys in CI:
1. **Contact Form Submission**:
   - Verify required field validation, invalid email rejection, Server Action dispatch, and success state.
2. **Newsletter & Careers Application**:
   - Verify negative constraints on email and career application fields (URL formats, required checkboxes).
3. **Blog Navigation**:
   - Verify pagination controls (ensuring no `page=0` links) and category filter encoding.

Sample Playwright Test Spec (`e2e/forms.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Form Validation & Integrity', () => {
  test('Contact form should block empty submit and invalid email', async ({ page }) => {
    await page.goto('/contact');
    const submitBtn = page.getByRole('button', { name: /send|submit|get in touch/i });
    await submitBtn.click();
    
    // Validate email field using visible accessible label
    const emailInput = page.getByLabel(/email/i);
    expect(await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity())).toBe(true);

    await emailInput.fill('invalid-format');
    await submitBtn.click();
    expect(await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity())).toBe(true);
  });

  test('Blog pagination should not expose page=0', async ({ page }) => {
    await page.goto('/blog');
    const prevLink = page.locator('a[href*="page=0"]');
    expect(await prevLink.count()).toBe(0);
  });
});
```

---

### 2.2 Continuous Accessibility Testing (Axe in CI)
Run `@axe-core/playwright` as a blocking GitHub Action on every Pull Request:
```typescript
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('Should meet WCAG 2.2 AA standards on key pages', async ({ page }) => {
  await page.goto('/contact');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

---

### 2.3 Lighthouse CI Performance Budgets
Deploy `.lighthouserc.json` in repository root to prevent hydration and performance regressions:
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["https://www.cynbit.in/", "https://www.cynbit.in/contact"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.80 }],
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

---

## 3. Pre-Release QA Regression Checklist

Every deployment to staging or production should require sign-off against this checklist:

### 3.1 Functional & Navigation
- [ ] Primary brand logo routes cleanly to `/`.
- [ ] Mobile hamburger toggle opens, closes, traps focus, and has `aria-label`.
- [ ] Contact form validates required fields and dispatches Server Action with HTTP 200.
- [ ] Newsletter form validates email syntax.
- [ ] Careers application form validates URLs in portfolio/LinkedIn fields.
- [ ] Blog pagination on page 1 does not link to `page=0`.
- [ ] Blog category filter URLs contain valid percent-encoded strings (`%20`).
- [ ] "Our impact" CTA link on `/contact` routes to `/impact` using valid HTML.
- [ ] Custom 404 page returns HTTP 404 and displays `404 - Page Not Found | Cynbit Technologies`.

### 3.2 Responsive & Cross-Browser
- [ ] Page renders without horizontal scroll (`scrollWidth <= clientWidth`) on 360px mobile width.
- [ ] Interactive touch targets meet or exceed 24x24px (WCAG AA) and target 44x44px.
- [ ] Sticky header docks cleanly without content overlap during scrolling.
- [ ] Tested on latest versions of Chromium, Firefox, and WebKit (Safari).

### 3.3 Performance & Core Web Vitals
- [ ] Hero heading text paints immediately in initial HTML without `opacity: 0` hydration gating.
- [ ] Mobile Largest Contentful Paint (LCP) is under 2.5 seconds.
- [ ] Mobile Total Blocking Time (TBT) is under 200 ms.
- [ ] Cumulative Layout Shift (CLS) is under 0.1.

### 3.4 Accessibility (WCAG 2.2 AA)
- [ ] Zero critical or serious Axe-Core violations.
- [ ] All icon buttons (`menu`, `close`, social links) possess descriptive `aria-label` tags.
- [ ] Form `<select>` controls possess associated `<label>` or `aria-label` attributes.
- [ ] Color contrast for body and secondary text meets or exceeds 4.5:1 (using tokens like `text-zinc-300`).
- [ ] List semantics are valid (`<ul>` contains only `<li>` elements).

### 3.5 Security & SEO Hygiene
- [ ] HTTP-to-HTTPS redirect functions for both `cynbit.in` and `www.cynbit.in`.
- [ ] Security headers present: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- [ ] `X-Powered-By: Next.js` header is suppressed.
- [ ] No duplicate brand suffixes in `<title>` tags across any page.
- [ ] `/case-studies` possesses unique title and meta description.
- [ ] OpenGraph image references raster image format (`.png`/`.jpg`), not `.svg`.
- [ ] Self-referencing `rel="canonical"` tag matches active domain on all pages.
