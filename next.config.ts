import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v41: TypeScript is checked explicitly with `npx tsc --noEmit` before build.
  // This avoids the Next 16.2.x build worker hanging on this large dynamic app.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
