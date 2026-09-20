import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Standalone is for Docker / Railway / Render only — breaks Vercel serverless APIs
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  reactStrictMode: true,
  serverExternalPackages: ['firebase-admin'],
  turbopack: {
    resolveAlias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(rootDir, 'src'),
    }
    return config
  },
}

export default nextConfig
