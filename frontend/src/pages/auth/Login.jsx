import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import AuthLayout from '../../components/layout/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { rutaInicio } from '../../services/sesion';
import { correoValido } from '../../utils/validaciones';

// Inicio de sesión (RF-02, CU-02, prototipo siger_login). Tras entrar lleva al inicio de su rol o a la página pedida.
export default function Login() {
  const { usuario, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordarme, setRecordarme] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const volver = parametros.get('volver');
  const destino = (rol) => (volver?.startsWith('/') && !volver.startsWith('//') ? volver : rutaInicio(rol));

  if (usuario) return <Navigate to={destino(usuario.rol)} replace />;

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!correoValido(correo)) nuevos.correo = 'Escribe un correo válido.';
    if (!contrasena) nuevos.contrasena = 'Escribe tu contraseña.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    setError(null);
    try {
      const u = await iniciarSesion(correo.trim(), contrasena, recordarme);
      navigate(destino(u.rol), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Iniciar sesión"
      subtitulo="Accede a tus eventos y reservaciones"
      pie={
        <>
          ¿No tienes una cuenta aún?{' '}
          <Link to="/registro" className="font-bold text-secondary hover:underline">
            Regístrate ahora
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={enviar} noValidate>
        <Alert tono={error?.codigo === 'CUENTA_PENDIENTE' ? 'advertencia' : 'error'}>{error?.mensaje}</Alert>
        <Input
          etiqueta="Correo electrónico"
          icono="mail"
          type="email"
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
          autoFocus
        />
        <div className="space-y-1">
          <PasswordInput
            etiqueta="Contraseña"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errores.contrasena}
          />
          <div className="text-right">
            <Link to="/recuperar" className="text-label-md text-secondary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 px-1 text-body-sm text-on-surface-variant">
          <input type="checkbox" className="h-4 w-4 rounded border-outline text-primary" checked={recordarme} onChange={(e) => setRecordarme(e.target.checked)} />
          Recordar mi sesión en este equipo
        </label>
        <Button type="submit" className="w-full py-4" cargando={enviando} icono="login">
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
