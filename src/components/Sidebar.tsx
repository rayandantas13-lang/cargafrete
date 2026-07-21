import type { TabKey } from "@/app/page";

interface SidebarProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  userRole: "admin" | "proprietario" | "motorista";
  userName: string;
  onLogout: () => void;
}

const menuItems: { key: TabKey; label: string; icon: string; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "novo", label: "Novo Frete", icon: "➕" },
  { key: "fretes", label: "Fretes", icon: "🚛" },
  { key: "rotas", label: "Rotas & Mapas", icon: "🗺️" },
  { key: "motoristas", label: "Motoristas", icon: "👤", adminOnly: true },
  { key: "admin", label: "Admin", icon: "⚙️", adminOnly: true },
];

export default function Sidebar({ activeTab, onChangeTab, userRole, userName, onLogout }: SidebarProps) {
  const itensVisiveis = menuItems.filter((item) => {
    if (item.adminOnly) return userRole === "admin";
    return true;
  });

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
        {itensVisiveis.map((item) => (
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
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-slate-200 truncate max-w-[130px]">{userName}</p>
            <p className="text-slate-400 capitalize">{userRole}</p>
          </div>
          <button onClick={onLogout} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 px-2.5 py-1 rounded text-xs transition">Sair</button>
        </div>
      </div>
    </aside>
  );
}
