/**
 * ConsultationService.ts
 * 
 * Orchestrates the business logic when a consultation is completed.
 */
import { getDb, COLLECTIONS } from '../mongodb';
import { ObjectId } from 'mongodb';
import { NotificationService } from './NotificationService';
import { TelemedicineConsultation } from '../db/telemedicine';

export class ConsultationService {
  static async completeConsultation(consultationData: TelemedicineConsultation, patientEmail: string, patientName: string) {
    const db = await getDb();
    
    // 1. Save Consultation to DB
    const { _id: _unused, ...doc } = consultationData;
    const result = await db.collection(COLLECTIONS.telemedicine_consultations).insertOne(doc);
    
    // 2. Update Appointment Status
    let objId: any = (consultationData as any).appointmentId;
    try {
      objId = new ObjectId(objId);
    } catch {
      // keep original string
    }

    await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
      { $or: [{ _id: objId }, { _id: (consultationData as any).appointmentId }] },
      { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
    );
    
    // 3. Trigger Routine Creation (Future logic inside routine.ts)
    // For now we just log
    console.log("Automatically adding routines:", consultationData.morningRoutine, consultationData.nightRoutine);

    // 4. Send Email
    if (consultationData.generatedPdfUrl) {
      await NotificationService.sendPrescriptionReady(patientEmail, patientName, consultationData.generatedPdfUrl);
    }
    
    return result;
  }
}
