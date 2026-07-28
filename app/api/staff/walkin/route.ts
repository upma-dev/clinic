import { NextRequest, NextResponse } from 'next/server';
import { getWalkInRequests } from '@/lib/db/walkin';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'staff' && session.role !== 'doctor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const visitType = searchParams.get('visitType');
    const search = searchParams.get('search');

    const query: any = {};
    if (status) query.status = status;
    if (visitType) query.visitType = visitType;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const { data, total } = await getWalkInRequests(query, page, limit);

    return NextResponse.json({ data, total, page, limit });
  } catch (err: any) {
    console.error('Walkin Fetch Error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
