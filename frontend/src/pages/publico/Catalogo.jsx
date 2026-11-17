import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import EventoTarjeta from '../../components/EventoTarjeta';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { categoriasService, eventosService } from '../../services/eventos.service';

const LIMITE = 12;

// Catálogo público (RF-11, CU-10; prototipos siger_descubrir_eventos y siger_cat_logo): búsqueda con espera de
// 300 ms, categorías, fechas, lugar, orden y páginas. Los filtros quedan en la dirección para poder compartirla.
export default function Catalogo() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = {
    buscar: parametros.get('buscar') ?? '',
    categoria: parametros.get('categoria') ?? '',
    desde: parametros.get('desde') ?? '',
    hasta: parametros.get('hasta') ?? '',
    orden: parametros.get('orden') ?? 'fecha',
    pagina: Number(parametros.get('pagina') ?? 1),
  };
  const [escrito, setEscrito] = useState(filtros.buscar);
  const [categorias, setCategorias] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const clave = parametros.toString();

  const cambiar = (nuevos) => {
    const siguiente = new URLSearchParams(parametros);
    Object.entries(nuevos).forEach(([k, v]) => (v ? siguiente.set(k, v) : siguiente.delete(k)));
    if (!('pagina' in nuevos)) siguiente.delete('pagina');
    setParametros(siguiente, { replace: true });
  };

  useEffect(() => {
    categoriasService.listar().then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    let vigente = true;
    const p = new URLSearchParams(clave);
    eventosService
      .catalogo({
        buscar: p.get('buscar'),
        categoria: p.get('categoria'),
        desde: p.get('desde'),
        hasta: p.get('hasta'),
        orden: p.get('orden') ?? 'fecha',
        pagina: p.get('pagina') ?? 1,
        limite: LIMITE,
      })
      .then((r) => {
        if (!vigente) return;
        setResultado(r);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [clave]);

  // La búsqueda espera a que se deje de escribir.
  useEffect(() => {
    if (escrito === (parametros.get('buscar') ?? '')) return undefined;
    const t = setTimeout(() => cambiar({ buscar: escrito.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo depende del texto escrito
  }, [escrito]);

  const chip = (valor, texto) => (
    <button
      key={valor || 'todas'}
      type="button"
      onClick={() => cambiar({ categoria: valor })}
      aria-pressed={filtros.categoria === valor}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-semibold transition-colors ${filtros.categoria === valor ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
    >
      {texto}
    </button>
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-display-lg-mobile text-primary md:text-display-lg">Descubre eventos</h1>
        <p className="text-body-base text-on-surface-variant">Conferencias, talleres y actividades de la comunidad universitaria.</p>
      </header>

      <div className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
        <Input icono="search" placeholder="Buscar por nombre o lugar…" aria-label="Buscar eventos" value={escrito} onChange={(e) => setEscrito(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categorías">
          {chip('', 'Todas')}
          {categorias.map((c) => chip(String(c.idCategoria), c.nombre))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input etiqueta="Desde" type="date" value={filtros.desde} onChange={(e) => cambiar({ desde: e.target.value })} />
          <Input etiqueta="Hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value })} />
          <Select
            etiqueta="Ordenar por"
            value={filtros.orden}
            onChange={(e) => cambiar({ orden: e.target.value === 'fecha' ? '' : e.target.value })}
            opciones={[
              { valor: 'fecha', texto: 'Fecha más próxima' },
              { valor: 'popularidad', texto: 'Más populares' },
            ]}
          />
        </div>
      </div>

      <Alert tono="error">{error?.mensaje}</Alert>

      {resultado && resultado.contenido.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-card">
          <span className="material-symbols-outlined mb-2 text-5xl text-outline" aria-hidden="true">event_busy</span>
          <p className="text-title-sm">No encontramos eventos con esos filtros</p>
          <p className="text-body-sm text-on-surface-variant">Prueba con otra búsqueda o quita algún filtro.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-busy={!resultado}>
          {resultado?.contenido.map((e) => <EventoTarjeta key={e.idEvento} evento={e} />)}
        </div>
      )}
      {resultado && (
        <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} totalElementos={resultado.totalElementos} onCambiar={(p) => cambiar({ pagina: String(p) })} />
      )}
    </div>
  );
}
