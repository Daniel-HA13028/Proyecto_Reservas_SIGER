import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Cargando from '../components/Cargando';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import { useAuth } from '../context/AuthContext';
import { notificacionesService } from '../services/notificaciones.service';
import { fechaHora } from '../utils/formato';

/** Ícono y color de cada tipo de notificación. */
const TIPOS = {
  Bienvenida: ['waving_hand', 'text-secondary bg-secondary/10'],
  Verificacion_Correo: ['mark_email_read', 'text-secondary bg-secondary/10'],
  Recuperacion_Contrasena: ['key', 'text-secondary bg-secondary/10'],
  Aprobacion_Organizador: ['verified', 'text-exito bg-exito-container'],
  Rechazo_Organizador: ['block', 'text-error bg-error-container'],
  Confirmacion_Reserva: ['confirmation_number', 'text-exito bg-exito-container'],
  Cancelacion_Reserva: ['event_busy', 'text-on-surface-variant bg-surface-container-high'],
  Cambio_Evento: ['edit_calendar', 'text-on-advertencia-container bg-advertencia-container'],
  Cancelacion_Evento: ['cancel', 'text-error bg-error-container'],
  Recordatorio: ['alarm', 'text-primary bg-primary/10'],
};

/** Hace cuánto: «hace 5 min», «hace 3 h»; después de una semana, la fecha. */
function haceCuanto(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`;
  if (min < 7 * 24 * 60) return `hace ${Math.round(min / 1440)} d`;
  return fechaHora(iso);
}

/** A dónde lleva cada aviso al abrirlo. */
function destino(n, rol) {
  if (['Confirmacion_Reserva', 'Recordatorio'].includes(n.tipo) && rol === 'Participante') return '/mis-reservaciones';
  if (n.tipo === 'Cancelacion_Reserva' && rol === 'Participante') return '/mis-reservaciones?grupo=canceladas';
  if (n.idEvento) return `/eventos/${n.idEvento}`;
  if (n.tipo === 'Aprobacion_Organizador') return '/organizador';
  return null;
}

// Centro de notificaciones (RF-21, CU-14; T-08-04): avisos propios con filtro de no leídas, marcar una o todas como
// leídas e ir a lo que menciona cada aviso. La campana de la barra superior muestra el contador.
export default function Notificaciones() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    let vigente = true;
    notificacionesService
      .listar({ leida: soloNoLeidas ? false : null, pagina, limite: 15 })
      .then((d) => {
        if (!vigente) return;
        setDatos(d);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [soloNoLeidas, pagina, recarga]);

  const abrir = async (n) => {
    try {
      if (!n.leida) await notificacionesService.marcarLeida(n.idNotificacion);
    } catch {
      // Si no se pudo marcar, igual se abre lo que menciona.
    }
    const ruta = destino(n, usuario.rol);
    if (ruta) navigate(ruta);
    else setRecarga((x) => x + 1);
  };

  const marcarTodas = async () => {
    setMarcando(true);
    try {
      await notificacionesService.marcarTodas();
      setRecarga((x) => x + 1);
    } catch (err) {
      setError(err);
    } finally {
      setMarcando(false);
    }
  };

  const filtrar = (valor) => {
    setSoloNoLeidas(valor);
    setPagina(1);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-on-surface">Notificaciones</h1>
          <p className="text-body-sm text-on-surface-variant">
            {datos ? (datos.noLeidas === 0 ? 'Estás al día.' : `Tienes ${datos.noLeidas} sin leer.`) : 'Avisos de tus reservaciones, eventos y cuenta.'}
          </p>
        </div>
        <Button variante="contorno" icono="done_all" cargando={marcando} disabled={!datos || datos.noLeidas === 0} onClick={marcarTodas}>
          Marcar todas como leídas
        </Button>
      </header>

      <div className="flex gap-2" role="group" aria-label="Filtro">
        {[
          [false, 'Todas'],
          [true, `No leídas${datos ? ` (${datos.noLeidas})` : ''}`],
        ].map(([valor, texto]) => (
          <button
            key={texto}
            type="button"
            aria-pressed={soloNoLeidas === valor}
            onClick={() => filtrar(valor)}
            className={`rounded-full px-4 py-2 text-body-sm ${soloNoLeidas === valor ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}
          >
            {texto}
          </button>
        ))}
      </div>

      <Alert tono="error">{error?.mensaje}</Alert>

      {!datos ? (
        !error && <Cargando />
      ) : datos.notificaciones.contenido.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
          <span className="material-symbols-outlined mb-2 text-5xl" aria-hidden="true">notifications_off</span>
          <p>{soloNoLeidas ? 'No tienes notificaciones sin leer.' : 'Aún no tienes notificaciones.'}</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
          <ul className="divide-y divide-outline-variant">
            {datos.notificaciones.contenido.map((n) => {
              const [icono, color] = TIPOS[n.tipo] ?? ['notifications', 'text-secondary bg-secondary/10'];
              return (
                <li key={n.idNotificacion}>
                  <button
                    type="button"
                    onClick={() => abrir(n)}
                    className={`flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-surface-container-low md:px-6 ${n.leida ? '' : 'bg-secondary/5'}`}
                  >
                    <span className={`material-symbols-outlined shrink-0 rounded-full p-2 ${color}`} aria-hidden="true">{icono}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block ${n.leida ? 'text-on-surface' : 'font-semibold text-on-surface'}`}>{n.asunto}</span>
                      <span className="block text-body-sm text-on-surface-variant">{n.mensaje}</span>
                      <span className="mt-1 block text-[12px] text-on-surface-variant" title={fechaHora(n.fechaCreacion)}>{haceCuanto(n.fechaCreacion)}</span>
                    </span>
                    {!n.leida && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" aria-label="Sin leer" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-outline-variant p-4">
            <Pagination
              pagina={pagina}
              totalPaginas={datos.notificaciones.totalPaginas}
              totalElementos={datos.notificaciones.totalElementos}
              onCambiar={setPagina}
            />
          </div>
        </section>
      )}
    </div>
  );
}
