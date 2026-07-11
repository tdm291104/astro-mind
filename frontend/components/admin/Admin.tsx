"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import AdminShell from "@/components/admin/AdminShell";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminUsersPage from "@/components/admin/AdminUsersPage";
import AdminUsagePage from "@/components/admin/AdminUsagePage";
import AdminSourcesPage from "@/components/admin/AdminSourcesPage";
import AdminQuotasPage from "@/components/admin/AdminQuotasPage";
import { SECTIONS, type Section } from "@/components/admin/admin-sections";

export default function Admin() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("section");
  const section: Section = (SECTIONS as string[]).includes(raw ?? "") ? (raw as Section) : "overview";

  const setSection = useCallback(
    (s: Section) => router.replace(s === "overview" ? "/admin" : `/admin?section=${s}`),
    [router],
  );

  function renderPage() {
    switch (section) {
      case "overview": return <AdminOverview />;
      case "users":    return <AdminUsersPage />;
      case "usage":    return <AdminUsagePage />;
      case "sources":  return <AdminSourcesPage />;
      case "quotas":   return <AdminQuotasPage />;
      default:         return <AdminOverview />;
    }
  }

  return (
    <AdminShell sidebar={<AdminSidebar section={section} onSelect={setSection} />}>
      {renderPage()}
    </AdminShell>
  );
}
