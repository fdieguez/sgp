package com.sgp.backend.service;

import com.sgp.backend.entity.Location;
import com.sgp.backend.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public List<Location> getAllLocations() {
        return locationRepository.findAll();
    }

    public List<Location> getRootLocations() {
        return locationRepository.findByParent(null);
    }

    public Location createLocation(Location location) {
        return locationRepository.save(location);
    }

    public void deleteLocation(Long id) {
        locationRepository.deleteById(id);
    }

    public int cleanupLocations() {
        List<Location> all = locationRepository.findAll();
        int count = 0;
        List<String> badNames = List.of(
                "ZONA", "BARRIO", "LOCALIDAD", "MES", "CONTROL", "NOMBRE", "ESTADO", "RESPONSABLE",
                "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE",
                "NOVIEMBRE", "DICIEMBRE");

        for (Location loc : all) {
            String name = loc.getName().toUpperCase().trim();
            boolean isBad = false;

            if (name.length() < 2)
                isBad = true;
            if (badNames.contains(name))
                isBad = true;
            if (name.matches("\\d+"))
                isBad = true; // Just numbers
            if (name.startsWith("COLUMNA"))
                isBad = true;

            if (isBad) {
                try {
                    locationRepository.delete(loc);
                    count++;
                } catch (Exception e) {
                    // Might have foreign key constraints
                }
            }
        }
        return count;
    }
}
