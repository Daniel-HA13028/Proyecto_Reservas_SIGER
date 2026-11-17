package com.project.siger.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import com.project.siger.model.SolicitudSoporte;

/** Solicitudes de soporte técnico  */
public interface SolicitudSoporteRepository extends JpaRepository<SolicitudSoporte, Long>, JpaSpecificationExecutor<SolicitudSoporte> {
}
