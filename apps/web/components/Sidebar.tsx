import Link from "next/link";
import { LayoutDashboard, GitBranch, Layers, AlertCircle, History, Activity, PlusCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/queues", label: "Queues", icon: Layers },
  { href: "/failures", label: "Failures", icon: AlertCircle },
  { href: "/audit", label: "Audit Logs", icon: History },
];

const ACTION_ITEMS = [
  { href: "/document-intelligence/new", label: "New Document Pipeline", icon: PlusCircle },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Activity className="w-6 h-6 text-primary mr-3" />
        <span className="font-bold text-sm tracking-wider uppercase">WCE Ops</span>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center px-3 py-2 text-sm text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-md transition-colors"
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="px-3 mt-4 pt-4 border-t border-border">
          {ACTION_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors border border-primary/20"
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center text-xs text-textMuted">
          <div className="w-2 h-2 rounded-full bg-success mr-2"></div>
          Engine Active
        </div>
      </div>
    </aside>
  );
}
