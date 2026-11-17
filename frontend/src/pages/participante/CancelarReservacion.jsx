import { useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { reservacionesService } from '../../services/reservaciones.service';
import { fechaHora } from '../../utils/formato';

// Confirmación de la cancelación (RF-16, CU-06, RN-07). Se usa en «Tu reservación» y en «Mis reservaciones».
export default function CancelarReservacion({ reservacion, onCerrar, onCancelada }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cerrar = () => {
    setError(null);
    onCerrar();
  };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      onCancelada(await reservacionesService.cancelar(reservacion.idReservacion));
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto={Boolean(reservacion)}
      titulo="¿Cancelar la reservación?"
      onCerrar={cerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={cerrar} disabled={enviando}>Conservarla</Button>
          <Button variante="peligro" icono="event_busy" onClick={confirmar} cargando={enviando}>Sí, cancelar</Button>
        </>
      }
    >
      {reservacion && (
        <div className="space-y-3">
          <p>
            Cancelarás tu lugar en <strong>{reservacion.evento.nombreEvento}</strong> ({fechaHora(reservacion.evento.fechaHoraInicio)}).
            {reservacion.acompanantes > 0 && ` También se liberan los ${reservacion.acompanantes} cupo(s) de tus acompañantes.`}
          </p>
          <p>El código QR dejará de ser válido. Podrás volver a reservar si aún quedan cupos.</p>
          <Alert tono="error">{error?.mensaje}</Alert>
        </div>
      )}
    </Modal>
  );
}
