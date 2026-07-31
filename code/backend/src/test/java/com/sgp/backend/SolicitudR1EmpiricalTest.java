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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas empíricas y de casos de borde para la verificación de la regla R1 en SolicitudService.
 * Requisito R1: Extracción del monto de subsidio desde el campo detalle JSON en asignaciones de tipo SUBSIDIO.
 */
@SpringBootTest
@Transactional
public class SolicitudR1EmpiricalTest {

    @Autowired
    private SolicitudService solicitudService;

    @Autowired
    private SolicitudRepository solicitudRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PersonRepository personRepository;

    private User operador;
    private User resolutor;
    private Person person;

    @BeforeEach
    void setUp() {
        // Configurar usuarios y persona de prueba
        operador = userRepository.save(User.builder()
                .email("operador_r1@test.com")
                .password("123")
                .firstName("Op")
                .lastName("R1")
                .role("OPERADOR")
                .phone("123456789")
                .build());

        resolutor = userRepository.save(User.builder()
                .email("resolutor_r1@test.com")
                .password("123")
                .firstName("Res")
                .lastName("R1")
                .role("RESOLUTOR")
                .phone("123456789")
                .build());

        person = personRepository.save(Person.builder()
                .name("Carlos R1")
                .phone("987654321")
                .type("INDIVIDUAL")
                .build());

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(operador.getEmail(), null, new ArrayList<>()));
    }

    private Solicitud createBaseSolicitud(String type) {
        Solicitud s = new Solicitud();
        s.setType(type);
        s.setDescription("Solicitud de prueba R1");
        s.setOrigin("MANUAL");
        s.setPerson(person);
        return solicitudService.createSolicitud(s);
    }

    private SolicitudUpdateDTO dtoDesde(Solicitud s) {
        SolicitudUpdateDTO dto = new SolicitudUpdateDTO();
        dto.setType(s.getType() != null ? s.getType() : "SUBSIDIO");
        dto.setDescription(s.getDescription());
        dto.setStatus(s.getStatus());
        dto.setOrigin(s.getOrigin());
        dto.setEntryDate(s.getEntryDate());
        if (s.getPerson() != null) {
            SolicitudUpdateDTO.PersonDTO personDTO = new SolicitudUpdateDTO.PersonDTO();
            personDTO.setId(s.getPerson().getId());
            personDTO.setName(s.getPerson().getName());
            personDTO.setPhone(s.getPerson().getPhone());
            dto.setPerson(personDTO);
        }
        return dto;
    }

    @Test
    @DisplayName("R1 - Extracción con valores numéricos enteros y decimales")
    void testNumericValuesInDetail() {
        // Caso 1: Valor entero 75000
        Solicitud s1 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto1 = dtoDesde(s1);
        dto1.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": 75000}")
        ));
        Solicitud u1 = solicitudService.updateSolicitud(s1.getId(), dto1);
        assertNotNull(u1.getAmount(), "El monto no debe ser nulo para entero 75000");
        assertEquals(0, new BigDecimal("75000").compareTo(u1.getAmount()), "Monto debe ser 75000");

        // Caso 2: Valor decimal 75000.50
        Solicitud s2 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto2 = dtoDesde(s2);
        dto2.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": 75000.50}")
        ));
        Solicitud u2 = solicitudService.updateSolicitud(s2.getId(), dto2);
        assertNotNull(u2.getAmount(), "El monto no debe ser nulo para decimal 75000.50");
        assertEquals(0, new BigDecimal("75000.50").compareTo(u2.getAmount()), "Monto debe ser 75000.50");
    }

    @Test
    @DisplayName("R1 - Extracción con valores en string (simple vs formateado)")
    void testStringValuesInDetail() {
        // Caso 1: String numérico plano "75000"
        Solicitud s1 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto1 = dtoDesde(s1);
        dto1.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": \"75000\"}")
        ));
        Solicitud u1 = solicitudService.updateSolicitud(s1.getId(), dto1);
        assertNotNull(u1.getAmount(), "El monto no debe ser nulo para string '75000'");
        assertEquals(0, new BigDecimal("75000").compareTo(u1.getAmount()));

        // Caso 2: String decimal plano "75000.50"
        Solicitud s2 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto2 = dtoDesde(s2);
        dto2.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": \"75000.50\"}")
        ));
        Solicitud u2 = solicitudService.updateSolicitud(s2.getId(), dto2);
        assertNotNull(u2.getAmount(), "El monto no debe ser nulo para string '75000.50'");
        assertEquals(0, new BigDecimal("75000.50").compareTo(u2.getAmount()));

        // Caso 3: String formateado español "75.000,00"
        Solicitud s3 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto3 = dtoDesde(s3);
        dto3.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": \"75.000,00\"}")
        ));
        Solicitud u3 = solicitudService.updateSolicitud(s3.getId(), dto3);
        assertNotNull(u3.getAmount(), "El monto no debe ser nulo para formato español '75.000,00'");
        assertEquals(0, new BigDecimal("75000").compareTo(u3.getAmount()), "Monto debe ser 75000 para '75.000,00'");

        // Caso 4: String formateado con separador de miles sin decimales "75.000"
        Solicitud s4 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto4 = dtoDesde(s4);
        dto4.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": \"75.000\"}")
        ));
        Solicitud u4 = solicitudService.updateSolicitud(s4.getId(), dto4);
        assertNotNull(u4.getAmount(), "El monto no debe ser nulo para punto de miles '75.000'");
        assertEquals(0, new BigDecimal("75000").compareTo(u4.getAmount()), "Monto debe ser 75000 para '75.000'");

        // Caso 5: String con símbolo de moneda "$ 75.000,00"
        Solicitud s5 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto5 = dtoDesde(s5);
        dto5.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto\": \"$ 75.000,00\"}")
        ));
        Solicitud u5 = solicitudService.updateSolicitud(s5.getId(), dto5);
        assertNotNull(u5.getAmount(), "El monto no debe ser nulo para símbolo de moneda '$ 75.000,00'");
        assertEquals(0, new BigDecimal("75000").compareTo(u5.getAmount()), "Monto debe ser 75000 para '$ 75.000,00'");
    }

    @Test
    @DisplayName("R1 - Claves alternativas JSON ('Monto', 'monto', 'Monto en dinero')")
    void testAlternativeJsonKeys() {
        // Caso 1: clave en minúscula "monto"
        Solicitud s1 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto1 = dtoDesde(s1);
        dto1.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"monto\": 50000}")
        ));
        Solicitud u1 = solicitudService.updateSolicitud(s1.getId(), dto1);
        assertNotNull(u1.getAmount(), "Debe soportar la clave 'monto'");
        assertEquals(0, new BigDecimal("50000").compareTo(u1.getAmount()));

        // Caso 2: clave "Monto en dinero"
        Solicitud s2 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto2 = dtoDesde(s2);
        dto2.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"Monto en dinero\": 60000}")
        ));
        Solicitud u2 = solicitudService.updateSolicitud(s2.getId(), dto2);
        assertNotNull(u2.getAmount(), "Debe soportar la clave 'Monto en dinero'");
        assertEquals(0, new BigDecimal("60000").compareTo(u2.getAmount()));
    }

    @Test
    @DisplayName("R1 - Casos de detalle JSON faltante, vacío o inválido")
    void testMissingOrInvalidDetail() {
        // Detalle null
        Solicitud s1 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto1 = dtoDesde(s1);
        dto1.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", null)
        ));
        Solicitud u1 = solicitudService.updateSolicitud(s1.getId(), dto1);
        assertNull(u1.getAmount(), "Monto debe permanecer nulo cuando detalle es null");

        // Detalle vacío
        Solicitud s2 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto2 = dtoDesde(s2);
        dto2.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "   ")
        ));
        Solicitud u2 = solicitudService.updateSolicitud(s2.getId(), dto2);
        assertNull(u2.getAmount(), "Monto debe permanecer nulo cuando detalle está vacío");

        // JSON sin campo Monto
        Solicitud s3 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto3 = dtoDesde(s3);
        dto3.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "{\"observaciones\": \"Sin monto\"}")
        ));
        Solicitud u3 = solicitudService.updateSolicitud(s3.getId(), dto3);
        assertNull(u3.getAmount(), "Monto debe permanecer nulo cuando JSON no tiene clave de monto");

        // JSON malformado / inválido
        Solicitud s4 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto4 = dtoDesde(s4);
        dto4.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "SUBSIDIO", "monto: 75000 invalido{")
        ));
        Solicitud u4 = solicitudService.updateSolicitud(s4.getId(), dto4);
        assertNull(u4.getAmount(), "Monto debe permanecer nulo cuando JSON es inválido y no debe arrojar excepción");
    }

    @Test
    @DisplayName("R1 - Diferenciación de asignaciones SUBSIDIO vs no-SUBSIDIO")
    void testNonSubsidioAssignments() {
        // Asignación de tipo MATERIALES con JSON conteniendo Monto
        Solicitud s1 = createBaseSolicitud("PEDIDO");
        SolicitudUpdateDTO dto1 = dtoDesde(s1);
        dto1.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "MATERIALES", "{\"Monto\": 75000}")
        ));
        Solicitud u1 = solicitudService.updateSolicitud(s1.getId(), dto1);
        assertNull(u1.getAmount(), "No debe extraer monto para asignaciones de tipo MATERIALES");

        // Asignación de tipo SUBSIDIO case-insensitive ("subsidio")
        Solicitud s2 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto2 = dtoDesde(s2);
        dto2.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO(resolutor.getEmail(), "subsidio", "{\"Monto\": 45000}")
        ));
        Solicitud u2 = solicitudService.updateSolicitud(s2.getId(), dto2);
        assertNotNull(u2.getAmount(), "Debe extraer monto ignorando mayúsculas/minúsculas en 'subsidio'");
        assertEquals(0, new BigDecimal("45000").compareTo(u2.getAmount()));
    }

    @Test
    @DisplayName("R1 - Email de resolutor no registrado en BD pero asignación SUBSIDIO presente")
    void testUnregisteredResolutorEmail() {
        Solicitud s1 = createBaseSolicitud("SUBSIDIO");
        SolicitudUpdateDTO dto1 = dtoDesde(s1);
        dto1.setAssignments(Collections.singletonList(
                new ResolutorAssignmentDTO("no_existe@test.com", "SUBSIDIO", "{\"Monto\": 99000}")
        ));
        Solicitud u1 = solicitudService.updateSolicitud(s1.getId(), dto1);
        // Se verifica si el monto se asigna a la solicitud aun cuando el resolutor no existe en BD
        assertNotNull(u1.getAmount(), "Se extrae el monto aunque el resolutor no esté en la BD");
        assertEquals(0, new BigDecimal("99000").compareTo(u1.getAmount()));
        assertTrue(u1.getResolutorAssignments().isEmpty(), "No se crea la asignación persistida porque el resolutor no se encontró");
    }
}
