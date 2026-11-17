import DocumentoLegal from '../../components/DocumentoLegal';

// Términos y Condiciones de uso (se aceptan al registrarse: RegistroRequest.aceptaTerminos). Las condiciones siguen
// las reglas de negocio que aplica el sistema.
const SECCIONES = [
  {
    id: 'aceptacion',
    titulo: 'Aceptación',
    contenido: (
      <p>
        Al crear una cuenta en SIGER marcas la casilla «Acepto los Términos y Condiciones y la Política de Privacidad». Sin esa aceptación no es
        posible registrarse. Consultar el catálogo de eventos no requiere cuenta.
      </p>
    ),
  },
  {
    id: 'cuentas',
    titulo: 'Cuentas de usuario',
    contenido: (
      <ul>
        <li>Debes registrarte con datos verdaderos y un correo electrónico propio, que verificarás con el enlace que te enviamos.</li>
        <li>Eres responsable de mantener tu contraseña en secreto. Por seguridad, tras 5 intentos fallidos el acceso se bloquea durante 15 minutos.</li>
        <li>Las cuentas de organizador quedan pendientes hasta que un administrador las aprueba.</li>
        <li>El administrador puede desactivar una cuenta que incumpla estos términos.</li>
      </ul>
    ),
  },
  {
    id: 'reservaciones',
    titulo: 'Reservaciones',
    contenido: (
      <ul>
        <li>Solo puedes tener una reservación confirmada por evento. Cada acompañante ocupa un cupo.</li>
        <li>Las reservaciones se aceptan mientras haya cupos; el sistema no permite reservar más cupos que la capacidad del evento.</li>
        <li>Puedes cancelar hasta 24 horas antes del inicio del evento. Al cancelar, el comprobante QR deja de ser válido.</li>
        <li>Los pagos de eventos con precio son simulados: SIGER no cobra ni procesa dinero.</li>
      </ul>
    ),
  },
  {
    id: 'asistencia',
    titulo: 'Comprobante QR y asistencia',
    contenido: (
      <p>
        El comprobante QR es personal y sirve para una sola entrada: la asistencia se registra una vez por reservación. No compartas tu código; si
        otra persona lo usa primero, tu acceso será rechazado.
      </p>
    ),
  },
  {
    id: 'organizadores',
    titulo: 'Obligaciones de los organizadores',
    contenido: (
      <ul>
        <li>Publicar información veraz del evento: fecha, lugar, capacidad y precio. La fecha de inicio debe ser futura.</li>
        <li>Si cambias la fecha, la hora o el lugar, o cancelas el evento, SIGER avisa a quienes reservaron.</li>
        <li>Usar los datos de los participantes solo para gestionar el evento.</li>
        <li>Las imágenes que subas deben ser tuyas o contar con permiso para usarlas.</li>
      </ul>
    ),
  },
  {
    id: 'uso',
    titulo: 'Uso aceptable',
    contenido: (
      <p>
        No está permitido intentar acceder a cuentas ajenas, alterar el funcionamiento del sistema, enviar solicitudes automatizadas de forma masiva
        ni publicar contenido ofensivo o ilegal. El sistema limita la cantidad de solicitudes y registra las acciones relevantes en una bitácora.
      </p>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Responsabilidad',
    contenido: (
      <p>
        SIGER es una plataforma para gestionar eventos; la realización de cada evento es responsabilidad de su organizador. SIGER es un proyecto
        académico de la Universidad de El Salvador y se ofrece tal como está, sin garantía de disponibilidad continua.
      </p>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios a estos términos',
    contenido: <p>Podemos actualizar estos términos. La fecha de la última actualización aparece al inicio de esta página.</p>,
  },
];

export default function Terminos() {
  return (
    <DocumentoLegal
      titulo="Términos y Condiciones"
      actualizado="16 de noviembre de 2026"
      introduccion="Estas condiciones regulan el uso del Sistema Inteligente de Gestión de Eventos y Reservaciones (SIGER) por participantes, organizadores y administradores."
      secciones={SECCIONES}
      otro={{ ruta: '/legal/privacidad', etiqueta: 'Política de Privacidad' }}
    />
  );
}
