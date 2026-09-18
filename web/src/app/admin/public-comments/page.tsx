import type { Route } from "next";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default function AdminPublicCommentsIndexPage() {
  redirect(routes.adminPublicComments() as Route);
}
