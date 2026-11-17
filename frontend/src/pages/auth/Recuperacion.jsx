import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import AuthLayout from '../../components/layout/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import { authService } from '../../services/auth.service';
import { contrasenaValida, correoValido } from '../../utils/validaciones';

// Recuperación de contraseña en tres pasos (RF-03, CU-09, prototipos siger_recuperar_contrase_a,
// siger_verificar_c_digo, siger_nueva_contrase_a y siger_xito_restablecimiento). El correo y el código pasan
// de un paso a otro en sessionStorage, que se borra al terminar o al cerrar la pestaña.
const CLAVE = 'siger.recuperacion';
const leer = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE)) ?? {};
  } catch {
    return {};
  }
};
const guardar = (datos) => {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ ...leer(), ...datos }));
  } catch {
    // sin almacenamiento: el flujo sigue mientras la página esté abierta
  }
};
const volverAlLogin = (
  <Link to="/login" className="font-bold text-secondary hover:underline">
    Volver a iniciar sesión
  </Link>
);

/** Paso 1: correo. */
export function RecuperarContrasena() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState(leer().correo ?? '');
  const [error, setError] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!correoValido(correo)) return setErrorCampo('Escribe un correo válido.');
    setErrorCampo(null);
    setEnviando(true);
    setError(null);
    try {
      await authService.recuperar(correo.trim());
      guardar({ correo: correo.trim(), codigo: null });
      navigate('/recuperar/verificar');
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout titulo="Recuperar contraseña" subtitulo="Te enviaremos un código de 6 dígitos a tu correo" pie={volverAlLogin}>
      <form className="space-y-6" onSubmit={enviar} noValidate>
        <Alert tono="error">{error?.mensaje}</Alert>
        <Input etiqueta="Correo electrónico" icono="mail" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} error={errorCampo} autoFocus />
        <Button type="submit" className="w-full py-4" cargando={enviando} icono="send">
          Enviar código
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Paso 2: código de 6 dígitos (vence en 15 minutos, 5 intentos). */
export function VerificarCodigo() {
  const navigate = useNavigate();
  const { correo } = leer();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  if (!correo) return <Navigate to="/recuperar" replace />;

  const verificar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await authService.verificarCodigo(correo, codigo);
      guardar({ codigo });
      navigate('/recuperar/nueva');
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setError(null);
    try {
      await authService.recuperar(correo);
      setAviso('Te enviamos un código nuevo; el anterior ya no sirve.');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <AuthLayout titulo="Verifica tu código" subtitulo={`Escribe el código que enviamos a ${correo}`} pie={volverAlLogin}>
      <form className="space-y-6" onSubmit={verificar} noValidate>
        <Alert tono="error">{error?.mensaje}</Alert>
        <Alert tono="exito">{aviso}</Alert>
        <Input
          etiqueta="Código de verificación"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-2xl [&_input]:tracking-[0.5em]"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          ayuda="Vence en 15 minutos y admite 5 intentos."
          autoFocus
        />
        <Button type="submit" className="w-full py-4" cargando={enviando} disabled={codigo.length !== 6}>
          Verificar código
        </Button>
        <button type="button" className="w-full text-center text-label-md text-secondary hover:underline" onClick={reenviar}>
          ¿No te llegó? Enviar otro código
        </button>
      </form>
    </AuthLayout>
  );
}

/** Paso 3: nueva contraseña. */
export function NuevaContrasena() {
  const navigate = useNavigate();
  const { correo, codigo } = leer();
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  if (!correo || !codigo) return <Navigate to="/recuperar" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!contrasenaValida(contrasena)) nuevos.contrasena = 'La contraseña no cumple los requisitos.';
    if (confirmacion !== contrasena) nuevos.confirmacion = 'Las contraseñas no coinciden.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    setError(null);
    try {
      await authService.restablecer({ correoElectronico: correo, codigo, nuevaContrasena: contrasena, confirmacionContrasena: confirmacion });
      sessionStorage.removeItem(CLAVE);
      navigate('/recuperar/exito', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout titulo="Nueva contraseña" subtitulo="Elige una contraseña segura" pie={volverAlLogin}>
      <form className="space-y-6" onSubmit={enviar} noValidate>
        <Alert tono="error">{error?.mensaje}</Alert>
        <PasswordInput etiqueta="Nueva contraseña" autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} error={errores.contrasena} mostrarRequisitos autoFocus />
        <PasswordInput etiqueta="Confirmar contraseña" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} error={errores.confirmacion} />
        <Button type="submit" className="w-full py-4" cargando={enviando} icono="lock_reset">
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Éxito: la contraseña cambió y se cerraron las sesiones abiertas. */
export function RecuperacionExito() {
  return (
    <AuthLayout titulo="¡Contraseña actualizada!">
      <div className="space-y-6 text-center text-body-base text-on-surface-variant">
        <span className="material-symbols-outlined text-6xl text-exito" aria-hidden="true">
          task_alt
        </span>
        <p>Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad cerramos las sesiones abiertas en otros equipos.</p>
        <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-container">
          Iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  );
}
