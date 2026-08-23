import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointmentId');
    const patientPhone = searchParams.get('phone'); // to link past history

    const db = await getDb();

    // 1. Get the current questionnaire & consultation
    const currentQuestionnaire = await db.collection(COLLECTIONS.telemedicine_questionnaires)
      .findOne({ appointmentId });

    const currentConsultation = await db.collection(COLLECTIONS.telemedicine_consultations)
      .findOne({ appointmentId });

    // 2. Get past consultations for this patient
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
      currentConsultation,
      pastHistory
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch case file' }, { status: 500 });
  }
}
