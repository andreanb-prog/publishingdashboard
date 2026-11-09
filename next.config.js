/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  // Old dashboard URLs land on the new homepage instead of a 404.
  async redirects() {
    return ['/dashboard/:path*', '/pricing', '/waitlist', '/freeresources', '/demo', '/login', '/content/:path*'].map(
      (source) => ({ source, destination: '/', permanent: false }),
    )
  },
}

module.exports = nextConfig
