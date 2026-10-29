package com.sgp.backend.service;

import com.sgp.backend.entity.DocumentoAdjunto;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.repository.SolicitudRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${sgp.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Envía de forma asíncrona y liviana una notificación por correo electrónico
     * al responsable territorial informando la aprobación de la solicitud o resolución.
     * Incluye enlace directo a la plataforma y no adjunta archivos pesados.
     *
     * @param responsableEmail Correo del responsable territorial.
     * @param solicitudId      Identificador de la solicitud aprobada.
     * @param tipoResolucion   Tipo de resolución o solicitud (Agenda, Subsidio, Pedido, etc.).
     * @param observaciones    Observaciones registradas en la resolución.
     */
    @Async
    @Transactional(readOnly = true)
    public void sendSolicitudAprobadaEmail(String responsableEmail, Long solicitudId, String tipoResolucion, String observaciones) {
        if (responsableEmail == null || responsableEmail.trim().isEmpty()) {
            System.out.println("⚠️ No se envía correo de solicitud aprobada: no hay correo de responsable configurado para solicitud #" + solicitudId);
            return;
        }

        System.out.println("📧 Iniciando envío de notificación de aprobación liviana a " + responsableEmail + " para Solicitud #" + solicitudId);
        try {
            Solicitud solicitud = solicitudRepository.findById(solicitudId)
                    .orElseThrow(() -> new RuntimeException("Solicitud no encontrada con ID: " + solicitudId));

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");

            String rawBeneficiario = solicitud.getPerson() != null && solicitud.getPerson().getName() != null
                    ? solicitud.getPerson().getName()
                    : "Sin Beneficiario";
            String beneficiario = org.springframework.web.util.HtmlUtils.htmlEscape(rawBeneficiario);

            String rawTipo = (tipoResolucion != null && !tipoResolucion.trim().isEmpty())
                    ? tipoResolucion
                    : (solicitud.getType() != null ? solicitud.getType() : "Solicitud General");
            String tipoDisplay = org.springframework.web.util.HtmlUtils.htmlEscape(rawTipo);

            helper.setTo(responsableEmail);
            helper.setSubject(String.format("[SGP] Solicitud Aprobada - #%d", solicitud.getId()));

            String directUrl = frontendUrl + "/mis-solicitudes?id=" + solicitud.getId();

            String rawObs = (observaciones != null && !observaciones.trim().isEmpty())
                    ? observaciones
                    : (solicitud.getObservation() != null ? solicitud.getObservation() : "Sin observaciones registradas.");
            String obsDisplay = org.springframework.web.util.HtmlUtils.htmlEscape(rawObs);

            // Construcción de plantilla HTML liviana, responsive e institucional
            String htmlContent = String.format(
                    "<!DOCTYPE html>" +
                    "<html lang='es'>" +
                    "<head><meta charset='UTF-8'></head>" +
                    "<body style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px;'>" +
                    "  <table align='center' border='0' cellpadding='0' cellspacing='0' width='100%%' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>" +
                    "    <tr>" +
                    "      <td style='background-color: #10b981; padding: 24px; text-align: center; color: #ffffff;'>" +
                    "        <h1 style='margin: 0; font-size: 22px; font-weight: 700;'>✅ Solicitud Aprobada</h1>" +
                    "        <p style='margin: 6px 0 0; font-size: 14px; opacity: 0.9;'>Sistema de Gestión Política (SGP)</p>" +
                    "      </td>" +
                    "    </tr>" +
                    "    <tr>" +
                    "      <td style='padding: 28px; color: #1f2937;'>" +
                    "        <p style='font-size: 15px; margin-top: 0;'>Estimado/a Responsable Territorial,</p>" +
                    "        <p style='font-size: 14px; line-height: 1.5; color: #4b5563;'>" +
                    "          Le informamos que se ha aprobado exitosamente una resolución para la siguiente solicitud bajo su jurisdicción:" +
                    "        </p>" +
                    "        <table style='width: 100%%; margin: 20px 0; border-collapse: collapse; font-size: 14px;'>" +
                    "          <tr style='border-bottom: 1px solid #e5e7eb;'><td style='padding: 10px 0; font-weight: 600; color: #374151; width: 35%%;'>N° de Solicitud:</td><td style='padding: 10px 0; color: #111827;'>#%d</td></tr>" +
                    "          <tr style='border-bottom: 1px solid #e5e7eb;'><td style='padding: 10px 0; font-weight: 600; color: #374151;'>Beneficiario / Solicitante:</td><td style='padding: 10px 0; color: #111827;'>%s</td></tr>" +
                    "          <tr style='border-bottom: 1px solid #e5e7eb;'><td style='padding: 10px 0; font-weight: 600; color: #374151;'>Tipo:</td><td style='padding: 10px 0; color: #111827;'>%s</td></tr>" +
                    "          <tr style='border-bottom: 1px solid #e5e7eb;'><td style='padding: 10px 0; font-weight: 600; color: #374151;'>Observaciones:</td><td style='padding: 10px 0; color: #111827;'>%s</td></tr>" +
                    "        </table>" +
                    "        <div style='text-align: center; margin: 32px 0 16px;'>" +
                    "          <a href='%s' target='_blank' style='background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);'>Ver Solicitud en el Sistema</a>" +
                    "        </div>" +
                    "        <p style='font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;'>Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br/><a href='%s' style='color: #4f46e5;'>%s</a></p>" +
                    "      </td>" +
                    "    </tr>" +
                    "    <tr>" +
                    "      <td style='background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;'>" +
                    "        Sistema de Gestión Política &bull; Notificación Automática Oficial" +
                    "      </td>" +
                    "    </tr>" +
                    "  </table>" +
                    "</body>" +
                    "</html>",
                    solicitud.getId(),
                    beneficiario,
                    tipoDisplay,
                    obsDisplay,
                    directUrl,
                    directUrl,
                    directUrl
            );

            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            System.out.println("✅ Notificación liviana de aprobación enviada exitosamente a: " + responsableEmail);

        } catch (Exception e) {
            System.err.println("❌ Error al enviar notificación de aprobación liviana para Solicitud #" + solicitudId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

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
