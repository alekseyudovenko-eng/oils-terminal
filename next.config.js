/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Шрифты для PDF-отчёта по стране читаются с диска во время запроса — кладём их в сборку функции.
    outputFileTracingIncludes: {
      '/lab/countries/[code]/pdf': ['./assets/fonts/**/*'],
    },
  },
};

module.exports = nextConfig;
