/**
 * Email Service
 */
import type { ClinicSettings } from './types';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  // Mock delivery
  console.log('\n=======================================');
  console.log(`✉️ EMAIL SENT (MOCK)`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${html}`);
  console.log('=======================================\n');
  
  return { success: true, mocked: true };
}

export async function sendAutomatedEmail(
  to: string,
  type: keyof ClinicSettings['emailTemplates'],
  replacements: Record<string, string | number>
) {
  try {
    const { getClinicSettings } = await import('./db/settings');
    const settings = await getClinicSettings();
    
    // Safety check for templates object
    const templates = settings.emailTemplates || {};
    let template = templates[type as keyof typeof templates];
    
    if (!template) {
      // Default fallbacks in case DB isn't updated
      const fallbacks: Record<string, string> = {
        booked: 'Dear {name}, your appointment booking request for {date} at {time} has been registered. Reference: {id}.',
        confirmed: 'Dear {name}, your appointment on {date} at {time} is confirmed. Your queue token number is #{token}. Please arrive 10 minutes prior.',
        paymentSuccess: 'Dear {name}, we have successfully received your prepayment of Rs. {amount} for appointment on {date}. Status: Paid.',
        paymentFailed: 'Dear {name}, payment of Rs. {amount} failed or was cancelled. Your booking stays pending payment.',
        cancelled: 'Dear {name}, your appointment on {date} at {time} has been cancelled.',
        rescheduled: 'Dear {name}, your appointment has been rescheduled to {newDate} at {newTime}. Reason: {reason}. Click here to confirm: {confirmUrl}',
        doctorDelayed: 'Dear {name}, we regret to inform you that Dr. Prateek Tiwari is running delayed by {delayMinutes} minutes today.',
        reminderBefore: 'Dear {name}, this is a reminder for your upcoming appointment today at {time}. Please arrive on time.',
        followUp: 'Dear {name}, this is a reminder that Dr. Prateek Tiwari has scheduled your follow-up consultation on {date}. Clinic address: {address}.',
        prescriptionReady: 'Dear {name}, your prescription is ready. You can download it using the patient portal. Doctor notes: {notes}.',
      };
      template = fallbacks[type] || 'Dear Patient, you have an update regarding your appointment.';
    }

    // Replace placeholders
    let parsedHtml = template;
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{${key}}`, 'g');
      parsedHtml = parsedHtml.replace(regex, String(value));
    }

    // Wrap in standard HTML template styling
    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 25px;">
          <h2 style="color: #0b1b29; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${settings.clinicName}</h2>
          <p style="font-size: 11px; color: #6b7280; margin: 6px 0 0 0; font-weight: 500;">${settings.clinicAddress}</p>
        </div>
        <div style="color: #374151; font-size: 14px; line-height: 1.6; font-weight: 500;">
          ${parsedHtml.replace(/\n/g, '<br/>')}
        </div>
        <div style="margin-top: 35px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 11px; color: #9ca3af; font-weight: 500;">
          <p style="margin: 0 0 8px 0;">This is an automated notification from ${settings.clinicName}. Please do not reply directly to this email.</p>
          <p style="margin: 0;">Contact: ${settings.clinicPhone} | Email: ${settings.clinicEmail}</p>
        </div>
      </div>
    `;

    // Map subjects
    const subjects: Record<string, string> = {
      booked: `Appointment Booking Registered - ${settings.clinicName}`,
      confirmed: `Appointment Confirmed - ${settings.clinicName}`,
      paymentSuccess: `Pre-payment Successful - ${settings.clinicName}`,
      paymentFailed: `Pre-payment Failed - ${settings.clinicName}`,
      cancelled: `Appointment Cancellation - ${settings.clinicName}`,
      rescheduled: `Appointment Time Rescheduled - ${settings.clinicName}`,
      doctorDelayed: `Schedule Delay Notification - ${settings.clinicName}`,
      reminderBefore: `Appointment Reminder Alert - ${settings.clinicName}`,
      followUp: `Follow-up Consultation Scheduled - ${settings.clinicName}`,
      prescriptionReady: `Prescription & Notes Released - ${settings.clinicName}`,
    };

    const subject = subjects[type] || `Notification from ${settings.clinicName}`;

    return await sendEmail({ to, subject, html: emailBody });
  } catch (err) {
    console.error('Error sending automated email:', err);
    return { success: false, error: err };
  }
}

export const templates = {
  walkinAccepted: (name: string, date: string) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 25px;">
        <h2 style="color: #0b1b29; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Skin Hub Clinic</h2>
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6; font-weight: 500;">
        <p>Dear ${name},</p>
        <p>Your walk-in registration has been successfully verified and <strong>Accepted</strong>.</p>
        <p>Please report to the clinic reception desk to fetch your physical token and slot timing.</p>
      </div>
    </div>
  `,
  confirmation: (name: string, date: string, time: string) => `Dear ${name}, confirmed for ${date} at ${time}.`,
  reminder: (name: string, date: string, time: string) => `Dear ${name}, reminder for ${date} at ${time}.`,
  cancellation: (name: string, date: string, time: string) => `Dear ${name}, cancelled for ${date} at ${time}.`,
};
