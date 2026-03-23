import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    //cacheComponents: true,
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
    reactCompiler: true,
};

export default nextConfig;
