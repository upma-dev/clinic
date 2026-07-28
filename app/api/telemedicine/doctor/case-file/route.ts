import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointmentId');
    const patientPhone = searchParams.get('phone'); // to link past history

    const db = await getDb();

    // 1. Get the current questionnaire
    const currentQuestionnaire = await db.collection(COLLECTIONS.telemedicine_questionnaires)
      .findOne({ appointmentId });

    // 2. Get past consultations for this patient
    // If the patient has a phone number, find all appointments with this phone, then their consultations.
    let pastHistory: any[] = [];
    if (patientPhone) {
      const pastAppointments = await db.collection(COLLECTIONS.telemedicine_appointments)
        .find({ phone: patientPhone, status: 'completed' })
        .sort({ createdAt: -1 })
        .toArray();
      
      const aptIds = pastAppointments.map(a => a._id.toString());
      
      const pastConsultations = await db.collection(COLLECTIONS.telemedicine_consultations)
        .find({ appointmentId: { $in: aptIds } })
        .sort({ createdAt: -1 })
        .toArray();

      const pastQuestionnaires = await db.collection(COLLECTIONS.telemedicine_questionnaires)
        .find({ appointmentId: { $in: aptIds } })
        .toArray();

      // Combine them into a timeline
      pastHistory = pastAppointments.map(apt => {
        const cons = pastConsultations.find(c => c.appointmentId === apt._id.toString());
        const quest = pastQuestionnaires.find(q => q.appointmentId === apt._id.toString());
        return { appointment: apt, consultation: cons, questionnaire: quest };
      });
    }

    return NextResponse.json({
      currentQuestionnaire,
      pastHistory
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch case file' }, { status: 500 });
  }
}
