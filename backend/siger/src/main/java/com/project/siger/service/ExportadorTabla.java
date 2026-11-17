package com.project.siger.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;
import com.project.siger.dto.FormatoExportacion;

/**
 * Exporta tablas a PDF (OpenPDF) o Excel (Apache POI) con título, fecha de generación, solicitante y filtros
 * Lo usan la lista de usuarios, la de participantes y los reportes. Un documento puede
 * tener varias secciones: en el PDF van una tras otra y en el Excel cada una en su hoja.
 */
@Component
public class ExportadorTabla {

    static final ZoneId ZONA = ZoneId.of("America/El_Salvador");
    static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter ARCHIVO = DateTimeFormatter.ofPattern("yyyyMMdd_HHmm");

    public record Archivo(String nombre, String tipoContenido, byte[] contenido) {
    }

    /**
     * Documento de una sola tabla.
     *
     * @param titulo  primera línea del documento
     * @param hoja    nombre de la hoja de Excel (y de la sección)
     * @param base    nombre del archivo sin fecha ni extensión
     * @param lineas  líneas informativas bajo el título, además de la de generación y la de filtros
     * @param anchos  ancho relativo de cada columna
     * @param unidad  lo que se cuenta en la línea de filtros («usuarios», «participantes»)
     */
    public record Tabla(String titulo, String hoja, String base, List<String> lineas, String[] columnas, float[] anchos,
            List<String[]> filas, String unidad) {
    }

    /** Una tabla dentro de un documento con varias. */
    public record Seccion(String titulo, String[] columnas, float[] anchos, List<String[]> filas) {
    }

    public Archivo exportar(FormatoExportacion formato, Tabla tabla, Map<String, Object> filtros, String solicitante) {
        String sufijo = " · " + tabla.filas().size() + " " + tabla.unidad();
        return exportar(formato, tabla.titulo(), tabla.base(), tabla.lineas(),
                List.of(new Seccion(tabla.hoja(), tabla.columnas(), tabla.anchos(), tabla.filas())), filtros, solicitante, sufijo, false);
    }

    /** Documento con varias secciones */
    public Archivo exportar(FormatoExportacion formato, String titulo, String base, List<String> lineas, List<Seccion> secciones,
            Map<String, Object> filtros, String solicitante) {
        return exportar(formato, titulo, base, lineas, secciones, filtros, solicitante, "", true);
    }

    private Archivo exportar(FormatoExportacion formato, String titulo, String base, List<String> lineas, List<Seccion> secciones,
            Map<String, Object> filtros, String solicitante, String sufijoFiltros, boolean titulosDeSeccion) {
        ZonedDateTime ahora = ZonedDateTime.now(ZONA);
        List<String> todas = new ArrayList<>(lineas);
        todas.add("Generado el " + ahora.format(FECHA_HORA) + " por " + solicitante);
        todas.add((filtros.isEmpty() ? "Sin filtros"
                : "Filtros: " + filtros.entrySet().stream().map(e -> e.getKey() + " = " + e.getValue())
                        .collect(Collectors.joining(", "))) + sufijoFiltros);
        String nombre = base + "_" + ahora.format(ARCHIVO);
        return formato == FormatoExportacion.xlsx
                ? new Archivo(nombre + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        excel(titulo, todas, secciones))
                : new Archivo(nombre + ".pdf", "application/pdf", pdf(titulo, todas, secciones, titulosDeSeccion));
    }

    private static byte[] pdf(String titulo, List<String> lineas, List<Seccion> secciones, boolean titulosDeSeccion) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.LETTER.rotate(), 30, 30, 30, 30);
        PdfWriter.getInstance(documento, salida);
        documento.open();
        documento.add(new Paragraph(titulo, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
        for (String linea : lineas) {
            documento.add(new Paragraph(linea, FontFactory.getFont(FontFactory.HELVETICA, 9)));
        }
        var fuenteTitulo = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, java.awt.Color.WHITE);
        var fuente = FontFactory.getFont(FontFactory.HELVETICA, 8);
        for (Seccion s : secciones) {
            documento.add(new Paragraph(" "));
            if (titulosDeSeccion) {
                Paragraph encabezado = new Paragraph(s.titulo(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11));
                encabezado.setSpacingAfter(4);
                documento.add(encabezado);
            }
            PdfPTable t = new PdfPTable(s.anchos());
            t.setWidthPercentage(100);
            t.setHeaderRows(1);
            for (String c : s.columnas()) {
                PdfPCell celda = new PdfPCell(new Phrase(c, fuenteTitulo));
                celda.setBackgroundColor(new java.awt.Color(0x00, 0x23, 0x6f));
                celda.setPadding(4);
                t.addCell(celda);
            }
            for (String[] fila : s.filas()) {
                for (String v : fila) {
                    PdfPCell celda = new PdfPCell(new Phrase(v, fuente));
                    celda.setPadding(3);
                    celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    t.addCell(celda);
                }
            }
            if (s.filas().isEmpty()) {
                PdfPCell vacia = new PdfPCell(new Phrase("Sin datos en el periodo", fuente));
                vacia.setColspan(s.columnas().length);
                vacia.setPadding(3);
                t.addCell(vacia);
            }
            documento.add(t);
        }
        documento.close();
        return salida.toByteArray();
    }

    private static byte[] excel(String titulo, List<String> lineas, List<Seccion> secciones) {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Font negrita = libro.createFont();
            negrita.setBold(true);
            Font blanca = libro.createFont();
            blanca.setBold(true);
            blanca.setColor(IndexedColors.WHITE.getIndex());
            CellStyle estiloTitulo = libro.createCellStyle();
            estiloTitulo.setFont(negrita);
            CellStyle cabecera = libro.createCellStyle();
            cabecera.setFont(blanca);
            cabecera.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            cabecera.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            for (Seccion s : secciones) {
                Sheet hoja = libro.createSheet(WorkbookUtil.createSafeSheetName(s.titulo()));
                hoja.createRow(0).createCell(0).setCellValue(titulo);
                hoja.getRow(0).getCell(0).setCellStyle(estiloTitulo);
                int r = 1;
                for (String linea : lineas) {
                    hoja.createRow(r++).createCell(0).setCellValue(linea);
                }
                int filaEncabezados = r + 1;
                Row encabezados = hoja.createRow(filaEncabezados);
                String[] columnas = s.columnas();
                for (int i = 0; i < columnas.length; i++) {
                    encabezados.createCell(i).setCellValue(columnas[i]);
                    encabezados.getCell(i).setCellStyle(cabecera);
                }
                r = filaEncabezados + 1;
                for (String[] v : s.filas()) {
                    Row fila = hoja.createRow(r++);
                    for (int i = 0; i < v.length; i++) {
                        fila.createCell(i).setCellValue(v[i]);
                    }
                }
                hoja.createFreezePane(0, filaEncabezados + 1);
                hoja.setAutoFilter(new CellRangeAddress(filaEncabezados, Math.max(filaEncabezados, r - 1), 0, columnas.length - 1));
                float total = 0;
                for (float a : s.anchos()) {
                    total += a;
                }
                for (int i = 0; i < columnas.length; i++) {
                    hoja.setColumnWidth(i, Math.round(Math.max(12, s.anchos()[i] / total * 150)) * 256);
                }
            }
            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
