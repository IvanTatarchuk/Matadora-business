/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint is run via `npm run lint`, not during `next build`.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  webpack: (config) => {
    // node_modules was populated via manual tarball extraction (no symlinks).
    // On Windows, fs.readlink on these regular files returns EISDIR instead of
    // EINVAL, which crashes webpack's symlink resolution. Disable it.
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
