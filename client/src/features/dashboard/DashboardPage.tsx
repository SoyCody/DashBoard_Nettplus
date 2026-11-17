import type { ReactNode } from 'react';
import {
  AlarmClockCheck,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  Filter,
  Info,
  RotateCcw,
  Search,
  Sheet,
  Timer,
  TrendingUp,
  UserRoundX,
  UserSearch,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Dot, ResponsiveContainer, XAxis, YAxis } from 'recharts';

/* ----------------------------------------------------------------------------
 * Datos de muestra (Período Octubre 2026)
 * ------------------------------------------------------------------------- */

const attendanceTrend = [
  97.1, 97.3, 97.6, 97.8, 97.9, 98.1, 98.5, 98.9, 99.3, 98.6, 97.8, 97.6, 98.2, 99.0, 99.2, 99.6, 99.1, 98.2,
  97.4, 97.2, 97.9, 98.9, 99.2, 98.7, 98.0, 98.1, 98.6, 99.1, 99.3, 99.0, 98.8,
].map((value, index) => ({ day: index + 1, value }));

const highlightedDays = new Set([8, 15, 22, 31]);

const delaysByDepartment = [
  { department: 'Operaciones Técnicas (FO)', count: 8, percent: 44, color: 'bg-nettplus-royal' },
  { department: 'ATC y Cajas (Agencias)', count: 5, percent: 28, color: 'bg-nettplus-navy' },
  { department: 'Comercial & Ventas Terreno', count: 3, percent: 17, color: 'bg-nettplus-blue' },
  { department: 'NOC & Infraestructura Red', count: 2, percent: 11, color: 'bg-[#3D55BF]' },
  { department: 'Administración & Finanzas', count: 0, percent: 0, color: 'bg-nettplus-royal' },
];

const markingDistribution = [
  { label: 'Puntuales', value: '88% (1,698)', percent: 88, color: '#0033D3' },
  { label: 'Atrasos leves (<15m)', value: '9% (174)', percent: 9, color: '#B9F612' },
  { label: 'Novedades / Faltas', value: '3% (58)', percent: 3, color: '#0A2A8F' },
];

type Tone = 'success' | 'info' | 'danger';
type Collaborator = {
  code: string;
  initials: string;
  avatar: string;
  name: string;
  position: string;
  department: string;
  delays: number;
  minutes: number;
  absences: { label: string; tone?: Tone };
  punctuality: number;
  attendance: number;
};

const collaborators: Collaborator[] = [
  { code: 'NT-1042', initials: 'LA', avatar: 'bg-nettplus-navy text-white', name: 'Luis Alberto Andrade Castillo', position: 'Técnico Instalador Senior - FO', department: 'Operaciones Técnicas', delays: 1, minutes: 6, absences: { label: '0' }, punctuality: 96.5, attendance: 100 },
  { code: 'NT-1088', initials: 'CB', avatar: 'bg-nettplus-royal text-white', name: 'Claudia Sofía Bermeo Loaiza', position: 'Supervisora ATC Loja Matriz', department: 'ATC y Cajas', delays: 0, minutes: 0, absences: { label: '0' }, punctuality: 100, attendance: 100 },
  { code: 'NT-1104', initials: 'DC', avatar: 'bg-nettplus-haze text-nettplus-navy', name: 'Diego Fernando Cabrera Jaramillo', position: 'Ingeniero Core NOC', department: 'NOC & Infraestructura', delays: 2, minutes: 19, absences: { label: '0' }, punctuality: 91.3, attendance: 100 },
  { code: 'NT-1120', initials: 'AD', avatar: 'bg-nettplus-deep text-white', name: 'Andrea Estefanía Dávila Mora', position: 'Ejecutiva Comercial Corporativa', department: 'Comercial & Ventas', delays: 0, minutes: 0, absences: { label: '2 (IESS)', tone: 'info' }, punctuality: 100, attendance: 91.3 },
  { code: 'NT-1155', initials: 'CE', avatar: 'bg-nettplus-haze text-nettplus-navy', name: 'Carlos Marcelo Espinoza Vega', position: 'Líder Cuadrilla Fibra Óptica', department: 'Operaciones Técnicas', delays: 3, minutes: 28, absences: { label: '0' }, punctuality: 87, attendance: 100 },
  { code: 'NT-1180', initials: 'GF', avatar: 'bg-nettplus-royal text-white', name: 'Gabriela Fernanda Flores Ríos', position: 'Contadora General', department: 'Administración y Finanzas', delays: 0, minutes: 0, absences: { label: '0' }, punctuality: 100, attendance: 100 },
  { code: 'NT-1205', initials: 'JP', avatar: 'bg-nettplus-navy text-white', name: 'Jonathan Paúl Guamán Sarango', position: 'Técnico Splicer & Medición OTDR', department: 'Operaciones Técnicas', delays: 2, minutes: 14, absences: { label: '0' }, punctuality: 91.3, attendance: 100 },
  { code: 'NT-1233', initials: 'VM', avatar: 'bg-nettplus-danger-soft text-nettplus-danger', name: 'Víctor Manuel Medina Ordóñez', position: 'Cajero Ventanilla Loja Centro', department: 'ATC y Cajas', delays: 1, minutes: 8, absences: { label: '1 Injust.', tone: 'danger' }, punctuality: 95.6, attendance: 95.6 },
];

