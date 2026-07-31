package com.sgp.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableAsync
public class SgpApplication {

    public static void main(String[] args) {
        SpringApplication.run(SgpApplication.class, args);
    }

}
