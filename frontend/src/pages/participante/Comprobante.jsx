import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import Cargando from '../../components/Cargando';
import { Portada } from '../../components/EventoTarjeta';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { reservacionesService } from '../../services/reservaciones.service';
import { fechaCorta, fechaHora, fechaLarga, hora, precio } from '../../utils/formato';
import NoEncontrada from '../publico/NoEncontrada';
import { motivoNoCancelable } from '../../utils/reservaciones';
import CancelarReservacion from './CancelarReservacion';

const ESTADOS = {
  Confirmada: 'bg-exito-container text-on-exito-container',
  Cancelada: 'bg-error-container text-on-error-container',
};

/** Fecha en el formato UTC de iCalendar (20261024T150000Z). */
const ics = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function descargar(nombre, contenido) {
  const url = URL.createObjectURL(contenido);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapar = (texto) => String(texto ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Tu reservación (RF-14, CU-04/CU-12; prototipo siger_tu_reservacion_qr): QR para la entrada, descarga como imagen,
// impresión o PDF, archivo de calendario y cancelación (RN-07).
export default function Comprobante() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nueva = params.get('nueva') === '1';
  const [reservacion, setReservacion] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let vigente = true;
    let url = null;
    reservacionesService
      .detalle(id)
      .then((r) => vigente && setReservacion(r))
      .catch((err) => vigente && setError(err));
    reservacionesService
      .qr(id)
      .then((blob) => {
        if (!vigente) return;
        url = URL.createObjectURL(blob);
        setQr({ url, blob });
      })
      .catch(() => {});
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (error?.response?.status === 404 || error?.codigo === 'PARAMETRO_INVALIDO') return <NoEncontrada />;
  if (error) return <Alert tono="error">{error.mensaje}</Alert>;
  if (!reservacion) return <Cargando />;

  const { evento } = reservacion;
  const confirmada = reservacion.estadoReservacion === 'Confirmada';
  const personas = 1 + reservacion.acompanantes;

  const guardarCalendario = () => {
    const lineas = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SIGER//Reservaciones//ES', 'BEGIN:VEVENT',
      `UID:reservacion-${reservacion.idReservacion}@siger`, `DTSTAMP:${ics(new Date().toISOString())}`,
      `DTSTART:${ics(evento.fechaHoraInicio)}`, `DTEND:${ics(evento.fechaHoraFin)}`,
      `SUMMARY:${evento.nombreEvento.replace(/[,;]/g, ' ')}`, `LOCATION:${evento.ubicacion.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:Reservación SIGER ${reservacion.codigoComprobante}`, 'END:VEVENT', 'END:VCALENDAR',
    ];
    descargar(`evento-${evento.idEvento}.ics`, new Blob([lineas.join('\r\n')], { type: 'text/calendar' }));
  };

  /** Abre el comprobante solo en una ventana nueva para imprimirlo o guardarlo como PDF desde el navegador. */
  const imprimir = async () => {
    const datos = await new Promise((resolver) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result);
      lector.readAsDataURL(qr.blob);
    });
    const v = window.open('', '_blank', 'width=480,height=720');
    if (!v) return;
    v.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante ${escapar(evento.nombreEvento)}</title>
      <style>body{font-family:Inter,Arial,sans-serif;color:#151c27;margin:32px;text-align:center}h1{font-size:20px;color:#00236f;margin:0 0 4px}
      p{margin:4px 0;font-size:14px}.codigo{font-family:Consolas,monospace;font-size:12px;word-break:break-all;margin-top:12px}
      img{width:240px;height:240px;margin:20px auto;display:block;border:1px solid #c5c5d3;border-radius:8px}</style></head><body>
      <p style="font-weight:bold;letter-spacing:2px;color:#00236f">SIGER · COMPROBANTE</p>
      <h1>${escapar(evento.nombreEvento)}</h1><p>${escapar(fechaLarga(evento.fechaHoraInicio))} · ${escapar(hora(evento.fechaHoraInicio))}</p>
      <p>${escapar(evento.ubicacion)}</p><img src="${datos}" alt="Código QR">
      <p>${personas} persona(s) · ${escapar(precio(reservacion.monto))}</p><p class="codigo">${escapar(reservacion.codigoComprobante)}</p>
      </body></html>`);
    v.document.close();
    v.focus();
    setTimeout(() => v.print(), 300);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {nueva && confirmada ? (
        <header className="text-center">
          <span className="material-symbols-outlined mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-5xl text-white shadow-modal" aria-hidden="true">check_circle</span>
          <h1 className="text-headline-md text-primary">¡Reservación exitosa!</h1>
          <p className="text-body-base text-on-surface-variant">Tu lugar está asegurado. Te enviamos el comprobante por correo; presenta el código QR al ingresar.</p>
        </header>
      ) : (
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/mis-reservaciones" className="inline-flex items-center gap-1 text-body-sm font-semibold text-secondary hover:underline">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            Mis reservaciones
          </Link>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${ESTADOS[reservacion.estadoReservacion]}`}>{reservacion.estadoReservacion}</span>
        </header>
      )}
      <Alert tono="exito">{aviso}</Alert>

      <article className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
        <div className="relative h-36">
          <Portada evento={evento} />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent" />
          <div className="absolute bottom-0 p-4 text-white">
            <span className="mb-1 inline-block rounded-full bg-secondary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide">{evento.categoria}</span>
            <h2 className="text-title-sm">
              <Link to={`/eventos/${evento.idEvento}`} className="hover:underline">{evento.nombreEvento}</Link>
            </h2>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 p-5">
          <div><dt className="text-label-md uppercase text-on-surface-variant">Fecha</dt><dd className="font-semibold">{fechaCorta(evento.fechaHoraInicio)}</dd></div>
          <div><dt className="text-label-md uppercase text-on-surface-variant">Hora</dt><dd className="font-semibold">{hora(evento.fechaHoraInicio)}</dd></div>
          <div className="col-span-2"><dt className="text-label-md uppercase text-on-surface-variant">Ubicación</dt><dd>{evento.ubicacion}</dd></div>
          <div><dt className="text-label-md uppercase text-on-surface-variant">Personas</dt><dd>{personas}{reservacion.acompanantes > 0 && ` (tú + ${reservacion.acompanantes})`}</dd></div>
          <div><dt className="text-label-md uppercase text-on-surface-variant">Monto</dt><dd>{precio(reservacion.monto)}</dd></div>
          {reservacion.observaciones && <div className="col-span-2"><dt className="text-label-md uppercase text-on-surface-variant">Observaciones</dt><dd className="break-words">{reservacion.observaciones}</dd></div>}
        </dl>
        <div className="border-t border-dashed border-outline-variant p-5 text-center">
          {confirmada ? (
            <>
              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl border border-outline-variant bg-white p-2">
                {qr ? <img src={qr.url} alt="Código QR de la reservación" className="h-full w-full" /> : <Cargando />}
              </div>
              {reservacion.asistio && <p className="mt-3 font-semibold text-exito">Asistencia registrada</p>}
            </>
          ) : (
            <p className="rounded-lg bg-error-container px-4 py-3 text-body-sm text-on-error-container">
              Reservación cancelada el {fechaHora(reservacion.fechaCancelacion)}. El código QR ya no es válido.
            </p>
          )}
          <p className="mt-3 text-label-md uppercase text-on-surface-variant">Código de la reservación</p>
          <p className="break-all font-mono text-body-sm">{reservacion.codigoComprobante}</p>
        </div>
      </article>

      {confirmada && (
        <div className="space-y-3">
          <Button className="w-full" icono="download" disabled={!qr} onClick={() => descargar(`comprobante-${reservacion.idReservacion}.png`, qr.blob)}>
            Descargar QR (imagen)
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variante="contorno" icono="print" disabled={!qr} onClick={imprimir}>Imprimir o PDF</Button>
            <Button variante="contorno" icono="calendar_add_on" onClick={guardarCalendario}>Guardar en calendario</Button>
          </div>
          {reservacion.cancelable ? (
            <Button variante="texto" className="w-full text-error hover:bg-error/10" icono="event_busy" onClick={() => setCancelando(true)}>
              Cancelar reservación
            </Button>
          ) : (
            <p className="text-center text-body-sm text-on-surface-variant">{motivoNoCancelable(reservacion)}</p>
          )}
        </div>
      )}
      <CancelarReservacion
        reservacion={cancelando ? reservacion : null}
        onCerrar={() => setCancelando(false)}
        onCancelada={(r) => {
          setReservacion(r);
          setCancelando(false);
          setAviso('Reservación cancelada. Te enviamos la confirmación por correo.');
        }}
      />
    </div>
  );
}
