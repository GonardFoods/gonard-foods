import type { NextConfig } from "next";

// Applied to every response
const globalHeaders = [
  // Prevent browsers from guessing content types — blocks MIME-sniffing attacks
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Block the site from being embedded in any iframe — prevents clickjacking
  { key: "X-Frame-Options", value: "DENY" },

  // Only send the origin (no path/query) as a referrer to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Force HTTPS for 2 years once a browser has visited once (Vercel enforces HTTPS anyway,
  // but this makes browsers refuse to downgrade even if something goes wrong)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

  // Disable browser features this site doesn't use — limits damage if XSS occurs
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },

  // Content Security Policy:
  //   default-src 'self'              — block everything not listed below by default
  //   script-src 'unsafe-inline'      — Next.js injects inline hydration scripts; required
  //   style-src  'unsafe-inline'      — site uses React inline styles throughout; required
  //   img-src    data: blob:          — Next.js image optimisation uses data URIs and blobs
  //              *.vercel-storage.com — Vercel Blob (uploaded product/team/homepage photos)
  //              logo.clearbit.com    — bank logos in the Pay modal
  //   font-src   'self'               — fonts served locally via next/font
  //   connect-src 'self'             — all fetch/XHR calls are same-origin API routes
  //   frame-ancestors 'none'         — belt-and-suspenders alongside X-Frame-Options
  //   object-src  'none'             — block Flash/plugin embeds
  //   base-uri    'self'             — prevent base-tag hijacking
  //   form-action 'self'             — forms only post to same-origin endpoints
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.vercel-storage.com https://logo.clearbit.com",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

// Tell search engines not to index admin pages
const adminHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/(.*)",        headers: globalHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
    ];
  },
};

export default nextConfig;
