import { History, Search, Filter } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getAuditLogs() {
  try {
    const res = await fetch(`${API_URL}/observability/audit?limit=100`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return [];
}

function actionColor(action: string) {
  if (action.includes("fail") || action.includes("dead") || action.includes("error")) {
    return "border-error/30 text-error";
  }
  if (action.includes("retry") || action.includes("scheduled")) {
    return "border-warning/30 text-warning";
  }
  if (action.includes("completed") || action.includes("created")) {
    return "border-success/30 text-success";
  }
  return "border-border text-textMain";
}

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center">
            <History className="w-6 h-6 mr-2" /> Audit Logs
          </h1>
          <p className="text-sm text-textMuted">
            Immutable ledger of state transitions and system events.
            <span className="ml-2 text-primary font-medium">{logs.length} records</span>
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              placeholder="Search action..."
              className="bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors w-64"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-surface border border-border rounded-md text-sm hover:bg-surfaceHover transition-colors text-textMuted">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-textMuted uppercase bg-surface border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">Workflow</th>
              <th className="px-6 py-4 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-textMuted">
                  No audit logs yet. Create a booking to generate logs.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-surfaceHover/50 transition-colors">
                  <td className="px-6 py-3 text-textMuted whitespace-nowrap">
                    {log.timestamp ? format(new Date(log.timestamp), "HH:mm:ss.SSS") : "-"}
                    <div className="text-textMuted/50 text-[10px]">
                      {log.timestamp ? format(new Date(log.timestamp), "MMM dd") : ""}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded bg-surface border ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {log.workflow_id ? (
                      <Link href={`/workflows/${log.workflow_id}`} className="text-primary hover:underline">
                        {log.workflow_id.split("-")[0]}...
                      </Link>
                    ) : (
                      <span className="text-textMuted">system</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-textMuted max-w-xs truncate">
                    {log.metadata && Object.keys(log.metadata).length > 0
                      ? JSON.stringify(log.metadata)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
