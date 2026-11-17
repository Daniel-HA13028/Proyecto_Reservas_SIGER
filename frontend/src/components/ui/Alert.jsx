// Aviso dentro de la página: error, exito, advertencia o info. Los errores se anuncian a los lectores de pantalla.
const TONOS = {
  error: ['bg-error-container text-on-error-container', 'error'],
  exito: ['bg-exito-container text-on-exito-container', 'check_circle'],
  advertencia: ['bg-advertencia-container text-on-advertencia-container', 'warning'],
  info: ['bg-secondary-fixed text-on-secondary-fixed', 'info'],
};

export default function Alert({ tono = 'info', children, className = '' }) {
  if (!children) return null;
  const [clases, icono] = TONOS[tono];
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg px-4 py-3 text-body-sm ${clases} ${className}`}>
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        {icono}
      </span>
      <div>{children}</div>
    </div>
  );
}
