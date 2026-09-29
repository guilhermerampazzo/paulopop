/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    localPatterns: [
      {
        pathname: '/uploads/**',
      },
    ],
  },
  // Headers de segurança (5.4)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://elfsightcdn.com https://*.elfsightcdn.com https://apps.elfsight.com https://static.elfsight.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://connect.facebook.net https://*.clarity.ms",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://elfsightcdn.com https://*.elfsightcdn.com https://static.elfsight.com",
              "font-src 'self' https://fonts.gstatic.com https://elfsightcdn.com https://*.elfsightcdn.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://*.clarity.ms https://*.doubleclick.net",
              "frame-src 'self' https://www.youtube.com https://*.youtube.com https://*.google.com https://www.googletagmanager.com https://www.facebook.com https://www.openstreetmap.org https://openstreetmap.org https://elfsightcdn.com https://apps.elfsight.com",
              "media-src 'self' https:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
