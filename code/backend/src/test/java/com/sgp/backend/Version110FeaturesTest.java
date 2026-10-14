package com.sgp.backend;

import com.sgp.backend.dto.PersonSummaryDTO;
import com.sgp.backend.entity.AgendaGuest;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.repository.AgendaGuestRepository;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.SheetsConfigRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.service.PersonService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Suite de pruebas automatizadas para las funcionalidades de la Versión 1.1.0 (CDU-06, CDU-07, CDU-08, CDU-14).
 */
@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class Version110FeaturesTest {

    @Autowired
    private PersonService personService;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private SolicitudRepository solicitudRepository;

    @Autowired
    private SheetsConfigRepository sheetsConfigRepository;

    @Autowired
    private AgendaGuestRepository agendaGuestRepository;

    private Person testPerson;

    @BeforeEach
    void setUp() {
        // Crear persona de prueba para verificación de búsqueda y estadísticas
        testPerson = Person.builder()
                .name("María Sol Pérez")
                .dni("38123456")
                .phone("3424112233")
                .type("Personal")
                .subType("emprendedor")
                .build();
        testPerson = personRepository.save(testPerson);

        // Crear solicitudes asociadas con distintos estados para validar la Vista 360° (CDU-07)
        Solicitud s1 = Solicitud.builder()
                .person(testPerson)
                .entryDate(LocalDate.now())
                .status("pendiente")
                .type("PEDIDO")
                .description("Solicitud de prueba 1")
                .build();

        Solicitud s2 = Solicitud.builder()
                .person(testPerson)
                .entryDate(LocalDate.now())
                .status("en proceso")
                .type("PEDIDO")
                .description("Solicitud de prueba 2")
                .build();

        Solicitud s3 = Solicitud.builder()
                .person(testPerson)
                .entryDate(LocalDate.now())
                .status("completadas")
                .type("PEDIDO")
                .description("Solicitud de prueba 3")
                .build();

        solicitudRepository.saveAll(List.of(s1, s2, s3));
    }

    @Test
    @DisplayName("CDU-06: Búsqueda flexible por coincidencia parcial de nombre tolerante a mayúsculas")
    void testBusquedaFlexiblePorNombre() {
        List<PersonSummaryDTO> results = personService.searchPersonsFlexible("sol pérez", 10);
        assertFalse(results.isEmpty(), "Debe encontrar a la persona por búsqueda parcial de nombre");
        assertEquals("María Sol Pérez", results.get(0).getName());
    }

    @Test
    @DisplayName("CDU-06: Búsqueda flexible por coincidencia parcial de DNI")
    void testBusquedaFlexiblePorDni() {
        List<PersonSummaryDTO> results = personService.searchPersonsFlexible("38123", 5);
        assertFalse(results.isEmpty(), "Debe encontrar a la persona por su DNI");
        assertEquals("38123456", results.get(0).getDni());
    }

    @Test
    @DisplayName("CDU-07: Resumen contextual 360° de solicitudes asociadas a la persona")
    void testResumenContextual360() {
        PersonSummaryDTO stats = personService.getPersonStats(testPerson.getId());
        assertNotNull(stats, "El resumen de la persona no puede ser nulo");
        assertEquals(3, stats.getTotalSolicitudes(), "Debe registrar un total de 3 solicitudes");
        assertEquals(1, stats.getPendientes(), "Debe registrar 1 solicitud pendiente");
        assertEquals(1, stats.getEnProceso(), "Debe registrar 1 solicitud en proceso");
        assertEquals(1, stats.getCompletadas(), "Debe registrar 1 solicitud completada");
    }

    @Test
    @DisplayName("CDU-08: Detección y búsqueda por DNI exacto")
    void testBusquedaPorDniExacto() {
        Optional<PersonSummaryDTO> found = personService.findByDni("38123456");
        assertTrue(found.isPresent(), "Debe encontrar la persona con el DNI indicado");
        assertEquals("María Sol Pérez", found.get().getName());

        Optional<PersonSummaryDTO> notFound = personService.findByDni("99999999");
        assertTrue(notFound.isEmpty(), "No debe existir persona con DNI inexistente");
    }

    @Test
    @DisplayName("CDU-14: Persistencia y recuperación de invitados frecuentes de Agenda")
    void testGestionInvitadosFrecuentesAgenda() {
        SheetsConfig config = new SheetsConfig();
        config.setSpreadsheetId("test-sheet-id");
        config.setSheetName("AGENDA");
        config.setCalendarId("agenda@test.com");
        config.setStatus("ACTIVE");
        config = sheetsConfigRepository.save(config);

        AgendaGuest guest1 = AgendaGuest.builder()
                .sheetsConfig(config)
                .name("Invitado de Honor")
                .email("invitado@gmail.com")
                .build();
        agendaGuestRepository.save(guest1);

        List<AgendaGuest> guests = agendaGuestRepository.findBySheetsConfigIdOrderByCreatedAtAsc(config.getId());
        assertEquals(1, guests.size(), "Debe recuperar el invitado frecuente registrado");
        assertEquals("invitado@gmail.com", guests.get(0).getEmail());
    }
}
