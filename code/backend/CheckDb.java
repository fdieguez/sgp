import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckDb {
    public static void main(String[] args) {
        try {
            Class.forName("org.h2.Driver");
            Connection conn = DriverManager.getConnection("jdbc:h2:file:./data/sgp_db", "sa", "password");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT EMAIL, ROLE FROM USERS WHERE EMAIL = 'user1@sgp.com'");
            if (rs.next()) {
                System.out.println("USER EMAIL: " + rs.getString("EMAIL") + " | ROLE: " + rs.getString("ROLE"));
            } else {
                System.out.println("User not found!");
            }
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
