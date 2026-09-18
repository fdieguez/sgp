package com.sgp.backend.service;

import com.sgp.backend.entity.DocumentoAdjunto;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio encargado de las tareas de mantenimiento de la base de datos.
 * Proporciona el vaciado transaccional seguro y ordenado.
 */
@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileService fileService;
    private final EntityManager entityManager;

    /**
     * Limpia de forma transaccional todas las tablas transaccionales de la base de datos.
     * Preserva usuarios, configuraciones y catálogos.
     *
     * @param password Contraseña del administrador actual.
     * @param confirmText Texto de confirmación de seguridad.
     */
    @Transactional
    public void clearTransactions(String password, String confirmText) {
        // 1. Validar que el texto de confirmación sea el correcto
        if (!"LIMPIAR".equals(confirmText)) {
            throw new IllegalArgumentException("El texto de confirmación debe ser exactamente 'LIMPIAR'");
        }

        // 2. Obtener el administrador actual y validar su contraseña
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Administrador no encontrado"));

        if (!passwordEncoder.matches(password, admin.getPassword())) {
            throw new IllegalArgumentException("Contraseña incorrecta");
        }

        // 3. Obtener todos los adjuntos para borrar sus archivos físicos
        List<DocumentoAdjunto> adjuntos = entityManager.createQuery("SELECT da FROM DocumentoAdjunto da", DocumentoAdjunto.class).getResultList();
        for (DocumentoAdjunto adjunto : adjuntos) {
            if (adjunto.getFileName() != null) {
                try {
                    fileService.deleteFile(adjunto.getFileName());
                } catch (Exception e) {
                    // Ignorar fallos de borrado de archivos físicos si no existen, para no bloquear el vaciado de BD
                }
            }
        }

        // 4. Ejecutar eliminaciones en orden secuencial para respetar claves foráneas
        try {
            entityManager.createNativeQuery("DELETE FROM pedidos").executeUpdate();
        } catch (Exception e) {
            // Ignorar si la tabla no existe en producción
        }
        try {
            entityManager.createNativeQuery("DELETE FROM subsidios").executeUpdate();
        } catch (Exception e) {
            // Ignorar si la tabla no existe en producción
        }
        entityManager.createQuery("DELETE FROM TicketSeguimiento").executeUpdate();
        entityManager.createQuery("DELETE FROM DocumentoAdjunto").executeUpdate();
        entityManager.createQuery("DELETE FROM SolicitudResolutorAssignment").executeUpdate();
        entityManager.createQuery("DELETE FROM AsignacionHistorial").executeUpdate();
        entityManager.createQuery("DELETE FROM Solicitud").executeUpdate();

        // 5. Reiniciar los contadores de secuencia e índices AUTO_INCREMENT para que la próxima solicitud inicie en ID = 1
        String[] transactionalTables = {
            "solicitudes",
            "ticket_seguimiento",
            "documento_adjunto",
            "solicitud_resolutor_assignment",
            "asignacion_historial",
            "pedidos",
            "subsidios"
        };

        for (String table : transactionalTables) {
            try {
                // Sentencia estándar para MySQL / MariaDB en producción
                entityManager.createNativeQuery("ALTER TABLE " + table + " AUTO_INCREMENT = 1").executeUpdate();
            } catch (Exception e) {
                // Manejo de compatibilidad para H2 Database en entornos de pruebas
                try {
                    entityManager.createNativeQuery("ALTER TABLE " + table + " ALTER COLUMN id RESTART WITH 1").executeUpdate();
                } catch (Exception ignored) {
                }
            }
        }
    }
}
