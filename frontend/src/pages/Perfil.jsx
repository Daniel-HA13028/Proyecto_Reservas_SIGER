import { useEffect, useState } from 'react';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { perfilService } from '../services/auth.service';
import { contrasenaValida, correoValido, erroresPorCampo, hoyIso } from '../utils/validaciones';

const fecha = (iso, conHora = false) =>
  iso ? new Date(iso).toLocaleString('es-SV', conHora ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }) : '—';

// Mi perfil (RF-07, CU-13, prototipo siger_perfil): datos personales, cambio de correo con verificación y contraseña.
export default function Perfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const [perfil, setPerfil] = useState(usuario);
  const [datos, setDatos] = useState({
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    correoElectronico: usuario.correoElectronico,
    fechaNacimiento: usuario.fechaNacimiento ?? '',
  });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    perfilService.obtener().then(setPerfil).catch(() => {});
  }, []);

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!datos.nombres.trim()) nuevos.nombres = 'Escribe tus nombres.';
    if (!datos.apellidos.trim()) nuevos.apellidos = 'Escribe tus apellidos.';
    if (!correoValido(datos.correoElectronico)) nuevos.correoElectronico = 'Escribe un correo válido.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const correoNuevo = datos.correoElectronico.trim().toLowerCase() !== perfil.correoElectronico;
      const actualizado = await perfilService.actualizar({ ...datos, fechaNacimiento: datos.fechaNacimiento || null });
      setPerfil(actualizado);
      actualizarUsuario(actualizado);
      setAviso(
        correoNuevo
          ? `Datos guardados. Te enviamos un enlace a ${datos.correoElectronico.trim()}: tu correo cambiará cuando lo confirmes.`
          : 'Datos guardados.',
      );
    } catch (err) {
      setError(err);
      setErrores(erroresPorCampo(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Mi perfil</h1>
        <p className="text-body-sm text-on-surface-variant">Actualiza tus datos y tu contraseña.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card lg:col-span-2" aria-labelledby="datos">
          <h2 id="datos" className="mb-4 text-title-sm">Datos personales</h2>
          <form className="space-y-5" onSubmit={guardar} noValidate>
            <Alert tono="exito">{aviso}</Alert>
            <Alert tono="error">{error && error.codigo !== 'VALIDACION_FALLIDA' ? error.mensaje : null}</Alert>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input etiqueta="Nombres" value={datos.nombres} onChange={cambiar('nombres')} error={errores.nombres} maxLength={100} />
              <Input etiqueta="Apellidos" value={datos.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} maxLength={100} />
            </div>
            <Input
              etiqueta="Correo electrónico"
              icono="mail"
              type="email"
              value={datos.correoElectronico}
              onChange={cambiar('correoElectronico')}
              error={errores.correoElectronico}
              ayuda="Si lo cambias, te enviaremos un enlace al correo nuevo para confirmarlo."
            />
            <Input etiqueta="Fecha de nacimiento" type="date" value={datos.fechaNacimiento} onChange={cambiar('fechaNacimiento')} error={errores.fechaNacimiento} max={hoyIso()} />
            <div className="flex justify-end">
              <Button type="submit" cargando={guardando} icono="save">
                Guardar cambios
              </Button>
            </div>
          </form>
        </section>
        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card" aria-labelledby="cuenta">
            <h2 id="cuenta" className="mb-4 text-title-sm">Mi cuenta</h2>
            <dl className="grid grid-cols-2 gap-y-3 text-body-sm">
              <dt className="text-on-surface-variant">Rol</dt>
              <dd><Badge valor={perfil.rol} /></dd>
              <dt className="text-on-surface-variant">Estado</dt>
              <dd><Badge valor={perfil.estadoCuenta} /></dd>
              <dt className="text-on-surface-variant">Correo</dt>
              <dd>{perfil.correoVerificado ? 'Verificado' : 'Sin verificar'}</dd>
              <dt className="text-on-surface-variant">Miembro desde</dt>
              <dd>{fecha(perfil.fechaRegistro)}</dd>
              <dt className="text-on-surface-variant">Último acceso</dt>
              <dd>{fecha(perfil.ultimoAcceso, true)}</dd>
            </dl>
          </section>
          <CambiarContrasena />
        </aside>
      </div>
    </div>
  );
}

function CambiarContrasena() {
  const vacio = { contrasenaActual: '', nuevaContrasena: '', confirmacionContrasena: '' };
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!datos.contrasenaActual) nuevos.contrasenaActual = 'Escribe tu contraseña actual.';
    if (!contrasenaValida(datos.nuevaContrasena)) nuevos.nuevaContrasena = 'La contraseña no cumple los requisitos.';
    if (datos.confirmacionContrasena !== datos.nuevaContrasena) nuevos.confirmacionContrasena = 'Las contraseñas no coinciden.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    setError(null);
    try {
      await perfilService.cambiarContrasena(datos);
      setDatos(vacio);
      setAviso('Contraseña actualizada. Cerramos tus sesiones en otros equipos.');
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card" aria-labelledby="pass">
      <h2 id="pass" className="mb-4 text-title-sm">Cambiar contraseña</h2>
      <form className="flex flex-col gap-4" onSubmit={enviar} noValidate>
        <Alert tono="exito">{aviso}</Alert>
        <Alert tono="error">{error?.mensaje}</Alert>
        <PasswordInput etiqueta="Contraseña actual" autoComplete="current-password" value={datos.contrasenaActual} onChange={cambiar('contrasenaActual')} error={errores.contrasenaActual} />
        <PasswordInput etiqueta="Nueva contraseña" autoComplete="new-password" value={datos.nuevaContrasena} onChange={cambiar('nuevaContrasena')} error={errores.nuevaContrasena} mostrarRequisitos />
        <PasswordInput etiqueta="Confirmar nueva contraseña" autoComplete="new-password" value={datos.confirmacionContrasena} onChange={cambiar('confirmacionContrasena')} error={errores.confirmacionContrasena} />
        <Button type="submit" variante="secundario" className="w-full" cargando={enviando}>
          Actualizar contraseña
        </Button>
      </form>
    </section>
  );
}
