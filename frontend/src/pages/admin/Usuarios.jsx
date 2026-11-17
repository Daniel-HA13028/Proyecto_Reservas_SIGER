import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { usuariosService } from '../../services/usuarios.service';
import { correoValido, erroresPorCampo } from '../../utils/validaciones';

const ROLES = ['Administrador', 'Organizador', 'Participante'];
const LIMITE = 10;
const iniciales = (u) => `${u.nombres[0] ?? ''}${u.apellidos[0] ?? ''}`.toUpperCase();
const miembroDesde = (iso) => new Date(iso).toLocaleDateString('es-SV', { month: 'short', year: 'numeric' });

// Gestión de usuarios (RF-05, RF-06, CU-07, CU-11; prototipo siger_usuarios): búsqueda, filtros, páginas,
// acciones por fila (editar, rol, activar/desactivar, aprobar o rechazar organizadores) y exportación.
export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const [params] = useSearchParams();
  // Filtro inicial desde la dirección (por ejemplo, el enlace «Organizadores pendientes» del dashboard).
  const [filtros, setFiltros] = useState(() => ({ buscar: '', rol: params.get('rol') ?? '', estado: params.get('estado') ?? '' }));
  const [buscarEscrito, setBuscarEscrito] = useState('');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null); // { tipo, usuario }
  const [exportando, setExportando] = useState(null);

  const [recarga, setRecarga] = useState(0);

  // Consulta la página actual; si cambian los filtros antes de que responda, se ignora la respuesta vieja.
  useEffect(() => {
    let vigente = true;
    usuariosService
      .listar({ ...filtros, pagina, limite: LIMITE })
      .then((r) => {
        if (!vigente) return;
        setResultado(r);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [filtros, pagina, recarga]);

  const cargar = () => setRecarga((n) => n + 1);

  // La búsqueda espera a que se deje de escribir (300 ms) para no consultar en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.buscar === buscarEscrito ? f : { ...f, buscar: buscarEscrito }));
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [buscarEscrito]);

  const filtrar = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPagina(1);
  };

  const terminar = (mensaje) => {
    setAccion(null);
    setAviso(mensaje);
    cargar();
  };

  const exportar = async (formato) => {
    setExportando(formato);
    try {
      await usuariosService.exportar(formato, filtros);
    } catch (err) {
      setError(err);
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-headline-md text-on-surface">Directorio de usuarios</h1>
          <p className="text-body-sm text-on-surface-variant">Gestiona roles, estados y solicitudes de organizador.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variante="contorno" icono="picture_as_pdf" cargando={exportando === 'pdf'} onClick={() => exportar('pdf')}>
            PDF
          </Button>
          <Button variante="contorno" icono="table_view" cargando={exportando === 'xlsx'} onClick={() => exportar('xlsx')}>
            Excel
          </Button>
          <Link to="/admin/usuarios/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary-container">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person_add</span>
            Nuevo usuario
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Input className="md:col-span-2" icono="search" placeholder="Buscar por nombre o correo…" aria-label="Buscar usuarios" value={buscarEscrito} onChange={(e) => setBuscarEscrito(e.target.value)} />
        <Select aria-label="Filtrar por rol" value={filtros.rol} onChange={filtrar('rol')} opciones={[{ valor: '', texto: 'Todos los roles' }, ...ROLES.map((r) => ({ valor: r, texto: r }))]} />
        <Select
          aria-label="Filtrar por estado"
          value={filtros.estado}
          onChange={filtrar('estado')}
          opciones={[
            { valor: '', texto: 'Cualquier estado' },
            { valor: 'Activo', texto: 'Activos' },
            { valor: 'Inactivo', texto: 'Inactivos' },
            { valor: 'Pendiente', texto: 'Pendientes de aprobación' },
          ]}
        />
      </div>

      <Alert tono="exito">{aviso}</Alert>
      <Alert tono="error">{error?.mensaje}</Alert>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de usuarios">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                {['Usuario', 'Correo', 'Rol', 'Estado', 'Acciones'].map((c, i) => (
                  <th key={c} scope="col" className={`px-4 py-4 text-label-md uppercase text-on-surface-variant md:px-6 ${i === 1 ? 'hidden md:table-cell' : ''} ${i === 4 ? 'text-right' : ''}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {resultado?.contenido.map((u) => (
                <tr key={u.idUsuario} className="group transition-colors hover:bg-surface-container-low">
                  <td className="px-4 py-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-white">{iniciales(u)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">
                          {u.nombres} {u.apellidos}
                          {u.idUsuario === yo.idUsuario && <span className="ml-2 text-[11px] font-normal text-on-surface-variant">(tú)</span>}
                        </p>
                        <p className="text-[12px] text-on-surface-variant">Miembro desde {miembroDesde(u.fechaRegistro)}</p>
                        <p className="truncate text-[12px] text-on-surface-variant md:hidden">{u.correoElectronico}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 text-body-sm text-on-surface-variant md:table-cell">
                    {u.correoElectronico}
                    {!u.correoVerificado && <span className="block text-[11px] text-advertencia">Sin verificar</span>}
                  </td>
                  <td className="px-4 py-4 md:px-6"><Badge valor={u.rol} /></td>
                  <td className="px-4 py-4 md:px-6"><Badge valor={u.estadoCuenta} /></td>
                  <td className="px-4 py-4 text-right md:px-6">
                    <Acciones usuario={u} esYo={u.idUsuario === yo.idUsuario} onAccion={(tipo) => setAccion({ tipo, usuario: u })} />
                  </td>
                </tr>
              ))}
              {resultado && resultado.contenido.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined mb-2 block text-4xl text-outline" aria-hidden="true">person_search</span>
                    No hay usuarios con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {resultado && (
          <div className="border-t border-outline-variant px-4 py-3 md:px-6">
            <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} totalElementos={resultado.totalElementos} onCambiar={setPagina} />
          </div>
        )}
      </div>

      {accion?.tipo === 'editar' && <EditarUsuario usuario={accion.usuario} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'rol' && <CambiarRol usuario={accion.usuario} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'estado' && <CambiarEstado usuario={accion.usuario} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {(accion?.tipo === 'aprobar' || accion?.tipo === 'rechazar') && (
        <ResolverSolicitud usuario={accion.usuario} aprobar={accion.tipo === 'aprobar'} onCerrar={() => setAccion(null)} onListo={terminar} />
      )}
    </div>
  );
}

/** Botones de la fila; en escritorio se resaltan al pasar el mouse (prototipo). */
function Acciones({ usuario, esYo, onAccion }) {
  const boton = (tipo, icono, titulo, clase = 'text-secondary hover:bg-secondary/10', deshabilitado = false) => (
    <button type="button" title={titulo} aria-label={`${titulo}: ${usuario.nombres} ${usuario.apellidos}`} disabled={deshabilitado} onClick={() => onAccion(tipo)} className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-30 ${clase}`}>
      <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
    </button>
  );
  return (
    <div className="flex items-center justify-end gap-1 transition-opacity md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      {usuario.estadoCuenta === 'Pendiente' ? (
        <>
          {boton('aprobar', 'how_to_reg', 'Aprobar organizador', 'text-exito hover:bg-exito-container')}
          {boton('rechazar', 'person_off', 'Rechazar solicitud', 'text-error hover:bg-error-container')}
        </>
      ) : (
        <>
          {boton('rol', 'manage_accounts', esYo ? 'No puedes cambiar tu propio rol' : 'Cambiar rol', undefined, esYo)}
          {boton(
            'estado',
            usuario.estadoCuenta === 'Activo' ? 'block' : 'check_circle',
            esYo ? 'No puedes desactivar tu propia cuenta' : usuario.estadoCuenta === 'Activo' ? 'Desactivar' : 'Activar',
            usuario.estadoCuenta === 'Activo' ? 'text-error hover:bg-error-container' : 'text-exito hover:bg-exito-container',
            esYo,
          )}
        </>
      )}
      {boton('editar', 'edit', 'Editar')}
    </div>
  );
}

