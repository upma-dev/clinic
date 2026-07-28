import { NextResponse } from 'next/server';
import { ConsultationService } from '@/lib/services/ConsultationService';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { patientEmail, patientName, ...consultationData } = data;

    // Use our ConsultationService wrapper to execute the business logic
    await ConsultationService.completeConsultation(
      {
        ...consultationData,
        consultationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      patientEmail,
      patientName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save consultation' }, { status: 500 });
  }
}
