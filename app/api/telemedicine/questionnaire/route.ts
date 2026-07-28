import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const { appointmentId, patientId, ...questionnaireData } = data;

    if (!appointmentId || !patientId) {
      return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
    }

    const db = await getDb();

    // Insert questionnaire
    const result = await db.collection(COLLECTIONS.telemedicine_questionnaires).insertOne({
      appointmentId,
      patientId,
      ...questionnaireData,
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    // Also update appointment status if needed (e.g., mark as ready for doctor)
    // Though usually it stays 'confirmed' until the doctor finishes the call.
    // We'll leave the appointment status as 'confirmed', but the doctor dashboard will show Questionnaire: Completed.

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error: any) {
    console.error('Questionnaire submission error:', error);
    return NextResponse.json({ error: 'Failed to submit questionnaire' }, { status: 500 });
  }
}
