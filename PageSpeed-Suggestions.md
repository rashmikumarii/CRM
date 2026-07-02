# PageSpeed & Core Web Vitals — OrthoNow Landing Page

Target: **90+ Mobile** in Lighthouse / PageSpeed Insights, green Core Web Vitals
(LCP < 2.5s, INP < 200ms, CLS < 0.1) on a mid-range Android over 4G.

This page was built performance-first. Below is (a) what the code already does,
and (b) the production checklist for the WordPress team when they port it.

---

## What this build already does

| Area | Technique | Effect |
|------|-----------|--------|
| **Render blocking** | One same-origin `styles.css`; JS loaded with `defer`. No blocking third parties in `<head>`. | HTML parses without waiting on JS; CSS is the only critical resource. |
| **Web fonts** | None — `system-ui` font stack. | Zero font requests, zero FOUT/FOIT, no font-driven CLS. |
| **Layout stability (CLS)** | Every `<img>` has explicit `width`/`height`; the Thank-You block replaces the form in place; sticky CTA has reserved space via body padding. | Near-zero layout shift. |
| **LCP** | LCP element is the hero `<h1>` (text, not an image) painted from inline system fonts. | LCP is text — paints on first frame, no image download. |
| **Images** | SVG assets (vector, tiny, cacheable); below-the-fold images use `loading="lazy"` with dimensions. | Minimal image bytes; off-screen images deferred. |
| **JavaScript** | ~4 KB of hand-written vanilla JS, no framework/library, single delegated click listener. | Tiny main-thread cost → low INP. |
| **Icons** | One SVG sprite via `<use>` — a single request for all icons, inherits `currentColor`. | Fewer requests, no icon-font. |
| **Accessibility (feeds SEO/UX score)** | Semantic landmarks, labelled inputs, skip link, AA contrast, visible focus, `prefers-reduced-motion`. | High a11y score, better real UX. |
| **SEO** | Title/description, canonical, Open Graph, `MedicalClinic` + `AggregateRating` JSON-LD. | Rich-result eligible, strong on-page SEO signals. |

---

## Production checklist (WordPress port)

### 1. Delivery & caching
- [ ] Serve over **HTTP/2 or HTTP/3** with **Brotli** (or gzip) compression for
      HTML/CSS/JS/SVG.
- [ ] Set **long cache headers** on static assets (`Cache-Control: public,
      max-age=31536000, immutable`) and fingerprint filenames
      (`styles.abc123.css`).
- [ ] Put static assets behind a **CDN** (Cloudflare/Fastly) — India edge PoPs
      matter for Bengaluru/Hyderabad/Chennai traffic.

### 2. CSS
- [ ] **Minify** `styles.css` (build step or a WP plugin like FlyingPress/WP
      Rocket). Ships ~40% smaller.
- [ ] Optionally **inline critical CSS** for the hero and defer the rest with
      `media="print"` + `onload` swap. Only needed if LCP is borderline; the
      single small stylesheet is usually fine.
- [ ] Add `<link rel="preload" as="style" href="styles.css">` if CSS is not
      inlined.

### 3. JavaScript & third parties
- [ ] Keep `defer` on `script.js`.
- [ ] **GTM is the main third-party risk.** Load only essential tags; move heavy
      pixels to **triggered / consent-gated** loading. Consider **server-side
      GTM** to cut client JS and improve INP.
- [ ] Add `rel="preconnect"` to `https://www.googletagmanager.com` (and any
      analytics origin) so the GTM handshake overlaps with parsing.

### 4. Images (when real photography replaces SVG placeholders)
- [ ] Use **AVIF/WebP** with a JPEG fallback; serve responsive `srcset`/`sizes`.
- [ ] `fetchpriority="high"` on the LCP image **only** (if the hero becomes an
      image); `loading="lazy"` on everything below the fold.
- [ ] Compress to ≤ ~100 KB per hero image; strip EXIF.

### 5. Fonts (only if brand fonts are mandated)
- [ ] `font-display: swap`, self-host WOFF2, `preload` the one weight used
      above the fold, and subset to Latin. Prefer sticking with system fonts.

### 6. Server / TTFB
- [ ] WordPress: enable **full-page caching** (host-level or WP Rocket) so
      landing-page HTML is served static — TTFB is the biggest WP LCP risk.
- [ ] Keep the page a **static-cacheable** template; do the dynamic clinic
      selection client-side (the hidden `clinic` field) so the HTML stays
      cacheable across all clinic campaigns.

### 7. Verify
- [ ] Run **PageSpeed Insights (Mobile)** and **Lighthouse CI** on every deploy;
      fail the build under 90.
- [ ] Watch **field data (CrUX)** in Search Console once live — lab ≠ field.
- [ ] Confirm **INP** with real interactions (form submit, sticky CTA) using the
      Web Vitals extension.

---

## Expected result

With system fonts, a text LCP element, a single small CSS file, deferred 4 KB of
JS, and no render-blocking third parties, this page should land **90–100 on
Mobile** out of the box. The only realistic score risks in production are
**(1) an unoptimised WordPress TTFB** and **(2) heavy marketing tags in GTM** —
both are addressed in the checklist above.