/* ----------------------------------------------------------------------------
 * Piezas reutilizables
 * ------------------------------------------------------------------------- */

const card = 'rounded-xl bg-white shadow-soft';
const eyebrow = 'text-[11px] font-semibold uppercase leading-4 tracking-[0.08em]';

const toneClasses: Record<Tone, string> = {
  success: 'bg-nettplus-neon font-bold text-nettplus-neon-ink',
  info: 'bg-nettplus-haze font-semibold text-nettplus-royal',
  danger: 'bg-nettplus-danger-soft font-semibold text-nettplus-danger',
};

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-sm leading-5 ${toneClasses[tone]}`}>{children}</span>;
}

function percentTone(value: number): Tone {
  if (value >= 100) return 'success';
  if (value < 90) return 'danger';
  return 'info';
}

function KpiIcon({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${className}`}>{children}</div>;
}

function FilterField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2">
      <span className={`flex items-center gap-1.5 text-nettplus-ink/80 ${eyebrow}`}>
        <span className="text-nettplus-royal">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

function SortHeader({ children, align = 'left', icon = 'sort' }: { children: ReactNode; align?: 'left' | 'center'; icon?: 'sort' | 'desc' }) {
  const Icon = icon === 'desc' ? ArrowDown : ChevronsUpDown;
  return (
    <th className={`px-4 py-3 text-[13px] font-semibold leading-[18px] tracking-[0.01em] text-nettplus-deep ${align === 'center' ? 'text-center' : 'text-left'}`}>
      <span className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {children}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </span>
    </th>
  );
}

/* ----------------------------------------------------------------------------
 * Página
 * ------------------------------------------------------------------------- */

