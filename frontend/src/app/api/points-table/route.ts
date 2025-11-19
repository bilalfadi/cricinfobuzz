import { NextResponse } from 'next/server';
import { extractEverything } from '@/lib/server/extractor';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const jsonError = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('seriesId') || '';
    const path = seriesId
      ? `/cricket-series/${seriesId}/points-table`
      : '/cricket-series';

    console.log(`📊 API /api/points-table -> path=${path}`);

    const data = await extractEverything(path, false);
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('❌ /api/points-table error:', error);
    return jsonError(error?.message || 'Failed to fetch points table');
  }
}


