"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && (user as { role: string }).role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user || (user as { role: string }).role !== "admin") return null;
  return <>{children}</>;
}
