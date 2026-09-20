import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Standalone output for always-on Docker / Railway / Render
  output: 'standalone',
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
