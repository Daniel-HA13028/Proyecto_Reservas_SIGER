import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Cargando from '../../components/Cargando';
import Indicador from '../../components/Indicador';
import Alert from '../../components/ui/Alert';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/reportes.service';
import { fechaHora } from '../../utils/formato';
import { ACCIONES, COLORES, etiquetaPeriodo } from '../../utils/graficos';

const ACCESOS = [
  ['/admin/usuarios', 'Usuarios', 'group'],
  ['/admin/eventos', 'Eventos', 'event'],
  ['/admin/categorias', 'Categorías', 'category'],
  ['/reportes', 'Reportes', 'analytics'],
];

// Dashboard del administrador (RF-22, CU-08; prototipo siger_dashboard_admin; T-09-05): indicadores de la plataforma,
// tasa de asistencia de los últimos 6 meses, actividad reciente de la bitácora y accesos rápidos.
export default function DashboardAdmin() {
  const { usuario } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    dashboardService
      .admin()
      .then((r) => vigente && setD(r))
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Alert tono="error">{error.mensaje}</Alert>;
  if (!d) return <Cargando />;

  const serie = d.asistenciaPorPeriodo.map((s) => ({ periodo: etiquetaPeriodo(s.etiqueta), valor: s.valor }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Resumen ejecutivo</h1>
        <p className="text-body-sm text-on-surface-variant">Hola, {usuario.nombres}. Este es el estado actual de la plataforma.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Indicador titulo="Usuarios activos" valor={d.usuariosActivos} icono="group" a="/admin/usuarios" />
        <Indicador titulo="Organizadores pendientes" valor={d.organizadoresPendientes} icono="pending_actions" tono={d.organizadoresPendientes ? 'advertencia' : 'primario'} nota={d.organizadoresPendientes ? 'Por revisar' : null} a="/admin/usuarios?estado=Pendiente" />
        <Indicador titulo="Eventos activos" valor={d.eventosActivos} icono="event_available" tono="secundario" a="/admin/eventos" />
        <Indicador titulo="Reservaciones confirmadas" valor={d.reservacionesConfirmadas} icono="confirmation_number" tono="exito" />
        <Indicador titulo="Soporte abierto" valor={d.solicitudesSoporteAbiertas} icono="support_agent" tono={d.solicitudesSoporteAbiertas ? 'error' : 'primario'} a="/admin/soporte" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card xl:col-span-2">
          <h2 className="text-title-sm">Tasa de asistencia</h2>
          <p className="mb-4 text-body-sm text-on-surface-variant">Asistencias sobre reservaciones confirmadas de los eventos que iniciaron cada mes.</p>
          <div className="h-64" role="img" aria-label={`Tasa de asistencia de los últimos 6 meses: ${serie.map((s) => `${s.periodo} ${s.valor}%`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORES.rejilla} vertical={false} />
                <XAxis dataKey="periodo" tick={{ fill: COLORES.texto, fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fill: COLORES.texto, fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Asistencia']} />
                <Bar dataKey="valor" fill={COLORES.secundario} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
          <h2 className="mb-4 text-title-sm">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {ACCESOS.map(([ruta, texto, icono]) => (
              <Link key={ruta} to={ruta} className="flex flex-col items-center gap-2 rounded-lg border border-outline-variant p-4 text-body-sm font-semibold text-primary hover:bg-surface-container-low">
                <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
                {texto}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
        <h2 className="border-b border-outline-variant px-6 py-4 text-title-sm">Actividad reciente</h2>
        {d.actividadReciente.length === 0 ? (
          <p className="p-6 text-body-sm text-on-surface-variant">Sin actividad registrada.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {d.actividadReciente.map((a, i) => (
              <li key={`${a.fecha}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                <p className="text-body-sm">
                  <strong>{a.usuario}</strong> {ACCIONES[a.accion] ?? a.accion.toLowerCase().replaceAll('_', ' ')}
                  {a.entidad && a.idEntidad != null && <span className="text-on-surface-variant"> · {a.entidad} #{a.idEntidad}</span>}
                </p>
                <span className="text-[12px] text-on-surface-variant">{fechaHora(a.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
