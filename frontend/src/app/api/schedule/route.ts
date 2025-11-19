import { NextResponse } from 'next/server';
import { extractEverything } from '@/lib/server/extractor';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const jsonError = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    console.log('📅 API /api/schedule -> Fetching schedule');
    const data = await extractEverything('/cricket-schedule/upcoming-series/international', false);
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('❌ /api/schedule error:', error);
    return jsonError(error?.message || 'Failed to fetch schedule');
  }
}


