/** @type {import('next').NextConfig} */
const target = process.env.API_PROXY_TARGET || "http://localhost:8000";

const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${target}/:path*` }];
  },
};

export default nextConfig;
