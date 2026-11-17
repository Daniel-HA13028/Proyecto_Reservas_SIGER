import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Cargando from '../../components/Cargando';
import EventoTarjeta, { Portada } from '../../components/EventoTarjeta';
import Indicador from '../../components/Indicador';
import Alert from '../../components/ui/Alert';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/reportes.service';
import { fechaHora } from '../../utils/formato';

// Mi panel del participante (RF-22, CU-08; prototipo siger_mi_dashboard; T-09-07): su próximo evento, accesos, cuántos
// eventos asistió y recomendaciones por las categorías de sus reservaciones anteriores.
export default function MiPanel() {
  const { usuario } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    dashboardService
      .participante()
      .then((r) => vigente && setD(r))
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Alert tono="error">{error.mensaje}</Alert>;
  if (!d) return <Cargando />;

  const [proxima, ...otras] = d.proximasReservaciones;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Hola, {usuario.nombres}</h1>
        <p className="text-body-sm text-on-surface-variant">¿Listo para tu próxima experiencia?</p>
      </header>

      {proxima ? (
        <Link to={`/reservaciones/${proxima.idReservacion}`} className="relative block h-48 overflow-hidden rounded-xl shadow-card md:h-56">
          <Portada evento={proxima.evento} />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-transparent" />
          <div className="absolute bottom-0 space-y-2 p-6 text-white">
            <span className="inline-block rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-wide">Tu próximo evento</span>
            <h2 className="text-title-sm md:text-headline-md">{proxima.evento.nombreEvento}</h2>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-white/90">
              <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_today</span>{fechaHora(proxima.evento.fechaHoraInicio)}</span>
              <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>{proxima.evento.ubicacion}</span>
            </p>
          </div>
        </Link>
      ) : (
        <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
          <p>No tienes reservaciones próximas.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/eventos" className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 font-semibold text-primary shadow-card hover:shadow-modal">
          <span className="material-symbols-outlined rounded-full bg-secondary/10 p-3 text-secondary" aria-hidden="true">search</span>
          Buscar eventos
        </Link>
        <Link to="/mis-reservaciones" className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 font-semibold text-primary shadow-card hover:shadow-modal">
          <span className="material-symbols-outlined rounded-full bg-secondary/10 p-3 text-secondary" aria-hidden="true">confirmation_number</span>
          <span>
            Mis reservaciones
            {otras.length > 0 && <span className="block text-body-sm font-normal text-on-surface-variant">{otras.length} próxima{otras.length === 1 ? '' : 's'} más</span>}
          </span>
        </Link>
        <Indicador titulo="Eventos a los que asististe" valor={d.eventosAsistidos} icono="verified" tono="exito" a="/mis-reservaciones?grupo=pasadas" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title-sm">Recomendados para ti</h2>
          <Link to="/eventos" className="text-body-sm font-semibold text-secondary hover:underline">Ver todos</Link>
        </div>
        {d.eventosRecomendados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">No hay eventos disponibles por ahora.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {d.eventosRecomendados.map((e) => (
              <EventoTarjeta key={e.idEvento} evento={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
