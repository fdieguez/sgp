package com.sgp.backend;

import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.TipoResolucion;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.service.SolicitudService;
import com.sgp.backend.repository.TipoResolucionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas unitarias para verificar la funcionalidad del Milestone 2_1.
 */
@SpringBootTest
@Transactional
public class SolicitudM21Test {

    @Autowired
    private SolicitudService solicitudService;

    @Autowired
    private SolicitudRepository solicitudRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TipoResolucionRepository tipoResolucionRepository;

    @Autowired
    private PersonRepository personRepository;

    private User resolutorSinSubsidio;
    private User resolutorConSubsidio;
    private Solicitud solicitudPrueba;

    @BeforeEach
    public void setUp() {
        resolutorSinSubsidio = userRepository.save(User.builder()
                .email("res_sin_subsidio@test.com")
                .password("123456")
                .firstName("Resolutor")
                .lastName("SinSubsidio")
                .role("RESOLUTOR")
                .phone("12345678")
                .activo(true)
                .build());

        TipoResolucion trSubsidio = tipoResolucionRepository.findByTipoIgnoreCase("SUBSIDIO")
                .orElseGet(() -> tipoResolucionRepository.save(TipoResolucion.builder()
                        .tipo("SUBSIDIO")
                        .activo(true)
                        .build()));

        resolutorConSubsidio = userRepository.save(User.builder()
                .email("res_con_subsidio@test.com")
                .password("123456")
                .firstName("Resolutor")
                .lastName("ConSubsidio")
                .role("RESOLUTOR")
                .phone("87654321")
                .activo(true)
                .tiposResolucion(new java.util.HashSet<>(Collections.singletonList(trSubsidio)))
                .build());

        Person personaPrueba = personRepository.save(Person.builder()
                .name("Persona Prueba M21")
                .phone("123456")
                .type("INDIVIDUAL")
                .build());

        // Se asigna la fecha de ingreso obligatoria (entryDate) y la persona asociada para evitar DataIntegrityViolationException al persistir la entidad Solicitud
        solicitudPrueba = solicitudRepository.save(Solicitud.builder()
                .type("SUBSIDIO")
                .status("pendiente")
                .entryDate(java.time.LocalDate.now())
                .person(personaPrueba)
                .description("Solicitud de prueba M2_1")
                .build());
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Validar que ponerEnConsideracion lanza FORBIDDEN cuando el RESOLUTOR no posee competencia SUBSIDIO")
    public void testPonerEnConsideracionResolutorSinCompetenciaLanzaForbidden() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(resolutorSinSubsidio.getEmail(), null, Collections.emptyList())
        );

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            solicitudService.ponerEnConsideracion(solicitudPrueba.getId());
        });

        assertEquals(403, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("SUBSIDIO"));
    }

    @Test
    @DisplayName("Validar que ponerEnConsideracion permite actualizar el estado cuando el RESOLUTOR posee competencia SUBSIDIO")
    public void testPonerEnConsideracionResolutorConCompetenciaExitoso() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(resolutorConSubsidio.getEmail(), null, Collections.emptyList())
        );

        Solicitud actualizada = solicitudService.ponerEnConsideracion(solicitudPrueba.getId());

        assertNotNull(actualizada);
        assertEquals("consideracion", actualizada.getStatus());
    }
}
