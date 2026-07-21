import type { NextConfig } from "next";

// Se GITHUB_PAGES=true, gera site estático para GitHub Pages
// Caso contrário, gera build normal com servidor (para Vercel, preview, etc)
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/cargafrete" : "",
  trailingSlash: isGithubPages,
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typedRoutes: true,
};

export default nextConfig;
