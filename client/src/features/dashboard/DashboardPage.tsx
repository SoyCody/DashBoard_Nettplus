import { BarChart3, CalendarDays, Clock3, UserCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import { Card } from '../../components/ui/Card';

const metrics = [
  { label: 'Puntualidad', value: '94.8%', icon: UserCheck, tone: 'bg-nettplus-lime text-nettplus-navy' },
  { label: 'Asistencia', value: '96.2%', icon: CalendarDays, tone: 'bg-nettplus-blue text-white' },
  { label: 'Atrasos', value: '18', icon: Clock3, tone: 'bg-amber-100 text-amber-700' },
  { label: 'Min. atraso', value: '345', icon: BarChart3, tone: 'bg-red-100 text-red-600' },
  { label: 'Ausencias', value: '12', icon: CalendarDays, tone: 'bg-slate-100 text-slate-700' },
];

const attendanceTrend = [
  { date: 'Lun', punctual: 90, total: 100 },
  { date: 'Mar', punctual: 84, total: 100 },
  { date: 'Mié', punctual: 92, total: 100 },
  { date: 'Jue', punctual: 88, total: 100 },
  { date: 'Vie', punctual: 96, total: 100 },
  { date: 'Sáb', punctual: 98, total: 100 },
];

const delayByDepartment = [
  { department: 'Operación', value: 42 },
  { department: 'Ventas', value: 26 },
  { department: 'Finanzas', value: 18 },
  { department: 'Soporte', value: 12 },
  { department: 'Administración', value: 9 },
];

const distribution = [
  { name: 'Puntual', value: 78, color: '#B4F000' },
  { name: 'Atraso', value: 15, color: '#F59E0B' },
  { name: 'Ausencia', value: 7, color: '#DC2626' },
];

const collaborators = [
  { code: 'NET-1024', name: 'Ana Cárdenas', department: 'Operación', delays: 3, minutes: 42, absences: 1, punctuality: '96%', attendance: '97%' },
  { code: 'NET-1201', name: 'Daniel Flores', department: 'Ventas', delays: 5, minutes: 58, absences: 2, punctuality: '93%', attendance: '94%' },
  { code: 'NET-3412', name: 'Patricia Salazar', department: 'Administración', delays: 1, minutes: 18, absences: 0, punctuality: '99%', attendance: '100%' },
  { code: 'NET-2108', name: 'Luis Andrade', department: 'Soporte', delays: 2, minutes: 29, absences: 1, punctuality: '95%', attendance: '96%' },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-nettplus-blue">Dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Indicadores del periodo</h2>
        </div>
        <div className="rounded-lg border border-nettplus-blue/20 bg-nettplus-ice px-3 py-2 text-sm font-medium text-nettplus-blue">
          Periodo: Julio 2026
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Tendencia diaria</h3>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Puntualidad</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="colorPunctual" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#1F4BFF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1F4BFF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[70, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="punctual" stroke="#1F4BFF" fill="url(#colorPunctual)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Atrasos por departamento</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Deptos.</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayByDepartment}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="department" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#B4F000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Distribución</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Estados</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3}>
                  {distribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">Colaboradores</h3>
          <button className="text-sm font-medium text-nettplus-blue">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Colaborador</th>
                <th className="px-5 py-3">Departamento</th>
                <th className="px-5 py-3">Atrasos</th>
                <th className="px-5 py-3">Min. atraso</th>
                <th className="px-5 py-3">Ausencias</th>
                <th className="px-5 py-3">% puntualidad</th>
                <th className="px-5 py-3">% asistencia</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((person) => (
                <tr key={person.code} className="border-t border-slate-200 even:bg-nettplus-ice/40">
                  <td className="px-5 py-3 font-medium text-slate-800">{person.code}</td>
                  <td className="px-5 py-3">{person.name}</td>
                  <td className="px-5 py-3">{person.department}</td>
                  <td className="px-5 py-3">{person.delays}</td>
                  <td className="px-5 py-3">{person.minutes}</td>
                  <td className="px-5 py-3">{person.absences}</td>
                  <td className="px-5 py-3">{person.punctuality}</td>
                  <td className="px-5 py-3">{person.attendance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
