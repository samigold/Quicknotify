import org.junit.Test;
import static org.junit.Assert.*;

public class DeliveryServiceTest {
  
  @Test
  public void testSendEmail() {
    // Arrange
    String email = "user@example.com";
    String subject = "Test";
    
    // Act
    boolean result = DeliveryService.sendEmail(email, subject);
    
    // Assert
    assertTrue(result);
  }
  
  @Test
  public void testInvalidEmail() {
    boolean result = DeliveryService.sendEmail("invalid", "Test");
    assertFalse(result);
  }
}