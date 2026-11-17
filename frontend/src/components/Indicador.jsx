import { Link } from 'react-router';

const TONOS = {
  primario: ['text-primary', 'bg-primary/10 text-primary'],
  secundario: ['text-secondary', 'bg-secondary/10 text-secondary'],
  exito: ['text-exito', 'bg-exito-container text-exito'],
  error: ['text-error', 'bg-error-container text-error'],
  advertencia: ['text-advertencia', 'bg-advertencia-container text-advertencia'],
};

// Tarjeta de un indicador de dashboard o reporte: título, cifra, ícono y nota opcional; si tiene «a», es un enlace.
export default function Indicador({ titulo, valor, icono, tono = 'primario', nota, a }) {
  const [texto, insignia] = TONOS[tono];
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`material-symbols-outlined rounded-lg p-2 ${insignia}`} aria-hidden="true">{icono}</span>
        {nota && <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">{nota}</span>}
      </div>
      <p className="mt-3 text-label-md uppercase text-on-surface-variant">{titulo}</p>
      <p className={`text-headline-md tabular-nums ${texto}`}>{valor ?? '—'}</p>
    </>
  );
  const clases = 'block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card';
  return a ? (
    <Link to={a} className={`${clases} transition-shadow hover:shadow-modal`}>{contenido}</Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}
