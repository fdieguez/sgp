package com.sgp.backend.controller;

import com.sgp.backend.entity.DocumentoAdjunto;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.DocumentoAdjuntoRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
@RequiredArgsConstructor
public class DocumentoAdjuntoController {

    private final DocumentoAdjuntoRepository documentoAdjuntoRepository;
    private final SolicitudRepository solicitudRepository;
    private final UserRepository userRepository;
    private final FileService fileService;

    @PostMapping("/{solicitudId}/adjuntos")
    public ResponseEntity<DocumentoAdjunto> uploadFile(@PathVariable Long solicitudId, @RequestParam("file") MultipartFile file) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

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
    public ResponseEntity<Resource> downloadFile(@PathVariable Long adjuntoId) {
        DocumentoAdjunto adjunto = documentoAdjuntoRepository.findById(adjuntoId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        Resource resource = fileService.loadFileAsResource(adjunto.getFileName());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(adjunto.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + adjunto.getOriginalFileName() + "\"")
                .body(resource);
    }
    
    @DeleteMapping("/adjuntos/{adjuntoId}")
    public ResponseEntity<Void> deleteAdjunto(@PathVariable Long adjuntoId) {
        DocumentoAdjunto adjunto = documentoAdjuntoRepository.findById(adjuntoId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));
                
        fileService.deleteFile(adjunto.getFileName());
        documentoAdjuntoRepository.delete(adjunto);
        
        return ResponseEntity.ok().build();
    }
}
