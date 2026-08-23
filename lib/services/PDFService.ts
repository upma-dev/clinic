import type { TelemedicineConsultation, TelemedicineAppointment } from '../db/telemedicine';
import { PRESCRIPTION_FORM_BASE64 } from '../prescriptionFormBase64';

export class PDFService {
  /**
   * Generates HTML letterhead document matching /assets/prescriptionform.jpeg template structure using embedded base64.
   */
  static generatePrescriptionHTML(
    appointment: TelemedicineAppointment,
    consultation: TelemedicineConsultation
  ): string {
    const appointmentDate = appointment.preferredDate || (consultation.consultationDate ? new Date(consultation.consultationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const prescriptionText = (consultation as any).prescriptionText || consultation.prescription || 'As advised by Doctor';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription - ${appointment.name}</title>
  <style>
    @page { size: A4; margin: 0; }
    body {
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .print-btn-bar {
      position: fixed;
      top: 15px;
      right: 20px;
      z-index: 1000;
    }
    .print-btn {
      padding: 10px 20px;
      background: #0D9488;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .page-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      background: #fff;
      position: relative;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
    }
    .letterhead-bg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      object-fit: fill;
    }
    .content-overlay {
      position: relative;
      z-index: 2;
      padding-top: 58mm;
      padding-left: 54mm;
      padding-right: 18mm;
      box-sizing: border-box;
    }
    .patient-card {
      background: #ffffff;
      border: 1.5px solid #0D9488;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .card-item {
      display: flex;
      flex-direction: column;
    }
    .card-label {
      font-size: 8.5px;
      font-weight: 800;
      color: #0D9488;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-value {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .diagnosis-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
    }
    .rx-header {
      font-size: 13px;
      font-weight: 900;
      color: #0D9488;
      border-bottom: 2px solid #0D9488;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .rx-content {
      font-size: 12px;
      line-height: 1.8;
      white-space: pre-wrap;
      color: #1e293b;
      font-weight: 600;
      min-height: 85mm;
    }
    .advice-card {
      margin-top: 15px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 10px;
      font-size: 11px;
      color: #334155;
      line-height: 1.6;
    }
    @media print {
      body { background: #fff; margin: 0; }
      .print-btn-bar { display: none; }
      .page-wrapper { margin: 0; box-shadow: none; width: 210mm; height: 297mm; }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button onclick="window.print()" class="print-btn">🖨️ Print / Download Prescription PDF</button>
  </div>

  <div class="page-wrapper">
    <!-- Embedded Base64 Background Letterhead Template -->
    <img src="${PRESCRIPTION_FORM_BASE64}" class="letterhead-bg" alt="Prescription Letterhead" />

    <!-- Content overlay placed cleanly in the middle white writing area -->
    <div class="content-overlay">
      
      <!-- Patient Information Card -->
      <div class="patient-card">
        <div class="card-item">
          <span class="card-label">Patient Name</span>
          <span class="card-value">${appointment.name}</span>
        </div>
        <div class="card-item">
          <span class="card-label">Age / Gender</span>
          <span class="card-value">${appointment.age || 'N/A'} ${appointment.gender || ''}</span>
        </div>
        <div class="card-item">
          <span class="card-label">Phone No</span>
          <span class="card-value">${appointment.phone}</span>
        </div>
        <div class="card-item">
          <span class="card-label">Date</span>
          <span class="card-value">${appointmentDate}</span>
        </div>
      </div>

      <!-- Diagnosis Banner -->
      <div class="diagnosis-card">
        <span class="card-label" style="color: #15803d;">DIAGNOSIS</span>
        <div class="card-value" style="color: #166534; font-size: 12px; font-weight: 800; margin-top: 2px;">
          ${consultation.diagnosis}
        </div>
      </div>

      <!-- Medicines (Rx) -->
      <div class="rx-header">
        Rx (Medicines & Skincare Routine)
      </div>
      <div class="rx-content">${prescriptionText}</div>

      <!-- Advice & Follow-up -->
      ${(consultation.lifestyleAdvice || consultation.followUpDate || consultation.dietSuggestions) ? `
      <div class="advice-card">
        ${consultation.lifestyleAdvice ? `<p><strong>Skincare & Advice:</strong> ${consultation.lifestyleAdvice}</p>` : ''}
        ${consultation.dietSuggestions ? `<p><strong>Dietary Suggestions:</strong> ${consultation.dietSuggestions}</p>` : ''}
        ${consultation.followUpDate ? `<p style="color:#0D9488; font-weight:bold; margin-top:4px;"><strong>Follow-up Date:</strong> ${consultation.followUpDate}</p>` : ''}
      </div>` : ''}

    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Opens the prescription form document in a new tab via Blob URL with embedded base64 letterhead.
   */
  static openPrescription(
    appointment: TelemedicineAppointment,
    consultation: TelemedicineConsultation
  ) {
    const html = this.generatePrescriptionHTML(appointment, consultation);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Triggers client-side jsPDF download with embedded /assets/prescriptionform.jpeg background image.
   */
  static async downloadPrescriptionPDF(
    appointment: TelemedicineAppointment,
    consultation: TelemedicineConsultation
  ): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      if (!(window as any).jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const { jsPDF } = (window as any).jspdf;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Render Background Letterhead Form Image from embedded base64
      doc.addImage(PRESCRIPTION_FORM_BASE64, 'JPEG', 0, 0, 210, 297);

      // 2. Patient Header Box
      const appointmentDate = appointment.preferredDate || (consultation.consultationDate ? new Date(consultation.consultationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.4);
      doc.roundedRect(52, 58, 145, 14, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136);
      doc.setFont("helvetica", "bold");
      doc.text("PATIENT NAME", 55, 62);
      doc.text("AGE / GENDER", 108, 62);
      doc.text("PHONE NO", 140, 62);
      doc.text("DATE", 172, 62);

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(appointment.name || 'N/A', 55, 68);
      doc.text(`${appointment.age || ''} ${appointment.gender || ''}`, 108, 68);
      doc.text(appointment.phone || 'N/A', 140, 68);
      doc.text(appointmentDate, 172, 68);

      // 3. Diagnosis Box
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
      doc.roundedRect(52, 75, 145, 12, 1.5, 1.5, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text("DIAGNOSIS", 55, 79);
      doc.setFontSize(9.5);
      doc.text(consultation.diagnosis || 'N/A', 55, 84);

      // 4. Medicines (Rx)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 148, 136);
      doc.text("Rx (Medicines & Skincare Routine)", 52, 94);
      doc.line(52, 96, 197, 96);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      const prescriptionText = (consultation as any).prescriptionText || consultation.prescription || 'As advised by Doctor';
      const splitMedicines = doc.splitTextToSize(prescriptionText, 140);
      doc.text(splitMedicines, 52, 102);

      // 5. Advice / Follow up
      if (consultation.lifestyleAdvice || consultation.followUpDate) {
        const medicinesHeight = splitMedicines.length * 4.5;
        const adviceStartY = 102 + medicinesHeight + 8;
        
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text("Advice & Follow-up:", 52, adviceStartY);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        const adviceText = `${consultation.lifestyleAdvice || ''} ${consultation.followUpDate ? `\nFollow-up Date: ${consultation.followUpDate}` : ''}`;
        const splitAdvice = doc.splitTextToSize(adviceText, 140);
        doc.text(splitAdvice, 52, adviceStartY + 4.5);
      }

      const fileName = `Prescription_${(appointment.name || 'Patient').replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

    } catch (e) {
      console.error('jsPDF error, falling back to Blob window open:', e);
      this.openPrescription(appointment, consultation);
    }
  }

  static async generatePrescriptionPDF(
    appointment: TelemedicineAppointment,
    consultation: TelemedicineConsultation
  ): Promise<string> {
    return this.generatePrescriptionHTML(appointment, consultation);
  }
}
