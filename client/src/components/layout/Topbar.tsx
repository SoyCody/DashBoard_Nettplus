import { CalendarDays, LogOut, Store, User } from 'lucide-react';

export function Topbar({ role, userName, onLogout }: { role: string; userName: string; onLogout: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between bg-nettplus-navy px-6 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-nettplus-royal px-3 py-1.5 text-[13px] font-semibold leading-[18px] tracking-[0.01em] text-white">
          <Store className="h-4 w-4 text-nettplus-neon" />
          <span>Sede: Loja - Matriz</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-nettplus-deep px-3 py-1.5 text-[13px] font-medium leading-[18px] tracking-[0.01em] text-nettplus-lavender">
          <CalendarDays className="h-4 w-4" />
          <span>Marzo, 2026</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right">
            <p className="text-base font-semibold leading-5 tracking-[-0.005em] text-white">{userName}</p>
            <p className="text-[11px] font-semibold leading-4 tracking-[0.04em] text-nettplus-periwinkle">{role}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nettplus-deep text-white">
            <User className="h-4 w-4" />
          </div>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-lg bg-nettplus-royal px-3 py-1.5 text-[13px] font-medium leading-[18px] tracking-[0.01em] text-white transition hover:bg-nettplus-deep"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
