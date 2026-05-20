import { Bell, Search, Settings } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center text-sm text-textMuted bg-background px-3 py-1.5 rounded-md border border-border w-64">
        <Search className="w-4 h-4 mr-2" />
        <span>Search workflows, traces...</span>
      </div>
      <div className="flex items-center space-x-4 text-textMuted">
        <button className="hover:text-textMain transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="hover:text-textMain transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-medium text-sm">
          A
        </div>
      </div>
    </header>
  );
}
