import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import Cargando from '../../components/Cargando';
import { Portada } from '../../components/EventoTarjeta';
import Alert from '../../components/ui/Alert';
import Pagination from '../../components/ui/Pagination';
import { reservacionesService } from '../../services/reservaciones.service';
import { fechaCorta, fechaHora, hora, precio } from '../../utils/formato';
import { motivoNoCancelable } from '../../utils/reservaciones';
import CancelarReservacion from './CancelarReservacion';

const GRUPOS = [
  ['proximas', 'Próximas', 'event_upcoming'],
  ['pasadas', 'Pasadas', 'history'],
  ['canceladas', 'Canceladas', 'event_busy'],
];

const VACIOS = {
  proximas: 'No tienes reservaciones para eventos próximos.',
  pasadas: 'Aún no has asistido a ningún evento.',
  canceladas: 'No has cancelado ninguna reservación.',
};

function Etiqueta({ reservacion, grupo }) {
  if (grupo === 'canceladas') return <span className="rounded-full bg-error-container px-3 py-1 text-[11px] font-bold uppercase text-on-error-container">Cancelada</span>;
  if (grupo === 'pasadas') {
    return reservacion.asistio ? (
      <span className="rounded-full bg-exito-container px-3 py-1 text-[11px] font-bold uppercase text-on-exito-container">Asististe</span>
    ) : (
      <span className="rounded-full bg-surface-variant px-3 py-1 text-[11px] font-bold uppercase text-on-surface-variant">Sin asistencia</span>
    );
  }
  return <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase text-on-primary">Confirmada</span>;
}

// Mis reservaciones (RF-15, CU-12; prototipo siger_mis_reservaciones): próximas, pasadas con la asistencia (historial
// de participación) y canceladas. Cancelar solo se habilita a más de 24 h del inicio (RN-07) y se explica por qué no.
export default function MisReservaciones() {
  const [params, setParams] = useSearchParams();
  const grupo = GRUPOS.some(([g]) => g === params.get('grupo')) ? params.get('grupo') : 'proximas';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [aCancelar, setACancelar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    reservacionesService
      .mias(grupo, pagina)
      .then((r) => {
        if (!vigente) return;
        setResultado({ grupo, ...r });
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [grupo, pagina, recarga]);

  const cambiar = (g) => {
    setAviso(null);
    setParams(g === 'proximas' ? {} : { grupo: g });
  };

  const cargando = !resultado || resultado.grupo !== grupo;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-on-surface">Mis reservaciones</h1>
          <p className="text-body-sm text-on-surface-variant">Administra tus reservaciones y accede a tus códigos QR.</p>
        </div>
        <Link to="/eventos" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary-container">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
          Explorar eventos
        </Link>
      </header>

      <div className="flex border-b border-outline-variant" role="tablist" aria-label="Grupos de reservaciones">
        {GRUPOS.map(([valor, texto, icono]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={grupo === valor}
            onClick={() => cambiar(valor)}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-3 text-label-md uppercase sm:flex-none sm:px-6 ${grupo === valor ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined hidden text-[18px] sm:inline" aria-hidden="true">{icono}</span>
            {texto}
          </button>
        ))}
      </div>

      <Alert tono="exito">{aviso}</Alert>
      <Alert tono="error">{error?.mensaje}</Alert>

      {cargando ? (
        !error && <Cargando />
      ) : resultado.contenido.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
          <span className="material-symbols-outlined mb-2 text-5xl" aria-hidden="true">confirmation_number</span>
          <p>{VACIOS[grupo]}</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {resultado.contenido.map((r) => (
              <li key={r.idReservacion} className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
                <div className="relative h-36">
                  <Portada evento={r.evento} className={grupo === 'proximas' ? '' : 'grayscale-[40%]'} />
                  <div className="absolute right-3 top-3"><Etiqueta reservacion={r} grupo={grupo} /></div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="text-title-sm">
                    <Link to={`/eventos/${r.evento.idEvento}`} className="hover:underline">{r.evento.nombreEvento}</Link>
                  </h2>
                  <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_today</span>
                    {fechaCorta(r.evento.fechaHoraInicio)} · {hora(r.evento.fechaHoraInicio)}
                  </p>
                  <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
                    <span className="truncate">{r.evento.ubicacion}</span>
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {1 + r.acompanantes} persona{r.acompanantes ? 's' : ''} · {precio(r.monto)}
                    {grupo === 'canceladas' && ` · cancelada el ${fechaHora(r.fechaCancelacion)}`}
                  </p>
                  <div className="mt-auto space-y-2 pt-2">
                    {grupo !== 'canceladas' && (
                      <Link to={`/reservaciones/${r.idReservacion}`} className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 font-semibold text-on-secondary hover:bg-secondary-container">
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">qr_code_2</span>
                        {grupo === 'proximas' ? 'Ver QR' : 'Ver comprobante'}
                      </Link>
                    )}
                    {grupo === 'proximas' && (
                      <>
                        <button
                          type="button"
                          disabled={!r.cancelable}
                          onClick={() => setACancelar(r)}
                          className="w-full rounded-lg px-4 py-2 text-body-sm font-semibold text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:text-on-surface-variant disabled:opacity-60 disabled:hover:bg-transparent"
                          aria-describedby={r.cancelable ? undefined : `motivo-${r.idReservacion}`}
                        >
                          Cancelar reservación
                        </button>
                        {!r.cancelable && (
                          <p id={`motivo-${r.idReservacion}`} className="text-center text-[12px] text-on-surface-variant">{motivoNoCancelable(r)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            pagina={pagina}
            totalPaginas={resultado.totalPaginas}
            totalElementos={resultado.totalElementos}
            onCambiar={(p) => setParams({ ...(grupo === 'proximas' ? {} : { grupo }), pagina: String(p) })}
          />
        </>
      )}

      <CancelarReservacion
        reservacion={aCancelar}
        onCerrar={() => setACancelar(null)}
        onCancelada={(r) => {
          setACancelar(null);
          setAviso(`Reservación para «${r.evento.nombreEvento}» cancelada. Los cupos quedaron libres.`);
          setRecarga((n) => n + 1);
        }}
      />
    </div>
  );
}
