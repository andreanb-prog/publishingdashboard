const originalEmitWarning = process.emitWarning.bind(process)
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('DEP0169')) return
  originalEmitWarning(warning, ...args)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'pdfjs-dist'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
