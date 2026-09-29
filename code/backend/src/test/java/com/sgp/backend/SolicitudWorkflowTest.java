package com.sgp.backend;

import com.sgp.backend.dto.ResolutorAssignmentDTO;
import com.sgp.backend.dto.SolicitudUpdateDTO;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.service.SolicitudService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class SolicitudWorkflowTest {

    @Autowired
    private SolicitudService solicitudService;

    @Autowired
    private SolicitudRepository solicitudRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PersonRepository personRepository;

    private User operador;
    private User responsable;
    private User resolutor1;
    private User resolutor2;
    private Person person;

    @BeforeEach
    void setUp() {
        // Crear usuarios de prueba en base de datos en memoria
        operador    = userRepository.save(User.builder().email("operador@test.com").password("123").firstName("Op").lastName("1").role("OPERADOR").phone("123456789").build());
        responsable = userRepository.save(User.builder().email("responsable@test.com").password("123").firstName("Resp").lastName("1").role("RESPONSABLE").phone("123456789").build());
        resolutor1  = userRepository.save(User.builder().email("resolutor1@test.com").password("123").firstName("Res").lastName("1").role("RESOLUTOR").phone("123456789").build());
        resolutor2  = userRepository.save(User.builder().email("resolutor2@test.com").password("123").firstName("Res").lastName("2").role("RESOLUTOR").phone("123456789").build());

        person = personRepository.save(Person.builder().name("Juan Perez").phone("123456").type("INDIVIDUAL").build());

        // Simular sesión del operador en el contexto de seguridad
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(operador.getEmail(), null, new ArrayList<>()));
    }

    /**
     * Construye un DTO de actualización mínimo a partir de una solicitud ya persistida.
     * Centraliza la conversión para que los tests sean más legibles.
     */
    private SolicitudUpdateDTO dtoDesde(Solicitud s) {
        SolicitudUpdateDTO dto = new SolicitudUpdateDTO();
        dto.setType(s.getType() != null ? s.getType() : "PEDIDO");
        dto.setDescription(s.getDescription());
        dto.setStatus(s.getStatus());
        dto.setOrigin(s.getOrigin());
        dto.setEntryDate(s.getEntryDate());
        dto.setZone(s.getZone());
        dto.setObservation(s.getObservation());
        dto.setResolution(s.getResolution());
        dto.setDetail(s.getDetail());
        dto.setFirstContactControl(s.getFirstContactControl());
        dto.setResolutionApproved(s.getResolutionApproved());
        dto.setSuggestedResolutionType(s.getSuggestedResolutionType());
        // Copiar datos del beneficiario
        if (s.getPerson() != null) {
            SolicitudUpdateDTO.PersonDTO personDTO = new SolicitudUpdateDTO.PersonDTO();
            personDTO.setId(s.getPerson().getId());
            personDTO.setName(s.getPerson().getName());
            personDTO.setPhone(s.getPerson().getPhone());
            dto.setPerson(personDTO);
        }
        // Responsable solo por ID (no objeto anidado)
        if (s.getResponsable() != null) {
            dto.setResponsableId(s.getResponsable().getId());
        }
        return dto;
    }

    @Test
    void testFullWorkflow() {
        // 1. Operador crea solicitud → estado inicial: pendiente
        Solicitud s = new Solicitud();
        s.setType("PEDIDO");
        s.setDescription("Test workflow");
        s.setOrigin("MANUAL");
        s.setPerson(person);

        Solicitud saved = solicitudService.createSolicitud(s);

        assertEquals("pendiente", saved.getStatus());
        assertEquals(operador.getEmail(), saved.getCreatedBy().getEmail());

        // 2. Distribuidor asigna responsable usando el DTO
        SolicitudUpdateDTO dto1 = dtoDesde(saved);
        dto1.setResponsableId(responsable.getId());
        Solicitud updated1 = solicitudService.updateSolicitud(saved.getId(), dto1);

        assertEquals("en proceso", updated1.getStatus());
        assertEquals(responsable.getId(), updated1.getResponsable().getId());

        // 3. Responsable asigna resolutores
        List<ResolutorAssignmentDTO> assignments = new ArrayList<>();
        assignments.add(new ResolutorAssignmentDTO(resolutor1.getEmail(), "MATERIALES", "Techo"));
        assignments.add(new ResolutorAssignmentDTO(resolutor2.getEmail(), "SUBSIDIO", "Comedor"));

        SolicitudUpdateDTO dto2 = dtoDesde(updated1);
        dto2.setAssignments(assignments);
        Solicitud updated2 = solicitudService.updateSolicitud(updated1.getId(), dto2);

        assertEquals("en resolucion", updated2.getStatus());
        assertEquals(2, updated2.getResolutorAssignments().size());

        // 4. Resolutor 1 aprueba — la solicitud debe seguir en resolución
        solicitudService.aprobarAsignacion(updated2.getId(), resolutor1.getEmail(), "Todo ok resolutor 1", null, null);

        Solicitud statusAfter1 = solicitudService.getSolicitudById(updated2.getId());
        assertEquals("en resolucion", statusAfter1.getStatus(), "Debe seguir en resolución porque falta resolutor 2");

        // 5. Resolutor 2 aprueba — la solicitud debe completarse
        solicitudService.aprobarAsignacion(updated2.getId(), resolutor2.getEmail(), "Finalizado por resolutor 2", null, null);

        Solicitud statusAfter2 = solicitudService.getSolicitudById(updated2.getId());
        assertEquals("completadas", statusAfter2.getStatus(), "Debe estar completada ahora que todos aprobaron");
    }

    @Test
    void testDocumentIntegrity() {
        // Crear solicitud base
        Solicitud s = new Solicitud();
        s.setType("PEDIDO");
        s.setDescription("Doc integrity test");
        s.setPerson(person);
        Solicitud saved = solicitudService.createSolicitud(s);

        // Verificar que updateSolicitud no rompe la integridad de los datos al asignar responsable
        SolicitudUpdateDTO dto = dtoDesde(saved);
        dto.setResponsableId(responsable.getId());
        Solicitud updated = solicitudService.updateSolicitud(saved.getId(), dto);

        assertNotNull(updated);
        assertEquals(saved.getId(), updated.getId());
        assertEquals(responsable.getId(), updated.getResponsable().getId());
    }

    @Test
    void testSubsidioAssignmentAmountExtraction() {
        // Crear solicitud de prueba
        Solicitud s = new Solicitud();
        s.setType("SUBSIDIO");
        s.setDescription("Prueba de extracción de monto en subsidio");
        s.setPerson(person);
        Solicitud saved = solicitudService.createSolicitud(s);

        // Crear asignación SUBSIDIO con JSON conteniendo el monto 75000
        List<ResolutorAssignmentDTO> assignments = new ArrayList<>();
        assignments.add(new ResolutorAssignmentDTO(resolutor1.getEmail(), "SUBSIDIO", "{\"Monto\": 75000, \"Concepto\": \"Ayuda economica\"}"));

        SolicitudUpdateDTO dto = dtoDesde(saved);
        dto.setAssignments(assignments);
        Solicitud updated = solicitudService.updateSolicitud(saved.getId(), dto);

        // Verificar que el monto fue extraído y guardado correctamente en la solicitud
        assertNotNull(updated.getAmount(), "El monto de la solicitud no debe ser nulo");
        assertEquals(0, new java.math.BigDecimal("75000").compareTo(updated.getAmount()), "El monto extraído debe ser 75000");

        // También verificar recuperando la solicitud desde la base de datos
        Solicitud reloaded = solicitudService.getSolicitudById(saved.getId());
        assertNotNull(reloaded.getAmount(), "El monto en BD no debe ser nulo");
        assertEquals(0, new java.math.BigDecimal("75000").compareTo(reloaded.getAmount()), "El monto recuperado de BD debe ser 75000");
    }

    @Test
    void testPoolZonaYTomarSolicitud() {
        // 1. Crear dos responsables en zonas diferentes
        User respNorte1 = userRepository.save(User.builder().email("resp.norte1@test.com").password("123").firstName("Resp").lastName("Norte 1").role("RESPONSABLE").zone("NORTE").phone("111").build());
        User respNorte2 = userRepository.save(User.builder().email("resp.norte2@test.com").password("123").firstName("Resp").lastName("Norte 2").role("RESPONSABLE").zone("NORTE").phone("222").build());
        User respSur = userRepository.save(User.builder().email("resp.sur@test.com").password("123").firstName("Resp").lastName("Sur").role("RESPONSABLE").zone("SUR").phone("333").build());

        // 2. Crear solicitud con zona NORTE pero sin responsable asignado
        Solicitud s = new Solicitud();
        s.setType("PEDIDO");
        s.setDescription("Solicitud territorial para la zona norte");
        s.setZone("NORTE");
        s.setPerson(person);
        Solicitud saved = solicitudService.createSolicitud(s);

        assertNull(saved.getResponsable(), "Inicialmente no debe tener responsable asignado");
        assertEquals("pendiente", saved.getStatus());

        // 3. Simular sesión de respNorte1: debe ver la solicitud en el pool de su zona
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(respNorte1.getEmail(), null, new ArrayList<>()));
        org.springframework.data.domain.Page<Solicitud> solicitudesNorte1 = solicitudService.getAllSolicitudes(
                null, null, null, null, null, null, null, org.springframework.data.domain.PageRequest.of(0, 10));
        assertTrue(solicitudesNorte1.getContent().stream().anyMatch(sol -> sol.getId().equals(saved.getId())),
                "El responsable de la zona NORTE debe ver la solicitud disponible en su pool");

        // 4. Simular sesión de respSur: NO debe ver la solicitud de zona NORTE
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(respSur.getEmail(), null, new ArrayList<>()));
        org.springframework.data.domain.Page<Solicitud> solicitudesSur = solicitudService.getAllSolicitudes(
                null, null, null, null, null, null, null, org.springframework.data.domain.PageRequest.of(0, 10));
        assertFalse(solicitudesSur.getContent().stream().anyMatch(sol -> sol.getId().equals(saved.getId())),
                "El responsable de la zona SUR NO debe ver solicitudes del pool de zona NORTE");

        // 5. respNorte1 toma la solicitud
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(respNorte1.getEmail(), null, new ArrayList<>()));
        Solicitud tomada = solicitudService.tomarSolicitud(saved.getId());

        assertNotNull(tomada.getResponsable(), "Debe quedar asignada");
        assertEquals(respNorte1.getId(), tomada.getResponsable().getId(), "El responsable asignado debe ser respNorte1");
        assertEquals("en proceso", tomada.getStatus(), "El estado debe pasar a 'en proceso'");

        // 6. respNorte2 ya NO debe ver la solicitud porque ya fue tomada por respNorte1
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(respNorte2.getEmail(), null, new ArrayList<>()));
        org.springframework.data.domain.Page<Solicitud> solicitudesNorte2 = solicitudService.getAllSolicitudes(
                null, null, null, null, null, null, null, org.springframework.data.domain.PageRequest.of(0, 10));
        assertFalse(solicitudesNorte2.getContent().stream().anyMatch(sol -> sol.getId().equals(saved.getId())),
                "El otro responsable de la misma zona ya NO debe ver la solicitud una vez tomada por su compañero");

        // 7. Si respNorte2 intenta tomarla, debe arrojar conflicto (HTTP 409)
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> {
            solicitudService.tomarSolicitud(saved.getId());
        }, "Debe lanzar excepción por conflicto al intentar tomar una solicitud ya asignada");
    }
}
