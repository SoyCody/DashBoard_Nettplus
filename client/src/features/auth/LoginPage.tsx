import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/api';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { error: authError, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(usuario, password);
      navigate('/dashboard');
    } catch (caughtError) {
      setError(caughtError instanceof ApiError && caughtError.status === 401
        ? caughtError.message
        : caughtError instanceof Error ? caughtError.message : 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nettplus-ice p-8">
      <div className="flex min-h-[720px] w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-soft">
        <div className="relative flex w-1/2 flex-col justify-between overflow-hidden bg-nettplus-navy p-10 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(180,240,0,0.28),transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(31,75,255,0.35),transparent_28%)]" />
          <div className="relative z-10">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nettplus-lime text-xl font-black text-nettplus-navy">N</div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/70">NETTPLUS</p>
                <h1 className="text-2xl font-semibold">Dashboard de Nómina</h1>
              </div>
            </div>

            <div className="space-y-6">
              <p className="max-w-md text-3xl font-semibold leading-tight">
                Control de asistencia y reportes para Recursos Humanos
              </p>
              <p className="text-base text-white/75">The Power of Fiber</p>
            </div>
          </div>

          <div className="relative z-10 space-y-3 text-sm text-white/80">
            <div className="h-2 w-28 rounded-full bg-nettplus-lime" />
            <div className="flex gap-3">
              <span className="h-10 w-1 rounded-full bg-nettplus-lime" />
              <span className="h-10 w-1 rounded-full bg-white/20" />
              <span className="h-10 w-1 rounded-full bg-white/20" />
              <span className="h-10 w-1 rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        <div className="flex w-1/2 items-center justify-center bg-white p-10">
          <div className="w-full max-w-md space-y-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-nettplus-blue">Acceso</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Iniciar sesión</h2>
            </div>
            {location.state?.expired ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">La sesión se cerró por inactividad. Ingresa nuevamente.</p>
            ) : null}
            {location.state?.logoutError ? (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{location.state.logoutError}</p>
            ) : null}
            {authError ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p> : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Usuario</span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-nettplus-blue focus-within:ring-2 focus-within:ring-nettplus-blue/20">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    value={usuario}
                    onChange={(event) => setUsuario(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Ingrese su usuario"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Contraseña</span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-nettplus-blue focus-within:ring-2 focus-within:ring-nettplus-blue/20">
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error ? (
                <div className="space-y-2 text-sm text-nettplus-red">
                  <p>{error}</p>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
