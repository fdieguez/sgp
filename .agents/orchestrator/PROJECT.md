# Project: SGP Bugfixes — LazyInitialization, Google Calendar Multirrol & Consideración Security

## Architecture
- Backend: Java Spring Boot service (`EmailService.java`, `SolicitudService.java`)
- Frontend: React components (`ProjectDetailsPage.jsx`, `SolicitudModal.jsx`)
- End-to-End Tests: Playwright (`tests/playwright_sgp.spec.js`)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Exploration | Codebase & test analysis for EmailService, SolicitudService, ProjectDetailsPage, SolicitudModal | None | DONE |
| 2 | M2: Implementation & Hardening | Backend & Frontend bugfixes + Spanish comments + unit tests | M1 | DONE |
| 3 | M3: Review & Verification | Code review, unit test execution (`mvn test`), E2E execution (`playwright`) | M2 | DONE |
| 4 | M4: Forensic Integrity Audit | Forensic audit of code, comments in Spanish, verification clean check | M3 | DONE |

## Interface Contracts
- Requirement 1: `EmailService.java` -> Mark `@Async public void sendSubsidioApprovedEmail(...)` with `@org.springframework.transaction.annotation.Transactional(readOnly = true)`.
- Requirement 2: `SolicitudService.java` -> In `aprobarAsignacion`, evaluate `assignment.getTipoResolucion()` instead of `saved.getType()` for Google Calendar and Subsidio email triggers (~lines 652 & 671).
- Requirement 3a: `SolicitudService.java` -> In `ponerEnConsideracion`, get authenticated user and check if role is `"RESOLUTOR"`. If so, verify that `"SUBSIDIO"` is among dynamic formats (`formatosDinamicos`). Throw `ResponseStatusException(HttpStatus.FORBIDDEN, ...)` if missing.
- Requirement 3b: `ProjectDetailsPage.jsx` -> Render "Poner en Consideración" button only if user is Admin, Responsable, or Subsidio Resolutor (`isResolutorSubsidio === true`).
- Requirement 3c: `SolicitudModal.jsx` -> Render `<option value="consideracion">Consideración</option>` only for authorized users (Admin, Responsable, or Subsidio Resolutor).
- Requirement 4: All comments, notes, and commits MUST be exclusively in SPANISH (ESPAÑOL).

## Code Layout
- Backend: `code/backend/src/main/java/com/sgp/backend/service/` (`EmailService.java`, `SolicitudService.java`)
- Frontend: `code/frontend/src/pages/ProjectDetailsPage.jsx`, `code/frontend/src/components/SolicitudModal.jsx`
- E2E Tests: `code/frontend/tests/playwright_sgp.spec.js`
