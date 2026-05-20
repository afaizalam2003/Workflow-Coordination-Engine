import Link from "next/link";
import { Filter, Search, CheckCircle2, XCircle, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { API_URL } from "../../lib/config";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <span className="flex items-center text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full border border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</span>;
    case "failed":
      return <span className="flex items-center text-xs font-medium text-error bg-error/10 px-2 py-1 rounded-full border border-error/20"><XCircle className="w-3 h-3 mr-1" /> Failed</span>;
    case "active":
      return <span className="flex items-center text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20"><Clock className="w-3 h-3 mr-1" /> Active</span>;
    case "retrying":
      return <span className="flex items-center text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded-full border border-warning/20"><RefreshCw className="w-3 h-3 mr-1 animate-spin-slow" /> Retrying</span>;
    default:
      return <span>{status}</span>;
  }
}



export default async function WorkflowsPage() {
  let workflows = [];
  try {
    const res = await fetch(`${API_URL}/workflows`, { cache: "no-store" });
    if (res.ok) {
      workflows = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Workflows</h1>
          <p className="text-sm text-textMuted">Monitor and debug execution traces.</p>
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <input 
              type="text" 
              placeholder="Search ID, type..." 
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
              <th className="px-6 py-4 font-medium">Workflow ID</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Started</th>
              <th className="px-6 py-4 font-medium">Updated</th>
              <th className="px-6 py-4 font-medium">Retries</th>
              <th className="px-6 py-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workflows.map((wf: any) => (
              <tr key={wf.id} className="hover:bg-surfaceHover/50 transition-colors group">
                <td className="px-6 py-4 font-mono text-primary group-hover:underline">
                  <Link href={`/workflows/${wf.id}`}>{wf.id.split('-')[0]}...</Link>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{wf.workflow_type}</td>
                <td className="px-6 py-4"><StatusBadge status={wf.status} /></td>
                <td className="px-6 py-4 text-textMuted">{formatDistanceToNow(new Date(wf.created_at), { addSuffix: true })}</td>
                <td className="px-6 py-4 text-textMuted">{wf.updated_at ? formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true }) : "-"}</td>
                <td className="px-6 py-4">
                  {wf.retry_count > 0 ? (
                    <span className="text-warning font-medium">{wf.retry_count}</span>
                  ) : (
                    <span className="text-textMuted">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/workflows/${wf.id}`} className="text-primary hover:text-primaryHover font-medium text-xs">
                    View Trace
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
