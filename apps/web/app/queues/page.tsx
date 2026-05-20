import { Layers, Activity, Server } from "lucide-react";

async function getQueueData() {
  try {
    const res = await fetch("http://127.0.0.1:8000/observability/queues", { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return null;
}

async function getOverview() {
  try {
    const res = await fetch("http://127.0.0.1:8000/observability/overview", { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return null;
}

export default async function QueuesPage() {
  const [queueData, overview] = await Promise.all([getQueueData(), getOverview()]);

  const celeryDepth = queueData?.celery_default ?? 0;
  const totalWorkflows = overview
    ? Object.values(overview.workflows_by_status || {}).reduce((a: any, b: any) => a + b, 0)
    : 0;

  const queues = [
    {
      name: "celery (default)",
      depth: celeryDepth,
      capacity: 10000,
      status: celeryDepth > 5000 ? "critical" : celeryDepth > 1000 ? "warning" : "healthy",
      note: queueData?.note || null,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Queue Observability</h1>
          <p className="text-sm text-textMuted">Monitor broker queues, worker pools, and throughput.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 border-l-4 border-l-primary">
          <div className="flex items-center mb-2">
            <Layers className="w-4 h-4 mr-2 text-primary" />
            <h3 className="font-semibold">Celery Queue Depth</h3>
          </div>
          <p className="text-3xl font-bold">{celeryDepth.toLocaleString()}</p>
          <p className="text-xs text-textMuted mt-1">Messages waiting in queue</p>
        </div>
        <div className="card p-6 border-l-4 border-l-success">
          <div className="flex items-center mb-2">
            <Activity className="w-4 h-4 mr-2 text-success" />
            <h3 className="font-semibold">Total Workflows</h3>
          </div>
          <p className="text-3xl font-bold">{totalWorkflows}</p>
          <p className="text-xs text-textMuted mt-1">Across all statuses</p>
        </div>
        <div className="card p-6 border-l-4 border-l-accent">
          <div className="flex items-center mb-2">
            <Server className="w-4 h-4 mr-2 text-accent" />
            <h3 className="font-semibold">Pending Retries</h3>
          </div>
          <p className="text-3xl font-bold">{overview?.pending_retries ?? 0}</p>
          <p className="text-xs text-textMuted mt-1">Scheduled for retry</p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Queue Health</h2>
        <div className="grid grid-cols-1 gap-4">
          {queues.map((q) => (
            <div key={q.name} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="md:w-1/4">
                <div className="flex items-center space-x-2">
                  <h4 className="font-mono font-medium">{q.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    q.status === "critical" ? "text-error border-error/30 bg-error/10" :
                    q.status === "warning" ? "text-warning border-warning/30 bg-warning/10" :
                    "text-success border-success/30 bg-success/10"
                  }`}>{q.status}</span>
                </div>
                {q.note && <p className="text-xs text-textMuted mt-1">{q.note}</p>}
              </div>

              <div className="md:w-1/2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-textMuted">Depth</span>
                  <span className="font-mono">{q.depth} / {q.capacity.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className={`h-full ${q.status === "critical" ? "bg-error" : q.status === "warning" ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (q.depth / q.capacity) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="md:w-1/4 text-right">
                <p className="text-xs text-textMuted mb-1">Broker</p>
                <p className="text-sm font-mono text-primary">Upstash Redis</p>
              </div>
            </div>
          ))}

          {/* Status breakdown as queue cards */}
          {overview && Object.entries(overview.workflows_by_status || {}).map(([status, count]: any) => (
            <div key={status} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-80">
              <div className="md:w-1/4">
                <h4 className="font-mono font-medium">workflows:{status}</h4>
                <p className="text-xs text-textMuted mt-1">Workflow status bucket</p>
              </div>
              <div className="md:w-1/2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-textMuted">Count</span>
                  <span className="font-mono">{count}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className={`h-full ${status === "completed" ? "bg-success" : status === "failed" ? "bg-error" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (count / Math.max(1, totalWorkflows)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="md:w-1/4 text-right">
                <span className={`text-xl font-bold ${status === "completed" ? "text-success" : status === "failed" ? "text-error" : "text-primary"}`}>
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
