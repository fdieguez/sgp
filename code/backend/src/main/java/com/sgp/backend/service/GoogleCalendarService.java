package com.sgp.backend.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * Servicio encargado de la integración con Google Calendar.
 * Permite registrar eventos asociados a Agendas aprobadas de forma asíncrona.
 */
@Service
@RequiredArgsConstructor
public class GoogleCalendarService {

    private static final String APPLICATION_NAME = "SGP Backend Calendar";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String CREDENTIALS_FILE_PATH = "/credentials.json";
    private static final List<String> SCOPES = Collections.singletonList(CalendarScopes.CALENDAR);

    private final SolicitudRepository solicitudRepository;

    /**
     * Inicializa y retorna el cliente de la API de Google Calendar usando la Cuenta de Servicio.
     */
    private Calendar getCalendarService() throws IOException, GeneralSecurityException {
        InputStream in = GoogleCalendarService.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
        if (in == null) {
            throw new IOException("Recurso de credenciales no encontrado: " + CREDENTIALS_FILE_PATH);
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                .createScoped(SCOPES);

        return new Calendar.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JSON_FACTORY,
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * Crea un evento en el Google Calendar especificado con los datos customizados desde el frontend.
     */
    @Async
    public void createEvent(String calendarId, String title, String description, String location, String dateStr, String timeStr, Long agendaId) {
        System.out.println("📅 Iniciando creación de evento en Google Calendar de forma asíncrona para la Agenda #" + agendaId);
        try {
            Calendar calendarService = getCalendarService();

            Event event = new Event()
                    .setSummary(title)
                    .setDescription(description)
                    .setLocation(location);

            if (timeStr != null && !timeStr.trim().isEmpty()) {
                // Evento con hora específica
                String dateTimeStr = dateStr + "T" + timeStr + ":00-03:00"; // Asumiendo zona horaria de Argentina (UTC-3)
                DateTime startDateTime = new DateTime(dateTimeStr);
                EventDateTime start = new EventDateTime().setDateTime(startDateTime);
                event.setStart(start);
                
                // Por defecto, duración de 1 hora
                java.time.LocalDateTime startLocal = java.time.LocalDateTime.parse(dateStr + "T" + timeStr);
                java.time.LocalDateTime endLocal = startLocal.plusHours(1);
                DateTime endDateTime = new DateTime(endLocal.toString() + ":00-03:00");
                EventDateTime end = new EventDateTime().setDateTime(endDateTime);
                event.setEnd(end);
            } else {
                // Evento de todo el día
                DateTime startDateTime = new DateTime(dateStr);
                EventDateTime start = new EventDateTime().setDate(startDateTime);
                event.setStart(start);

                LocalDate eventDate = LocalDate.parse(dateStr);
                DateTime endDateTime = new DateTime(eventDate.plusDays(1).toString());
                EventDateTime end = new EventDateTime().setDate(endDateTime);
                event.setEnd(end);
            }

            Event createdEvent = calendarService.events().insert(calendarId, event).execute();
            String googleEventId = createdEvent.getId();

            System.out.println("✅ Evento creado en Google Calendar exitosamente. ID del Evento: " + googleEventId);

            // Persistir el googleEventId en la base de datos si existe el agendaId
            if (agendaId != null) {
                Solicitud solicitud = solicitudRepository.findById(agendaId).orElse(null);
                if (solicitud != null) {
                    solicitud.setGoogleEventId(googleEventId);
                    solicitudRepository.save(solicitud);
                }
            }

        } catch (Exception e) {
            System.err.println("❌ Error al crear el evento en Google Calendar para la Agenda #" + agendaId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Comprueba si la cuenta de servicio tiene acceso al calendario especificado.
     */
    public boolean checkAccess(String calendarId) throws Exception {
        if (calendarId == null || calendarId.trim().isEmpty()) {
            throw new IllegalArgumentException("El ID de Google Calendar no puede estar vacío.");
        }
        Calendar calendarService = getCalendarService();
        // Intentar recuperar los metadatos básicos del calendario
        calendarService.calendars().get(calendarId).execute();
        return true;
    }
}