function useEnvio(onListo) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ejecutar = async (accion, mensaje) => {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      onListo(mensaje);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };
  return { enviando, error, ejecutar };
}

const nombre = (u) => `${u.nombres} ${u.apellidos}`;

function EditarUsuario({ usuario, onCerrar, onListo }) {
  const [datos, setDatos] = useState({
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    correoElectronico: usuario.correoElectronico,
    fechaNacimiento: usuario.fechaNacimiento ?? '',
  });
  const { enviando, error, ejecutar } = useEnvio(onListo);
  const errores = erroresPorCampo(error);
  const cambiar = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));
  const valido = datos.nombres.trim() && datos.apellidos.trim() && correoValido(datos.correoElectronico);
  return (
    <Modal
      abierto
      titulo={`Editar a ${nombre(usuario)}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={onCerrar}>Cancelar</Button>
          <Button
            cargando={enviando}
            disabled={!valido}
            onClick={() => ejecutar(() => usuariosService.actualizar(usuario.idUsuario, { ...datos, fechaNacimiento: datos.fechaNacimiento || null }), 'Datos del usuario actualizados.')}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert tono="error">{error && error.codigo !== 'VALIDACION_FALLIDA' ? error.mensaje : null}</Alert>
        <Input etiqueta="Nombres" value={datos.nombres} onChange={cambiar('nombres')} error={errores.nombres} />
        <Input etiqueta="Apellidos" value={datos.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} />
        <Input etiqueta="Correo electrónico" type="email" value={datos.correoElectronico} onChange={cambiar('correoElectronico')} error={errores.correoElectronico} ayuda="Si lo cambias, quedará sin verificar." />
        <Input etiqueta="Fecha de nacimiento" type="date" value={datos.fechaNacimiento} onChange={cambiar('fechaNacimiento')} />
      </div>
    </Modal>
  );
}

function CambiarRol({ usuario, onCerrar, onListo }) {
  const [rol, setRol] = useState(usuario.rol);
  const { enviando, error, ejecutar } = useEnvio(onListo);
  return (
    <Modal
      abierto
      titulo="Cambiar rol"
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={onCerrar}>Cancelar</Button>
          <Button cargando={enviando} disabled={rol === usuario.rol} onClick={() => ejecutar(() => usuariosService.cambiarRol(usuario.idUsuario, rol), `${nombre(usuario)} ahora es ${rol}.`)}>
            Cambiar rol
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p>El cambio se aplica de inmediato y queda registrado en la bitácora.</p>
        <Alert tono="error">{error?.mensaje}</Alert>
        <Select etiqueta={`Rol de ${nombre(usuario)}`} value={rol} onChange={(e) => setRol(e.target.value)} opciones={ROLES.map((r) => ({ valor: r, texto: r }))} />
      </div>
    </Modal>
  );
}

function CambiarEstado({ usuario, onCerrar, onListo }) {
  const desactivar = usuario.estadoCuenta === 'Activo';
  const { enviando, error, ejecutar } = useEnvio(onListo);
  return (
    <Modal
      abierto
      titulo={desactivar ? 'Desactivar cuenta' : 'Activar cuenta'}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={onCerrar}>Cancelar</Button>
          <Button
            variante={desactivar ? 'peligro' : 'primario'}
            cargando={enviando}
            onClick={() => ejecutar(() => usuariosService.cambiarEstado(usuario.idUsuario, desactivar ? 'Inactivo' : 'Activo'), `Cuenta de ${nombre(usuario)} ${desactivar ? 'desactivada' : 'activada'}.`)}
          >
            {desactivar ? 'Desactivar' : 'Activar'}
          </Button>
        </>
      }
    >
      <Alert tono="error">{error?.mensaje}</Alert>
      <p>
        {desactivar
          ? `${nombre(usuario)} no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Sus datos se conservan.`
          : `${nombre(usuario)} podrá volver a iniciar sesión.`}
      </p>
    </Modal>
  );
}

function ResolverSolicitud({ usuario, aprobar, onCerrar, onListo }) {
  const [motivo, setMotivo] = useState('');
  const { enviando, error, ejecutar } = useEnvio(onListo);
  return (
    <Modal
      abierto
      titulo={aprobar ? 'Aprobar organizador' : 'Rechazar solicitud'}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={onCerrar}>Cancelar</Button>
          <Button
            variante={aprobar ? 'primario' : 'peligro'}
            cargando={enviando}
            disabled={!aprobar && !motivo.trim()}
            onClick={() =>
              ejecutar(
                () => usuariosService.resolverAprobacion(usuario.idUsuario, aprobar, aprobar ? null : motivo.trim()),
                aprobar ? `${nombre(usuario)} ya es Organizador.` : `Solicitud rechazada: ${nombre(usuario)} quedó como Participante.`,
              )
            }
          >
            {aprobar ? 'Aprobar' : 'Rechazar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert tono="error">{error?.mensaje}</Alert>
        <p>
          {aprobar
            ? `${nombre(usuario)} podrá iniciar sesión y crear eventos. Le avisaremos por correo.`
            : `${nombre(usuario)} quedará como Participante activo. Le enviaremos el motivo por correo.`}
        </p>
        {!aprobar && <Input etiqueta="Motivo del rechazo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} autoFocus />}
      </div>
    </Modal>
  );
}
