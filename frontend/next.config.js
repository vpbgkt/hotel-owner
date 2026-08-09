/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  },
  // Proxy /uploads/* through Next.js so images work even when the backend
  // is behind a devtunnel or Codespaces URL that requires authentication.
  // The rewrite runs server-side so it uses the internal localhost URL.
  async rewrites() {
    const backendBase =
      (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api')
        .replace(/\/api\/?$/, '');
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendBase}/uploads/:path*`,
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  // Shorten the App Router client-side segment cache so navigating back to a
  // page (e.g. returning to /admin after creating a walk-in booking) re-renders
  // and re-runs client data fetches instead of showing a stale cached version.
  // Without this, static routes are cached for 5 minutes by default.
  // Note: Next.js enforces a minimum of 30s for staleTimes.static (0 is
  // rejected), so pages relying on always-fresh data also call router.refresh()
  // after mutations rather than depending solely on this setting.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

module.exports = nextConfig;

