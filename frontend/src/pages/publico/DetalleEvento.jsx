import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import Cargando from '../../components/Cargando';
import { Portada } from '../../components/EventoTarjeta';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { eventosService } from '../../services/eventos.service';
import { disponibilidad, fechaLarga, hora, precio } from '../../utils/formato';
import NoEncontrada from './NoEncontrada';

// Detalle del evento (RF-12, CU-10; prototipo siger_detalle_evento): disponibilidad, organizador, Reservar y copiar enlace.
export default function DetalleEvento() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [evento, setEvento] = useState(null);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vigente = true;
    eventosService
      .detalle(id)
      .then((e) => vigente && setEvento(e))
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (error?.response?.status === 404 || error?.codigo === 'PARAMETRO_INVALIDO') return <NoEncontrada />;
  if (error) return <Alert tono="error">{error.mensaje}</Alert>;
  if (!evento) return <Cargando />;

  const estado = disponibilidad(evento);
  const ocupados = evento.cupoMaximo - evento.cupoDisponible;
  const gestiona = usuario && (usuario.rol === 'Administrador' || usuario.idUsuario === evento.organizador.idUsuario);
  const destinoReserva = `/eventos/${evento.idEvento}/reservar`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <article className="space-y-6">
      <div className="relative h-56 overflow-hidden rounded-xl md:h-72">
        <Portada evento={evento} />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
        <div className="absolute bottom-0 p-6 text-white">
          <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">{evento.categoria}</span>
          <h1 className="text-display-lg-mobile md:text-display-lg">{evento.nombreEvento}</h1>
        </div>
      </div>

      {evento.estadoEvento === 'Cancelado' && (
        <Alert tono="error">Este evento fue cancelado. Motivo: {evento.motivoCancelacion}</Alert>
      )}
      {evento.estadoEvento === 'Borrador' && <Alert tono="advertencia">Borrador: solo tú y los administradores ven este evento hasta que lo publiques.</Alert>}
      {evento.estadoEvento === 'Finalizado' && <Alert tono="info">Este evento ya terminó.</Alert>}
      {evento.reprogramado && evento.estadoEvento === 'Publicado' && (
        <Alert tono="advertencia">Este evento fue reprogramado: revisa la fecha, la hora y el lugar.</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <dl className="grid gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card sm:grid-cols-2">
            {[
              ['calendar_today', 'Fecha', fechaLarga(evento.fechaHoraInicio)],
              ['schedule', 'Hora', `${hora(evento.fechaHoraInicio)} – ${hora(evento.fechaHoraFin)}`],
              ['location_on', 'Ubicación', evento.ubicacion],
              ['confirmation_number', 'Precio', precio(evento.precio)],
            ].map(([icono, titulo, valor]) => (
              <div key={titulo} className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                <span className="material-symbols-outlined row-span-2 rounded-lg bg-secondary/10 p-2 text-secondary" aria-hidden="true">{icono}</span>
                <dt className="text-label-md uppercase text-on-surface-variant">{titulo}</dt>
                <dd className="font-semibold first-letter:uppercase">{valor}</dd>
              </div>
            ))}
          </dl>
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
            <h2 className="mb-3 text-title-sm">Acerca del evento</h2>
            <p className="whitespace-pre-line text-body-base text-on-surface-variant">{evento.descripcion}</p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card" aria-labelledby="disponibilidad">
            <h2 id="disponibilidad" className="mb-3 text-title-sm">Disponibilidad</h2>
            <p className="mb-2 text-body-sm text-on-surface-variant">
              <strong className="text-headline-md text-on-surface">{evento.cupoDisponible}</strong> de {evento.cupoMaximo} cupos libres
            </p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-container" role="progressbar" aria-valuemin={0} aria-valuemax={evento.cupoMaximo} aria-valuenow={ocupados} aria-label="Cupos ocupados">
              <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.round((ocupados / evento.cupoMaximo) * 100)}%` }} />
            </div>
            <p className="mb-4 text-body-sm text-on-surface-variant">
              Estado: <strong>{estado.texto}</strong>
              {evento.maxAcompanantes > 0 && ` · hasta ${evento.maxAcompanantes} acompañante(s)`}
            </p>
            {evento.aceptaReservaciones ? (
              usuario?.rol === 'Participante' ? (
                <Link to={destinoReserva} className="block rounded-lg bg-primary px-5 py-3 text-center font-semibold text-on-primary hover:bg-primary-container">
                  Reservar
                </Link>
              ) : usuario ? (
                <p className="text-body-sm text-on-surface-variant">Solo los participantes pueden reservar.</p>
              ) : (
                <Link to={`/login?volver=${encodeURIComponent(destinoReserva)}`} className="block rounded-lg bg-primary px-5 py-3 text-center font-semibold text-on-primary hover:bg-primary-container">
                  Inicia sesión para reservar
                </Link>
              )
            ) : (
              <p className="rounded-lg bg-surface-container-low px-4 py-3 text-center text-body-sm text-on-surface-variant">Este evento no acepta reservaciones en este momento.</p>
            )}
            <Button variante="contorno" className="mt-3 w-full" icono={copiado ? 'check' : 'link'} onClick={copiar}>
              {copiado ? 'Enlace copiado' : 'Copiar enlace'}
            </Button>
          </section>
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
            <h2 className="mb-3 text-title-sm">Organizado por</h2>
            <p className="font-semibold">{evento.organizador.nombreCompleto}</p>
            <a href={`mailto:${evento.organizador.correoElectronico}`} className="text-body-sm text-secondary hover:underline">
              {evento.organizador.correoElectronico}
            </a>
          </section>
          {gestiona && (
            <Link to={`/organizador/eventos/${evento.idEvento}/editar`} className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 font-semibold text-primary hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
              Editar evento
            </Link>
          )}
        </aside>
      </div>
    </article>
  );
}
