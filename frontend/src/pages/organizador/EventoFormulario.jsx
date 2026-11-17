import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Cargando from '../../components/Cargando';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { categoriasService, eventosService } from '../../services/eventos.service';
import { aInputLocal, deInputLocal, fechaCorta, hora, precio } from '../../utils/formato';
import { erroresPorCampo } from '../../utils/validaciones';

const VACIO = {
  nombreEvento: '',
  descripcion: '',
  idCategoria: '',
  fechaHoraInicio: '',
  fechaHoraFin: '',
  fechaLimiteReserva: '',
  ubicacion: '',
  cupoMaximo: '',
  maxAcompanantes: '0',
  precio: '0',
  requiereQr: true,
};
const MAX_IMAGEN = 2 * 1024 * 1024;

// Crear o editar un evento (RF-08, RF-09, CU-03; prototipos siger_crear_evento, siger_editar_evento y
// siger_confirmaci_n_creaci_n_evento): formulario con vista previa en tiempo real.
export default function EventoFormulario() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const [datos, setDatos] = useState(VACIO);
  const [evento, setEvento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [imagen, setImagen] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(null);
  const [cargando, setCargando] = useState(editando);

  useEffect(() => {
    categoriasService.listar().then(setCategorias).catch(() => {});
    if (!editando) return;
    eventosService
      .detalle(id)
      .then((e) => {
        setEvento(e);
        setDatos({
          nombreEvento: e.nombreEvento,
          descripcion: e.descripcion,
          idCategoria: String(e.idCategoria),
          fechaHoraInicio: aInputLocal(e.fechaHoraInicio),
          fechaHoraFin: aInputLocal(e.fechaHoraFin),
          fechaLimiteReserva: aInputLocal(e.fechaLimiteReserva),
          ubicacion: e.ubicacion,
          cupoMaximo: String(e.cupoMaximo),
          maxAcompanantes: String(e.maxAcompanantes),
          precio: String(e.precio),
          requiereQr: e.requiereQr,
        });
      })
      .catch(setError)
      .finally(() => setCargando(false));
  }, [editando, id]);

  // Vista previa de la imagen elegida (se libera al cambiarla).
  const vistaImagen = useMemo(() => (imagen ? URL.createObjectURL(imagen) : evento?.imagenUrl ?? null), [imagen, evento]);
  useEffect(() => () => imagen && URL.revokeObjectURL(vistaImagen), [imagen, vistaImagen]);

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const elegirImagen = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) return setErrores((x) => ({ ...x, imagen: 'La imagen debe ser JPG o PNG.' }));
    if (archivo.size > MAX_IMAGEN) return setErrores((x) => ({ ...x, imagen: 'La imagen supera el tamaño máximo de 2 MB.' }));
    setErrores((x) => ({ ...x, imagen: null }));
    setImagen(archivo);
  };

  const validar = () => {
    const e = {};
    const inicio = datos.fechaHoraInicio && new Date(deInputLocal(datos.fechaHoraInicio));
    if (!datos.nombreEvento.trim()) e.nombreEvento = 'Escribe el nombre del evento.';
    if (!datos.descripcion.trim()) e.descripcion = 'Escribe una descripción.';
    if (!datos.idCategoria) e.idCategoria = 'Elige una categoría.';
    if (!inicio) e.fechaHoraInicio = 'Indica la fecha y hora de inicio.';
    else if (inicio <= new Date()) e.fechaHoraInicio = 'La fecha de inicio debe ser posterior a hoy (RN-06).';
    if (!datos.fechaHoraFin) e.fechaHoraFin = 'Indica la fecha y hora de fin.';
    else if (inicio && new Date(deInputLocal(datos.fechaHoraFin)) <= inicio) e.fechaHoraFin = 'El fin debe ser posterior al inicio.';
    if (datos.fechaLimiteReserva && inicio && new Date(deInputLocal(datos.fechaLimiteReserva)) > inicio)
      e.fechaLimiteReserva = 'La fecha límite no puede ser posterior al inicio.';
    if (!datos.ubicacion.trim()) e.ubicacion = 'Indica el lugar o el enlace.';
    if (!(Number(datos.cupoMaximo) > 0)) e.cupoMaximo = 'La capacidad debe ser mayor que 0.';
    if (!(Number(datos.maxAcompanantes) >= 0)) e.maxAcompanantes = 'No puede ser negativo.';
    if (!(Number(datos.precio) >= 0)) e.precio = 'No puede ser negativo.';
    return e;
  };

  const guardar = async (e) => {
    e.preventDefault();
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    const cuerpo = {
      ...datos,
      nombreEvento: datos.nombreEvento.trim(),
      idCategoria: Number(datos.idCategoria),
      fechaHoraInicio: deInputLocal(datos.fechaHoraInicio),
      fechaHoraFin: deInputLocal(datos.fechaHoraFin),
      fechaLimiteReserva: deInputLocal(datos.fechaLimiteReserva),
      cupoMaximo: Number(datos.cupoMaximo),
      maxAcompanantes: Number(datos.maxAcompanantes),
      precio: Number(datos.precio),
    };
    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        const actualizado = await eventosService.actualizar(id, cuerpo, imagen);
        navigate(`/eventos/${actualizado.idEvento}`, { replace: true });
      } else {
        setCreado(await eventosService.crear(cuerpo, imagen));
      }
    } catch (err) {
      setError(err);
      setErrores(erroresPorCampo(err));
    } finally {
      setGuardando(false);
    }
  };

  const publicarCreado = async () => {
    try {
      await eventosService.publicar(creado.idEvento);
      navigate(`/eventos/${creado.idEvento}`);
    } catch (err) {
      setError(err);
      setCreado(null);
    }
  };

  if (cargando) return <Cargando />;
  if (editando && evento && ['Cancelado', 'Finalizado'].includes(evento.estadoEvento)) {
    return <Alert tono="advertencia">Un evento {evento.estadoEvento.toLowerCase()} no se puede modificar.</Alert>;
  }

  const categoria = categorias.find((c) => String(c.idCategoria) === datos.idCategoria)?.nombre ?? evento?.categoria ?? 'Categoría';
  const inicioPrevio = deInputLocal(datos.fechaHoraInicio);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-md text-on-surface">{editando ? 'Editar evento' : 'Crear nuevo evento'}</h1>
          <p className="text-body-sm text-on-surface-variant">
            {editando ? 'Si cambias la fecha, la hora o el lugar de un evento publicado, avisaremos a quienes reservaron.' : 'Se guarda como borrador; podrás publicarlo al terminar.'}
          </p>
        </div>
        {evento && <Badge valor={evento.estadoEvento === 'Publicado' ? 'Activo' : 'Pendiente'}>{evento.estadoEvento}</Badge>}
      </header>

      <div className="grid gap-6 xl:grid-cols-5">
        <form className="space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card xl:col-span-3" onSubmit={guardar} noValidate>
          <Alert tono="error">{error && error.codigo !== 'VALIDACION_FALLIDA' ? error.mensaje : null}</Alert>
          <Input etiqueta="Nombre del evento" value={datos.nombreEvento} onChange={cambiar('nombreEvento')} error={errores.nombreEvento} maxLength={150} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              etiqueta="Categoría"
              value={datos.idCategoria}
              onChange={cambiar('idCategoria')}
              error={errores.idCategoria}
              opciones={[{ valor: '', texto: 'Seleccionar…' }, ...categorias.map((c) => ({ valor: String(c.idCategoria), texto: c.nombre }))]}
            />
            <Input etiqueta="Capacidad máxima" type="number" min={1} value={datos.cupoMaximo} onChange={cambiar('cupoMaximo')} error={errores.cupoMaximo} />
          </div>
          <div className="space-y-2">
            <label htmlFor="descripcion" className="ml-1 block text-label-md uppercase text-on-surface-variant">Descripción</label>
            <textarea id="descripcion" rows={4} className={`w-full rounded-lg border bg-surface px-4 py-3 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 ${errores.descripcion ? 'border-error' : 'border-outline-variant'}`} value={datos.descripcion} onChange={cambiar('descripcion')} />
            {errores.descripcion && <p className="ml-1 text-body-sm text-error">{errores.descripcion}</p>}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input etiqueta="Inicio" type="datetime-local" value={datos.fechaHoraInicio} onChange={cambiar('fechaHoraInicio')} error={errores.fechaHoraInicio} />
            <Input etiqueta="Fin" type="datetime-local" value={datos.fechaHoraFin} min={datos.fechaHoraInicio || undefined} onChange={cambiar('fechaHoraFin')} error={errores.fechaHoraFin} />
          </div>
          <Input
            etiqueta="Fecha límite para reservar (opcional)"
            type="datetime-local"
            value={datos.fechaLimiteReserva}
            max={datos.fechaHoraInicio || undefined}
            onChange={cambiar('fechaLimiteReserva')}
            error={errores.fechaLimiteReserva}
            ayuda="Si la dejas vacía, se puede reservar hasta la hora de inicio."
          />
          <Input etiqueta="Ubicación" icono="location_on" value={datos.ubicacion} onChange={cambiar('ubicacion')} error={errores.ubicacion} maxLength={200} ayuda="Lugar físico o enlace de la plataforma virtual." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input etiqueta="Acompañantes por reservación" type="number" min={0} value={datos.maxAcompanantes} onChange={cambiar('maxAcompanantes')} error={errores.maxAcompanantes} />
            <Input etiqueta="Precio por persona (US$)" type="number" min={0} step="0.01" value={datos.precio} onChange={cambiar('precio')} error={errores.precio} ayuda="0 = gratuito (pago simulado, RN-12)." />
          </div>
          <div className="space-y-2">
            <span className="ml-1 block text-label-md uppercase text-on-surface-variant">Imagen de portada</span>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-outline-variant p-6 text-center text-on-surface-variant hover:border-secondary hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-4xl text-secondary" aria-hidden="true">cloud_upload</span>
              <span className="text-body-sm">{imagen ? imagen.name : 'Clic para elegir una imagen PNG o JPG (máx. 2 MB)'}</span>
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={elegirImagen} />
            </label>
            {errores.imagen && <p className="ml-1 text-body-sm text-error">{errores.imagen}</p>}
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline-variant p-4">
            <span>
              <span className="block font-semibold">Requiere QR</span>
              <span className="text-body-sm text-on-surface-variant">Habilita el código QR para el control de asistencia.</span>
            </span>
            <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={datos.requiereQr} onChange={cambiar('requiereQr')} />
          </label>
          <div className="flex justify-end gap-3">
            <Link to={editando ? `/eventos/${id}` : '/organizador/eventos'} className="rounded-lg border border-outline-variant px-5 py-3 font-semibold text-primary hover:bg-surface-container-low">
              Cancelar
            </Link>
            <Button type="submit" cargando={guardando} icono="save">
              {editando ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
          </div>
        </form>

        <aside className="xl:col-span-2" aria-label="Vista previa">
          <div className="sticky top-20 space-y-3">
            <p className="flex items-center gap-2 text-label-md uppercase text-on-surface-variant">
              <span className="h-2 w-2 animate-pulse rounded-full bg-exito" aria-hidden="true" /> Vista previa en tiempo real
            </p>
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
              <div className="relative h-44">
                {vistaImagen ? (
                  <img src={vistaImagen} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary to-secondary">
                    <span className="material-symbols-outlined text-6xl text-white/40" aria-hidden="true">event</span>
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-surface-container-lowest/90 px-3 py-1 text-[11px] font-bold uppercase text-primary">{categoria}</span>
              </div>
              <div className="space-y-3 p-5">
                <h2 className="text-title-sm text-on-surface">{datos.nombreEvento || 'Nombre del evento'}</h2>
                <p className="line-clamp-3 text-body-sm text-on-surface-variant">{datos.descripcion || 'La descripción aparecerá aquí.'}</p>
                <ul className="space-y-1 text-body-sm text-on-surface-variant">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_today</span>{inicioPrevio ? fechaCorta(inicioPrevio) : 'Fecha'}</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">schedule</span>{inicioPrevio ? hora(inicioPrevio) : 'Hora'}</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>{datos.ubicacion || 'Ubicación'}</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">group</span>{datos.cupoMaximo || 0} cupos · {precio(datos.precio || 0)}</li>
                </ul>
                <p className="text-[12px] font-bold uppercase text-on-surface-variant">Estado: {evento?.estadoEvento ?? 'Borrador'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        abierto={Boolean(creado)}
        titulo="¡Evento creado!"
        onCerrar={() => navigate('/organizador/eventos')}
        acciones={
          <>
            <Button variante="contorno" onClick={() => navigate(`/eventos/${creado.idEvento}`)}>Ver borrador</Button>
            <Button icono="publish" onClick={publicarCreado}>Publicar ahora</Button>
          </>
        }
      >
        {creado && <p>Guardamos «{creado.nombreEvento}» como borrador. Publícalo para que aparezca en el catálogo y acepte reservaciones.</p>}
      </Modal>
    </div>
  );
}
