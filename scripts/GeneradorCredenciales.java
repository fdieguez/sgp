package scripts;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Generador maestro de nuevas credenciales para usuarios de SGP.
 * Reemplaza el patrón '2026' por un código aleatorio alfanumérico seguro de 4 caracteres.
 * Genera los hashes BCrypt oficiales de Spring Security y actualiza de forma atómica:
 * 1. El script SQL con transacciones para las bases de datos de producción y local.
 * 2. La nómina completa en usuarios_contrasenas_sgp.txt y docs/usuarios_contrasenas_sgp.txt.
 * 3. El archivo CSV usuarios_credenciales_envio.csv con los 44 destinatarios oficiales.
 */
public class GeneradorCredenciales {

    // Caracteres alfanuméricos nítidos sin ambigüedad tipográfica (sin 0, O, 1, I, l)
    private static final String ALPHANUMERIC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generarCodigoRandom4() {
        StringBuilder sb = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            int index = RANDOM.nextInt(ALPHANUMERIC.length());
            sb.append(ALPHANUMERIC.charAt(index));
        }
        return sb.toString();
    }

    public static class UsuarioDef {
        int index;
        String nombre;
        String roles;
        String email;
        String passTemplate;
        String zona;
        String telefono;
        String dni;

        public UsuarioDef(int index, String nombre, String roles, String email, String passTemplate, String zona, String telefono, String dni) {
            this.index = index;
            this.nombre = nombre;
            this.roles = roles;
            this.email = email;
            this.passTemplate = passTemplate;
            this.zona = zona;
            this.telefono = telefono;
            this.dni = dni;
        }
    }

    public static class UsuarioProcesado {
        UsuarioDef def;
        String codigo4;
        String passNueva;
        String passHash;
    }

    public static void main(String[] args) throws Exception {
        List<UsuarioDef> listaMaestra = Arrays.asList(
            new UsuarioDef(1, "Admin Supremo", "ADMINISTRADOR", "admin@sgp.com", "SGP_Admin_#2026_Prod_Secure_!", "Administración Total", "3420000000", "12.345.678"),
            new UsuarioDef(2, "Maria Celeste Solari", "OPERADOR", "celeste_solari19@hotmail.com", "Celeste_SGP_2026#", "Mesa de Entrada", "3424760480", "30562372"),
            new UsuarioDef(3, "Sabrina Schmidt", "OPERADOR", "sabrivschmidt@gmail.com", "Sabrina_SGP_2026$", "Mesa de Entrada", "3424777085", "31273418"),
            new UsuarioDef(4, "Matías Ippólito", "RESPONSABLE,DISTRIBUIDOR", "matias.ippolito@gmail.com", "Matias_Dist_SGP_2026!", "NORTE", "3426148609", "28925931"),
            new UsuarioDef(5, "Maxi Caraffa", "RESPONSABLE,DISTRIBUIDOR", "caraffamaxi@gmail.com", "Maxi!2026$Lh", "GENERAL", "3425129767", "33568046"),
            new UsuarioDef(6, "Florencia Vildoza", "RESPONSABLE,DISTRIBUIDOR", "fy.vildoza@gmail.com", "Florencia$2026#Uw", "GENERAL", "3425008539", "35448744"),
            new UsuarioDef(7, "Martin Nocioni", "RESPONSABLE,RESOLUTOR", "martinnocioni@gmail.com", "Martin_SGP_2026*", "SUBSIDIO (General)", "3426144703", "31111251"),
            new UsuarioDef(8, "Verónica González", "RESPONSABLE,RESOLUTOR", "mveronicagonzalez79@gmail.com", "Maria_SGP_2026%", "AGENDA (Primer Cordón)", "3425119354", "27620830"),
            new UsuarioDef(9, "Eduardo Alfaro", "RESPONSABLE,RESOLUTOR", "ealfaro.51@gmail.com", "Eduardo_SGP_2026^", "DEC. INTERÉS (Primer Cordón)", "3434404035", "32831230"),
            new UsuarioDef(10, "Resolutor Defecto", "RESOLUTOR", "resolutor@sgp.com", "Resolutor_SGP_2026!", "Resoluciones Generales", "3420000000", "31.222.333"),
            new UsuarioDef(11, "Juan Manuel Dieguez", "AUDITOR", "juanm.dieguez@gmail.com", "Juan$2026@Gd", "Auditoría General", "3424734898", "31058854"),
            new UsuarioDef(12, "Auditor Seguimiento", "AUDITOR", "test.auditor@gmail.com", "Auditor_SGP_2026!", "Control / QA", "3424444444", "36.666.666"),
            new UsuarioDef(13, "Auditor Sheets", "LECTOR", "auditor.sheets@gmail.com", "Lector_SGP_2026#", "Planillas Google Sheets", "3420000000", "33.444.555"),
            new UsuarioDef(14, "Leandro Suarez Aufranc", "RESPONSABLE", "lea.aufranc@gmail.com", "Leandro&2026&Kb", "GENERAL", "3425009056", "35468210"),
            new UsuarioDef(15, "Alejandro Fluchá", "RESPONSABLE", "adflucha@gmail.com", "Alejandro#2026!Dt", "RESTO DEPTO", "3424766314", "37451391"),
            new UsuarioDef(16, "Ignacio Alurralde", "RESPONSABLE", "ignaciojosealurralde@gmail.com", "Ignacio&2026#Al", "GENERAL", "3424215352", "37333237"),
            new UsuarioDef(17, "Juan Bonadeo", "RESPONSABLE", "nacho.bonadeo@gmail.com", "Juan@2026$Fa", "NOROESTE", "3424781312", "34301949"),
            new UsuarioDef(18, "Victor González", "RESPONSABLE", "vicnanogonzalez@gmail.com", "Victor$2026#Gz", "NOROESTE", "3425666421", "35457814"),
            new UsuarioDef(19, "Mauricio Leguizamon", "RESPONSABLE", "mj.leguizamon05@gmail.com", "Mauricio$2026!Nx", "NORTE", "3425352263", "29378048"),
            new UsuarioDef(20, "Sol Benitez", "RESPONSABLE", "sol.benitez.sf@gmail.com", "Sol#2026@Bt", "NORESTE", "3424879211", "34761961"),
            new UsuarioDef(21, "Aldana Erika Perez", "RESPONSABLE", "aldanaperez941@gmail.com", "Aldana!2026&Pz", "NORESTE", "3424050857", "27600202"),
            new UsuarioDef(22, "Victor Hugo Gonzalez", "RESPONSABLE", "victorhugogonzalez618@gmail.com", "Victor@2026!Rk", "OESTE", "3424348588", "16203521"),
            new UsuarioDef(23, "Seba Baez", "RESPONSABLE", "lucianobaez0505@gmail.com", "Seba!2026#Bg", "OESTE", "3424211791", "30501806"),
            new UsuarioDef(24, "Javier Cuello", "RESPONSABLE", "javier.i.cuello@gmail.com", "Javier#2026&Tu", "SUROESTE", "3425289616", "29618855"),
            new UsuarioDef(25, "Gastón Machicote", "RESPONSABLE", "machicotegaston@gmail.com", "Gaston@2026$Lq", "SUROESTE", "3425161923", "35448175"),
            new UsuarioDef(26, "Carina Devard", "RESPONSABLE", "carinacdevard@gmail.com", "Carina!2026!Qg", "MONTE VERA", "3425346032", "22861416"),
            new UsuarioDef(27, "Hernán Rubens Dorigo", "RESPONSABLE", "hrdorigo@gmail.com", "Hernan&2026!Dz", "MONTE VERA", "3424638141", "25402746"),
            new UsuarioDef(28, "María Florencia Barducco", "RESPONSABLE", "florenciabarducco@gmail.com", "Maria!2026#Tg", "MONTE VERA", "3424497204", "33839349"),
            new UsuarioDef(29, "Facu Lanfranchi", "RESPONSABLE", "faculanfranchi@gmail.com", "Facu&2026&Ge", "RECREO", "3425413301", "31419507"),
            new UsuarioDef(30, "Analia Masutti", "RESPONSABLE", "analiamasutti@gmail.com", "Analia&2026&Xq", "RECREO", "3434608357", "33322523"),
            new UsuarioDef(31, "Diego Piedrabuena", "RESPONSABLE", "diegopiedrabuena74@gmail.com", "Diego#2026&Mn", "SAUCE VIEJO", "3424460555", "23738440"),
            new UsuarioDef(32, "Ayelén Collado", "RESPONSABLE", "ayecollado89@gmail.com", "Ayelen$2026&Gj", "SANTO TOME", "3425430464", "34394418"),
            new UsuarioDef(33, "China Rodriguez Del Curto", "RESPONSABLE", "camilarodriguezdelcurto@gmail.com", "China$2026!Fc", "RINCON", "3425357954", "33891921"),
            new UsuarioDef(34, "Erica Figueroa", "RESPONSABLE", "erifigueroa1905@gmail.com", "Erica@2026!Jb", "RINCON", "3424680912", "31873373"),
            new UsuarioDef(35, "Ayelen Dutruel", "RESPONSABLE", "ayelencdutruel@gmail.com", "Ayelen&2026#Vh", "COSTA", "3425211843", "34748919"),
            new UsuarioDef(36, "Mauricio Armando", "RESPONSABLE", "mauricio.luis82@gmail.com", "Mauricio@2026#Ar", "ARROYO LEYES", "3426105454", "29505974"),
            new UsuarioDef(37, "Ramiro Arola lecour", "RESPONSABLE", "rarolalecour@gmail.com", "Ramiro!2026$Lc", "ARROYO LEYES", "3425272965", "29242196"),
            new UsuarioDef(38, "Lorena Fortonani", "RESPONSABLE", "lorefortonani@gmail.com", "Lorena#2026&Ft", "PRIMER CORDON", "3426980011", "30432280"),
            new UsuarioDef(39, "Eugenio Serafino", "RESPONSABLE", "serafinoeugenio@gmail.com", "Eugenio&2026!Sf", "PRIMER CORDON", "3424072359", "31419336"),
            new UsuarioDef(40, "Damian Ciorciari", "RESPONSABLE", "damianciorciari@gmail.com", "Damian@2026$Cr", "PRIMER CORDON", "3424771102", "32702548"),
            new UsuarioDef(41, "Axel Dario Menor", "RESPONSABLE", "axeldariomenor@gmail.com", "Axel&2026!Gf", "DEPORTIVO", "3424297493", "21412093"),
            new UsuarioDef(42, "Milagros Cáceres", "RESPONSABLE", "milagrosscaceres@gmail.com", "Milagros$2026#Hp", "JUVENTUDES", "3425139472", "40646661"),
            new UsuarioDef(43, "Barbara Brancatto", "RESPONSABLE", "barbarabrancatto@gmail.com", "Barbara_Resp_SGP_2026!", "EDUCACION", "3424216840", "26972841"),
            new UsuarioDef(44, "Joaquín Simon", "RESPONSABLE", "quinchosimon11@gmail.com", "Joaquin#2026!Sm", "CULTURA", "3425211879", "33988572"),
            new UsuarioDef(45, "Luz Marina Garcia Rossi", "RESPONSABLE", "luzmarinagrossi@gmail.com", "Luz@2026$Gr", "CULTURA", "3425390264", "32176402"),
            new UsuarioDef(46, "German Rosas", "RESPONSABLE", "germanerosas@gmail.com", "German!2026&Rs", "CULTURA", "3424724705", "34162828"),
            new UsuarioDef(47, "Carina Gonzalez", "RESPONSABLE", "carina.gonzalez023@gmail.com", "Carina#2026@Gz", "CULTURA", "3425323610", "33568517"),
            new UsuarioDef(48, "Evelyn Wenetz", "RESPONSABLE", "wenetze@gmail.com", "Evelyn$2026!Wz", "CULTURA", "3424484878", "36814305")
        );

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        List<UsuarioProcesado> procesados = new ArrayList<>();

        for (UsuarioDef def : listaMaestra) {
            UsuarioProcesado up = new UsuarioProcesado();
            up.def = def;
            up.codigo4 = generarCodigoRandom4();
            up.passNueva = def.passTemplate.replace("2026", up.codigo4);
            up.passHash = encoder.encode(up.passNueva);
            procesados.add(up);
        }

        System.out.println("Procesados con éxito: " + procesados.size() + " usuarios.");

        // 1. Escribir script SQL transaccional
        File sqlFile = new File("c:/Users/fran/dev/projects/SGP/scripts/actualizar_contrasenas_2026.sql");
        try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(sqlFile), StandardCharsets.UTF_8))) {
            pw.println("-- =============================================================================");
            pw.println("-- ACTUALIZACIÓN DE CONTRASEÑAS Y HASHES BCRYPT - SGP");
            pw.println("-- Total usuarios actualizados: " + procesados.size());
            pw.println("-- =============================================================================");
            pw.println("START TRANSACTION;");
            pw.println();
            for (UsuarioProcesado up : procesados) {
                pw.println(String.format("UPDATE users SET password = '%s' WHERE email = '%s';", up.passHash, up.def.email));
            }
            pw.println();
            pw.println("COMMIT;");
            pw.println("-- FIN DE ACTUALIZACIÓN");
        }
        System.out.println("1. Script SQL guardado en: " + sqlFile.getAbsolutePath());

        // 2. Escribir nóminas de texto completas
        String headerTxt = "=================================================================================================================================\n" +
                           "                                      SISTEMA DE GESTIÓN POLÍTICA (SGP)\n" +
                           "                    NÓMINA OFICIAL DE ACCESOS Y CREDENCIALES COMPLETA (48 USUARIOS - BASE PRODUCCIÓN)\n" +
                           "=================================================================================================================================\n" +
                           "Fecha de sincronización con servidor de producción: 25/09/2026\n" +
                           "Servidor: VPS 149.50.128.168 (https://solicitudes.ultrasoft.website)\n" +
                           "Base de datos: sgp_db (MySQL 8)\n\n" +
                           "=================================================================================================================================\n" +
                           "TABLA COMPLETA DE USUARIOS DE PRODUCCIÓN (48 CUENTAS)\n" +
                           "=================================================================================================================================\n\n" +
                           "| #  | USUARIO / NOMBRE         | ROL(ES)                    | EMAIL                            | CONTRASEÑA                    | ZONA / ÁREA              | TELÉFONO    | DNI        |\n" +
                           "|----|--------------------------|----------------------------|----------------------------------|--------------------------------|--------------------------|-------------|------------|";

        File txtRoot = new File("c:/Users/fran/dev/projects/SGP/usuarios_contrasenas_sgp.txt");
        File txtDocs = new File("c:/Users/fran/dev/projects/SGP/docs/usuarios_contrasenas_sgp.txt");

        List<File> txtFiles = Arrays.asList(txtRoot, txtDocs);
        for (File f : txtFiles) {
            try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8))) {
                pw.println(headerTxt);
                for (UsuarioProcesado up : procesados) {
                    pw.println(String.format("| %-2d | %-24s | %-26s | %-32s | %-30s | %-24s | %-11s | %-10s |",
                            up.def.index, up.def.nombre, up.def.roles, up.def.email, up.passNueva, up.def.zona, up.def.telefono, up.def.dni));
                }
                pw.println("=================================================================================================================================");
                pw.println("TOTAL: 48 CUENTAS OFICIALES REGISTRADAS EN PRODUCCIÓN");
                pw.println("=================================================================================================================================");
            }
        }
        System.out.println("2. Archivos TXT actualizados.");

        // 3. Escribir CSV de envío para 44 destinatarios
        Set<String> excluidos = new HashSet<>(Arrays.asList(
                "admin@sgp.com",
                "resolutor@sgp.com",
                "test.auditor@gmail.com",
                "auditor.sheets@gmail.com"
        ));

        File csvFile = new File("c:/Users/fran/dev/projects/SGP/usuarios_credenciales_envio.csv");
        int totalDestinatarios = 0;
        try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(csvFile), StandardCharsets.UTF_8))) {
            pw.println("nombre,email,password,rol,zona,url");
            for (UsuarioProcesado up : procesados) {
                if (excluidos.contains(up.def.email.toLowerCase())) {
                    continue;
                }

                String rolLabel;
                if (up.def.roles.contains("OPERADOR")) {
                    rolLabel = "OPERADOR";
                } else if (up.def.roles.contains("DISTRIBUIDOR")) {
                    rolLabel = "DISTRIBUIDOR / RESPONSABLE";
                } else if (up.def.roles.contains("RESOLUTOR")) {
                    if (up.def.zona.toUpperCase().contains("SUBSIDIO")) {
                        rolLabel = "RESPONSABLE / RESOLUTOR (Subsidios)";
                    } else if (up.def.zona.toUpperCase().contains("AGENDA")) {
                        rolLabel = "RESPONSABLE / RESOLUTOR (Agenda)";
                    } else {
                        rolLabel = "RESPONSABLE / RESOLUTOR (Declaración de Interés)";
                    }
                } else if (up.def.roles.contains("AUDITOR")) {
                    rolLabel = "AUDITOR";
                } else {
                    rolLabel = "RESPONSABLE";
                }

                pw.println(String.format("%s,%s,%s,%s,%s,%s",
                        up.def.nombre,
                        up.def.email,
                        up.passNueva,
                        rolLabel,
                        up.def.zona,
                        "https://solicitudes.ultrasoft.website"
                ));
                totalDestinatarios++;
            }
        }
        System.out.println("3. CSV generado para " + totalDestinatarios + " destinatarios en: " + csvFile.getAbsolutePath());
    }
}
