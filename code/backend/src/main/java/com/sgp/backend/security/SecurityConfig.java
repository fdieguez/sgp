package com.sgp.backend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

import java.util.List;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthFilter;
        private final UserDetailsService userDetailsService;

        @Value("${spring.profiles.active:dev}")
        private String activeProfile;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                boolean isProd = "prod".equalsIgnoreCase(activeProfile);

                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(AbstractHttpConfigurer::disable)
                                .headers(headers -> headers.frameOptions(
                                                org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                                .authorizeHttpRequests(auth -> {
                                        // Endpoints Públicos de Autenticación
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/auth/login")).permitAll();
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/welcome")).permitAll();
                                        auth.requestMatchers(new AntPathRequestMatcher("/error")).permitAll();

                                        // Endpoints de Pruebas y Consola H2: Exclusivamente permitidos en entornos no productivos
                                        if (!isProd) {
                                                auth.requestMatchers(new AntPathRequestMatcher("/api/test-helper/**")).permitAll();
                                                auth.requestMatchers(new AntPathRequestMatcher("/h2-console/**")).permitAll();
                                        }

                                        // Endpoints de Sincronización de Planilla de Salida (Accesible para ADMIN y RESOLUTOR)
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/planilla-salida/**"))
                                                .hasAnyRole("ADMINISTRADOR", "RESOLUTOR");

                                        // Endpoints Administrativos y de Configuración
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/admin/**")).hasRole("ADMINISTRADOR");
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/sync/**")).hasRole("ADMINISTRADOR");
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/config/**", "GET")).hasAnyRole("ADMINISTRADOR", "RESOLUTOR");
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/config/**", "PUT")).hasAnyRole("ADMINISTRADOR", "RESOLUTOR");
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/config/**/check-calendar", "POST")).hasAnyRole("ADMINISTRADOR", "RESOLUTOR");
                                        auth.requestMatchers(new AntPathRequestMatcher("/api/config/**")).hasRole("ADMINISTRADOR");

                                        // Cualquier otra solicitud requiere autenticación obligatoria
                                        auth.anyRequest().authenticated();
                                })
                                .exceptionHandling(exceptions -> exceptions
                                                // Manejador para solicitudes no autenticadas o con token vencido / inválido (401)
                                                .authenticationEntryPoint((request, response, authException) -> {
                                                        response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                                                        response.setContentType("application/json");
                                                        response.setCharacterEncoding("UTF-8");
                                                        response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"Token inválido o sesión expirada\"}");
                                                })
                                                // Manejador para usuarios autenticados sin permisos de rol suficientes (403)
                                                .accessDeniedHandler((request, response, accessDeniedException) -> {
                                                        response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                                                        response.setContentType("application/json");
                                                        response.setCharacterEncoding("UTF-8");
                                                        response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"Acceso no autorizado al recurso solicitado\"}");
                                                })
                                )
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                                .authenticationProvider(authenticationProvider())
                                                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
                org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
                // Restricción estricta de orígenes autorizados para prevenir explotación Cross-Origin (CORS)
                configuration.setAllowedOriginPatterns(List.of(
                                "http://localhost*",
                                "http://127.0.0.1*",
                                "https://solicitudes.ultrasoft.website",
                                "http://solicitudes.ultrasoft.website",
                                "http://149.50.128.168*"
                ));
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition", "X-Active-Role"));
                configuration.setAllowCredentials(true);
                org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        @Bean
        public AuthenticationProvider authenticationProvider() {
                DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
                authProvider.setUserDetailsService(userDetailsService);
                authProvider.setPasswordEncoder(passwordEncoder());
                return authProvider;
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }
}
