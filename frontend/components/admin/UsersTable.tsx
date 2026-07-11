"use client";

import { useEffect, useState } from "react";

import { getAdminUsers, type AdminUser } from "@/lib/api";
import { formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

const tierStyles: Record<string, string> = {
  free: "text-ink-soft border-line",
  pro: "text-cyan border-cyan/25 bg-cyan/[0.08]",
  team: "text-violet border-violet/25 bg-violet/[0.08]",
};
const statusDot: Record<string, string> = { active: "bg-ok", banned: "bg-danger" };
const statusText: Record<string, string> = { active: "text-ok", banned: "text-danger" };

export default function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  useEffect(() => {
    void getAdminUsers().then((d) => setUsers(d.users.slice(0, 5))).catch(() => setUsers([]));
  }, []);

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold">👥 Recent Users</h3>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["User", "Tier", "Tokens Used", "Status"].map((h) => (
              <th key={h} className="text-left font-mono text-[10.5px] uppercase tracking-wide text-ink-muted pb-2.5 border-b border-line px-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-line/50 last:border-0">
              <td className="py-2.5 px-2.5 align-middle">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-cyan/20 text-cyan">
                    {(u.display_name || u.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px]">{u.display_name}</div>
                    <div className="font-mono text-[11px] text-ink-muted">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-2.5 align-middle">
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px]", tierStyles[u.plan])}>
                  {u.plan.toUpperCase()}
                </span>
              </td>
              <td className="py-2.5 px-2.5 align-middle font-mono text-xs">
                {formatTokens(u.tokens_used)} / {u.token_limit === null ? "∞" : formatTokens(u.token_limit)}
              </td>
              <td className="py-2.5 px-2.5 align-middle">
                <span className="flex items-center gap-1.5">
                  <span className={cn("inline-block w-[7px] h-[7px] rounded-full flex-shrink-0", statusDot[u.status])} />
                  <span className={cn("text-[12px] capitalize", statusText[u.status])}>{u.status}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
