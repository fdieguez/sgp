package com.sgp.backend.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

@Service
public class GoogleSheetsService {

    private static final String APPLICATION_NAME = "SGP Backend";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String CREDENTIALS_FILE_PATH = "/credentials.json";
    private static final List<String> SCOPES = Collections.singletonList(SheetsScopes.SPREADSHEETS);

    private Sheets sheetsService;

    public GoogleSheetsService() throws IOException, GeneralSecurityException {
        // Inicializar el servicio de Google Sheets al arrancar
        this.sheetsService = createSheetsService();
    }

    private Sheets createSheetsService() throws IOException, GeneralSecurityException {
        InputStream in = GoogleSheetsService.class.getResourceAsStream(CREDENTIALS_FILE_PATH);
        if (in == null) {
            throw new IOException("Recurso no encontrado: " + CREDENTIALS_FILE_PATH);
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                .createScoped(SCOPES);

        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JSON_FACTORY,
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * Obtiene los títulos de todas las hojas contenidas en la planilla.
     */
    public List<String> getSheetTitles(String spreadsheetId) throws IOException {
        com.google.api.services.sheets.v4.model.Spreadsheet spreadsheet = sheetsService.spreadsheets()
                .get(spreadsheetId)
                .execute();
        List<com.google.api.services.sheets.v4.model.Sheet> sheets = spreadsheet.getSheets();
        List<String> titles = new java.util.ArrayList<>();
        for (com.google.api.services.sheets.v4.model.Sheet sheet : sheets) {
            titles.add(sheet.getProperties().getTitle());
        }
        return titles;
    }

    /**
     * Lee los valores de un rango específico de una planilla de Google Sheets.
     * 
     * @param spreadsheetId El ID de la planilla (extraído de la URL).
     * @param range         El rango en notación A1 (ej: "Planilla1!A1:E10").
     * @return Una lista de filas, donde cada fila es una lista de objetos (valores de celda).
     */
    public List<List<Object>> readSheet(String spreadsheetId, String range) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute();

        return response.getValues();
    }

    /**
     * Escribe valores en un rango específico de una planilla de Google Sheets.
     * 
     * @param spreadsheetId El ID de la planilla (extraído de la URL).
     * @param range         El rango en notación A1 (ej: "Planilla de Salida!A2:AB").
     * @param values        La matriz de valores a escribir.
     */
    public void writeSheet(String spreadsheetId, String range, List<List<Object>> values) throws IOException {
        ValueRange body = new ValueRange().setValues(values);
        sheetsService.spreadsheets().values()
                .update(spreadsheetId, range, body)
                .setValueInputOption("USER_ENTERED")
                .execute();
    }

    /**
     * Agrega valores de forma incremental en una planilla de Google Sheets.
     *
     * @param spreadsheetId El ID de la planilla (extraído de la URL).
     * @param range         El rango o nombre de la hoja en notación A1 (ej: "Planilla de Salida!A1").
     * @param values        La matriz de valores a agregar.
     */
    public void appendSheet(String spreadsheetId, String range, List<List<Object>> values) throws java.io.IOException {
        ValueRange body = new ValueRange().setValues(values);
        sheetsService.spreadsheets().values()
                .append(spreadsheetId, range, body)
                .setValueInputOption("USER_ENTERED")
                .setInsertDataOption("INSERT_ROWS")
                .execute();
    }

    /**
     * Limpia o vacía las celdas de un rango específico de una planilla de Google Sheets.
     *
     * @param spreadsheetId El ID de la planilla.
     * @param range         El rango en notación A1 (ej: "Planilla de Salida!A3:Z1000").
     */
    public void clearSheet(String spreadsheetId, String range) throws java.io.IOException {
        sheetsService.spreadsheets().values()
                .clear(spreadsheetId, range, new com.google.api.services.sheets.v4.model.ClearValuesRequest())
                .execute();
    }
}

