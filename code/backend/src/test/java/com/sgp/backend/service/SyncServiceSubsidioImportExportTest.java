package com.sgp.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.SolicitudResolutorAssignment;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias para validar exportación e importación (aprobación/desaprobación)
 * de solicitudes de SUBSIDIO EN DINERO / SUBSIDIO EN ESPECIE (ej. caso #241).
 */
@ExtendWith(MockitoExtension.class)
class SyncServiceSubsidioImportExportTest {

    @Mock private GoogleSheetsService googleSheetsService;
    @Mock private SolicitudRepository solicitudRepository;
    @Mock private PersonRepository personRepository;
    @Mock private LocationRepository locationRepository;
    @Mock private UserRepository userRepository;
    @Mock private SheetsConfigRepository sheetsConfigRepository;
    @Mock private TipoResolucionRepository tipoResolucionRepository;
    @Mock private AsignacionHistorialRepository asignacionHistorialRepository;
    @Mock private EmailService emailService;
    @Spy  private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private SyncService syncService;

    private Solicitud solicitud241;
    private SolicitudResolutorAssignment assignmentDinero;

    @BeforeEach
    void setUp() {
        User resolutor = User.builder().id(10L).email("martinnocioni@gmail.com").firstName("Martin").lastName("Nocioni").build();
        Person person = Person.builder().id(504L).name("BANCO DE ALIMENTOS SANTA FE").dni("16237927").type("Institucional").build();

        assignmentDinero = SolicitudResolutorAssignment.builder()
                .id(91L)
                .tipoResolucion("SUBSIDIO EN DINERO")
                .resolutor(resolutor)
                .approved(false)
                .detalle("{\"Tipo de pedido\":\"Institucional en dinero\",\"Nombre de institución\":\"ASOCIACIÓN CIVIL BANCO DE ALIMENTOS SANTA FE\",\"Localidad\":\"Recreo\"}")
                .build();

        List<SolicitudResolutorAssignment> assignments = new ArrayList<>();
        assignments.add(assignmentDinero);

        solicitud241 = Solicitud.builder()
                .id(241L)
                .type("SUBSIDIO")
                .status("consideracion")
                .amount(new BigDecimal("1140000"))
                .description("Pedido de colaboración cajas navideñas")
                .person(person)
                .resolutorAssignments(assignments)
                .build();
        assignmentDinero.setSolicitud(solicitud241);
    }

    @Test
    void importarPlanillaSalida_debeAprobarSubsidioEnDineroSinDuplicarAsignacion() throws Exception {
        when(sheetsConfigRepository.findBySpreadsheetId(anyString())).thenReturn(List.of());
        when(sheetsConfigRepository.findAll()).thenReturn(List.of());
        when(googleSheetsService.getSheetTitles(anyString())).thenReturn(List.of("Salida"));

        List<List<Object>> sheetRows = List.of(
                List.of("IDENTIFICADOR", "TIPO DE PEDIDO", "MONTO EN DINERO", "POR DONDE?"),
                List.of("", "", "", ""),
                List.of("241", "Institucional en dinero", "1140000", "SENADO")
        );
        when(googleSheetsService.readSheet(eq("real-sheet-id"), anyString())).thenReturn(sheetRows);
        when(solicitudRepository.findById(241L)).thenReturn(Optional.of(solicitud241));

        int updated = syncService.importarPlanillaSalida("real-sheet-id", List.of(241L));

        assertEquals(1, updated);
        assertEquals("completadas", solicitud241.getStatus());
        assertTrue(Boolean.TRUE.equals(solicitud241.getResolutionApproved()));
        assertEquals(1, solicitud241.getResolutorAssignments().size(), "No debe crear una asignación fantasma SUBSIDIO");
        assertTrue(Boolean.TRUE.equals(assignmentDinero.getApproved()));
        assertEquals("SENADO", solicitud241.getPorDonde());
        verify(solicitudRepository).save(solicitud241);
    }

    @Test
    void importarPlanillaSalida_debeDesaprobarSubsidioEnDineroConImporteCero() throws Exception {
        when(sheetsConfigRepository.findBySpreadsheetId(anyString())).thenReturn(List.of());
        when(sheetsConfigRepository.findAll()).thenReturn(List.of());
        when(googleSheetsService.getSheetTitles(anyString())).thenReturn(List.of("Salida"));

        List<List<Object>> sheetRows = List.of(
                List.of("IDENTIFICADOR", "TIPO DE PEDIDO", "MONTO EN DINERO"),
                List.of("", "", ""),
                List.of("241", "Institucional en dinero", "0")
        );
        when(googleSheetsService.readSheet(eq("real-sheet-id"), anyString())).thenReturn(sheetRows);
        when(solicitudRepository.findById(241L)).thenReturn(Optional.of(solicitud241));

        int updated = syncService.importarPlanillaSalida("real-sheet-id", List.of(241L));

        assertEquals(1, updated);
        assertEquals("rechazada", solicitud241.getStatus());
        assertFalse(Boolean.TRUE.equals(solicitud241.getResolutionApproved()));
        assertEquals(1, solicitud241.getResolutorAssignments().size(), "No debe crear una asignación fantasma SUBSIDIO");
        assertFalse(Boolean.TRUE.equals(assignmentDinero.getApproved()));
        verify(solicitudRepository).save(solicitud241);
    }

    @Test
    void exportarPlanillaSalida_debeIncluirAtributosDeSubsidioEnDinero() throws Exception {
        when(sheetsConfigRepository.findBySpreadsheetId(anyString())).thenReturn(List.of());
        when(sheetsConfigRepository.findAll()).thenReturn(List.of());
        when(googleSheetsService.getSheetTitles(anyString())).thenReturn(List.of("Salida"));
        when(solicitudRepository.findAll()).thenReturn(List.of(solicitud241));

        List<List<Object>> headers = List.of(
                List.of("IDENTIFICADOR", "TIPO DE PEDIDO", "MONTO EN DINERO", "LOCALIDAD"),
                List.of("", "", "", "")
        );
        when(googleSheetsService.readSheet(eq("real-sheet-id"), contains("A1:AD2"))).thenReturn(new ArrayList<>(headers));
        when(googleSheetsService.readSheet(eq("real-sheet-id"), contains("A1:AD300"))).thenReturn(new ArrayList<>(headers));

        int count = syncService.exportarPlanillaSalida("real-sheet-id", List.of(241L));
        assertEquals(1, count);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<List<Object>>> captor = ArgumentCaptor.forClass(List.class);
        verify(googleSheetsService).writeSheet(eq("real-sheet-id"), contains("A3:AD3"), captor.capture());

        List<Object> exportedRow = captor.getValue().get(0);
        assertEquals("241", exportedRow.get(0));
        assertEquals("Institucional en dinero", exportedRow.get(1));
        assertEquals("1140000", exportedRow.get(2));
    }
}
