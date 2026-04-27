package com.sgp.backend;

import com.sgp.backend.dto.ResolutorAssignmentDTO;
import com.sgp.backend.dto.SolicitudUpdateDTO;
import com.sgp.backend.entity.Pedido;
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
        operador    = userRepository.save(User.builder().email("operador@test.com").password("123").firstName("Op").lastName("1").role("OPERADOR").build());
        responsable = userRepository.save(User.builder().email("responsable@test.com").password("123").firstName("Resp").lastName("1").role("RESPONSABLE").build());
        resolutor1  = userRepository.save(User.builder().email("resolutor1@test.com").password("123").firstName("Res").lastName("1").role("RESOLUTOR").build());
        resolutor2  = userRepository.save(User.builder().email("resolutor2@test.com").password("123").firstName("Res").lastName("2").role("RESOLUTOR").build());

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
        dto.setType(s instanceof com.sgp.backend.entity.Subsidio ? "SUBSIDIO" : "PEDIDO");
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
        Pedido s = new Pedido();
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
        solicitudService.aprobarAsignacion(updated2.getId(), resolutor1.getEmail(), "Todo ok resolutor 1");

        Solicitud statusAfter1 = solicitudService.getSolicitudById(updated2.getId());
        assertEquals("en resolucion", statusAfter1.getStatus(), "Debe seguir en resolución porque falta resolutor 2");

        // 5. Resolutor 2 aprueba — la solicitud debe completarse
        solicitudService.aprobarAsignacion(updated2.getId(), resolutor2.getEmail(), "Finalizado por resolutor 2");

        Solicitud statusAfter2 = solicitudService.getSolicitudById(updated2.getId());
        assertEquals("completadas", statusAfter2.getStatus(), "Debe estar completada ahora que todos aprobaron");
    }

    @Test
    void testDocumentIntegrity() {
        // Crear solicitud base
        Pedido s = new Pedido();
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
}
