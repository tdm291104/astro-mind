import { Suspense } from "react";

import Admin from "@/components/admin/Admin";
import AdminGate from "@/components/admin/AdminGate";

export default function AdminPage() {
  return (
    <AdminGate>
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    </AdminGate>
  );
}
