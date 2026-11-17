import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import EncabezadoAsistencia from '../../components/EncabezadoAsistencia';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import useEvento from '../../hooks/useEvento';
import { asistenciaService } from '../../services/asistencia.service';
import { hora } from '../../utils/formato';
import NoEncontrada from '../publico/NoEncontrada';

const LECTOR = 'lector-qr';
/** Tras leer un código se ignora el mismo código durante este tiempo (la cámara lo sigue viendo). */
const REPETICION_MS = 4000;
let colaCamara = Promise.resolve();

/** Pitido corto con Web Audio: agudo si se registró, grave y doble si hubo error. */
function sonar(exito) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const tonos = exito ? [[880, 0, 0.15]] : [[220, 0, 0.18], [220, 0.25, 0.18]];
    for (const [frecuencia, inicio, duracion] of tonos) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = frecuencia;
      osc.type = exito ? 'sine' : 'square';
      vol.gain.value = 0.15;
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion);
    }
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Sin audio disponible: basta la retroalimentación visual.
  }
  navigator.vibrate?.(exito ? 120 : [80, 60, 80]);
}

const ERRORES = {
  CODIGO_QR_INVALIDO: ['Código no válido', 'qr_code_2'],
  QR_DE_OTRO_EVENTO: ['Comprobante de otro evento', 'event_busy'],
  RESERVACION_NO_CONFIRMADA: ['Reservación cancelada', 'block'],
  ASISTENCIA_YA_REGISTRADA: ['Asistencia ya registrada', 'history'],
};

