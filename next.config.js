const originalEmitWarning = process.emitWarning.bind(process)
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('DEP0169')) return
  originalEmitWarning(warning, ...args)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'pdfjs-dist'],
  },
  async redirects() {
    return [
      {
        source: '/writing-notebook',
        destination: '/dashboard/writing-notebook',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
