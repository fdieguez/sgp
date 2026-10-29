package com.sgp.backend.controller;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/logs")
@Slf4j
public class LogController {

    private static final Logger frontendLogger = LoggerFactory.getLogger("frontend-logger");

    @PostMapping("/frontend")
    public void logFrontend(@RequestBody Map<String, Object> logData) {
        String level = (String) logData.getOrDefault("level", "INFO");
        String message = (String) logData.getOrDefault("message", "");
        String stack = (String) logData.getOrDefault("stack", "");

        // Sanitización para prevenir Log Injection (CWE-117) limitando longitud y neutralizando CRLF
        String cleanMessage = message != null ? message.replaceAll("[\r\n]", " ") : "";
        if (cleanMessage.length() > 500) {
            cleanMessage = cleanMessage.substring(0, 500) + "... [truncado]";
        }

        String cleanStack = stack != null ? stack.replaceAll("[\r\n]", " | ") : "";
        if (cleanStack.length() > 1000) {
            cleanStack = cleanStack.substring(0, 1000) + "... [truncado]";
        }
        
        String formattedMessage = String.format("[FRONTEND] %s %s", cleanMessage, cleanStack.isEmpty() ? "" : "Stack: " + cleanStack);

        switch (level != null ? level.toUpperCase() : "INFO") {
            case "ERROR":
                frontendLogger.error(formattedMessage);
                break;
            case "WARN":
                frontendLogger.warn(formattedMessage);
                break;
            default:
                frontendLogger.info(formattedMessage);
                break;
        }
    }
}
