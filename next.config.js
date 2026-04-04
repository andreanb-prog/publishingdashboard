/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'pdfjs-dist'],
  },
}

module.exports = nextConfig
