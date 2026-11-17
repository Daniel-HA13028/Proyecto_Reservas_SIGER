import { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { categoriasService } from '../../services/eventos.service';
import { fechaCorta } from '../../utils/formato';

// Categorías (prototipo siger_categorias_admin): crear, renombrar, activar y desactivar. No se eliminan.
export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    categoriasService.listar(true).then(setCategorias).catch(setError);
  }, [recarga]);

  const ejecutar = async (accion, mensaje) => {
    setError(null);
    try {
      await accion();
      setAviso(mensaje);
      setRecarga((n) => n + 1);
      return true;
    } catch (err) {
      setError(err);
      return false;
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!nueva.trim()) return;
    if (await ejecutar(() => categoriasService.crear(nueva.trim()), `Categoría «${nueva.trim()}» creada.`)) setNueva('');
  };

  const visibles = categorias.filter((c) => filtro === 'todas' || (filtro === 'activas' ? c.activa : !c.activa));
  const contar = (f) => categorias.filter((c) => (f === 'activas' ? c.activa : !c.activa)).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Categorías</h1>
        <p className="text-body-sm text-on-surface-variant">Clasifican los eventos del catálogo. Una categoría inactiva no se ofrece al crear eventos, pero los existentes la conservan.</p>
      </header>
      <Alert tono="exito">{aviso}</Alert>
      <Alert tono="error">{error?.mensaje}</Alert>
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card xl:col-span-2" aria-label="Lista de categorías">
          <div className="flex flex-wrap gap-2 border-b border-outline-variant p-4">
            {[
              ['todas', `Todas (${categorias.length})`],
              ['activas', `Activas (${contar('activas')})`],
              ['inactivas', `Inactivas (${contar('inactivas')})`],
            ].map(([valor, texto]) => (
              <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)} className={`rounded-full px-4 py-2 text-body-sm ${filtro === valor ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}>
                {texto}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de categorías">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-label-md uppercase text-on-surface-variant">
                  <th className="px-4 py-3 md:px-6">Nombre</th>
                  <th className="px-4 py-3 text-right md:px-6">Eventos</th>
                  <th className="hidden px-6 py-3 sm:table-cell">Estado</th>
                  <th className="hidden px-6 py-3 md:table-cell">Creada</th>
                  <th className="px-4 py-3 text-right md:px-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {visibles.map((c) => (
                  <tr key={c.idCategoria} className="hover:bg-surface-container-low">
                    <td className="px-4 py-3 md:px-6">
                      {editando?.idCategoria === c.idCategoria ? (
                        <form
                          className="flex gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (await ejecutar(() => categoriasService.renombrar(c.idCategoria, editando.nombre.trim()), 'Categoría renombrada.')) setEditando(null);
                          }}
                        >
                          <Input aria-label="Nuevo nombre" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} maxLength={60} autoFocus />
                          <Button type="submit" className="px-3 py-2" icono="check" aria-label="Guardar nombre" />
                        </form>
                      ) : (
                        <span className={`font-semibold ${c.activa ? '' : 'text-on-surface-variant'}`}>{c.nombre}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums md:px-6">{c.totalEventos ?? 0}</td>
                    <td className="hidden px-6 py-3 sm:table-cell"><Badge valor={c.activa ? 'Activo' : 'Inactivo'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge></td>
                    <td className="hidden px-6 py-3 text-body-sm text-on-surface-variant md:table-cell">{fechaCorta(c.fechaCreacion)}</td>
                    <td className="px-4 py-3 md:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" className="rounded-lg p-2 text-secondary hover:bg-secondary/10" title="Renombrar" aria-label={`Renombrar ${c.nombre}`} onClick={() => setEditando({ idCategoria: c.idCategoria, nombre: c.nombre })}>
                          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                        <label className="relative inline-flex cursor-pointer items-center" title={c.activa ? 'Desactivar' : 'Activar'}>
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={c.activa}
                            aria-label={`${c.activa ? 'Desactivar' : 'Activar'} ${c.nombre}`}
                            onChange={() => ejecutar(() => categoriasService.cambiarEstado(c.idCategoria, !c.activa), `Categoría «${c.nombre}» ${c.activa ? 'desactivada' : 'activada'}.`)}
                          />
                          <span className="relative h-6 w-11 rounded-full bg-outline-variant after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-secondary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/40" />
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <form onSubmit={crear} className="h-fit space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
          <h2 className="text-title-sm">Nueva categoría</h2>
          <Input etiqueta="Nombre" value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={60} ayuda="Único, hasta 60 caracteres." />
          <Button type="submit" className="w-full" icono="add" disabled={!nueva.trim()}>Crear categoría</Button>
        </form>
      </div>
    </div>
  );
}
