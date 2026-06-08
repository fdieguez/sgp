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
        entityManager.createQuery("DELETE FROM TicketSeguimiento").executeUpdate();
        entityManager.createQuery("DELETE FROM DocumentoAdjunto").executeUpdate();
        entityManager.createQuery("DELETE FROM SolicitudResolutorAssignment").executeUpdate();
        entityManager.createQuery("DELETE FROM AsignacionHistorial").executeUpdate();
        entityManager.createQuery("DELETE FROM Pedido").executeUpdate();
        entityManager.createQuery("DELETE FROM Subsidio").executeUpdate();
        entityManager.createQuery("DELETE FROM Solicitud").executeUpdate();
    }
}
