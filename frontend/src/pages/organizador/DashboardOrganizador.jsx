import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Cargando from '../../components/Cargando';
import { Portada } from '../../components/EventoTarjeta';
import Indicador from '../../components/Indicador';
import Alert from '../../components/ui/Alert';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/reportes.service';
import { fechaHora, fechaLarga } from '../../utils/formato';

/** «hace 5 min», «hace 3 h», «hace 2 d». */
function haceCuanto(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} d`;
}

// Dashboard del organizador (RF-22, CU-08; prototipo siger_dashboard_organizador; T-09-06): eventos activos, personas
// con reservación, asistencia promedio, próximos eventos y reservaciones recientes, solo de sus eventos (I-18).
export default function DashboardOrganizador() {
  const { usuario } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [hoy] = useState(() => new Date().toISOString());

  useEffect(() => {
    let vigente = true;
    dashboardService
      .organizador()
      .then((r) => vigente && setD(r))
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Alert tono="error">{error.mensaje}</Alert>;
  if (!d) return <Cargando />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-on-surface">Resumen del día</h1>
          <p className="text-body-sm text-on-surface-variant first-letter:uppercase">{fechaLarga(hoy)} · {usuario.nombres}</p>
        </div>
        <Link to="/organizador/eventos/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary-container">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_circle</span>
          Crear evento
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador titulo="Eventos activos" valor={d.eventosActivos} icono="event_available" a="/organizador/eventos" />
        <Indicador titulo="Personas con reservación" valor={d.totalParticipantes} icono="groups" tono="secundario" nota="Con acompañantes" />
        <Indicador titulo="Asistencia promedio" valor={`${d.porcentajeAsistenciaPromedio}%`} icono="how_to_reg" tono="exito" nota="Eventos ya iniciados" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title-sm">Próximos eventos</h2>
          <Link to="/organizador/eventos" className="text-body-sm font-semibold text-secondary hover:underline">Ver todos</Link>
        </div>
        {d.proximosEventos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">No tienes eventos publicados próximos.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.proximosEventos.map((e) => {
              const ocupacion = Math.round(((e.cupoMaximo - e.cupoDisponible) / e.cupoMaximo) * 100);
              return (
                <li key={e.idEvento} className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
                  <div className="h-28">
                    <Portada evento={e} />
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="truncate font-semibold">{e.nombreEvento}</h3>
                    <p className="text-body-sm text-on-surface-variant">{fechaHora(e.fechaHoraInicio)}</p>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container" role="progressbar" aria-valuenow={ocupacion} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupación">
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${ocupacion}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-body-sm">
                      <span className="text-on-surface-variant">{ocupacion}% lleno</span>
                      <Link to={`/organizador/eventos/${e.idEvento}/asistencia`} className="font-semibold text-secondary hover:underline">Asistencia</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
        <h2 className="border-b border-outline-variant px-6 py-4 text-title-sm">Reservaciones recientes</h2>
        {d.reservacionesRecientes.length === 0 ? (
          <p className="p-6 text-body-sm text-on-surface-variant">Aún no hay reservaciones en tus eventos.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de reservaciones recientes">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-label-md uppercase text-on-surface-variant">
                  <th className="px-6 py-3">Participante</th>
                  <th className="px-6 py-3">Evento</th>
                  <th className="hidden px-6 py-3 sm:table-cell">Personas</th>
                  <th className="px-6 py-3 text-right">Cuándo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {d.reservacionesRecientes.map((r) => (
                  <tr key={r.idReservacion}>
                    <td className="px-6 py-3 font-semibold">{r.participante}</td>
                    <td className="px-6 py-3 text-body-sm">{r.nombreEvento}</td>
                    <td className="hidden px-6 py-3 text-body-sm sm:table-cell">{1 + r.acompanantes}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-right text-body-sm text-on-surface-variant" title={fechaHora(r.fechaReservacion)}>{haceCuanto(r.fechaReservacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