// Escanear QR (RF-17, CU-05; prototipo siger_escanear_asistencia_qr): cámara trasera con html5-qrcode, respuesta visual
// y sonora, y campo para escribir el código si el QR está dañado. Requiere HTTPS o localhost para usar la cámara.
export default function Escanear() {
  const { id } = useParams();
  const { evento, error: errorEvento } = useEvento(id);
  const [camara, setCamara] = useState('iniciando');
  const [resultado, setResultado] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [recientes, setRecientes] = useState([]);
  // La cámara se abre solo cuando el servidor confirma que este usuario gestiona el evento.
  const [acceso, setAcceso] = useState({ permitido: false, error: null });
  const ultimo = useRef({ codigo: null, en: 0 });
  const ocupado = useRef(false);

  const cargarRecientes = useCallback(() => {
    asistenciaService
      .resumen(id)
      .then((r) => {
        setRecientes(r.ultimosValidados);
        setAcceso({ permitido: true, error: null });
      })
      .catch((error) => setAcceso((a) => (a.permitido ? a : { permitido: false, error })));
  }, [id]);

  const validar = useCallback(
    async (texto, metodo) => {
      const limpio = texto.trim();
      if (!limpio || ocupado.current) return;
      const ahora = Date.now();
      if (metodo === 'QR_Scanner' && ultimo.current.codigo === limpio && ahora - ultimo.current.en < REPETICION_MS) return;
      ultimo.current = { codigo: limpio, en: ahora };
      ocupado.current = true;
      setValidando(true);
      try {
        const a = await asistenciaService.validarQr(id, limpio, metodo);
        setResultado({ exito: true, asistencia: a, en: new Date() });
        sonar(true);
        setCodigo('');
        cargarRecientes();
      } catch (err) {
        setResultado({ exito: false, error: err, en: new Date() });
        sonar(false);
      } finally {
        ocupado.current = false;
        setValidando(false);
      }
    },
    [id, cargarRecientes],
  );

  useEffect(() => {
    cargarRecientes();
  }, [cargarRecientes]);

  // La cámara llama siempre a la versión más reciente de «validar» sin reiniciarse.
  const alLeer = useRef(validar);
  useEffect(() => {
    alLeer.current = validar;
  }, [validar]);

  useEffect(() => {
    if (!acceso.permitido) return undefined;
    let activo = true;
    let lector = null;
    // Arranques y paradas en serie: html5-qrcode falla si se inicia mientras otra instancia aún se detiene.
    colaCamara = colaCamara.then(async () => {
      if (!activo) return;
      lector = new Html5Qrcode(LECTOR, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      try {
        await lector.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (ancho, alto) => ({ width: Math.min(ancho, alto) * 0.7, height: Math.min(ancho, alto) * 0.7 }) },
          (texto) => alLeer.current(texto, 'QR_Scanner'),
          () => {},
        );
        if (activo) setCamara('activa');
      } catch {
        if (activo) setCamara('sin-acceso');
      }
    }).catch(() => {});
    return () => {
      activo = false;
      colaCamara = colaCamara.then(async () => {
        if (lector?.isScanning) await lector.stop().catch(() => {});
        try {
          lector?.clear();
        } catch {
          // El elemento ya no existe.
        }
      });
    };
  }, [acceso.permitido]);

  if (errorEvento?.response?.status === 404 || errorEvento?.codigo === 'PARAMETRO_INVALIDO') return <NoEncontrada />;

  if (acceso.error) {
    return (
      <div className="space-y-6">
        <EncabezadoAsistencia evento={evento} titulo="Escanear QR" />
        <Alert tono="error">{acceso.error.mensaje}</Alert>
      </div>
    );
  }

  const [tituloError, iconoError] = resultado?.error ? (ERRORES[resultado.error.codigo] ?? ['No se pudo validar', 'error']) : [];

  return (
    <div className="space-y-6">
      <EncabezadoAsistencia evento={evento} titulo="Escanear QR" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl bg-inverse-surface shadow-card" aria-label="Cámara">
            <div id={LECTOR} className="min-h-[280px] w-full [&_video]:w-full [&_video]:object-cover" />
            <p className="flex items-center gap-2 px-4 py-3 text-body-sm text-inverse-on-surface">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {camara === 'activa' ? 'center_focus_strong' : camara === 'iniciando' ? 'hourglass_top' : 'no_photography'}
              </span>
              {camara === 'activa' && 'Centra el código QR dentro del recuadro.'}
              {camara === 'iniciando' && 'Abriendo la cámara…'}
              {camara === 'sin-acceso' && 'No se pudo usar la cámara (permiso denegado, sin cámara o sin HTTPS). Escribe el código abajo.'}
            </p>
          </section>

          <form
            className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-5"
            onSubmit={(e) => {
              e.preventDefault();
              validar(codigo, 'Digital_Code');
            }}
          >
            <h2 className="text-title-sm">Ingreso con código</h2>
            <div className="flex gap-2">
              <Input className="flex-1" icono="keyboard" aria-label="Código del comprobante" placeholder="Código del comprobante" value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={64} autoComplete="off" />
              <Button type="submit" icono="how_to_reg" cargando={validando} disabled={!codigo.trim()}>Validar</Button>
            </div>
            <p className="text-body-sm italic text-on-surface-variant">Úsalo si el QR está dañado o la cámara no funciona. El código aparece bajo el QR del comprobante.</p>
          </form>
        </div>

        <div className="space-y-6">
          <section aria-live="assertive" aria-atomic="true">
            {resultado ? (
              <div
                className={`flex items-start gap-4 rounded-xl border-2 p-5 shadow-card ${resultado.exito ? 'border-exito bg-exito-container' : 'border-error bg-error-container'}`}
              >
                <span className={`material-symbols-outlined rounded-full bg-white/70 p-3 text-4xl ${resultado.exito ? 'text-exito' : 'text-error'}`} aria-hidden="true">
                  {resultado.exito ? 'check_circle' : iconoError}
                </span>
                <div className="min-w-0">
                  <p className={`text-label-md uppercase ${resultado.exito ? 'text-on-exito-container' : 'text-on-error-container'}`}>
                    {resultado.exito ? 'Acceso permitido' : 'Acceso denegado'} · {hora(resultado.en.toISOString())}
                  </p>
                  {resultado.exito ? (
                    <>
                      <p className="text-title-sm text-on-surface">{resultado.asistencia.participante}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {resultado.asistencia.acompanantes > 0 ? `Ingresa con ${resultado.asistencia.acompanantes} acompañante(s)` : 'Ingresa sin acompañantes'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-title-sm text-on-surface">{tituloError}</p>
                      <p className="text-body-sm text-on-error-container">{resultado.error.mensaje}</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined mb-2 text-5xl" aria-hidden="true">qr_code_scanner</span>
                <p>El resultado de cada lectura aparece aquí.</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
            <h2 className="border-b border-outline-variant px-5 py-4 text-label-md uppercase text-on-surface-variant">Ingresos recientes</h2>
            {recientes.length === 0 ? (
              <p className="p-5 text-body-sm text-on-surface-variant">Aún no hay ingresos registrados.</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {recientes.map((a) => (
                  <li key={a.idAsistencia} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.participante}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {hora(a.fechaHoraValidacion)}
                        {a.acompanantes > 0 && ` · +${a.acompanantes}`}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-exito" aria-hidden="true">verified</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
