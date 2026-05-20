import { CheckCircle2, XCircle, Clock, RotateCw, FileText, Database, Server, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { AutoRefresh } from "../../../components/AutoRefresh";
import { API_URL } from "../../../lib/config";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let workflow: any = null;
  let error = false;

  try {
    const res = await fetch(`${API_URL}/workflows/${id}`, { cache: "no-store" });
    if (res.ok) {
      workflow = await res.json();
    } else {
      error = true;
    }
  } catch {
    error = true;
  }

  if (error || !workflow) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Workflow Not Found</h2>
          <p className="text-textMuted text-sm font-mono">{id}</p>
        </div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/20",
    failed: "bg-error/10 text-error border-error/20",
    pending: "bg-primary/10 text-primary border-primary/20",
    running: "bg-warning/10 text-warning border-warning/20",
    retrying: "bg-warning/10 text-warning border-warning/20",
    awaiting_human_review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    manual_override: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    escalation_required: "bg-red-500/10 text-red-500 border-red-500/20",
    approval_pending: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  const eventIconMap: Record<string, any> = {
    completed: <CheckCircle2 className="w-4 h-4" />,
    failed: <XCircle className="w-4 h-4" />,
    pending: <Clock className="w-4 h-4" />,
    retrying: <RotateCw className="w-4 h-4" />,
  };

  const eventBgMap: Record<string, string> = {
    completed: "bg-success",
    failed: "bg-error animate-pulse",
    pending: "bg-primary",
    retrying: "bg-warning",
  };

  const isFinished = ["completed", "failed", "awaiting_human_review"].includes(workflow.status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {!isFinished && <AutoRefresh intervalMs={1500} />}
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{workflow.workflow_type}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor[workflow.status] || "bg-surface text-textMuted border-border"}`}>
              {workflow.status}
            </span>
          </div>
          <p className="text-sm text-textMuted font-mono">{workflow.id}</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-surface border border-border rounded-md text-sm hover:bg-surfaceHover transition-colors flex items-center">
            <RotateCw className="w-4 h-4 mr-2" /> Retry Failed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Event Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-textMuted" /> Execution Timeline
            </h3>

            {workflow.events && workflow.events.length > 0 ? (
              <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-border">
                {workflow.events.map((event: any) => (
                  <div key={event.id} className="relative flex items-start group">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-background ${eventBgMap[event.status] || "bg-primary"} text-background shrink-0 shadow absolute left-0 -translate-x-1/2 mt-1`}>
                      {eventIconMap[event.status] || <Clock className="w-4 h-4" />}
                    </div>
                    <div className={`card p-4 ml-6 w-full ${event.status === "failed" ? "border-error/50 bg-error/5" : event.status === "retrying" ? "border-warning/30 bg-warning/5" : ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-mono text-sm font-semibold ${event.status === "failed" ? "text-error" : event.status === "retrying" ? "text-warning" : "text-success"}`}>
                          {event.event_type}
                        </h4>
                        <span className="text-xs text-textMuted">
                          {event.created_at ? format(new Date(event.created_at), "HH:mm:ss.SSS") : "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-textMuted">Status: <span className="font-mono">{event.status}</span></span>
                        {event.retry_count > 0 && (
                          <span className="text-xs text-warning">Retries: {event.retry_count}</span>
                        )}
                        {event.processed_at && (
                          <span className="text-xs text-textMuted">
                            Processed: {formatDistanceToNow(new Date(event.processed_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-textMuted">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No events recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata & Payload */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Database className="w-4 h-4 mr-2 text-textMuted" /> Metadata
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-textMuted">Workflow Type</span>
                <span className="font-mono text-xs">{workflow.workflow_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Status</span>
                <span className={`text-xs font-medium ${statusColor[workflow.status]?.split(" ")[1] || ""}`}>{workflow.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Retries</span>
                <span className={workflow.retry_count > 0 ? "text-warning font-medium" : "text-textMuted"}>
                  {workflow.retry_count}
                </span>
              </div>
              {workflow.last_error && (
                <div className="pt-2 border-t border-border">
                  <span className="text-textMuted text-xs">Last Error</span>
                  <p className="text-error text-xs mt-1 font-mono break-all">{workflow.last_error}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-textMuted" /> Payload
            </h3>
            <div className="bg-background border border-border rounded-md p-3 font-mono text-xs overflow-x-auto text-textMain/80">
              <pre>{JSON.stringify(workflow.payload, null, 2)}</pre>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Server className="w-4 h-4 mr-2 text-textMuted" /> Workflow ID
            </h3>
            <p className="text-xs font-mono text-textMuted break-all">{workflow.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
