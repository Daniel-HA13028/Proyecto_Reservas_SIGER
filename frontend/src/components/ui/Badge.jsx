// Insignia de estado o rol (T-01-06). Los colores siguen los prototipos.
const TONOS = {
  Activo: 'bg-exito-container text-on-exito-container',
  Pendiente: 'bg-advertencia-container text-on-advertencia-container',
  Inactivo: 'bg-surface-variant text-on-surface-variant',
  Administrador: 'bg-primary/10 text-primary',
  Organizador: 'bg-secondary/10 text-secondary',
  Participante: 'bg-surface-container-high text-on-surface-variant',
};

export default function Badge({ valor, children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${TONOS[valor] ?? TONOS.Inactivo}`}>
      {children ?? valor}
    </span>
  );
}
