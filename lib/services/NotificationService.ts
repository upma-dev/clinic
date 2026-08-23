/**
 * NotificationService.ts
 * 
 * Centralized service to handle email, SMS, and Push notifications.
 * Currently simulates sending emails via console.log since Resend/SendGrid API keys are not yet configured.
 */

export class NotificationService {
  static async sendBookingReceived(email: string, name: string) {
    console.log(`[EMAIL SENT] To: ${email} | Subject: Consultation Request Received | Body: Hi ${name}, your request is pending review.`);
  }

  static async sendAppointmentConfirmed(email: string, name: string, date: string, time: string, meetingUrl: string) {
    console.log(`[EMAIL SENT] To: ${email} | Subject: Consultation Confirmed | Body: Hi ${name}, your consultation is on ${date} at ${time}. Link: ${meetingUrl}. Please complete your questionnaire before joining.`);
  }

  static async sendPrescriptionReady(email: string, name: string, pdfUrl: string) {
    console.log(`[EMAIL SENT] To: ${email} | Subject: Prescription Ready | Body: Hi ${name}, your prescription is ready. Download it here: ${pdfUrl}`);
  }
}
