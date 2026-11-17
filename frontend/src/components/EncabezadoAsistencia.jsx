import { Link, NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { fechaHora } from '../utils/formato';

const SECCIONES = [
  ['asistencia', 'Control', 'how_to_reg'],
  ['escanear', 'Escanear', 'qr_code_scanner'],
  ['participantes', 'Participantes', 'groups'],
  ['en-vivo', 'En vivo', 'monitoring'],
];

// Encabezado común de las pantallas de asistencia de un evento: nombre, fecha y navegación entre secciones.
export default function EncabezadoAsistencia({ evento, titulo, descripcion }) {
  const { usuario } = useAuth();
  const volver = usuario?.rol === 'Administrador' ? '/admin/eventos' : '/organizador/eventos';
  return (
    <header className="space-y-4">
      <Link to={volver} className="inline-flex items-center gap-1 text-body-sm font-semibold text-secondary hover:underline">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        {usuario?.rol === 'Administrador' ? 'Gestión de eventos' : 'Mis eventos'}
      </Link>
      <div>
        <p className="text-label-md uppercase text-secondary">{titulo}</p>
        <h1 className="text-headline-md text-on-surface">{evento?.nombreEvento ?? '…'}</h1>
        {evento && (
          <p className="text-body-sm text-on-surface-variant">
            {fechaHora(evento.fechaHoraInicio)} · {evento.ubicacion}
            {descripcion && ` · ${descripcion}`}
          </p>
        )}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-outline-variant" aria-label="Secciones de asistencia">
        {SECCIONES.map(([ruta, texto, icono]) => (
          <NavLink
            key={ruta}
            to={`/organizador/eventos/${evento?.idEvento ?? ''}/${ruta}`}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-label-md uppercase ${isActive ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`
            }
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icono}</span>
            {texto}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
