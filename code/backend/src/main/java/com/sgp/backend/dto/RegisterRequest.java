package com.sgp.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String firstName;
    private String lastName;
    private java.time.LocalDate birthDate;
    private String password;
    private String role; // OPTIONAL, defaults to USER if null
}
