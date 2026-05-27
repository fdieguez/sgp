package com.sgp.backend.repository;

import com.sgp.backend.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {
    java.util.Optional<Location> findFirstByName(String name);
    
    java.util.Optional<Location> findFirstByNameAndType(String name, String type);

    java.util.Optional<Location> findFirstByNameAndParentId(String name, Long parentId);
    
    java.util.Optional<Location> findFirstByNameAndParentIdAndType(String name, Long parentId, String type);

    List<Location> findByParent(Location parent);

    List<Location> findByType(String type);

    List<Location> findByShowInUiTrueOrType(String type);
}