export function DashboardPage() {
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;

  return (
    <div className="space-y-6 font-hanken text-nettplus-ink">
      {/* Barra de filtros */}
      <section className={`${card} flex items-end gap-4 p-4`}>
        <div className="flex flex-1 gap-3">
          <FilterField icon={<CalendarDays className="h-4 w-4" />} label="Período de liquidación">
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-lg bg-nettplus-mist px-3 pr-8 text-sm text-nettplus-ink outline-none focus:ring-2 focus:ring-nettplus-royal/30">
                <option>Octubre 2026 (Cerrado)</option>
                <option>Noviembre 2026 (Abierto)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nettplus-ink" />
            </div>
          </FilterField>
          <FilterField icon={<Building2 className="h-4 w-4" />} label="Departamento / Área">
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-lg bg-nettplus-mist px-3 pr-8 text-sm text-nettplus-ink outline-none focus:ring-2 focus:ring-nettplus-royal/30">
                <option>Todos los departamentos (5)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nettplus-ink" />
            </div>
          </FilterField>
          <FilterField icon={<UserSearch className="h-4 w-4" />} label="Colaborador">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Buscar por cédula o nombre"
                className="h-10 w-full rounded-lg bg-nettplus-mist pl-9 pr-3 text-sm text-nettplus-ink outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-nettplus-royal/30"
              />
            </div>
          </FilterField>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-nettplus-haze px-4 text-[13px] font-semibold text-nettplus-deep transition hover:bg-nettplus-frost">
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>
          <button className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-nettplus-royal px-5 text-[13px] font-semibold text-white transition hover:bg-nettplus-navy">
            <Filter className="h-4 w-4" />
            Aplicar filtros
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-5 gap-4">
        <article className="flex h-[220px] flex-col rounded-xl bg-gradient-to-br from-nettplus-navy via-nettplus-navy to-[#14389F] p-5 text-white shadow-soft">
          <div className="flex items-center justify-between">
            <p className={`${eyebrow} text-nettplus-lavender`}>Indicador clave</p>
            <KpiIcon className="bg-nettplus-deep text-nettplus-neon">
              <BadgeCheck className="h-5 w-5" />
            </KpiIcon>
          </div>
          <p className="mt-3 text-base font-semibold">% de Puntualidad</p>
          <p className="mt-1 text-4xl font-bold tracking-[-0.02em]">94.8%</p>
          <div className="mt-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-nettplus-neon px-2 py-0.5 text-xs font-bold text-nettplus-neon-ink">
              <ArrowUp className="h-3 w-3" />
              +1.4%
            </span>
            <span className="text-xs leading-4 text-nettplus-lavender">vs Septiembre 2026</span>
          </div>
        </article>

        <article className={`${card} flex h-[220px] flex-col p-5`}>
          <div className="flex items-center justify-between">
            <p className={`${eyebrow} text-nettplus-ink/80`}>Presencia total</p>
            <KpiIcon className="bg-nettplus-haze text-nettplus-royal">
              <CalendarDays className="h-5 w-5" />
            </KpiIcon>
          </div>
          <p className="mt-3 text-base font-semibold">% de Asistencia</p>
          <p className="mt-1 text-4xl font-bold tracking-[-0.02em] text-nettplus-deep">98.2%</p>
          <div className="mt-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-nettplus-haze px-2 py-0.5 text-xs font-semibold text-nettplus-royal">
              <TrendingUp className="h-3 w-3" />
              +0.6%
            </span>
            <span className="text-xs text-slate-600">Meta: &gt;97.5%</span>
          </div>
        </article>

        <article className={`${card} flex h-[220px] flex-col p-5`}>
          <div className="flex items-center justify-between">
            <p className={`${eyebrow} text-nettplus-ink/80`}>Incidencias</p>
            <KpiIcon className="bg-nettplus-haze text-nettplus-deep">
              <AlarmClockCheck className="h-5 w-5" />
            </KpiIcon>
          </div>
          <p className="mt-3 text-base font-semibold">Número de Atrasos</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-[-0.02em]">18</span>
            <span className="text-sm text-slate-600">eventos</span>
          </p>
          <div className="mt-auto flex items-end justify-between text-xs">
            <span className="text-slate-600">84 colaboradores</span>
            <span className="font-semibold text-nettplus-royal">-4 vs mes ant.</span>
          </div>
        </article>

        <article className={`${card} flex h-[220px] flex-col p-5`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`${eyebrow} text-nettplus-ink/80`}>Tiempo acumulado</p>
            <KpiIcon className="bg-nettplus-haze text-nettplus-royal">
              <Timer className="h-5 w-5" />
            </KpiIcon>
          </div>
          <p className="mt-3 text-base font-semibold">Minutos de Atraso</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-[-0.02em]">142</span>
            <span className="text-sm text-slate-600">min</span>
          </p>
          <div className="mt-auto flex items-center gap-1 text-xs">
            <span className="text-slate-600">Promedio:</span>
            <span className="rounded-md bg-nettplus-haze px-2 py-1 font-semibold text-nettplus-deep">7.8 min / atraso</span>
          </div>
        </article>

        <article className={`${card} flex h-[220px] flex-col p-5`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`${eyebrow} text-nettplus-ink/80`}>Faltas registradas</p>
            <KpiIcon className="bg-nettplus-danger-soft text-nettplus-danger">
              <UserRoundX className="h-5 w-5" />
            </KpiIcon>
          </div>
          <p className="mt-3 text-base font-semibold">Número de Ausencias</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-[-0.02em] text-nettplus-danger">3</span>
            <span className="text-sm text-slate-600">días</span>
          </p>
          <div className="mt-auto flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-nettplus-deep">
              <span className="h-2 w-2 rounded-full bg-nettplus-royal" />2 IESS
            </span>
            <span className="flex items-center gap-1.5 text-nettplus-danger">
              <span className="h-2 w-2 rounded-full bg-nettplus-danger" />1 Injust.
            </span>
          </div>
        </article>
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-12 gap-5">
        {/* Tendencia diaria */}
        <article className="col-span-5 flex h-[380px] flex-col rounded-xl bg-nettplus-navy p-5 text-white shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <p className={`${eyebrow} text-nettplus-neon`}>Monitoreo diario octubre 2026</p>
              <h3 className="mt-2 text-base font-semibold">Tendencia de Asistencia Efectiva</h3>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold leading-4 tracking-[0.04em] text-nettplus-lavender">Promedio mensual</p>
              <p className="mt-2 text-base font-bold text-nettplus-neon">98.4%</p>
            </div>
          </div>
          <div className="mt-2 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#B9F612" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#B9F612" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#BAC3FF" strokeOpacity={0.25} strokeDasharray="4 4" />
                <YAxis hide domain={[96, 100.5]} />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, 31]}
                  ticks={[1, 8, 15, 22, 31]}
                  tickFormatter={(day: number) => `${String(day).padStart(2, '0')} Oct`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  padding={{ left: 18, right: 18 }}
                  tick={{ fill: '#BAC3FF', fontSize: 11, fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#B9F612"
                  strokeWidth={2.5}
                  fill="url(#trendFill)"
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; payload?: { day: number } }) =>
                    props.payload && highlightedDays.has(props.payload.day) ? (
                      <Dot
                        key={props.payload.day}
                        cx={props.cx}
                        cy={props.cy}
                        r={5}
                        fill={props.payload.day === 31 ? '#FFFFFF' : '#0A2A8F'}
                        stroke="#B9F612"
                        strokeWidth={2}
                      />
                    ) : (
                      <g key={props.payload?.day} />
                    )
                  }
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] tracking-[0.04em]">
            <span className="flex items-center gap-2 text-nettplus-lavender">
              <span className="h-2 w-2 rounded-full bg-nettplus-neon" />
              Asistencia Registrada Biométrica
            </span>
            <span className="font-semibold text-white">Meta Operativa: 98.0%</span>
          </div>
        </article>

        {/* Atrasos por departamento */}
        <article className={`${card} col-span-4 flex h-[380px] flex-col justify-between p-5`}>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`${eyebrow} text-nettplus-ink/80`}>Distribución operativa</p>
                <h3 className="mt-2 text-base font-semibold">Atrasos por Departamento</h3>
              </div>
              <span className="rounded-lg bg-nettplus-haze px-2.5 py-1 text-[13px] font-semibold text-nettplus-royal">18 Total</span>
            </div>
            <ul className="mt-4 space-y-3">
              {delaysByDepartment.map(({ department, count, percent, color }) => (
                <li key={department}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span>{department}</span>
                    <span className={count > 0 ? 'font-semibold text-nettplus-deep' : 'text-slate-600'}>
                      {count} reg. ({percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-nettplus-haze">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-start justify-between gap-4 text-[11px] tracking-[0.04em]">
            <span className="flex items-start gap-1.5 text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nettplus-royal" />
              Tolerancia: 5 min reglamentarios
            </span>
            <span className="font-medium text-nettplus-royal">Corte quincenal</span>
          </div>
        </article>

        {/* Distribución de marcaciones */}
        <article className={`${card} col-span-3 flex h-[380px] flex-col p-5`}>
          <p className={`${eyebrow} text-nettplus-ink/80`}>Calidad de registro</p>
          <h3 className="mt-2 text-base font-semibold">Distribución Marcaciones</h3>
          <div className="relative mx-auto mt-5 h-32 w-32">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={donutRadius} fill="none" stroke="#EAEDFF" strokeWidth="12" />
              {markingDistribution.map(({ label, percent, color }) => {
                const length = (percent / 100) * donutCircumference;
                const segment = (
                  <circle
                    key={label}
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${length} ${donutCircumference - length}`}
                    strokeDashoffset={-donutOffset}
                  />
                );
                donutOffset += length;
                return segment;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-nettplus-deep">88%</span>
              <span className="text-[11px] text-slate-600">A tiempo</span>
            </div>
          </div>
          <ul className="mt-auto space-y-2 text-[13px]">
            {markingDistribution.map(({ label, value, color }) => (
              <li key={label} className="flex items-start justify-between gap-2">
                <span className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
                <span className="whitespace-nowrap font-semibold text-nettplus-deep">{value}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* Tabla de colaboradores */}
      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-nettplus-deep">Detalle de Asistencia por Colaborador</h3>
              <span className="rounded-full bg-nettplus-royal px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em] text-white">Período Octubre 2026</span>
            </div>
            <p className="mt-1 max-w-md text-sm text-slate-600">Auditoría de marcaciones registradas vía Z-BioTime con cálculo automático IESS.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Filtrar colaboradores..."
                className="h-9 w-full rounded-lg bg-nettplus-mist pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-nettplus-royal/30"
              />
            </div>
            <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-nettplus-haze px-3 text-[13px] font-medium text-nettplus-deep transition hover:bg-nettplus-frost">
              <Sheet className="h-4 w-4 text-nettplus-royal" />
              Exportar (.XLSX)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-nettplus-mist">
              <tr>
                <SortHeader>Código</SortHeader>
                <SortHeader icon="desc">Colaborador</SortHeader>
                <SortHeader>Departamento</SortHeader>
                <SortHeader align="center">Atrasos</SortHeader>
                <SortHeader align="center">Min. Atraso</SortHeader>
                <SortHeader align="center">Ausencias</SortHeader>
                <SortHeader align="center">% Puntualidad</SortHeader>
                <SortHeader align="center">% Asistencia</SortHeader>
                <th className="px-4 py-3 text-right text-[13px] font-semibold tracking-[0.01em] text-nettplus-deep">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((person) => {
                const highDelay = person.delays >= 3;
                return (
                  <tr key={person.code} className="border-t border-nettplus-haze even:bg-nettplus-mist">
                    <td className="px-4 py-3 font-semibold text-nettplus-deep">{person.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${person.avatar}`}>
                          {person.initials}
                        </span>
                        <div>
                          <p className="font-semibold">{person.name}</p>
                          <p className="text-xs text-slate-600">{person.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{person.department}</td>
                    <td className={`px-4 py-3 text-center ${highDelay ? 'font-bold text-nettplus-danger' : ''}`}>{person.delays}</td>
                    <td className={`px-4 py-3 text-center ${highDelay ? 'font-bold text-nettplus-danger' : ''}`}>{person.minutes} min</td>
                    <td className="px-4 py-3 text-center">
                      {person.absences.tone ? <Pill tone={person.absences.tone}>{person.absences.label}</Pill> : person.absences.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Pill tone={percentTone(person.punctuality)}>{person.punctuality.toFixed(1)}%</Pill>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Pill tone={percentTone(person.attendance)}>{person.attendance.toFixed(1)}%</Pill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-lg p-1.5 text-nettplus-royal transition hover:bg-nettplus-haze" aria-label={`Ver detalle de ${person.name}`}>
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 text-[13px]">
          <p className="text-slate-600">
            Mostrando <strong className="text-nettplus-ink">1 - 8</strong> de <strong className="text-nettplus-ink">84</strong> colaboradores activos
          </p>
          <nav className="flex items-center gap-1.5">
            <button disabled className="inline-flex h-8 items-center gap-1 rounded-lg bg-nettplus-mist px-3 text-slate-400">
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            {['1', '2', '3'].map((page) => (
              <button
                key={page}
                className={`h-8 min-w-8 rounded-lg px-2.5 font-medium ${page === '1' ? 'bg-nettplus-royal text-white' : 'bg-nettplus-haze text-nettplus-ink'}`}
              >
                {page}
              </button>
            ))}
            <span className="px-1 text-slate-500">…</span>
            <button className="h-8 min-w-8 rounded-lg bg-nettplus-haze px-2.5 font-medium text-nettplus-ink">11</button>
            <button className="inline-flex h-8 items-center gap-1 rounded-lg bg-nettplus-haze px-3 font-medium text-nettplus-ink">
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>
      </section>
    </div>
  );
}
