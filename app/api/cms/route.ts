import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCmsSettings, updateCmsSettings } from '@/lib/db/cms';

export async function GET() {
  try {
    const cms = await getCmsSettings();
    return NextResponse.json(cms);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CMS content unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor login required' }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate we're not saving empty objects or illegal changes
    const updated = await updateCmsSettings(body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CMS update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
