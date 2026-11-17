import {
  CalendarClock,
  CalendarDays,
  CloudUpload,
  Contact,
  FileSearch,
  History,
  LayoutDashboard,
  ReceiptText,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { AppRole } from '../../features/auth/AuthContext';

type MenuItem = { label: string; to: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const ALL: AppRole[] = ['asistente_rrhh', 'jefe_rrhh', 'administrador'];
const OPERATORS: AppRole[] = ['asistente_rrhh', 'administrador'];
const ADMIN: AppRole[] = ['administrador'];

const sections: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: 'Gestión & Nómina',
    items: [
      { label: 'Dashboard de Indicadores', to: '/dashboard', icon: LayoutDashboard, roles: ALL },
      { label: 'Importar Z-BioTime', to: '/importar', icon: CloudUpload, roles: OPERATORS },
      { label: 'Historial Asistencia', to: '/historial', icon: CalendarClock, roles: ALL },
      { label: 'Resumen Diario', to: '/resumen-diario', icon: CalendarDays, roles: ALL },
      { label: 'Reporte y Nómina', to: '/reportes/mensual', icon: ReceiptText, roles: ALL },
    ],
  },
  {
    title: 'Administración',
    items: [
      { label: 'Usuarios', to: '/usuarios', icon: Users, roles: ADMIN },
      { label: 'Colaboradores & Parámetros', to: '/parametros', icon: Contact, roles: ADMIN },
      { label: 'Bitácora de Auditoría', to: '/auditoria', icon: FileSearch, roles: ADMIN },
      { label: 'Respaldos', to: '/respaldos', icon: History, roles: ADMIN },
    ],
  },
];

export function Sidebar({ role }: { role: AppRole }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-nettplus-navy text-white shadow-soft">
      <div className="space-y-1 px-6 pb-5 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nettplus-neon text-xl font-bold tracking-[-0.01em] text-nettplus-deep">
            N
          </div>
          <div className="leading-none">
            <p className="text-base font-bold leading-5 tracking-[-0.025em] text-white">NETTPLUS</p>
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.05em] text-nettplus-lavender">Fibra Óptica</p>
          </div>
        </div>
        <div className="pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nettplus-royal px-2 py-0.5 text-[11px] font-semibold leading-4 tracking-[0.04em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-nettplus-neon" />
            The Power of Fiber
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {sections.map(({ title, items }, index) => {
          const visible = items.filter((item) => item.roles.includes(role));
          if (visible.length === 0) return null;
          return (
            <div key={title} className="space-y-1">
              <p
                className={`px-3 text-[11px] font-semibold uppercase leading-4 tracking-[0.05em] text-nettplus-periwinkle ${
                  index === 0 ? 'pb-[11px] pt-[9px]' : 'pb-[7px] pt-[17px]'
                }`}
              >
                {title}
              </p>
              {visible.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                      isActive
                        ? 'bg-nettplus-neon text-base text-nettplus-neon-ink shadow-sm'
                        : 'text-sm text-nettplus-frost hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="space-y-2.5 rounded-xl bg-nettplus-deep p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nettplus-neon opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-nettplus-neon" />
              </span>
              <span className="text-[13px] font-medium leading-[18px] tracking-[0.01em] text-white">Z-BioTime Conectado</span>
            </div>
            <span className="text-[11px] font-semibold leading-4 tracking-[0.04em] text-nettplus-lavender">Live</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-semibold leading-4 tracking-[0.04em] text-nettplus-lavender">Sistema Nómina</span>
            <span className="text-[13px] font-semibold leading-[18px] text-nettplus-neon">v2.6</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
