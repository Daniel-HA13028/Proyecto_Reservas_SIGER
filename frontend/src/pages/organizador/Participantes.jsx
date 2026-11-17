import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import Cargando from '../../components/Cargando';
import EncabezadoAsistencia from '../../components/EncabezadoAsistencia';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import useEvento from '../../hooks/useEvento';
import { asistenciaService } from '../../services/asistencia.service';
import { hora } from '../../utils/formato';
import NoEncontrada from '../publico/NoEncontrada';

const METODOS = { QR_Scanner: 'QR', Digital_Code: 'Código', Manual_Organizador: 'Manual' };

const iniciales = (nombre) =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

/** Tarjeta de un indicador (asistentes, ausentes). */
function Indicador({ titulo, valor, icono, tono }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
      <div>
        <p className="text-label-md uppercase text-on-surface-variant">{titulo}</p>
        <p className={`text-headline-md tabular-nums ${tono === 'exito' ? 'text-exito' : tono === 'error' ? 'text-error' : 'text-primary'}`}>{valor ?? '—'}</p>
      </div>
      <span className={`material-symbols-outlined rounded-full p-3 ${tono === 'exito' ? 'bg-exito-container text-exito' : tono === 'error' ? 'bg-error-container text-error' : 'bg-primary/10 text-primary'}`} aria-hidden="true">
        {icono}
      </span>
    </div>
  );
}

/**
 * Lista de participantes de un evento (RF-18, CU-05). Dos modos sobre los mismos datos:
 * - «control» (prototipo siger_control_asistencia): búsqueda y un interruptor por persona para marcar o deshacer.
 * - «lista» (prototipo siger_participantes_del_evento): además, filtro por asistencia y exportación PDF/Excel.
 * Deshacer solo se permite el mismo día del evento (RN-09); el interruptor lo explica cuando no se puede.
 */
