package com.project.siger.service.tareas;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.project.siger.service.EventoService;
import com.project.siger.service.RecordatorioService;
import com.project.siger.service.ReintentoCorreos;

/** Tareas automáticas (@Scheduled; AsyncConfig activa la programación). Cada horario se puede cambiar con siger.tareas.*. */
@Component
public class TareasProgramadas {

    private static final Logger log = LoggerFactory.getLogger(TareasProgramadas.class);

    private final EventoService eventos;
    private final RecordatorioService recordatorios;
    private final ReintentoCorreos reintentos;

    public TareasProgramadas(EventoService eventos, RecordatorioService recordatorios, ReintentoCorreos reintentos) {
        this.eventos = eventos;
        this.recordatorios = recordatorios;
        this.reintentos = reintentos;
    }

    /** cada 15 minutos, los eventos publicados cuyo fin ya llegó pasan a Finalizado. */
    @Scheduled(cron = "${siger.tareas.finalizar-eventos:0 */15 * * * *}")
    public void finalizarEventosVencidos() {
        int n = eventos.finalizarVencidos();
        if (n > 0) {
            log.info("Eventos finalizados automáticamente (RN-14): {}", n);
        }
    }

    /** cada hora, recordatorio a quienes tienen un evento en las próximas 24 horas. */
    @Scheduled(cron = "${siger.tareas.recordatorios:0 0 * * * *}")
    public void enviarRecordatorios() {
        int n = recordatorios.enviarRecordatorios();
        if (n > 0) {
            log.info("Recordatorios de eventos generados: {}", n);
        }
    }

    /** cada 10 minutos, reintento de los correos que fallaron. */
    @Scheduled(cron = "${siger.tareas.reintentar-correos:0 5/10 * * * *}")
    public void reintentarCorreos() {
        int n = reintentos.reintentar();
        if (n > 0) {
            log.info("Correos fallidos reintentados: {}", n);
        }
    }
}
