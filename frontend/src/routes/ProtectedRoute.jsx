import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Cargando from '../components/Cargando';

// Exige sesión. Sin sesión lleva al login y, al entrar, vuelve a la página que se pidió.
export default function ProtectedRoute() {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) {
    return <Navigate to={`/login?volver=${encodeURIComponent(ubicacion.pathname + ubicacion.search)}`} replace />;
  }
  return <Outlet />;
}
