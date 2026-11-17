import { Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import AccesoDenegado from '../pages/publico/AccesoDenegado';

// Limita una sección a ciertos roles. La API también lo impide (403), esto solo evita mostrar la pantalla.
export default function RoleRoute({ roles }) {
  const { usuario } = useAuth();
  return roles.includes(usuario?.rol) ? <Outlet /> : <AccesoDenegado />;
}
