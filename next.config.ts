import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
    //cacheComponents: true,
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
};

export default withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
})(nextConfig);
