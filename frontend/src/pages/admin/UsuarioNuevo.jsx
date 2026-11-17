import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { usuariosService } from '../../services/usuarios.service';
import { correoValido, erroresPorCampo, hoyIso } from '../../utils/validaciones';

const INICIAL = { nombres: '', apellidos: '', correoElectronico: '', rol: 'Participante', fechaNacimiento: '' };

// Alta de usuario por el Administrador (RF-05, CU-07; prototipos siger_registrar_usuario_admin y
// siger_confirmaci_n_creaci_n_usuario_admin). El usuario recibe un correo para definir su contraseña.
export default function UsuarioNuevo() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [creado, setCreado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!datos.nombres.trim()) nuevos.nombres = 'Escribe los nombres.';
    if (!datos.apellidos.trim()) nuevos.apellidos = 'Escribe los apellidos.';
    if (!correoValido(datos.correoElectronico)) nuevos.correoElectronico = 'Escribe un correo válido.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    setError(null);
    try {
      setCreado(await usuariosService.crear({ ...datos, correoElectronico: datos.correoElectronico.trim(), fechaNacimiento: datos.fechaNacimiento || null }));
    } catch (err) {
      setError(err);
      setErrores(erroresPorCampo(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link to="/admin/usuarios" className="mb-2 inline-flex items-center gap-1 text-body-sm text-secondary hover:underline">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Volver a usuarios
        </Link>
        <h1 className="text-headline-md text-on-surface">Registrar usuario</h1>
        <p className="text-body-sm text-on-surface-variant">La cuenta se crea activa y el usuario recibe un correo para definir su contraseña.</p>
      </header>
      <form className="space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card" onSubmit={enviar} noValidate>
        <Alert tono="error">{error && error.codigo !== 'VALIDACION_FALLIDA' ? error.mensaje : null}</Alert>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input etiqueta="Nombres" value={datos.nombres} onChange={cambiar('nombres')} error={errores.nombres} maxLength={100} autoFocus />
          <Input etiqueta="Apellidos" value={datos.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} maxLength={100} />
        </div>
        <Input etiqueta="Correo electrónico" icono="mail" type="email" value={datos.correoElectronico} onChange={cambiar('correoElectronico')} error={errores.correoElectronico} maxLength={150} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select etiqueta="Rol" value={datos.rol} onChange={cambiar('rol')} opciones={['Participante', 'Organizador', 'Administrador'].map((r) => ({ valor: r, texto: r }))} />
          <Input etiqueta="Fecha de nacimiento (opcional)" type="date" value={datos.fechaNacimiento} onChange={cambiar('fechaNacimiento')} error={errores.fechaNacimiento} max={hoyIso()} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variante="contorno" onClick={() => navigate('/admin/usuarios')}>Cancelar</Button>
          <Button type="submit" cargando={enviando} icono="person_add">Registrar usuario</Button>
        </div>
      </form>

      <Modal
        abierto={Boolean(creado)}
        titulo="¡Usuario registrado!"
        onCerrar={() => navigate('/admin/usuarios')}
        acciones={
          <>
            <Button variante="contorno" onClick={() => { setCreado(null); setDatos(INICIAL); }}>Registrar otro</Button>
            <Button onClick={() => navigate('/admin/usuarios')}>Ver usuarios</Button>
          </>
        }
      >
        {creado && (
          <p>
            Creamos la cuenta de <strong>{creado.nombres} {creado.apellidos}</strong> ({creado.rol}). Le enviamos un correo a{' '}
            <strong>{creado.correoElectronico}</strong> para que defina su contraseña.
          </p>
        )}
      </Modal>
    </div>
  );
}
