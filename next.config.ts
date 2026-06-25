import withPWA from '@ducanh2912/next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    //cacheComponents: true,
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
};

const withPWAConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
});

const withBundleAnalyzerConfig = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

export default withSentryConfig(withBundleAnalyzerConfig(withPWAConfig(nextConfig)), {
    ...(process.env.SENTRY_ORG && { org: process.env.SENTRY_ORG }),
    ...(process.env.SENTRY_PROJECT && { project: process.env.SENTRY_PROJECT }),
    // Needed to upload source maps and create a release tagged with the deploy's
    // Git SHA, so stack traces resolve to real source and tie back to a deploy.
    ...(process.env.SENTRY_AUTH_TOKEN && { authToken: process.env.SENTRY_AUTH_TOKEN }),
    silent: !process.env.CI,
    widenClientFileUpload: true,
    webpack: {
        treeshake: { removeDebugLogging: true },
        automaticVercelMonitors: true,
    },
});
