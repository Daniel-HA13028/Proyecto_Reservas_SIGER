import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import Input from '../../components/ui/Input';

// Preguntas frecuentes por tema; las respuestas siguen las reglas que aplica el sistema (RN-01 a RN-15).
const PREGUNTAS = [
  ['General', '¿Qué es SIGER?', 'El Sistema Inteligente de Gestión de Eventos y Reservaciones permite publicar eventos, reservar cupos con un comprobante QR y controlar la asistencia en la entrada.'],
  ['General', '¿Necesito una cuenta para ver los eventos?', 'No. El catálogo y el detalle de los eventos son públicos. Para reservar necesitas una cuenta de participante.'],
  ['General', 'No me llegó el correo de verificación o el código', 'Revisa la carpeta de correo no deseado. Puedes pedir un correo nuevo desde la pantalla de inicio de sesión; los enlaces y códigos anteriores dejan de servir.'],
  ['General', 'Olvidé mi contraseña', 'En «¿Olvidaste tu contraseña?» recibirás un código de 6 dígitos válido por 15 minutos. Tienes 5 intentos para escribirlo; después pide uno nuevo.'],
  ['General', 'Mi cuenta quedó bloqueada al iniciar sesión', 'Después de 5 intentos fallidos, por seguridad el acceso con ese correo se bloquea durante 15 minutos. Espera o recupera tu contraseña.'],
  ['Participantes', '¿Cómo reservo un evento?', 'Abre el evento en el catálogo y pulsa «Reservar». Indica si llevas acompañantes (cada uno usa un cupo) y confirma. Si el evento tiene precio, el pago es simulado: no se cobra nada.'],
  ['Participantes', '¿Puedo reservar dos veces el mismo evento?', 'No. Solo puedes tener una reservación confirmada por evento. Si cancelas, puedes volver a reservar mientras haya cupos.'],
  ['Participantes', '¿Dónde está mi código QR?', 'En «Mis reservaciones» → «Ver QR». También te lo enviamos por correo al reservar y te recordamos el evento 24 horas antes. Puedes descargarlo como imagen o imprimirlo.'],
  ['Participantes', '¿Hasta cuándo puedo cancelar?', 'Hasta 24 horas antes del inicio del evento. Al cancelar, tus cupos y los de tus acompañantes quedan libres y el QR deja de ser válido.'],
  ['Participantes', '¿Qué pasa si el organizador cancela o cambia el evento?', 'Te avisamos por correo y en tus notificaciones. Si se cancela, tu reservación se cancela automáticamente; si cambia la fecha o el lugar, verás el aviso «Reprogramado».'],
  ['Organizadores', '¿Cómo me registro como organizador?', 'Elige «Organizador» al crear tu cuenta. Un administrador revisará tu solicitud; te avisaremos por correo cuando sea aprobada.'],
  ['Organizadores', '¿Cómo creo y publico un evento?', 'En «Crear evento» completa los datos y la imagen (JPG o PNG de hasta 2 MB). Se guarda como borrador; cuando esté listo, pulsa «Publicar» para que aparezca en el catálogo.'],
  ['Organizadores', '¿Puedo editar un evento ya publicado?', 'Sí, mientras no esté cancelado ni finalizado. Si cambias la fecha, la hora o el lugar, avisamos a quienes reservaron. La capacidad no puede quedar por debajo de los cupos ya reservados.'],
  ['Organizadores', '¿Cómo registro la asistencia?', 'En «Mis eventos» → «Asistencia» → «Escanear QR». Usa la cámara del teléfono (requiere HTTPS) o escribe el código del comprobante. También puedes marcar la asistencia en la lista de participantes.'],
  ['Organizadores', '¿Puedo deshacer una asistencia marcada por error?', 'Sí, solo el mismo día del evento. La marca queda anulada (no se borra) y puedes volver a registrarla.'],
  ['Organizadores', '¿Dónde veo las estadísticas?', 'En «Estadísticas en vivo» del evento (se actualiza cada 10 segundos) y en «Reportes», donde puedes exportar a PDF o Excel.'],
];
const TEMAS = ['Todas', 'General', 'Participantes', 'Organizadores'];

// Preguntas frecuentes (RF-25; prototipo siger_faq; T-10-07): búsqueda, temas y acceso a soporte técnico.
export default function Faq() {
  const [tema, setTema] = useState('Todas');
  const [buscar, setBuscar] = useState('');

  const visibles = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return PREGUNTAS.filter(([cat, p, r]) => (tema === 'Todas' || cat === tema) && (!t || `${p} ${r}`.toLowerCase().includes(t)));
  }, [tema, buscar]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Preguntas frecuentes</h1>
        <p className="text-body-sm text-on-surface-variant">Respuestas rápidas sobre cuentas, reservaciones y eventos.</p>
      </header>

      <Input icono="search" aria-label="Buscar preguntas" placeholder="Buscar preguntas…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Temas">
        {TEMAS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tema === t}
            onClick={() => setTema(t)}
            className={`shrink-0 rounded-full px-4 py-2 text-body-sm ${tema === t ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="rounded-xl bg-primary p-6 text-white shadow-card">
        <h2 className="text-title-sm">¿Necesitas ayuda directa?</h2>
        <p className="mb-4 mt-1 text-body-sm text-white/80">Si tu duda no está aquí, reporta el problema y el equipo de soporte lo revisará.</p>
        <Link to="/ayuda/soporte" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-primary hover:bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">support_agent</span>
          Contactar soporte
        </Link>
      </section>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">No encontramos preguntas con «{buscar}».</p>
      ) : (
        <div className="space-y-3">
          {visibles.map(([cat, pregunta, respuesta]) => (
            <details key={pregunta} className="group rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card open:shadow-modal">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-secondary">{cat}</span>
                  {pregunta}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
              </summary>
              <p className="px-5 pb-5 text-body-base text-on-surface-variant">{respuesta}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
