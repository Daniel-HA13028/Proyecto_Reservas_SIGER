import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Portada } from '../../components/EventoTarjeta';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { eventosService } from '../../services/eventos.service';
import { fechaHora } from '../../utils/formato';

const ESTADOS = ['Borrador', 'Publicado', 'Cancelado', 'Finalizado'];
const TONO = {
  Borrador: 'bg-surface-variant text-on-surface-variant',
  Publicado: 'bg-exito-container text-on-exito-container',
  Cancelado: 'bg-error-container text-on-error-container',
  Finalizado: 'bg-secondary-fixed text-on-secondary-fixed',
};

// Mis eventos (organizador) y Gestión de eventos (administrador ve todos); prototipo siger_gesti_n_de_eventos_admin.
export default function GestionEventos() {
  const { usuario } = useAuth();
  const admin = usuario.rol === 'Administrador';
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    eventosService
      .mios({ estado, pagina, limite: 10 })
      .then((r) => {
        if (!vigente) return;
        setResultado(r);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [estado, pagina, recarga]);

  const listo = (mensaje) => {
    setAccion(null);
    setAviso(mensaje);
    setRecarga((n) => n + 1);
  };

  const publicar = async (e) => {
    try {
      await eventosService.publicar(e.idEvento);
      listo(`«${e.nombreEvento}» está publicado.`);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-headline-md text-on-surface">{admin ? 'Gestión de eventos' : 'Mis eventos'}</h1>
          <p className="text-body-sm text-on-surface-variant">{admin ? 'Todos los eventos de la plataforma.' : 'Crea, publica y administra tus eventos.'}</p>
        </div>
        <Link to="/organizador/eventos/nuevo" className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary-container">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_circle</span>
          Crear evento
        </Link>
      </header>

      <Select
        className="max-w-xs"
        aria-label="Filtrar por estado"
        value={estado}
        onChange={(e) => {
          setEstado(e.target.value);
          setPagina(1);
        }}
        opciones={[{ valor: '', texto: 'Todos los estados' }, ...ESTADOS.map((s) => ({ valor: s, texto: s }))]}
      />
      <Alert tono="exito">{aviso}</Alert>
      <Alert tono="error">{error?.mensaje}</Alert>

      <div className="space-y-3">
        {resultado?.contenido.map((e) => (
          <div key={e.idEvento} className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card sm:flex-row sm:items-center">
            <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg sm:w-32">
              <Portada evento={e} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase ${TONO[e.estadoEvento]}`}>{e.estadoEvento}</span>
                {e.reprogramado && <span className="text-[11px] font-bold uppercase text-advertencia">Reprogramado</span>}
              </div>
              <Link to={`/eventos/${e.idEvento}`} className="mt-1 block truncate text-title-sm text-on-surface hover:text-primary">{e.nombreEvento}</Link>
              <p className="text-body-sm text-on-surface-variant">
                {fechaHora(e.fechaHoraInicio)} · {e.cupoMaximo - e.cupoDisponible}/{e.cupoMaximo} reservados
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {e.estadoEvento === 'Borrador' && (
                <Button variante="secundario" className="px-4 py-2" icono="publish" onClick={() => publicar(e)}>Publicar</Button>
              )}
              {['Borrador', 'Publicado'].includes(e.estadoEvento) && (
                <Link to={`/organizador/eventos/${e.idEvento}/editar`} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2 font-semibold text-primary hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>Editar
                </Link>
              )}
              {['Publicado', 'Finalizado'].includes(e.estadoEvento) && (
                <Link to={`/organizador/eventos/${e.idEvento}/asistencia`} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-4 py-2 font-semibold text-primary hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">how_to_reg</span>Asistencia
                </Link>
              )}
              {['Borrador', 'Publicado'].includes(e.estadoEvento) && (
                <Button variante="texto" className="px-3 py-2 text-error" icono="cancel" onClick={() => setAccion({ tipo: 'cancelar', evento: e })}>Cancelar</Button>
              )}
              {e.estadoEvento === 'Borrador' && (
                <Button variante="texto" className="px-3 py-2 text-error" icono="delete" onClick={() => setAccion({ tipo: 'eliminar', evento: e })} aria-label={`Eliminar ${e.nombreEvento}`} />
              )}
            </div>
          </div>
        ))}
        {resultado && resultado.contenido.length === 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant shadow-card">
            <span className="material-symbols-outlined mb-2 block text-5xl text-outline" aria-hidden="true">event_note</span>
            Aún no hay eventos {estado && `en estado ${estado}`}.
          </div>
        )}
      </div>
      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} totalElementos={resultado.totalElementos} onCambiar={setPagina} />}

      {accion?.tipo === 'cancelar' && <CancelarEvento evento={accion.evento} onCerrar={() => setAccion(null)} onListo={listo} />}
      {accion?.tipo === 'eliminar' && <EliminarEvento evento={accion.evento} onCerrar={() => setAccion(null)} onListo={listo} />}
    </div>
  );
}

function CancelarEvento({ evento, onCerrar, onListo }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const confirmar = async () => {
    setEnviando(true);
    try {
      await eventosService.cancelar(evento.idEvento, motivo.trim());
      onListo(`«${evento.nombreEvento}» fue cancelado y avisamos a quienes reservaron.`);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Modal
      abierto
      titulo="Cancelar evento"
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={onCerrar}>Volver</Button>
          <Button variante="peligro" cargando={enviando} disabled={!motivo.trim()} onClick={confirmar}>Cancelar evento</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert tono="error">{error?.mensaje}</Alert>
        <p>Se cancelarán todas las reservaciones de «{evento.nombreEvento}» y enviaremos el motivo por correo a los participantes. No se puede deshacer.</p>
        <Input etiqueta="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} autoFocus />
      </div>
    </Modal>
  );
}

function EliminarEvento({ evento, onCerrar, onListo }) {
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    try {
      await eventosService.eliminar(evento.idEvento);
      onListo(`Borrador «${evento.nombreEvento}» eliminado.`);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Modal
      abierto
      titulo="Eliminar borrador"
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variante="contorno" onClick={onCerrar}>Volver</Button>
          <Button variante="peligro" cargando={enviando} onClick={confirmar}>Eliminar</Button>
        </>
      }
    >
      <Alert tono="error">{error?.mensaje}</Alert>
      <p>Se eliminará el borrador «{evento.nombreEvento}». Solo es posible porque no tiene reservaciones.</p>
    </Modal>
  );
}
