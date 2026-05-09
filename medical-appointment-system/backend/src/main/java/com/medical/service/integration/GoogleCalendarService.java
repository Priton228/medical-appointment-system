package com.medical.service.integration;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.medical.entity.Appointment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class GoogleCalendarService {

    private static final String CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

    private final RestClient restClient = RestClient.create();

    @Value("${app.integrations.calendar.enabled:false}")
    private boolean calendarEnabled;

    @Value("${app.integrations.calendar.id:}")
    private String calendarId;

    @Value("${app.integrations.calendar.service-account-email:}")
    private String serviceAccountEmail;

    @Value("${app.integrations.calendar.service-account-private-key:}")
    private String serviceAccountPrivateKey;

    @Value("${app.integrations.calendar.service-account-private-key-id:}")
    private String serviceAccountPrivateKeyId;

    @Value("${app.integrations.calendar.time-zone:Europe/Minsk}")
    private String calendarTimeZone;

    public String createEvent(Appointment appointment) {
        if (!isConfigured()) {
            return null;
        }

        try {
            String token = getAccessToken();
            Map<String, Object> payload = buildEventPayload(appointment);

            Map<String, Object> response = restClient.post()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events", calendarId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return null;
            }

            Object id = response.get("id");
            return id == null ? null : id.toString();
        } catch (Exception ex) {
            log.error("Failed to create Google Calendar event for appointment {}", appointment.getId(), ex);
            return null;
        }
    }

    public void updateEvent(String eventId, Appointment appointment) {
        if (!isConfigured() || eventId == null || eventId.isBlank()) {
            return;
        }

        try {
            String token = getAccessToken();
            Map<String, Object> payload = buildEventPayload(appointment);

            restClient.patch()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}", calendarId, eventId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.error("Failed to update Google Calendar event {}", eventId, ex);
        }
    }

    public void deleteEvent(String eventId) {
        if (!isConfigured() || eventId == null || eventId.isBlank()) {
            return;
        }

        try {
            String token = getAccessToken();
            restClient.delete()
                    .uri("https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}", calendarId, eventId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.error("Failed to delete Google Calendar event {}", eventId, ex);
        }
    }

    private boolean isConfigured() {
        if (!calendarEnabled) {
            return false;
        }
        return !isBlank(calendarId)
                && !isBlank(serviceAccountEmail)
                && !isBlank(serviceAccountPrivateKey)
                && !isBlank(serviceAccountPrivateKeyId);
    }

    private String getAccessToken() throws Exception {
        ServiceAccountCredentials credentials = ServiceAccountCredentials.fromPkcs8(
                null,
                serviceAccountEmail,
                normalizePrivateKey(serviceAccountPrivateKey),
                serviceAccountPrivateKeyId,
                List.of(CALENDAR_SCOPE)
        );
        AccessToken token = credentials.refreshAccessToken();
        return token.getTokenValue();
    }

    private Map<String, Object> buildEventPayload(Appointment appointment) {
        LocalDateTime start = LocalDateTime.of(appointment.getSlot().getDate(), appointment.getSlot().getStartTime());
        LocalDateTime end = LocalDateTime.of(appointment.getSlot().getDate(), appointment.getSlot().getEndTime());

        String summary = "Medical appointment with Dr. " + appointment.getDoctor().getUser().getFullName();
        String description = "Patient: " + appointment.getPatient().getUser().getFullName() +
                "\\nSymptoms: " + safeText(appointment.getSymptomsDescription());

        return Map.of(
                "summary", summary,
                "description", description,
                "start", Map.of(
                        "dateTime", start.atZone(ZoneId.of(calendarTimeZone)).toOffsetDateTime().toString(),
                        "timeZone", calendarTimeZone
                ),
                "end", Map.of(
                        "dateTime", end.atZone(ZoneId.of(calendarTimeZone)).toOffsetDateTime().toString(),
                        "timeZone", calendarTimeZone
                )
        );
    }

    private String normalizePrivateKey(String value) {
        return value.replace("\\n", "\n").trim();
    }

    private String safeText(String value) {
        return value == null || value.isBlank() ? "Not specified" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
