import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ScratchQuery {
    public static void main(String[] args) {
        String jdbcUrl = "jdbc:h2:file:./data/sgp_db";
        String user = "SA";
        String password = "password";

        try (Connection conn = DriverManager.getConnection(jdbcUrl, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("--- RESULTADOS LOCALES (H2) ---");

            // Inspect Solicitudes
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM solicitudes WHERE responsable_id IS NOT NULL");
            if (rs.next()) {
                System.out.println("Solicitudes atadas a Responsable: " + rs.getInt(1));
            }

            // Inspect Historial
            rs = stmt.executeQuery("SELECT COUNT(*) FROM asignacion_historial WHERE responsable_id IS NOT NULL");
            if (rs.next()) {
                System.out.println("Registros de Historial apuntando a Responsable: " + rs.getInt(1));
            }

            // Inspect Users vs Responsables
            rs = stmt.executeQuery("SELECT COUNT(*) FROM users");
            if (rs.next()) {
                System.out.println("Total Usuarios: " + rs.getInt(1));
            }

            rs = stmt.executeQuery("SELECT COUNT(*) FROM responsables");
            if (rs.next()) {
                System.out.println("Total Responsables separadas: " + rs.getInt(1));
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
