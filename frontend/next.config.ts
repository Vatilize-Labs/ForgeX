import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @coinbase/cdp-sdk (pulled in transitively via @base-org/account →
  // @wagmi/connectors/baseAccount) imports Solana + axios packages we
  // don't use. Exclude it from client bundling entirely.
  serverExternalPackages: [
    "@coinbase/cdp-sdk",
    "@base-org/account",
    "@solana/kit",
    "@solana-program/system",
    "@solana-program/token",
  ],
  // turbopack: {},
};

export default nextConfig;
