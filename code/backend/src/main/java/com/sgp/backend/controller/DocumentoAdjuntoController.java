package com.sgp.backend.controller;

import com.sgp.backend.entity.DocumentoAdjunto;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.DocumentoAdjuntoRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.service.FileService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
public class DocumentoAdjuntoController {

    private final DocumentoAdjuntoRepository documentoAdjuntoRepository;
    private final SolicitudRepository solicitudRepository;
    private final UserRepository userRepository;
    private final FileService fileService;

    @Value("${sgp.attachments.max-size-mb:10}")
    private long maxSizeMb;

    @Value("${sgp.attachments.allowed-extensions:pdf,png,jpg,jpeg,xls,xlsx,csv,doc,docx,txt}")
    private String allowedExtensionsCsv;

    public DocumentoAdjuntoController(
            DocumentoAdjuntoRepository documentoAdjuntoRepository,
            SolicitudRepository solicitudRepository,
            UserRepository userRepository,
            FileService fileService) {
        this.documentoAdjuntoRepository = documentoAdjuntoRepository;
        this.solicitudRepository = solicitudRepository;
        this.userRepository = userRepository;
        this.fileService = fileService;
    }

    @PostMapping("/{solicitudId}/adjuntos")
    public ResponseEntity<?> uploadFile(@PathVariable Long solicitudId, @RequestParam("file") MultipartFile file) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

        // 1. Validar Tamaño del Archivo
        long maxSizeBytes = maxSizeMb * 1024 * 1024;
        if (file.getSize() > maxSizeBytes) {
            return ResponseEntity.badRequest().body("El archivo supera el límite de tamaño permitido de " + maxSizeMb + " MB.");
        }

        // 2. Validar Extensión del Archivo
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.contains(".")) {
            return ResponseEntity.badRequest().body("El archivo no tiene una extensión válida.");
        }
        
        String extension = originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase();
        List<String> allowedList = Arrays.asList(allowedExtensionsCsv.split(","));
        boolean isAllowed = allowedList.stream().anyMatch(ext -> ext.trim().equalsIgnoreCase(extension));
        if (!isAllowed) {
            return ResponseEntity.badRequest().body("Extensión de archivo no permitida. Las permitidas son: " + allowedExtensionsCsv);
        }

        User currentUser = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        String fileName = fileService.storeFile(file);

        DocumentoAdjunto adjunto = DocumentoAdjunto.builder()
                .fileName(fileName)
                .originalFileName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .size(file.getSize())
                .solicitud(solicitud)
                .uploadedBy(currentUser)
                .uploadedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(documentoAdjuntoRepository.save(adjunto));
    }

    @GetMapping("/{solicitudId}/adjuntos")
    public ResponseEntity<List<DocumentoAdjunto>> getAdjuntos(@PathVariable Long solicitudId) {
        return ResponseEntity.ok(documentoAdjuntoRepository.findBySolicitudIdOrderByUploadedAtDesc(solicitudId));
    }

    @GetMapping("/adjuntos/{adjuntoId}/download")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESOLUTOR', 'RESPONSABLE', 'LECTOR', 'OPERADOR', 'AUDITOR')")
    public ResponseEntity<?> downloadFile(@PathVariable Long adjuntoId) {
        DocumentoAdjunto adjunto = documentoAdjuntoRepository.findById(adjuntoId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        try {
            Resource resource = fileService.loadFileAsResource(adjunto.getFileName());
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(adjunto.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + adjunto.getOriginalFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("El archivo físico asociado a esta solicitud no existe o no pudo ser recuperado del almacenamiento.");
        }
    }

    @GetMapping("/adjuntos/{adjuntoId}/view")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESOLUTOR', 'RESPONSABLE', 'LECTOR', 'OPERADOR', 'AUDITOR')")
    public ResponseEntity<?> viewFileInline(@PathVariable Long adjuntoId) {
        DocumentoAdjunto adjunto = documentoAdjuntoRepository.findById(adjuntoId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        try {
            Resource resource = fileService.loadFileAsResource(adjunto.getFileName());
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(adjunto.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + adjunto.getOriginalFileName() + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("El archivo físico asociado a esta solicitud no existe o no pudo ser recuperado del almacenamiento.");
        }
    }
    
    @DeleteMapping("/adjuntos/{adjuntoId}")
    public ResponseEntity<Void> deleteAdjunto(@PathVariable Long adjuntoId) {
        DocumentoAdjunto adjunto = documentoAdjuntoRepository.findById(adjuntoId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));
                
        try {
            fileService.deleteFile(adjunto.getFileName());
        } catch (Exception e) {
            System.err.println("Advertencia al borrar archivo del disco: " + e.getMessage());
        }
        
        documentoAdjuntoRepository.delete(adjunto);
        
        return ResponseEntity.ok().build();
    }
}
