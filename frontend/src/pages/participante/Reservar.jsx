import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Cargando from '../../components/Cargando';
import { Portada } from '../../components/EventoTarjeta';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { eventosService } from '../../services/eventos.service';
import { reservacionesService } from '../../services/reservaciones.service';
import { fechaLarga, hora, precio } from '../../utils/formato';
import NoEncontrada from '../publico/NoEncontrada';

const MAX_OBSERVACIONES = 300;

// Reservar (RF-13, CU-04; prototipo siger_reservacion): resumen del evento, datos del titular precargados,
// acompañantes y observaciones. Si el evento tiene precio, un paso de pago simulado (RN-12) antes de confirmar.
export default function Reservar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [evento, setEvento] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [acompanantes, setAcompanantes] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [paso, setPaso] = useState('datos');
  const [aceptaPago, setAceptaPago] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    eventosService
      .detalle(id)
      .then((e) => vigente && setEvento(e))
      .catch((err) => vigente && setErrorCarga(err));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (errorCarga?.response?.status === 404 || errorCarga?.codigo === 'PARAMETRO_INVALIDO') return <NoEncontrada />;
  if (errorCarga) return <Alert tono="error">{errorCarga.mensaje}</Alert>;
  if (!evento) return <Cargando />;

  const personas = 1 + acompanantes;
  const total = Number(evento.precio) * personas;
  const conPago = Number(evento.precio) > 0;
  const maxAcompanantes = Math.min(evento.maxAcompanantes, Math.max(0, evento.cupoDisponible - 1));

  const confirmar = async () => {
    setError(null);
    setEnviando(true);
    try {
      const r = await reservacionesService.reservar(evento.idEvento, { acompanantes, observaciones: observaciones.trim() || null });
      navigate(`/reservaciones/${r.idReservacion}?nueva=1`, { replace: true });
    } catch (err) {
      setError(err);
      setPaso('datos');
      // Los cupos pudieron cambiar mientras llenaba el formulario.
      eventosService.detalle(id).then(setEvento).catch(() => {});
    } finally {
      setEnviando(false);
    }
  };

  const continuar = (e) => {
    e.preventDefault();
    if (conPago) setPaso('pago');
    else confirmar();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={`/eventos/${evento.idEvento}`} className="inline-flex items-center gap-1 text-body-sm font-semibold text-secondary hover:underline">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Volver al evento
      </Link>
      <header>
        <h1 className="text-headline-md text-on-surface">{paso === 'pago' ? 'Pago de la reservación' : 'Confirmar reservación'}</h1>
        <p className="text-body-sm text-on-surface-variant">
          {paso === 'pago' ? 'Revisa el total y confirma el pago simulado.' : 'Revisa los detalles antes de finalizar tu reserva.'}
        </p>
      </header>

      {error && (
        <Alert tono="error">
          {error.mensaje}
          {error.codigo === 'RESERVA_DUPLICADA' && (
            <>
              {' '}
              <Link to="/mis-reservaciones" className="font-semibold underline">Ver mis reservaciones</Link>
            </>
          )}
        </Alert>
      )}
      {!evento.aceptaReservaciones && <Alert tono="advertencia">Este evento no acepta reservaciones en este momento.</Alert>}

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card md:flex">
        <div className="h-40 md:h-auto md:w-56 md:shrink-0">
          <Portada evento={evento} />
        </div>
        <div className="space-y-2 p-5">
          <span className="inline-block rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary">{evento.categoria}</span>
          <h2 className="text-title-sm">{evento.nombreEvento}</h2>
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_today</span>
            <span className="first-letter:uppercase">{fechaLarga(evento.fechaHoraInicio)} · {hora(evento.fechaHoraInicio)} – {hora(evento.fechaHoraFin)}</span>
          </p>
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
            {evento.ubicacion}
          </p>
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person</span>
            Organizado por {evento.organizador.nombreCompleto}
          </p>
        </div>
      </section>

      {paso === 'datos' ? (
        <form onSubmit={continuar} className="space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
          <h2 className="text-title-sm">Detalles de la entrada</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-label-md uppercase text-on-surface-variant">Titular</dt>
              <dd className="font-semibold">{usuario.nombres} {usuario.apellidos}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-label-md uppercase text-on-surface-variant">Correo electrónico</dt>
              <dd className="break-words">{usuario.correoElectronico}</dd>
            </div>
          </dl>
          {evento.maxAcompanantes > 0 ? (
            <div className="space-y-2">
              <Select
                etiqueta="Acompañantes"
                value={acompanantes}
                onChange={(e) => setAcompanantes(Number(e.target.value))}
                opciones={Array.from({ length: maxAcompanantes + 1 }, (_, n) => ({ valor: n, texto: n === 0 ? 'Solo yo' : `${n} acompañante${n === 1 ? '' : 's'}` }))}
              />
              <p className="ml-1 text-body-sm text-on-surface-variant">
                Hasta {evento.maxAcompanantes} acompañante(s). Cada acompañante usa un cupo; quedan {evento.cupoDisponible}.
              </p>
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant">Este evento no admite acompañantes: la reservación es solo para ti.</p>
          )}
          <div className="space-y-2">
            <label htmlFor="observaciones" className="ml-1 block text-label-md uppercase text-on-surface-variant">Observaciones (opcional)</label>
            <textarea
              id="observaciones"
              rows={3}
              maxLength={MAX_OBSERVACIONES}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Por ejemplo, necesidades de accesibilidad."
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-base outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
            <p className="ml-1 text-right text-body-sm text-on-surface-variant">{observaciones.length}/{MAX_OBSERVACIONES}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
            <span className="text-body-sm text-on-surface-variant">{personas} cupo{personas === 1 ? '' : 's'} × {precio(evento.precio)}</span>
            <strong className="text-title-sm">{precio(total)}</strong>
          </div>
          <Button type="submit" className="w-full" icono={conPago ? 'payments' : 'check_circle'} cargando={enviando} disabled={!evento.aceptaReservaciones}>
            {conPago ? 'Continuar al pago' : 'Confirmar reservación'}
          </Button>
          <p className="flex items-start gap-2 text-body-sm italic text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] not-italic" aria-hidden="true">info</span>
            Puedes cancelar tu reservación hasta 24 horas antes del inicio del evento.
          </p>
        </form>
      ) : (
        <section className="space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card" aria-label="Pago simulado">
          <Alert tono="info">SIGER simula el pago: no se solicita ni se cobra ninguna tarjeta. El monto queda registrado en tu comprobante.</Alert>
          <dl className="space-y-3">
            <div className="flex justify-between text-body-sm"><dt className="text-on-surface-variant">Entrada del titular</dt><dd>{precio(evento.precio)}</dd></div>
            {acompanantes > 0 && (
              <div className="flex justify-between text-body-sm"><dt className="text-on-surface-variant">{acompanantes} acompañante(s)</dt><dd>{precio(Number(evento.precio) * acompanantes)}</dd></div>
            )}
            <div className="flex justify-between border-t border-outline-variant pt-3"><dt className="font-semibold">Total</dt><dd className="text-title-sm">{precio(total)}</dd></div>
          </dl>
          <label className="flex items-start gap-3 text-body-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={aceptaPago} onChange={(e) => setAceptaPago(e.target.checked)} />
            Confirmo el pago simulado de {precio(total)} para {personas} persona{personas === 1 ? '' : 's'}.
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variante="contorno" onClick={() => setPaso('datos')} disabled={enviando}>Volver</Button>
            <Button icono="lock" onClick={confirmar} cargando={enviando} disabled={!aceptaPago}>Pagar y reservar</Button>
          </div>
        </section>
      )}
    </div>
  );
}
