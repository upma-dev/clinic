import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendEmail } from '@/lib/email';
import { getClinicSettings } from '@/lib/db/settings';
import { createNotification } from '@/lib/db/notifications';

interface SendEmailRequest {
  to: string;
  patientName: string;
  type: 'meeting-link' | 'confirmation' | 'prescription' | 'custom';
  appointmentId?: string;
  date?: string;
  time?: string;
  meetingUrl?: string;
  subject?: string;
  message?: string;
  pdfBase64?: string;
  medicines?: string;
  advice?: string;
}

export async function POST(req: Request) {
  try {
    const data: SendEmailRequest = await req.json();
    const { to, patientName, type, appointmentId, date, time, meetingUrl, subject: customSubject, message: customMessage, pdfBase64, medicines, advice } = data;

    if (!to || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required' }, { status: 400 });
    }

    const settings = await getClinicSettings();
    const clinicName = settings.clinicName || "Dr. Prateek Tiwari's Skin Hub Clinic";
    const clinicAddress = settings.clinicAddress || "B-23, Bada Shopping Complex, Opposite Water Tank, Rishi Nagar, Ujjain (M.P.)";
    const clinicPhone = settings.clinicPhone || "+91 98270 42111";
    const clinicEmail = settings.clinicEmail || "contact@skinhubujjain.com";

    let emailSubject = customSubject || `Important Update from ${clinicName}`;
    let emailHtml = '';

    if (type === 'meeting-link') {
      emailSubject = `📹 Video Consultation Link & Details — ${clinicName}`;
      const finalUrl = meetingUrl || `https://meet.ffmuc.net/SkinHub-Consult-${(patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '')}`;

      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0B1B29 0%, #0d9488 100%); padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">${clinicName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Dr. Prateek Tiwari • MBBS, MD (Dermatology)</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 13px; line-height: 1.6;">
            <p style="margin-top: 0;">Namaste <strong>${patientName || 'Patient'}</strong>,</p>
            <p>Your online telemedicine consultation appointment has been scheduled and confirmed. Since WhatsApp was not available or you preferred email communication, here are your complete consultation details:</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📅 Date:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${date || 'Scheduled Date'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">⏰ Time Slot:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #0f766e;">${time || 'Scheduled Time'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">👨‍⚕️ Specialist:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">Dr. Prateek Tiwari</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${finalUrl}" target="_blank" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                🎥 Join Video Consultation
              </a>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Direct meeting URL: <a href="${finalUrl}" style="color: #0d9488;">${finalUrl}</a></p>
            </div>

            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #166534; margin-bottom: 20px;">
              <strong>Patient Instructions:</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                <li>Please click the button 5 minutes prior to your scheduled slot.</li>
                <li>Ensure you are in a quiet, well-lit room so the doctor can evaluate skin conditions clearly.</li>
                <li>Keep any prior medical records or prescriptions handy.</li>
              </ul>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">If you face any issues joining the call, please contact our clinic team directly at <strong>${clinicPhone}</strong>.</p>
          </div>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">${clinicAddress}</p>
            <p style="margin: 4px 0 0 0;">Phone: ${clinicPhone} • Email: ${clinicEmail}</p>
          </div>
        </div>
      `;
    } else if (type === 'confirmation') {
      emailSubject = `✅ Appointment Confirmed — ${clinicName}`;
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <h2 style="color: #0f766e; margin-top: 0;">${clinicName}</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your appointment has been successfully confirmed for <strong>${date}</strong> at <strong>${time}</strong>.</p>
          <p>Address: ${clinicAddress}</p>
          <p>Doctor: Dr. Prateek Tiwari (MBBS, MD Dermatology)</p>
          <p style="margin-top: 20px; font-size: 11px; color: #94a3b8;">Phone: ${clinicPhone}</p>
        </div>
      `;
    } else if (type === 'prescription') {
      emailSubject = `📋 Official Medical Prescription Pad (PDF) — Dr. Prateek Tiwari, ${clinicName}`;
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = `${protocol}://${host}`;
      const padDownloadUrl = `${baseUrl}/api/prescription/download?id=${encodeURIComponent(appointmentId || '')}&v=${Date.now()}`;
      const padViewUrl = `${baseUrl}/prescription/view?id=${encodeURIComponent(appointmentId || '')}`;
      const medicinesText = customMessage || 'Follow medication schedule as discussed during consultation.';

      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 2px solid #0d9488; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Pad Header -->
          <div style="background: linear-gradient(135deg, #0B1B29 0%, #1B4F72 100%); padding: 24px 28px; color: white;">
            <div style="font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #2dd4bf;">Official Medical Prescription Pad</div>
            <h1 style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800;">${clinicName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #e2e8f0; font-weight: 600;">Dr. Prateek Tiwari • MBBS, MD (Dermatology)</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Consultant Dermatologist, Dermatosurgeon & Laser Specialist • Reg. MP-12345</p>
            <div style="margin-top: 12px; height: 3px; background: linear-gradient(90deg, #2dd4bf, #10b981); border-radius: 2px;"></div>
          </div>

          <!-- Warm Caring Message -->
          <div style="background: #f0fdf4; border-bottom: 1px solid #bbf7d0; padding: 14px 28px; font-size: 12px; color: #166534; font-weight: 500;">
            🌸 <strong>Namaste ${patientName || 'Patient'}!</strong> Aapki skin health hamari pehli priority hai. Dr. Prateek Tiwari dwara aapka official <strong>Medical Prescription Pad (PDF Document)</strong> generate kar diya gaya hai.
          </div>

          <!-- Patient Dossier Bar -->
          <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 28px;">
            <table style="width: 100%; font-size: 12px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0;"><strong>Patient:</strong> ${patientName}</td>
                <td style="padding: 4px 0; text-align: right;"><strong>Date:</strong> ${date || new Date().toISOString().split('T')[0]}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Prescription Ref:</strong> #${appointmentId || 'RX-001'}</td>
                <td style="padding: 4px 0; text-align: right;"><strong>Doctor:</strong> Dr. Prateek Tiwari</td>
              </tr>
            </table>
          </div>

          <!-- Prescription Body with Rx -->
          <div style="padding: 24px 28px; color: #1e293b;">
            <div style="font-size: 28px; font-weight: 900; color: #0d9488; font-family: Georgia, serif; line-height: 1; margin-bottom: 12px;">
              ℞ <span style="font-size: 14px; font-family: sans-serif; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 8px;">Medicines & Treatment Plan</span>
            </div>

            <!-- Medicines -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 13px; line-height: 1.8; color: #1e293b; white-space: pre-line; font-weight: 500;">
${medicinesText}
            </div>

            <!-- Direct Download Pad Button -->
            <div style="text-align: center; margin: 28px 0 16px 0;">
              <a href="${padDownloadUrl}" target="_blank" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; padding: 15px 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(13, 148, 136, 0.4);">
                📄 Download Official Prescription Pad (PDF File)
              </a>
            </div>

            <!-- Care Guidelines -->
            <div style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.5;">
              • Kripya prescribed dosage bina doctor ki salah ke change na karein.<br/>
              • Niyamit roop se dawai lein aur proper hydration maintain karein.<br/>
              • Kisi bhi reaction ya emergency ke liye clinic helpline number par contact karein.<br/>
              • Aapki skin health hamari priority hai. Jald swasth hon! 💖
            </div>
          </div>

          <!-- Pad Footer -->
          <div style="background: #f1f5f9; padding: 18px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: 600; color: #334155;">${clinicName} • ${clinicAddress}</p>
            <p style="margin: 4px 0 0 0;">Helpline: ${clinicPhone} • Email: ${clinicEmail}</p>
          </div>
        </div>
      `;
    } else {
      emailSubject = customSubject || `Update from ${clinicName}`;
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
          <h2 style="color: #0f766e; margin-top: 0;">${clinicName}</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>${(customMessage || '').replace(/\n/g, '<br/>')}</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            ${clinicName} • Phone: ${clinicPhone} • ${clinicAddress}
          </div>
        </div>
      `;
    }

    // Build attachments if PDF is attached
    const attachments: any[] = [];
    if (pdfBase64) {
      const safeName = (patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      attachments.push({
        filename: `Prescription_${safeName}_SkinHub.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      });
    }

    // Send email via lib/email with attachment
    await sendEmail({ to, subject: emailSubject, html: emailHtml, attachments });

    // Mark meetingLinkSent and store pdfBase64 in DB if appointmentId provided
    if (appointmentId) {
      try {
        const db = await getDb();
        const isOPD = String(appointmentId).startsWith('SKNHB-');
        const updateData: any = { meetingLinkSent: true, emailSentAt: new Date().toISOString() };
        if (pdfBase64) {
          updateData.prescriptionPdfBase64 = pdfBase64;
          updateData.prescriptionSent = true;
          updateData.hasCaseFile = true;
        }
        if (medicines || advice) {
          updateData.prescriptionData = {
            medicines: medicines || '',
            advice: advice || '',
            generatedAt: new Date().toISOString()
          };
        }

        if (isOPD) {
          await db.collection(COLLECTIONS.bookings).updateOne(
            { id: appointmentId },
            { $set: updateData }
          );
        } else {
          let query: any = { id: appointmentId };
          try {
            query = { $or: [{ _id: new ObjectId(appointmentId) }, { id: appointmentId }] };
          } catch {}
          await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
            query,
            { $set: updateData }
          );
        }
      } catch (err) {
        console.error('Failed to update in DB:', err);
      }
    }

    // Log notification
    const timeSnippet = date && time ? ` (${date} at ${time})` : (date ? ` (${date})` : '');
    await createNotification(
      'reminder_sent',
      `✉️ Email Sent to ${patientName}`,
      `Sent ${type} notification to ${to}${timeSnippet}.`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Email successfully sent to ${to}`,
      recipient: to
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send email' }, { status: 500 });
  }
}
