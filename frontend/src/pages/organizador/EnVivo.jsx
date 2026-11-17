import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import Cargando from '../../components/Cargando';
import EncabezadoAsistencia from '../../components/EncabezadoAsistencia';
import Alert from '../../components/ui/Alert';
import useEvento from '../../hooks/useEvento';
import { asistenciaService } from '../../services/asistencia.service';
import { hora } from '../../utils/formato';
import NoEncontrada from '../publico/NoEncontrada';

const CADA_MS = 10_000;

const horaSegundos = (fecha) => fecha.toLocaleTimeString('es-SV', { timeZone: 'America/El_Salvador', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Anillo con el porcentaje de asistencia. */
function Anillo({ porcentaje }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label={`${porcentaje}% de asistencia`}>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-surface-container-high" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="12"
        strokeLinecap="round"
        className="stroke-secondary transition-all duration-700"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(porcentaje, 100) / 100)}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-primary text-[22px] font-bold">{porcentaje}%</text>
      <text x="60" y="78" textAnchor="middle" className="fill-on-surface-variant text-[10px]">asistencia</text>
    </svg>
  );
}

/** Barras de ingresos cada 10 minutos (RF-19). */
function Barras({ intervalos }) {
  if (intervalos.length === 0) return <p className="py-10 text-center text-body-sm text-on-surface-variant">Aún no hay ingresos.</p>;
  const max = Math.max(...intervalos.map((i) => i.cantidad), 1);
  const etiquetaCada = Math.ceil(intervalos.length / 6);
  return (
    <div className="flex h-56 items-stretch justify-center gap-1 border-b border-outline-variant" role="img" aria-label="Ingresos por intervalo de 10 minutos">
      {intervalos.map((i, n) => (
        <div key={i.inicio} className="flex max-w-14 flex-1 flex-col justify-end" title={`${hora(i.inicio)}: ${i.cantidad} ingreso(s)`}>
          <span className="mb-1 text-center text-[11px] tabular-nums text-on-surface-variant">{i.cantidad || ''}</span>
          <div
            className={`rounded-t ${n === intervalos.length - 1 ? 'bg-secondary' : 'bg-secondary/40'}`}
            style={{ height: `${(i.cantidad / max) * 75}%`, minHeight: i.cantidad ? 4 : 0 }}
          />
          <span className="mt-1 h-4 whitespace-nowrap text-center text-[10px] text-on-surface-variant">{n % etiquetaCada === 0 ? hora(i.inicio) : ''}</span>
        </div>
      ))}
    </div>
  );
}

// Estadísticas en vivo (RF-19, CU-05; prototipo siger_estadisticas_rapidas). Consulta el resumen cada 10 s mientras la
// pestaña está visible y al volver a ella.
export default function EnVivo() {
  const { id } = useParams();
  const { evento, error: errorEvento } = useEvento(id);
  const [resumen, setResumen] = useState(null);
  const [actualizado, setActualizado] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    const consultar = () => {
      if (document.hidden) return;
      asistenciaService
        .resumen(id)
        .then((r) => {
          if (!vigente) return;
          setResumen(r);
          setActualizado(new Date());
          setError(null);
        })
        .catch((err) => vigente && setError(err));
    };
    consultar();
    const temporizador = setInterval(consultar, CADA_MS);
    document.addEventListener('visibilitychange', consultar);
    return () => {
      vigente = false;
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', consultar);
    };
  }, [id]);

  if (errorEvento?.response?.status === 404 || errorEvento?.codigo === 'PARAMETRO_INVALIDO') return <NoEncontrada />;

  if (error?.codigo === 'NO_ES_PROPIETARIO') {
    return (
      <div className="space-y-6">
        <EncabezadoAsistencia evento={evento} titulo="Estadísticas en vivo" />
        <Alert tono="error">{error.mensaje}</Alert>
      </div>
    );
  }

  const pico = resumen?.ingresosPorIntervalo.reduce((a, b) => (b.cantidad > (a?.cantidad ?? 0) ? b : a), null);

  return (
    <div className="space-y-6">
      <EncabezadoAsistencia evento={evento} titulo="Estadísticas en vivo" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-exito-container px-3 py-1 text-body-sm text-on-exito-container">
          <span className="h-2 w-2 animate-pulse rounded-full bg-exito" aria-hidden="true" />
          Se actualiza cada 10 segundos
        </p>
        {actualizado && <p className="text-body-sm text-on-surface-variant" aria-live="polite">Actualizado a las {horaSegundos(actualizado)}</p>}
      </div>
      <Alert tono="error">{error?.mensaje ?? errorEvento?.mensaje}</Alert>

      {!resumen ? (
        !error && <Cargando />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Registrados', resumen.registrados, 'how_to_reg', 'border-outline-variant', 'text-primary', `${resumen.personasEsperadas} personas con acompañantes`],
              ['Presentes', resumen.asistentes, 'check_circle', 'border-exito', 'text-exito', null],
              ['Ausentes', resumen.registrados - resumen.asistentes, 'person_off', 'border-error', 'text-error', null],
            ].map(([titulo, valor, icono, borde, color, nota]) => (
              <div key={titulo} className={`rounded-xl border-2 bg-surface-container-lowest p-5 shadow-card ${borde}`}>
                <span className={`material-symbols-outlined ${color}`} aria-hidden="true">{icono}</span>
                <p className="mt-2 text-label-md uppercase text-on-surface-variant">{titulo}</p>
                <p className={`text-display-lg-mobile tabular-nums ${color}`}>{valor}</p>
                {nota && <p className="text-body-sm text-on-surface-variant">{nota}</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
              <Anillo porcentaje={resumen.porcentajeAsistencia} />
              <dl className="mt-4 grid w-full grid-cols-2 divide-x divide-outline-variant text-center">
                <div>
                  <dt className="text-label-md uppercase text-on-surface-variant">Hora pico</dt>
                  <dd className="font-semibold">{pico?.cantidad ? hora(pico.inicio) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-label-md uppercase text-on-surface-variant">En el pico</dt>
                  <dd className="font-semibold">{pico?.cantidad ?? 0}</dd>
                </div>
              </dl>
            </section>
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card lg:col-span-2">
              <h2 className="mb-4 text-title-sm">Ingresos cada 10 minutos</h2>
              <Barras intervalos={resumen.ingresosPorIntervalo} />
            </section>
          </div>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="text-title-sm">Últimos ingresos</h2>
              <Link to={`/organizador/eventos/${id}/participantes`} className="text-body-sm font-semibold text-secondary hover:underline">Ver todos los participantes</Link>
            </div>
            {resumen.ultimosValidados.length === 0 ? (
              <p className="p-5 text-body-sm text-on-surface-variant">Aún no hay ingresos registrados.</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {resumen.ultimosValidados.map((a) => (
                  <li key={a.idAsistencia} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.participante}</p>
                      <p className="text-body-sm text-on-surface-variant">Registró {a.registradoPor}</p>
                    </div>
                    <span className="shrink-0 text-body-sm tabular-nums text-secondary">{hora(a.fechaHoraValidacion)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
