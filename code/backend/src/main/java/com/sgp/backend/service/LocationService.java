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
        return locationRepository.findByParentId(null);
    }

    public Location createLocation(Location location) {
        return locationRepository.save(location);
    }
}
