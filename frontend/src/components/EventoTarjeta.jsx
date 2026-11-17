import { Link } from 'react-router';
import { disponibilidad, fechaCorta, hora, precio } from '../utils/formato';

const TONOS = {
  exito: 'bg-exito-container text-on-exito-container',
  advertencia: 'bg-advertencia-container text-on-advertencia-container',
  error: 'bg-error-container text-on-error-container',
  neutro: 'bg-surface-variant text-on-surface-variant',
};

/** Portada del evento o, si no tiene imagen, un degradado con el ícono de evento. */
export function Portada({ evento, className = '' }) {
  return evento.imagenUrl ? (
    <img src={evento.imagenUrl} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary ${className}`} aria-hidden="true">
      <span className="material-symbols-outlined text-6xl text-white/40" aria-hidden="true">event</span>
    </div>
  );
}

// Tarjeta del catálogo (prototipo siger_descubrir_eventos): categoría, fecha, nombre, lugar, precio y disponibilidad.
export default function EventoTarjeta({ evento }) {
  const estado = disponibilidad(evento);
  return (
    <Link
      to={`/eventos/${evento.idEvento}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card transition-shadow hover:shadow-modal focus-visible:ring-2"
    >
      <div className="relative h-40">
        <Portada evento={evento} />
        <span className="absolute left-3 top-3 rounded-full bg-surface-container-lowest/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          {evento.categoria}
        </span>
        {evento.reprogramado && (
          <span className="absolute right-3 top-3 rounded-full bg-advertencia-container px-3 py-1 text-[11px] font-bold text-on-advertencia-container">Reprogramado</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-label-md uppercase text-secondary">
          {fechaCorta(evento.fechaHoraInicio)} · {hora(evento.fechaHoraInicio)}
        </p>
        <h3 className="line-clamp-2 text-title-sm text-on-surface group-hover:text-primary">{evento.nombreEvento}</h3>
        <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
          <span className="truncate">{evento.ubicacion}</span>
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-on-surface">{precio(evento.precio)}</span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${TONOS[estado.tono]}`}>{estado.texto}</span>
        </div>
      </div>
    </Link>
  );
}
