import { NextResponse } from 'next/server';
import { extractEverything } from '@/lib/server/extractor';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const jsonError = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    console.log('🏆 API /api/rankings -> Fetching rankings');
    const data = await extractEverything('/cricket-stats/rankings', false);
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('❌ /api/rankings error:', error);
    return jsonError(error?.message || 'Failed to fetch rankings');
  }
}


