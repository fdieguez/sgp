package com.sgp.backend.service;

import com.sgp.backend.entity.DocumentoAdjunto;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.repository.SolicitudRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio encargado de gestionar el envío de notificaciones por correo electrónico.
 * Implementa lógica asíncrona para no bloquear el hilo de ejecución principal.
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final SolicitudRepository solicitudRepository;
    private final FileService fileService;

    /**
     * Envía de forma asíncrona una notificación por correo electrónico con los detalles
     * del subsidio aprobado y sus archivos adjuntos.
     * Se marca con @Transactional(readOnly = true) para mantener la sesión Hibernate (Persistence Context) abierta
     * durante la carga diferida (LAZY) de la colección solicitud.getAdjuntos().
     *
     * @param resolutorEmail Correo de destino (el resolutor asignado).
     * @param subsidioId     Identificador del subsidio aprobado.
     */
    @Async
    @Transactional(readOnly = true)
    public void sendSubsidioApprovedEmail(String resolutorEmail, Long subsidioId) {
        System.out.println("📧 Iniciando proceso de envío de correo electrónico para el Subsidio #" + subsidioId);
        try {
            Solicitud solicitud = solicitudRepository.findById(subsidioId)
                    .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            // Habilitar soporte multipart para adjuntar archivos
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            String beneficiario = solicitud.getPerson() != null ? solicitud.getPerson().getName() : "Sin Beneficiario";

            helper.setTo(resolutorEmail);
            helper.setSubject(String.format("[SGP] Subsidio Aprobado - Solicitud #%d - %s", solicitud.getId(), beneficiario));

            // Construir el cuerpo HTML del correo electrónico
            String htmlContent = String.format(
                    "<html>" +
                    "<body>" +
                    "<h2>Notificación de Subsidio Aprobado</h2>" +
                    "<p>Estimado Resolutor,</p>" +
                    "<p>Se ha aprobado con éxito la resolución del subsidio con los siguientes detalles:</p>" +
                    "<ul>" +
                    "  <li><strong>N° de Solicitud (Orden):</strong> %d</li>" +
                    "  <li><strong>Beneficiario:</strong> %s</li>" +
                    "  <li><strong>Descripción del Pedido:</strong> %s</li>" +
                    "  <li><strong>Monto Aprobado:</strong> $%s</li>" +
                    "  <li><strong>Observaciones de la Resolución:</strong> %s</li>" +
                    "</ul>" +
                    "<p>Se adjuntan los documentos correspondientes cargados en el SGP.</p>" +
                    "<br/>" +
                    "<p>Atentamente,<br/><strong>Sistema de Gestión de Proyectos (SGP)</strong></p>" +
                    "</body>" +
                    "</html>",
                    solicitud.getId(),
                    beneficiario,
                    solicitud.getDescription() != null ? solicitud.getDescription() : "Sin descripción",
                    solicitud.getAmount() != null ? solicitud.getAmount().toString() : "0.00",
                    solicitud.getObservation() != null ? solicitud.getObservation() : "Sin observaciones"
            );

            helper.setText(htmlContent, true);

            // Adjuntar físicamente los archivos asociados al subsidio
            if (solicitud.getAdjuntos() != null && !solicitud.getAdjuntos().isEmpty()) {
                for (DocumentoAdjunto adjunto : solicitud.getAdjuntos()) {
                    try {
                        Resource resource = fileService.loadFileAsResource(adjunto.getFileName());
                        if (resource.exists()) {
                            helper.addAttachment(adjunto.getOriginalFileName(), resource);
                            System.out.println("📎 Archivo adjuntado al correo: " + adjunto.getOriginalFileName());
                        } else {
                            System.err.println("⚠️ Archivo no encontrado en disco para adjuntar: " + adjunto.getOriginalFileName());
                        }
                    } catch (Exception e) {
                        System.err.println("⚠️ Error al adjuntar el archivo " + adjunto.getOriginalFileName() + ": " + e.getMessage());
                    }
                }
            }

            mailSender.send(mimeMessage);
            System.out.println("✅ Correo de notificación enviado exitosamente a: " + resolutorEmail);

        } catch (Exception e) {
            System.err.println("❌ Error crítico al enviar el correo electrónico para el Subsidio #" + subsidioId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
