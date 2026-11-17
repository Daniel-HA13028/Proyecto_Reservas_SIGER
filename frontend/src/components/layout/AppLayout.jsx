import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import BarraInferior from './BarraInferior';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { NOTIFICACIONES_CAMBIARON, notificacionesService } from '../../services/notificaciones.service';

const CADA_MS = 60_000;

// Plantilla de las pantallas con sesión: barra superior, menú lateral (escritorio) o inferior (móvil) y contenido.
// Siempre va dentro de ProtectedRoute, así que hay usuario; el menú es el de su rol.
export default function AppLayout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [noLeidas, setNoLeidas] = useState(0);

  // Contador de la campana: al cambiar de pantalla, cada minuto con la pestaña visible y cuando se marcan leídas.
  useEffect(() => {
    let vigente = true;
    const consultar = () => {
      if (document.hidden) return;
      notificacionesService
        .listar({ limite: 1 })
        .then((r) => vigente && setNoLeidas(r.noLeidas))
        .catch(() => {});
    };
    consultar();
    const temporizador = setInterval(consultar, CADA_MS);
    window.addEventListener(NOTIFICACIONES_CAMBIARON, consultar);
    document.addEventListener('visibilitychange', consultar);
    return () => {
      vigente = false;
      clearInterval(temporizador);
      window.removeEventListener(NOTIFICACIONES_CAMBIARON, consultar);
      document.removeEventListener('visibilitychange', consultar);
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        nombre={`${usuario.nombres} ${usuario.apellidos}`}
        rol={usuario.rol}
        noLeidas={noLeidas}
        onCerrarSesion={async () => {
          await cerrarSesion();
          navigate('/login', { replace: true });
        }}
      />
      <div className="flex">
        <Sidebar rol={usuario.rol} />
        <main className="mx-auto w-full min-w-0 max-w-container-max-width flex-1 px-margin-mobile pb-24 pt-6 md:px-margin-desktop lg:pb-10">
          <Outlet />
        </main>
      </div>
      <BarraInferior rol={usuario.rol} />
    </div>
  );
}
