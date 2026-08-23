import { NextRequest, NextResponse } from 'next/server';
import { createWalkInRequest } from '@/lib/db/walkin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Basic validation
    if (!data.fullName || !data.mobile || !data.age || !data.gender || !data.visitType || !data.problem) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const walkInReq = {
      id: crypto.randomUUID(),
      fullName: data.fullName,
      mobile: data.mobile,
      age: Number(data.age),
      gender: data.gender,
      visitType: data.visitType,
      problem: data.problem,
      previousVisitDate: data.previousVisitDate || undefined,
      emergencyReason: data.emergencyReason || undefined,
      symptomsDuration: data.symptomsDuration || undefined,
      medicalReports: data.medicalReports || undefined,
      status: 'Pending' as const,
      createdAt: new Date().toISOString()
    };

    const saved = await createWalkInRequest(walkInReq);

    return NextResponse.json({ 
      success: true, 
      id: saved.id,
      message: 'Your request has been submitted successfully.'
    }, { status: 201 });

  } catch (err: any) {
    console.error('Walkin Submit Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 500 });
  }
}
