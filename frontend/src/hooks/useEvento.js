import { useEffect, useState } from 'react';
import { eventosService } from '../services/eventos.service';

/** Carga el detalle de un evento por su id; «error» trae el error de la API si no se pudo. */
export default function useEvento(id) {
  const [estado, setEstado] = useState({ id: null, evento: null, error: null });
  useEffect(() => {
    let vigente = true;
    eventosService
      .detalle(id)
      .then((evento) => vigente && setEstado({ id, evento, error: null }))
      .catch((error) => vigente && setEstado({ id, evento: null, error }));
    return () => {
      vigente = false;
    };
  }, [id]);
  return estado.id === id ? estado : { evento: null, error: null };
}
