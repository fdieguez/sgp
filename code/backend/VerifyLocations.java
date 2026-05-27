import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class VerifyLocations {
    public static void main(String[] args) {
        try {
            Class.forName("org.h2.Driver");
            Connection conn = DriverManager.getConnection("jdbc:h2:file:./data/sgp_db", "sa", "password");
            Statement stmt = conn.createStatement();
            
            // Ver si existe la columna show_in_ui y qué tiene Laguna Paiva
            ResultSet rs = stmt.executeQuery("SELECT id, name, type, show_in_ui FROM locations WHERE name IN ('Santa Fe', 'Laguna Paiva')");
            System.out.println("--- RESULTADOS DE LA BUSQUEDA ---");
            while (rs.next()) {
                System.out.println("ID: " + rs.getLong("id") + 
                                   " | NAME: " + rs.getString("name") + 
                                   " | TYPE: " + rs.getString("type") + 
                                   " | SHOW_IN_UI: " + rs.getBoolean("show_in_ui"));
            }
            
            // Contar total de localidades marcadas con show_in_ui = true
            ResultSet rs2 = stmt.executeQuery("SELECT count(*) FROM locations WHERE show_in_ui = true");
            if (rs2.next()) {
                System.out.println("TOTAL SHOW_IN_UI = TRUE: " + rs2.getInt(1));
            }
            
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
