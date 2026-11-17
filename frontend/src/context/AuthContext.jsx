// Sesión del usuario . Al abrir la aplicación recupera la sesión guardada con el refresh token.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { renovarSesion } from '../services/api';
import { authService } from '../services/auth.service';
import { actualizarUsuario as guardarUsuario, borrarSesion, guardarSesion, sesionGuardada } from '../services/sesion';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Mientras se intenta recuperar la sesión no se decide si mandar al usuario al login.
  const [cargando, setCargando] = useState(() => Boolean(sesionGuardada()?.refreshToken));

  useEffect(() => {
    let activo = true;
    if (sesionGuardada()?.refreshToken) {
      renovarSesion().then((sesion) => {
        if (!activo) return;
        setUsuario(sesion?.usuario ?? null);
        setCargando(false);
      });
    }
    const alCerrar = () => setUsuario(null);
    window.addEventListener('siger:sesion-cerrada', alCerrar);
    return () => {
      activo = false;
      window.removeEventListener('siger:sesion-cerrada', alCerrar);
    };
  }, []);

  const iniciarSesion = useCallback(async (correo, contrasena, recordarme) => {
    const respuesta = await authService.login(correo, contrasena, recordarme);
    guardarSesion(respuesta, recordarme);
    setUsuario(respuesta.usuario);
    return respuesta.usuario;
  }, []);

  const cerrarSesion = useCallback(async () => {
    const refreshToken = sesionGuardada()?.refreshToken;
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // Aunque falle la red, la sesión se cierra en este navegador.
    }
    borrarSesion();
    setUsuario(null);
  }, []);

  const actualizarUsuario = useCallback((datos) => {
    guardarUsuario(datos);
    setUsuario(datos);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion, actualizarUsuario }),
    [usuario, cargando, iniciarSesion, cerrarSesion, actualizarUsuario],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react/only-export-components -- el hook acompaña a su proveedor
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
