/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },
  // SECURITY: headers de segurança movidos para src/middleware.ts.
  // Motivo: CSP precisa de nonce per-request (strict-dynamic), o que
  // headers estáticos do next.config NÃO suportam. Tudo (CSP + HSTS +
  // Permissions-Policy + COOP + X-Frame-Options + X-Content-Type-Options +
  // Referrer-Policy) agora é gerado dinamicamente no middleware Edge.
};

export default nextConfig;
