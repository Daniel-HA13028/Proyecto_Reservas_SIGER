import { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Cargando from '../../components/Cargando';
import { TIPOS_SOPORTE, soporteService } from '../../services/soporte.service';
import { fechaHora } from '../../utils/formato';

const ESTADOS = {
  Abierta: ['Abierta', 'bg-error-container text-on-error-container'],
  En_Proceso: ['En proceso', 'bg-advertencia-container text-on-advertencia-container'],
  Cerrada: ['Cerrada', 'bg-exito-container text-on-exito-container'],
};
const TIPO = Object.fromEntries(TIPOS_SOPORTE.map((t) => [t.valor, t.texto]));
const MAX_RESPUESTA = 5000;

/** Espacio para escribir la respuesta; se envía al correo de contacto firmada por el «Equipo Soporte SIGER». */
function FormularioRespuesta({ solicitud, onEnviada, onCancelar }) {
  const [mensaje, setMensaje] = useState('');
  const [cerrar, setCerrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const id = `respuesta-${solicitud.idSolicitud}`;

  const enviar = async (e) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      setError('Escribe la respuesta antes de enviarla.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await soporteService.responder(solicitud.idSolicitud, mensaje.trim(), cerrar);
      onEnviada(cerrar);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="mt-4 space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div className="space-y-2">
        <label htmlFor={id} className="ml-1 block text-label-md uppercase text-on-surface-variant">
          Respuesta para <span className="normal-case">{solicitud.correoContacto}</span>
        </label>
        <textarea
          id={id}
          rows={6}
          maxLength={MAX_RESPUESTA}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          placeholder="Hola, revisamos tu solicitud y…"
          autoFocus
          className={`w-full rounded-lg border bg-surface px-4 py-3 text-body-base outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 ${error ? 'border-error' : 'border-outline-variant'}`}
        />
        <p id={`${id}-ayuda`} className="ml-1 flex justify-between gap-3 text-[12px] text-on-surface-variant">
          <span>Se envía por correo con la firma «Equipo Soporte SIGER». Si la persona contesta, la respuesta llega al buzón de soporte.</span>
          <span className="shrink-0">{mensaje.length}/{MAX_RESPUESTA}</span>
        </p>
        {error && <p className="ml-1 text-body-sm text-error">{error}</p>}
      </div>
      <label className="flex cursor-pointer items-center gap-2 px-1 text-body-sm text-on-surface-variant">
        <input type="checkbox" className="h-4 w-4 rounded border-outline text-primary" checked={cerrar} onChange={(e) => setCerrar(e.target.checked)} />
        Cerrar la solicitud al enviar (si no, queda «En proceso»)
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variante="texto" className="px-4 py-2" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" className="px-4 py-2" icono="send" cargando={enviando}>
          Enviar respuesta
        </Button>
      </div>
    </form>
  );
}

// Solicitudes de soporte (RF-25; T-10-07): el administrador filtra por estado y tipo y las atiende
// (Abierta → En proceso → Cerrada). Una solicitud cerrada ya no cambia.
export default function SoporteAdmin() {
  const [estado, setEstado] = useState('Abierta');
  const [tipo, setTipo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupada, setOcupada] = useState(null);
  const [respondiendo, setRespondiendo] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    soporteService
      .listar({ estado, tipo, pagina, limite: 10 })
      .then((r) => {
        if (!vigente) return;
        setDatos(r);
        setError(null);
      })
      .catch((err) => vigente && setError(err));
    return () => {
      vigente = false;
    };
  }, [estado, tipo, pagina, recarga]);

  const cambiar = async (s, nuevo) => {
    setOcupada(s.idSolicitud);
    setAviso(null);
    try {
      await soporteService.cambiarEstado(s.idSolicitud, nuevo);
      setAviso(`Solicitud #${s.idSolicitud} ${nuevo === 'Cerrada' ? 'cerrada' : 'en proceso'}.`);
      setRecarga((n) => n + 1);
    } catch (err) {
      setError(err);
    } finally {
      setOcupada(null);
    }
  };

  const filtrar = (fn) => (e) => {
    fn(e.target.value);
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-headline-md text-on-surface">Solicitudes de soporte</h1>
        <p className="text-body-sm text-on-surface-variant">Problemas reportados desde «Soporte técnico». Responde por correo desde aquí y actualiza el estado.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <Select
          etiqueta="Estado"
          value={estado}
          onChange={filtrar(setEstado)}
          opciones={[{ valor: '', texto: 'Todos' }, ...Object.entries(ESTADOS).map(([valor, [texto]]) => ({ valor, texto }))]}
        />
        <Select etiqueta="Tipo" value={tipo} onChange={filtrar(setTipo)} opciones={[{ valor: '', texto: 'Todos' }, ...TIPOS_SOPORTE]} />
      </div>

      <Alert tono="exito">{aviso}</Alert>
      <Alert tono="error">{error?.mensaje}</Alert>

      {!datos ? (
        !error && <Cargando />
      ) : datos.contenido.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">No hay solicitudes con esos filtros.</p>
      ) : (
        <section className="space-y-4" aria-label="Solicitudes">
          {datos.contenido.map((s) => {
            const [texto, color] = ESTADOS[s.estado];
            return (
              <article key={s.idSolicitud} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-label-md uppercase text-on-surface-variant">#{s.idSolicitud} · {TIPO[s.tipo] ?? s.tipo}</p>
                    <a href={`mailto:${s.correoContacto}?subject=${encodeURIComponent(`SIGER · Solicitud #${s.idSolicitud}`)}`} className="break-all font-semibold text-secondary hover:underline">
                      {s.correoContacto}
                    </a>
                    <p className="text-[12px] text-on-surface-variant">
                      {fechaHora(s.fechaCreacion)}
                      {s.idUsuario ? ' · usuario registrado' : ' · sin cuenta'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${color}`}>{texto}</span>
                </div>
                <p className="mt-3 whitespace-pre-line break-words text-body-base text-on-surface">{s.descripcion}</p>
                {s.estado !== 'Cerrada' && respondiendo === s.idSolicitud && (
                  <FormularioRespuesta
                    solicitud={s}
                    onCancelar={() => setRespondiendo(null)}
                    onEnviada={(cerrada) => {
                      setRespondiendo(null);
                      setAviso(`Respuesta enviada a ${s.correoContacto}. Solicitud #${s.idSolicitud} ${cerrada ? 'cerrada' : 'en proceso'}.`);
                      setRecarga((n) => n + 1);
                    }}
                  />
                )}
                {s.estado !== 'Cerrada' && respondiendo !== s.idSolicitud && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variante="primario" className="px-4 py-2" icono="reply" disabled={ocupada === s.idSolicitud} onClick={() => { setRespondiendo(s.idSolicitud); setAviso(null); }}>
                      Responder
                    </Button>
                    {s.estado === 'Abierta' && (
                      <Button variante="contorno" className="px-4 py-2" icono="pending" disabled={ocupada === s.idSolicitud} onClick={() => cambiar(s, 'En_Proceso')}>
                        En proceso
                      </Button>
                    )}
                    <Button variante="secundario" className="px-4 py-2" icono="task_alt" cargando={ocupada === s.idSolicitud} onClick={() => cambiar(s, 'Cerrada')}>
                      Cerrar
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
          <Pagination pagina={pagina} totalPaginas={datos.totalPaginas} totalElementos={datos.totalElementos} onCambiar={setPagina} />
        </section>
      )}
    </div>
  );
}
