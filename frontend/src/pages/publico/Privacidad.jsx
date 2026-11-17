import DocumentoLegal from '../../components/DocumentoLegal';

// Política de Privacidad: describe los datos que el sistema guarda de verdad (tablas usuario, reservacion, asistencia,
// notificacion, bitacora) y cómo se guarda la sesión en el navegador (services/sesion.js).
const SECCIONES = [
  {
    id: 'datos',
    titulo: 'Datos que recopilamos',
    contenido: (
      <ul>
        <li>
          <strong>Al registrarte:</strong> nombres, apellidos, correo electrónico, fecha de nacimiento, rol y contraseña. La contraseña se guarda
          cifrada con un algoritmo de un solo sentido; nadie puede leerla.
        </li>
        <li>
          <strong>Al usar el sistema:</strong> tus reservaciones, acompañantes, comprobantes QR, asistencias registradas, notificaciones y
          solicitudes de soporte.
        </li>
        <li>
          <strong>Por seguridad:</strong> una bitácora con las acciones relevantes (inicio de sesión, cambios de datos) y la dirección IP desde la que
          se hicieron.
        </li>
      </ul>
    ),
  },
  {
    id: 'uso',
    titulo: 'Para qué usamos tus datos',
    contenido: (
      <ul>
        <li>Crear y proteger tu cuenta, y verificar tu correo.</li>
        <li>Gestionar tus reservaciones y registrar tu asistencia a los eventos.</li>
        <li>Enviarte correos de confirmación, recordatorios 24 horas antes y avisos de cambios o cancelaciones.</li>
        <li>Generar estadísticas y reportes de asistencia para los organizadores y administradores.</li>
      </ul>
    ),
  },
  {
    id: 'acceso',
    titulo: 'Quién puede ver tus datos',
    contenido: (
      <ul>
        <li>El organizador de un evento ve el nombre y el correo de quienes reservaron en ese evento, y su asistencia.</li>
        <li>Los administradores pueden consultar las cuentas para aprobarlas, desactivarlas y atender solicitudes de soporte.</li>
        <li>No vendemos ni compartimos tus datos con terceros.</li>
      </ul>
    ),
  },
  {
    id: 'navegador',
    titulo: 'Sesión y almacenamiento en el navegador',
    contenido: (
      <p>
        SIGER no usa cookies de publicidad ni de rastreo. Para mantener tu sesión guarda un token en el almacenamiento del navegador: dura 1 día, o
        30 días si marcas «Recordarme». Si no lo marcas, se borra al cerrar la pestaña. Al cerrar sesión se elimina.
      </p>
    ),
  },
  {
    id: 'seguridad',
    titulo: 'Seguridad',
    contenido: (
      <p>
        Las comunicaciones con el servidor usan tokens firmados que vencen a los 30 minutos y se renuevan automáticamente. El acceso a cada sección
        depende de tu rol, y el sistema limita los intentos de inicio de sesión para impedir ataques de fuerza bruta.
      </p>
    ),
  },
  {
    id: 'derechos',
    titulo: 'Tus derechos',
    contenido: (
      <p>
        Puedes consultar y corregir tus datos en «Mi perfil». Para pedir que se desactive tu cuenta o resolver dudas sobre tus datos, envía una
        solicitud desde la página de soporte.
      </p>
    ),
  },
  {
    id: 'conservacion',
    titulo: 'Conservación',
    contenido: (
      <p>
        Guardamos tus datos mientras tu cuenta exista. Las reservaciones y asistencias se conservan para los reportes históricos de los eventos;
        una cuenta desactivada no puede iniciar sesión.
      </p>
    ),
  },
];

export default function Privacidad() {
  return (
    <DocumentoLegal
      titulo="Política de Privacidad"
      actualizado="16 de noviembre de 2026"
      introduccion="Esta política explica qué datos personales guarda SIGER, para qué los usa y quién puede verlos."
      secciones={SECCIONES}
      otro={{ ruta: '/legal/terminos', etiqueta: 'Términos y Condiciones' }}
    />
  );
}
