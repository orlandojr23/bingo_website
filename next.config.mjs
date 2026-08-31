const isDev = process.env.NODE_ENV !== 'production';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://picsum.photos https://tile.openstreetmap.org https://cdnjs.cloudflare.com;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://api.openrouteservice.org;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  ${isDev ? '' : "frame-ancestors 'none';"}
  upgrade-insecure-requests;
`;

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          ...(isDev
            ? []
            : [
                {
                  key: 'X-Frame-Options',
                  value: 'DENY',
                },
              ]),
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
