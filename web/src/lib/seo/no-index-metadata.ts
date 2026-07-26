import type { Metadata } from "next";

export const NO_INDEX_METADATA = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
} satisfies Metadata;
