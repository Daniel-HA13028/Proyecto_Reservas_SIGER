import { useState } from 'react';
import { Link } from 'react-router';
import AuthLayout from '../../components/layout/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import { authService } from '../../services/auth.service';
import { contrasenaValida, correoValido, erroresPorCampo, hoyIso } from '../../utils/validaciones';

const INICIAL = {
  nombres: '',
  apellidos: '',
  correoElectronico: '',
  fechaNacimiento: '',
  rol: 'Participante',
  contrasena: '',
  confirmacionContrasena: '',
  aceptaTerminos: false,
};

// Registro (RF-01, CU-01, prototipo siger_registro). Un organizador queda pendiente de aprobación (RN-04).
export default function Registro() {
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [creado, setCreado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) =>
    setDatos((d) => ({ ...d, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validar = () => {
    const e = {};
    if (!datos.nombres.trim()) e.nombres = 'Escribe tus nombres.';
    if (!datos.apellidos.trim()) e.apellidos = 'Escribe tus apellidos.';
    if (!correoValido(datos.correoElectronico)) e.correoElectronico = 'Escribe un correo válido.';
    if (!datos.fechaNacimiento) e.fechaNacimiento = 'Indica tu fecha de nacimiento.';
    else if (new Date(datos.fechaNacimiento) >= new Date()) e.fechaNacimiento = 'La fecha debe ser anterior a hoy.';
    if (!contrasenaValida(datos.contrasena)) e.contrasena = 'La contraseña no cumple los requisitos.';
    if (datos.confirmacionContrasena !== datos.contrasena) e.confirmacionContrasena = 'Las contraseñas no coinciden.';
    if (!datos.aceptaTerminos) e.aceptaTerminos = 'Debes aceptar los Términos y Condiciones y la Política de Privacidad.';
    return e;
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    setError(null);
    try {
      setCreado(await authService.registro({ ...datos, correoElectronico: datos.correoElectronico.trim() }));
    } catch (err) {
      setError(err);
      setErrores(erroresPorCampo(err));
    } finally {
      setEnviando(false);
    }
  };

  if (creado) {
    return (
      <AuthLayout titulo="¡Cuenta creada!" subtitulo={creado.correoElectronico}>
        <div className="space-y-4 text-center text-body-base text-on-surface-variant">
          <span className="material-symbols-outlined text-6xl text-exito" aria-hidden="true">
            mark_email_read
          </span>
          <p>Te enviamos un enlace para verificar tu correo. Revisa tu bandeja de entrada.</p>
          {creado.estadoCuenta === 'Pendiente' ? (
            <Alert tono="advertencia">
              Tu cuenta de organizador queda pendiente: podrás iniciar sesión cuando un administrador la apruebe. Te avisaremos por correo.
            </Alert>
          ) : (
            <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-container">
              Iniciar sesión
            </Link>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titulo="Crear cuenta"
      subtitulo="Regístrate para reservar o publicar eventos"
      ancho="max-w-[560px]"
      pie={
        <>
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="font-bold text-secondary hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={enviar} noValidate>
        <Alert tono="error">{error && error.codigo !== 'VALIDACION_FALLIDA' ? error.mensaje : null}</Alert>
        <fieldset>
          <legend className="mb-2 ml-1 text-label-md uppercase text-on-surface-variant">Tipo de cuenta</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Participante', 'confirmation_number', 'Reservo y asisto a eventos'],
              ['Organizador', 'event', 'Publico eventos (requiere aprobación)'],
            ].map(([rol, icono, texto]) => (
              <label
                key={rol}
                className={`cursor-pointer rounded-xl border p-4 text-center transition-all ${datos.rol === rol ? 'border-secondary bg-secondary/5 ring-2 ring-secondary/20' : 'border-outline-variant hover:bg-surface-container-low'}`}
              >
                <input type="radio" name="rol" value={rol} checked={datos.rol === rol} onChange={cambiar('rol')} className="sr-only" />
                <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
                  {icono}
                </span>
                <span className="block font-semibold text-on-surface">{rol}</span>
                <span className="block text-[12px] text-on-surface-variant">{texto}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input etiqueta="Nombres" autoComplete="given-name" value={datos.nombres} onChange={cambiar('nombres')} error={errores.nombres} maxLength={100} />
          <Input etiqueta="Apellidos" autoComplete="family-name" value={datos.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} maxLength={100} />
        </div>
        <Input etiqueta="Correo electrónico" icono="mail" type="email" autoComplete="email" value={datos.correoElectronico} onChange={cambiar('correoElectronico')} error={errores.correoElectronico} maxLength={150} />
        <Input etiqueta="Fecha de nacimiento" type="date" value={datos.fechaNacimiento} onChange={cambiar('fechaNacimiento')} error={errores.fechaNacimiento} max={hoyIso()} />
        <PasswordInput etiqueta="Contraseña" autoComplete="new-password" value={datos.contrasena} onChange={cambiar('contrasena')} error={errores.contrasena} mostrarRequisitos />
        <PasswordInput etiqueta="Confirmar contraseña" autoComplete="new-password" value={datos.confirmacionContrasena} onChange={cambiar('confirmacionContrasena')} error={errores.confirmacionContrasena} />
        <div>
          <label className="flex cursor-pointer items-start gap-2 px-1 text-body-sm text-on-surface-variant">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-outline text-primary" checked={datos.aceptaTerminos} onChange={cambiar('aceptaTerminos')} />
            Acepto los Términos y Condiciones y la Política de Privacidad.
          </label>
          {errores.aceptaTerminos && <p className="ml-1 mt-1 text-body-sm text-error">{errores.aceptaTerminos}</p>}
        </div>
        <Button type="submit" className="w-full py-4" cargando={enviando} icono="person_add">
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
