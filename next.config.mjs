import nextPwa from "next-pwa";

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: "CacheFirst",
      options: { cacheName: "static-images", expiration: { maxEntries: 64, maxAgeSeconds: 2592000 } },
    },
    {
      urlPattern: /\.(?:js|css|woff2?)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-resources", expiration: { maxEntries: 32, maxAgeSeconds: 604800 } },
    },
    {
      urlPattern: ({ url }) => url.pathname.startsWith("/_next/"),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "next-static", expiration: { maxEntries: 128, maxAgeSeconds: 2592000 } },
    },
    {
      urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
      handler: "NetworkOnly",
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2", "@node-rs/bcrypt"],
  },
};

export default withPWA(nextConfig);
