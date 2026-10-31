import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // Emits .next/standalone with a minimal server and only the traced runtime
  // files. The Dockerfile ships that folder; npm start keeps working as before.
  output: "standalone",
  serverExternalPackages: [
    "pdfkit",
    "sharp",
    "nodemailer",
    "read-excel-file",
    "write-excel-file",
  ],
  outputFileTracingIncludes: {
    "/*": ["./assets/**/*", "./public/images/participants/*"],
    "/api/admin/certificates/generate": [
      "./public/images/Template Sertifikat.png",
    ],
  },
  outputFileTracingExcludes: { "/*": ["./.data/**/*", "./.env*"] },
};

export default nextConfig;
