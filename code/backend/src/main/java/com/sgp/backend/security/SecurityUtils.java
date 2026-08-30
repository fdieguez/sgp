package com.sgp.backend.security;

import com.sgp.backend.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class SecurityUtils {

    /**
     * Obtiene el rol activo del usuario para la sesión actual a partir de la cabecera HTTP 'X-Active-Role'.
     * Si la cabecera no está presente o el rol solicitado no es válido para el usuario,
     * se retorna el string de todos sus roles como fallback.
     */
    public static String getActiveRole(User user) {
        if (user == null) return null;
        
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String activeRole = request.getHeader("X-Active-Role");
                if (activeRole != null && !activeRole.trim().isEmpty()) {
                    String cleanRole = activeRole.trim().toUpperCase();
                    String userRoles = user.getRole();
                    if (userRoles != null) {
                        for (String r : userRoles.split(",")) {
                            if (r.trim().equalsIgnoreCase(cleanRole)) {
                                return cleanRole;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Fuera de contexto HTTP o error
        }
        
        return user.getRole();
    }
}
