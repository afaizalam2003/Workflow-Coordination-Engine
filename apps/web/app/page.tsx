import { Activity, AlertCircle, CheckCircle2, RefreshCw, Zap, Clock } from "lucide-react";
import Link from "next/link";

async function getOverview() {
  try {
    const res = await fetch("http://127.0.0.1:8000/observability/overview", { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return null;
}

async function getWorkflows() {
  try {
    const res = await fetch("http://127.0.0.1:8000/workflows?limit=10", { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return [];
}

function StatCard({ title, value, icon: Icon, colorClass, sub }: any) {
  return (
    <div className="card p-5 hover:border-border/80 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-textMuted text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-md bg-background border border-border ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold">{value ?? "—"}</span>
        {sub && <span className="text-xs text-textMuted">{sub}</span>}
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  completed: "text-success",
  failed: "text-error",
  pending: "text-primary",
  processing: "text-warning",
  retrying: "text-warning",
};

export default async function DashboardPage() {
  const [overview, workflows] = await Promise.all([getOverview(), getWorkflows()]);

  const byStatus = overview?.workflows_by_status || {};
  const total = (Object.values(byStatus) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Operations Overview</h1>
          <p className="text-sm text-textMuted">Real-time workflow execution metrics.</p>
        </div>
        <div className="flex items-center text-xs text-textMuted bg-surface px-3 py-1.5 rounded-md border border-border">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          Live Data
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Workflows" value={total} icon={Activity} colorClass="text-primary" />
        <StatCard title="Completed" value={byStatus["completed"] ?? 0} icon={CheckCircle2} colorClass="text-success" />
        <StatCard title="Failed" value={byStatus["failed"] ?? 0} icon={AlertCircle} colorClass="text-error" />
        <StatCard title="Pending Retries" value={overview?.pending_retries ?? 0} icon={RefreshCw} colorClass="text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workflows */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Recent Workflows</h3>
              <Link href="/workflows" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-2">
              {workflows.length === 0 ? (
                <p className="text-textMuted text-sm text-center py-8">No workflows yet. <Link href="/document-intelligence/new" className="text-primary hover:underline">Create one →</Link></p>
              ) : (
                workflows.slice(0, 8).map((wf: any) => (
                  <Link key={wf.id} href={`/workflows/${wf.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-surfaceHover transition-colors group">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs text-primary group-hover:underline">{wf.id.split("-")[0]}...</span>
                      <span className="text-xs text-textMuted">{wf.workflow_type}</span>
                    </div>
                    <span className={`text-xs font-medium ${STATUS_COLOR[wf.status] || "text-textMuted"}`}>{wf.status}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-primary" /> Status Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(byStatus).length === 0 ? (
                <p className="text-textMuted text-sm">No data yet</p>
              ) : (
                Object.entries(byStatus as Record<string, number>).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-mono ${STATUS_COLOR[status] || "text-textMuted"}`}>{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${status === "completed" ? "bg-success" : status === "failed" ? "bg-error" : status === "pending" ? "bg-primary" : "bg-warning"}`}
                        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-textMuted" /> Dead Letter Queue
            </h3>
            <div className={`text-3xl font-bold mb-1 ${(overview?.dead_letter_retries ?? 0) > 0 ? "text-error" : "text-success"}`}>
              {overview?.dead_letter_retries ?? 0}
            </div>
            <p className="text-xs text-textMuted">
              {(overview?.dead_letter_retries ?? 0) > 0 ? "Needs manual intervention" : "All clear"}
            </p>
            {(overview?.dead_letter_retries ?? 0) > 0 && (
              <Link href="/failures" className="mt-3 text-xs text-error hover:underline block">Review failures →</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
