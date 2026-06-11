/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Compilacao falha se houver erro de tipo ou ESLint. Configuracao anterior
  // (ignoreBuildErrors=true) foi apontada como critica pela auditoria externa:
  // bugs financeiros podiam chegar em producao sem deteccao.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
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
