import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import AuthLayout from '../../components/layout/AuthLayout';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import { correoValido } from '../../utils/validaciones';

// Enlace del correo de verificación (RF-04) o de cambio de correo (RF-07); prototipo siger_verificar_correo.
export default function VerificarCorreo() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  const [estado, setEstado] = useState(token ? 'verificando' : 'sin-token');
  const [error, setError] = useState(null);
  const enviado = useRef(false);

  useEffect(() => {
    // El enlace es de un solo uso: en modo estricto React monta dos veces; solo se envía una.
    if (!token || enviado.current) return;
    enviado.current = true;
    authService
      .verificarCorreo(token)
      .then(() => setEstado('verificado'))
      .catch((err) => {
        setError(err);
        setEstado('error');
      });
  }, [token]);

  if (estado === 'verificando') {
    return (
      <AuthLayout titulo="Verificando tu correo…">
        <p className="text-center text-on-surface-variant">Un momento, por favor.</p>
      </AuthLayout>
    );
  }
  if (estado === 'verificado') {
    return (
      <AuthLayout titulo="¡Correo verificado!">
        <div className="space-y-6 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-6xl text-exito" aria-hidden="true">
            verified
          </span>
          <p>Tu correo quedó confirmado.</p>
          <Link to="/login" className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-container">
            Iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }
  return <Reenviar error={error} />;
}

function Reenviar({ error }) {
  const [correo, setCorreo] = useState('');
  const [aviso, setAviso] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!correoValido(correo)) return setFallo({ mensaje: 'Escribe un correo válido.' });
    setEnviando(true);
    setFallo(null);
    try {
      await authService.reenviarVerificacion(correo.trim());
      setAviso('Si la cuenta existe y falta verificarla, te enviamos un enlace nuevo.');
    } catch (err) {
      setFallo(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout titulo="Verificación de correo" subtitulo="Pide un enlace nuevo si el anterior venció o ya se usó">
      <form className="space-y-6" onSubmit={enviar} noValidate>
        <Alert tono="error">{error?.mensaje}</Alert>
        <Alert tono="exito">{aviso}</Alert>
        <Alert tono="error">{fallo?.mensaje}</Alert>
        <Input etiqueta="Correo electrónico" icono="mail" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <Button type="submit" className="w-full py-4" cargando={enviando} icono="forward_to_inbox">
          Enviar enlace nuevo
        </Button>
      </form>
    </AuthLayout>
  );
}