export default function Participantes({ modo = 'lista' }) {
  const { id } = useParams();
  const { evento, error: errorEvento } = useEvento(id);
  const [buscar, setBuscar] = useState('');
  const [buscarAplicado, setBuscarAplicado] = useState('');
  const [asistio, setAsistio] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [exportando, setExportando] = useState(null);
  const [recarga, setRecarga] = useState(0);

  // Búsqueda con debounce de 300 ms; al cambiar el texto vuelve a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscarAplicado(buscar.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  useEffect(() => {
    let vigente = true;
    const filtro = modo === 'lista' && asistio !== '' ? asistio === 'si' : null;
    Promise.all([
      asistenciaService.participantes(id, { buscar: buscarAplicado, asistio: filtro, pagina, limite: 20 }),
      asistenciaService.resumen(id),
    ])
      .then(([p, r]) => {
        if (!vigente) return;
        setDatos(p);
        setResumen(r);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [id, modo, buscarAplicado, asistio, pagina, recarga]);

  if (errorEvento?.response?.status === 404 || errorEvento?.codigo === 'PARAMETRO_INVALIDO') return <NoEncontrada />;

  const cambiar = async (p) => {
    setOcupado(p.idReservacion);
    setAviso(null);
    setError(null);
    try {
      if (p.asistio) {
        await asistenciaService.deshacer(id, p.idReservacion);
        setAviso(`Se deshizo la asistencia de ${p.nombreCompleto}.`);
      } else {
        await asistenciaService.marcar(id, p.idReservacion);
        setAviso(`Asistencia de ${p.nombreCompleto} registrada.`);
      }
      setRecarga((n) => n + 1);
    } catch (err) {
      setError(err);
    } finally {
      setOcupado(null);
    }
  };

  const exportar = async (formato) => {
    setExportando(formato);
    setError(null);
    try {
      await asistenciaService.exportar(id, formato, { buscar: buscarAplicado, asistio: asistio === '' ? null : asistio === 'si' });
    } catch (err) {
      setError(err);
    } finally {
      setExportando(null);
    }
  };

  const ausentes = resumen ? resumen.registrados - resumen.asistentes : null;

  if (error?.codigo === 'NO_ES_PROPIETARIO') {
    return (
      <div className="space-y-6">
        <EncabezadoAsistencia evento={evento} titulo={modo === 'control' ? 'Control de asistencia' : 'Lista de participantes'} />
        <Alert tono="error">{error.mensaje}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EncabezadoAsistencia
        evento={evento}
        titulo={modo === 'control' ? 'Control de asistencia' : 'Lista de participantes'}
        descripcion={resumen && `${resumen.personasEsperadas} personas esperadas con acompañantes`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador titulo="Asistentes" valor={resumen?.asistentes} icono="check_circle" tono="exito" />
        <Indicador titulo="Ausentes" valor={ausentes} icono="person_off" tono="error" />
        <Indicador titulo="Asistencia" valor={resumen ? `${resumen.porcentajeAsistencia}%` : null} icono="percent" />
      </div>

      <Alert tono="exito">{aviso}</Alert>
      <Alert tono="error">{error?.mensaje ?? errorEvento?.mensaje}</Alert>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card" aria-label="Participantes">
        <div className="flex flex-col gap-3 border-b border-outline-variant p-4 lg:flex-row lg:items-end">
          <Input
            className="flex-1"
            icono="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          {modo === 'lista' && (
            <>
              <Select
                className="lg:w-56"
                aria-label="Filtrar por asistencia"
                value={asistio}
                onChange={(e) => {
                  setAsistio(e.target.value);
                  setPagina(1);
                }}
                opciones={[
                  { valor: '', texto: 'Todos' },
                  { valor: 'si', texto: 'Asistieron' },
                  { valor: 'no', texto: 'No han llegado' },
                ]}
              />
              <div className="flex gap-2">
                <Button variante="contorno" className="flex-1 px-4" icono="picture_as_pdf" cargando={exportando === 'pdf'} onClick={() => exportar('pdf')}>PDF</Button>
                <Button variante="contorno" className="flex-1 px-4" icono="table_view" cargando={exportando === 'xlsx'} onClick={() => exportar('xlsx')}>Excel</Button>
              </div>
            </>
          )}
          {modo === 'control' && (
            <Link to={`/organizador/eventos/${id}/escanear`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary-container">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">qr_code_scanner</span>
              Escanear QR
            </Link>
          )}
        </div>

        {!datos ? (
          !error && <Cargando />
        ) : datos.contenido.length === 0 ? (
          <p className="p-8 text-center text-on-surface-variant">
            {buscarAplicado || asistio ? 'Nadie coincide con la búsqueda.' : 'Este evento aún no tiene reservaciones confirmadas.'}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {datos.contenido.map((p) => {
              const bloqueado = p.asistio && !p.deshacible;
              const ayuda = bloqueado ? 'Solo se puede deshacer el mismo día del evento.' : p.asistio ? 'Deshacer asistencia' : 'Marcar asistencia';
              return (
                <li key={p.idReservacion} className="flex items-center gap-4 px-4 py-3 md:px-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-body-sm font-bold text-secondary" aria-hidden="true">
                    {iniciales(p.nombreCompleto)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.nombreCompleto}</p>
                    <p className="truncate text-body-sm text-on-surface-variant">{p.correoElectronico}</p>
                    <p className="text-[12px] text-on-surface-variant">
                      {p.acompanantes > 0 ? `+${p.acompanantes} acompañante(s)` : 'Sin acompañantes'}
                      {p.asistio && ` · ingresó ${hora(p.fechaHoraValidacion)} (${METODOS[p.metodoValidacion]})`}
                    </p>
                  </div>
                  <label className={`relative inline-flex items-center ${bloqueado || ocupado ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={ayuda}>
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={p.asistio}
                      disabled={bloqueado || ocupado === p.idReservacion}
                      aria-label={`${ayuda}: ${p.nombreCompleto}`}
                      onChange={() => cambiar(p)}
                    />
                    <span className="relative h-6 w-11 rounded-full bg-outline-variant after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5 peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/40" />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {datos && datos.totalElementos > 0 && (
          <div className="border-t border-outline-variant p-4">
            <Pagination pagina={pagina} totalPaginas={datos.totalPaginas} totalElementos={datos.totalElementos} onCambiar={setPagina} />
          </div>
        )}
      </section>
    </div>
  );
}
