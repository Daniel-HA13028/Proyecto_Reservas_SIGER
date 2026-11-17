import { useState } from 'react';
import { Link } from 'react-router';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { TIPOS_SOPORTE, soporteService } from '../../services/soporte.service';
import { correoValido, erroresPorCampo } from '../../utils/validaciones';

const MAX_DESCRIPCION = 2000;

// Soporte técnico (RF-25, CU-15; prototipo siger_soporte_tecnico; T-10-07): formulario para reportar un problema. Si hay
// sesión, el correo se precarga y la solicitud queda asociada a la cuenta.
export default function Soporte() {
  const { usuario } = useAuth();
  // null = el usuario no lo ha editado: se usa el de la sesión, que puede terminar de cargar después del primer render.
  const [correoEditado, setCorreo] = useState(null);
  const correo = correoEditado ?? usuario?.correoElectronico ?? '';
  const [tipo, setTipo] = useState('Incidente');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [creada, setCreada] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    const locales = {};
    if (!correoValido(correo)) locales.correoContacto = 'Escribe un correo válido.';
    if (descripcion.trim().length < 10) locales.descripcion = 'Cuéntanos un poco más (al menos 10 caracteres).';
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setEnviando(true);
    setError(null);
    try {
      setCreada(await soporteService.crear({ correoContacto: correo.trim(), tipo, descripcion: descripcion.trim() }));
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  if (creada) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-card">
        <span className="material-symbols-outlined mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-exito-container text-4xl text-exito" aria-hidden="true">task_alt</span>
        <h1 className="text-headline-md text-on-surface">Recibimos tu solicitud</h1>
        <p className="text-body-base text-on-surface-variant">
          Tu número de seguimiento es <strong className="text-on-surface">#{creada.idSolicitud}</strong>. Te responderemos a <strong>{creada.correoContacto}</strong>.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button variante="contorno" onClick={() => { setCreada(null); setDescripcion(''); }}>Reportar otro problema</Button>
          <Link to="/ayuda/faq" className="inline-flex items-center rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary-container">Ver preguntas frecuentes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Soporte técnico</h1>
        <p className="text-body-sm text-on-surface-variant">¿Encontraste un error o necesitas ayuda? Cuéntanos y el equipo de soporte lo revisará.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <form onSubmit={enviar} noValidate className="space-y-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card md:col-span-2">
          <h2 className="text-title-sm">Reportar un problema</h2>
          <Alert tono="error">{error && !Object.keys(errores).length ? error.mensaje : null}</Alert>
          <Input etiqueta="Correo de contacto" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} error={errores.correoContacto} maxLength={150} />
          <Select etiqueta="Tipo de solicitud" value={tipo} onChange={(e) => setTipo(e.target.value)} opciones={TIPOS_SOPORTE} />
          <div className="space-y-2">
            <label htmlFor="descripcion" className="ml-1 block text-label-md uppercase text-on-surface-variant">Descripción</label>
            <textarea
              id="descripcion"
              rows={6}
              maxLength={MAX_DESCRIPCION}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={errores.descripcion ? true : undefined}
              aria-describedby="descripcion-ayuda"
              placeholder="Qué hacías, qué esperabas y qué pasó. Si es sobre una reservación, indica el evento."
              className={`w-full rounded-lg border bg-surface px-4 py-3 text-body-base outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 ${errores.descripcion ? 'border-error' : 'border-outline-variant'}`}
            />
            <p id="descripcion-ayuda" className={`ml-1 flex justify-between text-body-sm ${errores.descripcion ? 'text-error' : 'text-on-surface-variant'}`}>
              <span>{errores.descripcion ?? 'No incluyas contraseñas ni códigos de verificación.'}</span>
              <span>{descripcion.length}/{MAX_DESCRIPCION}</span>
            </p>
          </div>
          <Button type="submit" icono="send" cargando={enviando} className="w-full sm:w-auto">Enviar solicitud</Button>
        </form>

        <aside className="space-y-4">
          <Link to="/ayuda/faq" className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card hover:shadow-modal">
            <span className="material-symbols-outlined mb-2 rounded-lg bg-secondary/10 p-2 text-secondary" aria-hidden="true">quiz</span>
            <p className="font-semibold">Preguntas frecuentes</p>
            <p className="text-body-sm text-on-surface-variant">Muchas dudas se resuelven al instante.</p>
          </Link>
          <div className="rounded-xl bg-surface-container-low p-5">
            <p className="font-semibold">Tiempo de respuesta</p>
            <p className="text-body-sm text-on-surface-variant">Revisamos las solicitudes en días hábiles. Recibirás la respuesta en el correo que indiques.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
