import type { ReactNode } from "react";
import { NO_INDEX_METADATA } from "@/lib/seo/no-index-metadata";

export const metadata = NO_INDEX_METADATA;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
