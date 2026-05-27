package com.sgp.backend;

import com.sgp.backend.entity.Location;
import com.sgp.backend.repository.LocationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

@SpringBootTest
@ActiveProfiles("dev")
public class VerifyLocationsTest {

    @Autowired
    private LocationRepository locationRepository;

    @Test
    public void testVerifyLocations() {
        System.out.println("=== INICIO TEST DE VERIFICACION ===");
        
        long total = locationRepository.count();
        System.out.println("Total de localidades en la base de datos: " + total);

        Optional<Location> santaFe = locationRepository.findFirstByNameAndType("Santa Fe", "CITY");
        santaFe.ifPresent(loc -> System.out.println("Santa Fe -> ID: " + loc.getId() + ", Tipo: " + loc.getType() + ", showInUi: " + loc.getShowInUi()));

        Optional<Location> lagunaPaiva = locationRepository.findFirstByNameAndType("Laguna Paiva", "CITY");
        lagunaPaiva.ifPresent(loc -> System.out.println("Laguna Paiva -> ID: " + loc.getId() + ", Tipo: " + loc.getType() + ", showInUi: " + loc.getShowInUi()));

        List<Location> showInUiTrue = locationRepository.findByShowInUiTrueOrType("NEIGHBORHOOD");
        long showInUiTrueCount = showInUiTrue.stream().filter(l -> Boolean.TRUE.equals(l.getShowInUi())).count();
        System.out.println("Cantidad de localidades con showInUi=true (excluyendo barrios por defecto): " + showInUiTrueCount);
        
        System.out.println("=== FIN TEST DE VERIFICACION ===");
    }
}
