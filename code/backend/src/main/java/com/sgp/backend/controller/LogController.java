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
        
        String formattedMessage = String.format("[FRONTEND] %s %s", message, stack.isEmpty() ? "" : "\nStack: " + stack);

        switch (level.toUpperCase()) {
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
