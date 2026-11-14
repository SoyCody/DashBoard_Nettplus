import { Bell, LogOut, Search } from 'lucide-react';

export function Topbar({ role, userName, onLogout }: { role: string; userName: string; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        <span>Buscar</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200">
          <Bell className="h-4 w-4" />
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">{userName}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nettplus-blue text-sm font-semibold text-white">
          {userName.split(' ').map((part) => part[0]).slice(0, 2).join('')}
        </div>
        <button onClick={onLogout} className="secondary-button gap-2">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
