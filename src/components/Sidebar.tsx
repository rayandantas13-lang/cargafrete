import type { TabKey } from "@/app/page";

interface SidebarProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}

const menuItems: { key: TabKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "novo", label: "Novo Frete", icon: "➕" },
  { key: "fretes", label: "Fretes", icon: "🚛" },
  { key: "rotas", label: "Rotas & Mapas", icon: "🗺️" },
  { key: "motoristas", label: "Motoristas", icon: "👤" },
  { key: "admin", label: "Admin", icon: "⚙️" },
];

export default function Sidebar({ activeTab, onChangeTab }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span>🚚</span>
          <span>FreteControl</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Grande Goiânia</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onChangeTab(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.key
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p>v1.0 • Controle de Fretes</p>
        <p className="mt-1">© 2026</p>
      </div>
    </aside>
  );
}
