import { AlertOctagon, RotateCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getFailures() {
  try {
    const res = await fetch(`${API_URL}/observability/failures`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return { dead_letter: [], active_retries: [] };
}

export default async function FailuresPage() {
  const data = await getFailures();
  const deadLetter = data?.dead_letter || [];
  const activeRetries = data?.active_retries || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-error flex items-center">
            <ShieldAlert className="w-6 h-6 mr-2" /> Failures & Retries
          </h1>
          <p className="text-sm text-textMuted">Monitor retry chains, exhausted retries, and dead-letter queues.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dead Letter */}
        <div className="card border-error/30 bg-error/5 p-6">
          <h3 className="text-lg font-semibold text-error mb-2 flex items-center">
            <AlertOctagon className="w-5 h-5 mr-2" /> Dead Letter Queue
            <span className="ml-2 text-sm font-normal text-error/70">({deadLetter.length})</span>
          </h3>
          <p className="text-sm text-textMuted mb-6">Workflows that have exhausted all retry attempts and require manual intervention.</p>

          {deadLetter.length === 0 ? (
            <div className="text-center py-8 text-textMuted">
              <AlertOctagon className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No failed workflows. All good! ✅</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deadLetter.map((item: any) => (
                <div key={item.id} className="bg-background border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Link href={`/workflows/${item.id}`} className="font-mono text-sm text-primary hover:underline">
                        {item.id.split("-")[0]}...
                      </Link>
                      <span className="text-xs text-textMuted ml-2 bg-surface px-2 py-0.5 rounded">{item.workflow_type}</span>
                    </div>
                    <span className="text-xs text-textMuted">
                      {item.updated_at ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true }) : "-"}
                    </span>
                  </div>
                  {item.last_error && (
                    <p className="text-xs font-mono text-error mt-2 break-words">{item.last_error}</p>
                  )}
                  <div className="mt-3 flex items-center space-x-2">
                    <span className="text-xs text-textMuted">Retries: <span className="text-warning font-medium">{item.retry_count}</span></span>
                    <Link href={`/workflows/${item.id}`}
                      className="text-xs px-3 py-1.5 bg-surface border border-border hover:bg-surfaceHover rounded transition-colors">
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Retries */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <RotateCw className="w-5 h-5 mr-2 text-warning" /> Active Retry Chains
            <span className="ml-2 text-sm font-normal text-textMuted">({activeRetries.length})</span>
          </h3>
          <p className="text-sm text-textMuted mb-6">Workflows currently undergoing exponential backoff.</p>

          {activeRetries.length === 0 ? (
            <div className="text-center py-8 text-textMuted">
              <RotateCw className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No active retries right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRetries.map((item: any) => (
                <div key={item.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-sm text-primary">
                        {item.event_id?.split("-")[0]}...
                      </span>
                      <span className="text-xs text-warning border border-warning/30 bg-warning/10 px-1.5 rounded">
                        Attempt #{item.retry_number}
                      </span>
                    </div>
                    {item.error_message && (
                      <p className="text-xs text-error/80 mt-1 truncate max-w-xs">{item.error_message}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-textMuted mb-1">Scheduled for</p>
                    <p className="text-sm font-medium">
                      {item.scheduled_for ? formatDistanceToNow(new Date(item.scheduled_for), { addSuffix: true }) : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
