import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import Categorias from './pages/admin/Categorias';
import Usuarios from './pages/admin/Usuarios';
import UsuarioNuevo from './pages/admin/UsuarioNuevo';
import Login from './pages/auth/Login';
import { NuevaContrasena, RecuperacionExito, RecuperarContrasena, VerificarCodigo } from './pages/auth/Recuperacion';
import Registro from './pages/auth/Registro';
import VerificarCorreo from './pages/auth/VerificarCorreo';
import MiPanel from './pages/participante/MiPanel';
import Comprobante from './pages/participante/Comprobante';
import MisReservaciones from './pages/participante/MisReservaciones';
import Reservar from './pages/participante/Reservar';
import EnVivo from './pages/organizador/EnVivo';
import Participantes from './pages/organizador/Participantes';
import DashboardOrganizador from './pages/organizador/DashboardOrganizador';
import EventoFormulario from './pages/organizador/EventoFormulario';
import GestionEventos from './pages/organizador/GestionEventos';
import Notificaciones from './pages/Notificaciones';
import Perfil from './pages/Perfil';
import Catalogo from './pages/publico/Catalogo';
import DetalleEvento from './pages/publico/DetalleEvento';
import Faq from './pages/publico/Faq';
import Soporte from './pages/publico/Soporte';
import SoporteAdmin from './pages/admin/SoporteAdmin';
import ErrorInesperado from './pages/publico/ErrorInesperado';
import NoEncontrada from './pages/publico/NoEncontrada';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import Cargando from './components/Cargando';
import { rutaInicio } from './services/sesion';
import { ROLES } from './utils/menus';

// Páginas con librerías pesadas (Recharts, html5-qrcode): se descargan solo al visitarlas.
const diferida = (cargar) => () => cargar().then((m) => ({ Component: m.default }));

/** «/»: con sesión, al inicio del rol; sin sesión, al catálogo de eventos. */
function Entrada() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  return <Navigate to={usuario ? rutaInicio(usuario.rol) : '/eventos'} replace />;
}

const router = createBrowserRouter([
  {
    // Cualquier error al mostrar una pantalla (o al descargar una página diferida) muestra ErrorInesperado.
    errorElement: <ErrorInesperado />,
    children: [
      { index: true, element: <Entrada /> },
      // Acceso (pantalla completa, sin barra):
      { path: 'login', element: <Login /> },
      { path: 'registro', element: <Registro /> },
      { path: 'recuperar', element: <RecuperarContrasena /> },
      { path: 'recuperar/verificar', element: <VerificarCodigo /> },
      { path: 'recuperar/nueva', element: <NuevaContrasena /> },
      { path: 'recuperar/exito', element: <RecuperacionExito /> },
      { path: 'verificar-correo', element: <VerificarCorreo /> },
      {
        element: <PublicLayout />,
        children: [
          { path: 'eventos', element: <Catalogo /> },
          { path: 'eventos/:id', element: <DetalleEvento /> },
          { path: 'ayuda/faq', element: <Faq /> },
          { path: 'ayuda/soporte', element: <Soporte /> },
          { path: '*', element: <NoEncontrada /> },
        ],
      },
      // Con sesión: ProtectedRoute exige iniciar sesión y RoleRoute limita cada sección a su rol
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: 'perfil', element: <Perfil /> },
              { path: 'notificaciones', element: <Notificaciones /> },
              {
                element: <RoleRoute roles={[ROLES.PARTICIPANTE]} />,
                children: [
                  { path: 'inicio', element: <MiPanel /> },
                  { path: 'eventos/:id/reservar', element: <Reservar /> },
                  { path: 'reservaciones/:id', element: <Comprobante /> },
                  { path: 'mis-reservaciones', element: <MisReservaciones /> },
                ],
              },
              {
                element: <RoleRoute roles={[ROLES.ORGANIZADOR]} />,
                children: [
                  { path: 'organizador', element: <DashboardOrganizador /> },
                  { path: 'organizador/eventos', element: <GestionEventos /> },
                ],
              },
              {
                element: <RoleRoute roles={[ROLES.ORGANIZADOR, ROLES.ADMINISTRADOR]} />,
                children: [
                  { path: 'organizador/eventos/nuevo', element: <EventoFormulario /> },
                  { path: 'organizador/eventos/:id/editar', element: <EventoFormulario /> },
                  // Control de asistencia: el organizador dueño o un administrador
                  { path: 'organizador/eventos/:id/asistencia', element: <Participantes modo="control" /> },
                  { path: 'organizador/eventos/:id/escanear', lazy: diferida(() => import('./pages/organizador/Escanear')) },
                  { path: 'organizador/eventos/:id/participantes', element: <Participantes modo="lista" /> },
                  { path: 'organizador/eventos/:id/en-vivo', element: <EnVivo /> },
                ],
              },
              {
                element: <RoleRoute roles={[ROLES.ORGANIZADOR, ROLES.ADMINISTRADOR]} />,
                children: [{ path: 'reportes', lazy: diferida(() => import('./pages/Reportes')) }],
              },
              {
                element: <RoleRoute roles={[ROLES.ADMINISTRADOR]} />,
                children: [
                  { path: 'admin', lazy: diferida(() => import('./pages/admin/DashboardAdmin')) },
                  { path: 'admin/usuarios', element: <Usuarios /> },
                  { path: 'admin/eventos', element: <GestionEventos /> },
                  { path: 'admin/categorias', element: <Categorias /> },
                  { path: 'admin/soporte', element: <SoporteAdmin /> },
                  { path: 'admin/usuarios/nuevo', element: <UsuarioNuevo /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
