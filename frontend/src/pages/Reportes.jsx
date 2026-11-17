import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Cargando from '../components/Cargando';
import Indicador from '../components/Indicador';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { eventosService } from '../services/eventos.service';
import { reportesService } from '../services/reportes.service';
import { usuariosService } from '../services/usuarios.service';
import { fechaCorta, precio } from '../utils/formato';
import { COLORES, etiquetaPeriodo } from '../utils/graficos';

const PERIODOS = [
  { valor: '30', texto: 'Últimos 30 días' },
  { valor: '90', texto: 'Últimos 90 días' },
  { valor: '365', texto: 'Último año' },
  { valor: 'todo', texto: 'Todo el historial' },
  { valor: 'personalizado', texto: 'Personalizado' },
];

/** Fecha local (El Salvador) en formato AAAA-MM-DD. */
const hoyMenos = (dias) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/El_Salvador' }).format(new Date(Date.now() - dias * 86400000));

/** Gráfico de una serie con vista de línea o de barras. */
function GraficoSerie({ titulo, descripcion, serie, nombre, vista }) {
  const datos = serie.map((s) => ({ periodo: etiquetaPeriodo(s.etiqueta), valor: s.valor }));
  const comunes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORES.rejilla} vertical={false} />
      <XAxis dataKey="periodo" tick={{ fill: COLORES.texto, fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
      <YAxis allowDecimals={false} tick={{ fill: COLORES.texto, fontSize: 11 }} />
      <Tooltip formatter={(v) => [v, nombre]} />
    </>
  );
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
      <h2 className="text-title-sm">{titulo}</h2>
      <p className="mb-4 text-body-sm text-on-surface-variant">{descripcion}</p>
      <div className="h-64" role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.periodo} ${d.valor}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          {vista === 'linea' ? (
            <LineChart data={datos} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              {comunes}
              <Line type="monotone" dataKey="valor" stroke={COLORES.secundario} strokeWidth={2} dot={datos.length <= 31} />
            </LineChart>
          ) : (
            <BarChart data={datos} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              {comunes}
              <Bar dataKey="valor" fill={COLORES.secundario} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// Reportes y estadísticas (RF-23, RF-24, CU-08; prototipos siger_reportes y siger_reportes_detallados; T-09-08):
// periodo, alcance (el administrador elige global, un organizador o un evento; el organizador, sus eventos o uno de
// ellos), indicadores, gráficos con vista lineal o de barras, categorías, eventos con más asistencia y exportación.
export default function Reportes() {
  const { usuario } = useAuth();
  const admin = usuario.rol === 'Administrador';
  const [periodo, setPeriodo] = useState('todo');
  const [desde, setDesde] = useState(hoyMenos(30));
  const [hasta, setHasta] = useState(hoyMenos(0));
  const [tipo, setTipo] = useState(admin ? 'global' : 'organizador');
  const [id, setId] = useState('');
  const [vista, setVista] = useState('linea');
  const [organizadores, setOrganizadores] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(null);
  const [ahora] = useState(() => Date.now());

  // Opciones de los selectores de alcance.
  useEffect(() => {
    eventosService.mios({ limite: 100 }).then((r) => setEventos(r.contenido.filter((e) => e.estadoEvento !== 'Borrador'))).catch(() => {});
    if (admin) usuariosService.listar({ rol: 'Organizador', limite: 100 }).then((r) => setOrganizadores(r.contenido)).catch(() => {});
  }, [admin]);

  const filtros = useMemo(() => {
    const f = { tipo: tipo === 'organizador' && !admin ? 'organizador' : tipo, id: tipo === 'global' || (tipo === 'organizador' && !admin) ? null : id || null };
    if (periodo === 'personalizado') return { ...f, desde, hasta };
    if (periodo === 'todo') return f;
    return { ...f, desde: hoyMenos(Number(periodo)), hasta: hoyMenos(0) };
  }, [periodo, desde, hasta, tipo, id, admin]);

  const faltaReferencia = (tipo === 'evento' || (admin && tipo === 'organizador')) && !id;

  useEffect(() => {
    if (faltaReferencia) return undefined;
    let vigente = true;
    reportesService
      .generar(filtros)
      .then((r) => {
        if (!vigente) return;
        setReporte(r);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [filtros, faltaReferencia]);

  const exportar = async (formato) => {
    setExportando(formato);
    try {
      await reportesService.exportar(formato, filtros);
    } catch (err) {
      setError(err);
    } finally {
      setExportando(null);
    }
  };

  const opcionesTipo = admin
    ? [
        { valor: 'global', texto: 'Toda la plataforma' },
        { valor: 'organizador', texto: 'Un organizador' },
        { valor: 'evento', texto: 'Un evento' },
      ]
    : [
        { valor: 'organizador', texto: 'Todos mis eventos' },
        { valor: 'evento', texto: 'Un evento' },
      ];
  const categorias = (reporte?.rendimientoPorCategoria ?? []).map((c) => ({ ...c, nombre: c.categoria }));
  const maxAsistencias = Math.max(1, ...(reporte?.eventosMayorAsistencia ?? []).map((e) => e.reservaciones));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-on-surface">Reportes y estadísticas</h1>
          <p className="text-body-sm text-on-surface-variant">{admin ? 'Rendimiento de la plataforma y de cada organizador o evento.' : 'Rendimiento de tus eventos.'}</p>
        </div>
        <div className="flex gap-2">
          <Button variante="contorno" icono="table_view" cargando={exportando === 'xlsx'} disabled={!reporte || faltaReferencia} onClick={() => exportar('xlsx')}>Excel</Button>
          <Button icono="picture_as_pdf" cargando={exportando === 'pdf'} disabled={!reporte || faltaReferencia} onClick={() => exportar('pdf')}>PDF</Button>
        </div>
      </header>

      <section className="grid gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card md:grid-cols-2 xl:grid-cols-4" aria-label="Filtros del reporte">
        <Select etiqueta="Periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} opciones={PERIODOS} />
        {periodo === 'personalizado' && (
          <div className="grid grid-cols-2 gap-2">
            <Input etiqueta="Desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
            <Input etiqueta="Hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
          </div>
        )}
        <Select
          etiqueta="Alcance"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setId('');
          }}
          opciones={opcionesTipo}
        />
        {tipo === 'organizador' && admin && (
          <Select
            etiqueta="Organizador"
            value={id}
            onChange={(e) => setId(e.target.value)}
            opciones={[{ valor: '', texto: 'Elige un organizador' }, ...organizadores.map((o) => ({ valor: String(o.idUsuario), texto: `${o.nombres} ${o.apellidos}` }))]}
          />
        )}
        {tipo === 'evento' && (
          <Select
            etiqueta="Evento"
            value={id}
            onChange={(e) => setId(e.target.value)}
            opciones={[{ valor: '', texto: 'Elige un evento' }, ...eventos.map((e) => ({ valor: String(e.idEvento), texto: `${e.nombreEvento} (${fechaCorta(e.fechaHoraInicio)})` }))]}
          />
        )}
      </section>
      <p className="-mt-3 text-[12px] text-on-surface-variant">El periodo toma los eventos cuya fecha de inicio cae en él; la tasa de asistencia solo considera eventos que ya iniciaron.</p>

      <Alert tono="error">{error?.mensaje}</Alert>
      {faltaReferencia ? (
        <p className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
          Elige {tipo === 'evento' ? 'un evento' : 'un organizador'} para ver su reporte.
        </p>
      ) : !reporte ? (
        !error && <Cargando />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Indicador titulo="Eventos" valor={reporte.totalEventos} icono="event" />
            <Indicador titulo="Participantes" valor={reporte.totalParticipantes} icono="groups" tono="secundario" nota="Personas distintas" />
            <Indicador titulo="Reservaciones confirmadas" valor={reporte.reservacionesConfirmadas} icono="confirmation_number" tono="secundario" />
            <Indicador titulo="Asistencias" valor={reporte.asistencias} icono="how_to_reg" tono="exito" />
            <Indicador titulo="Tasa de asistencia" valor={`${reporte.tasaAsistencia}%`} icono="percent" tono="exito" nota="Eventos ya iniciados" />
            <Indicador titulo="Ingresos simulados" valor={precio(reporte.ingresosSimulados)} icono="payments" tono="advertencia" />
          </div>

          <div className="flex items-center justify-end gap-2" role="group" aria-label="Tipo de gráfico">
            {[
              ['linea', 'Líneas', 'show_chart'],
              ['barras', 'Barras', 'bar_chart'],
            ].map(([valor, texto, icono]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={vista === valor}
                onClick={() => setVista(valor)}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-body-sm ${vista === valor ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icono}</span>
                {texto}
              </button>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <GraficoSerie titulo="Tendencia de reservaciones" descripcion="Reservaciones confirmadas según la fecha en que se hicieron." serie={reporte.tendenciaReservaciones} nombre="Reservaciones" vista={vista} />
            <GraficoSerie
              titulo={reporte.tipo === 'global' ? 'Registros de usuarios' : 'Participantes nuevos'}
              descripcion={reporte.tipo === 'global' ? 'Cuentas creadas en SIGER.' : 'Personas que reservaron por primera vez en estos eventos.'}
              serie={reporte.registrosPorMes}
              nombre={reporte.tipo === 'global' ? 'Registros' : 'Participantes'}
              vista={vista}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
              <h2 className="mb-4 text-title-sm">Rendimiento por categoría</h2>
              {categorias.length === 0 ? (
                <p className="py-10 text-center text-body-sm text-on-surface-variant">Sin eventos en el periodo.</p>
              ) : (
                <div className="h-64" role="img" aria-label={`Reservaciones y asistencias por categoría: ${categorias.map((c) => `${c.nombre} ${c.reservaciones}/${c.asistencias}`).join(', ')}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorias} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORES.rejilla} vertical={false} />
                      <XAxis dataKey="nombre" tick={{ fill: COLORES.texto, fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: COLORES.texto, fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="reservaciones" name="Reservaciones" fill={COLORES.secundario} radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="asistencias" name="Asistencias" fill={COLORES.exito} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
              <h2 className="mb-4 text-title-sm">Eventos con más asistencia</h2>
              {reporte.eventosMayorAsistencia.length === 0 ? (
                <p className="py-10 text-center text-body-sm text-on-surface-variant">Sin eventos en el periodo.</p>
              ) : (
                <ul className="space-y-4">
                  {reporte.eventosMayorAsistencia.map((e) => (
                    <li key={e.idEvento}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-body-sm">
                        <span className="truncate font-semibold">{e.nombreEvento}</span>
                        <span className="shrink-0 tabular-nums text-on-surface-variant">{e.asistencias}/{e.reservaciones} · {new Date(e.fechaHoraInicio).getTime() > ahora ? 'por iniciar' : `${e.tasaAsistencia}%`}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
                        <div className="h-full rounded-full bg-secondary/40" style={{ width: `${(e.reservaciones / maxAsistencias) * 100}%` }}>
                          <div className="h-full rounded-full bg-secondary" style={{ width: `${e.reservaciones ? (e.asistencias / e.reservaciones) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[12px] text-on-surface-variant">Barra clara: reservaciones; oscura: asistencias.</p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
