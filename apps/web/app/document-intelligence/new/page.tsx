"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type FormState = "idle" | "loading" | "success" | "error";

export default function NewDocumentPipelinePage() {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    document_url: "",
    priority: "normal",
    callback_url: "",
    idempotency_key: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (form.idempotency_key) {
        headers["Idempotency-Key"] = form.idempotency_key;
      }

      const res = await fetch("http://localhost:8000/document-intelligence", {
        method: "POST",
        headers,
        body: JSON.stringify({
          document_url: form.document_url,
          priority: form.priority,
          callback_url: form.callback_url || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        setState("success");
      } else {
        setErrorMsg(data?.detail || "Something went wrong");
        setState("error");
      }
    } catch (err) {
      setErrorMsg("Cannot connect to backend. Make sure uvicorn is running on port 8000.");
      setState("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/workflows" className="text-textMuted hover:text-textMain transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Document Pipeline</h1>
          <p className="text-sm text-textMuted">Trigger an AI Document Intelligence Pipeline</p>
        </div>
      </div>

      {/* Success State */}
      {state === "success" && result && (
        <div className="card p-6 border-success/30 bg-success/5">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-success" />
            <h2 className="font-semibold text-success text-lg">
              {result.idempotent_hit ? "Pipeline Already Exists (Idempotent Hit)" : "Pipeline Started!"}
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-textMuted">Workflow ID</span>
              <span className="font-mono text-xs text-primary">{result.workflow_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-textMuted">Status</span>
              <span className="font-mono font-medium text-warning">{result.status}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-textMuted">Idempotent Hit</span>
              <span className="font-mono">{result.idempotent_hit ? "Yes" : "No"}</span>
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => router.push(`/workflows/${result.workflow_id}`)}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primaryHover transition-colors font-medium"
            >
              View Pipeline Trace →
            </button>
            <button
              onClick={() => { setState("idle"); setResult(null); setForm({ document_url: "", priority: "normal", callback_url: "", idempotency_key: "" }); }}
              className="px-4 py-2 bg-surface border border-border rounded-md text-sm hover:bg-surfaceHover transition-colors"
            >
              New Pipeline
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="card p-4 border-error/30 bg-error/5 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-error font-medium">Error</p>
            <p className="text-xs text-textMuted mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {state !== "success" && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textMain" htmlFor="document_url">
              Document URL <span className="text-error">*</span>
            </label>
            <input
              id="document_url"
              name="document_url"
              type="text"
              required
              value={form.document_url}
              onChange={handleChange}
              placeholder="s3://bucket/document.pdf"
              className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-textMuted/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textMain" htmlFor="priority">
              Priority <span className="text-error">*</span>
            </label>
            <select
              id="priority"
              name="priority"
              required
              value={form.priority}
              onChange={handleChange}
              className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors text-textMain"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textMain" htmlFor="callback_url">
              Callback URL <span className="text-textMuted text-xs">(optional)</span>
            </label>
            <input
              id="callback_url"
              name="callback_url"
              type="url"
              value={form.callback_url}
              onChange={handleChange}
              placeholder="https://my-system.com/webhook"
              className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-textMuted/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textMain" htmlFor="idempotency_key">
              Idempotency Key <span className="text-textMuted text-xs">(optional)</span>
            </label>
            <input
              id="idempotency_key"
              name="idempotency_key"
              type="text"
              value={form.idempotency_key}
              onChange={handleChange}
              placeholder="e.g. upload_req_123"
              className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-textMuted/50 font-mono"
            />
          </div>

          <div className="flex items-center p-3 bg-background border border-border rounded-md text-xs text-textMuted space-x-2">
            <div className="w-2 h-2 rounded-full bg-success animate-ping" />
            <span>Submits to <span className="font-mono text-primary">POST http://localhost:8000/document-intelligence</span></span>
          </div>

          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full flex items-center justify-center px-4 py-3 bg-primary text-white rounded-md text-sm font-medium hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Pipeline...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Start Pipeline
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
