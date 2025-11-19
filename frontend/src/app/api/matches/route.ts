import { NextResponse } from 'next/server';
import { extractEverything } from '@/lib/server/extractor';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const jsonError = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    console.log('🏏 API /api/matches -> Fetching live matches');
    let data = await extractEverything('/', true);
    let matches = data?.matchesList || [];

    if (!matches || matches.length === 0) {
      data = await extractEverything('/cricket-match/live-scores', true);
      matches = data?.matchesList || [];
    }

    console.log(`✅ API /api/matches -> ${matches.length} matches`);
    return NextResponse.json(matches || []);
  } catch (error: any) {
    console.error('❌ /api/matches error:', error);
    return jsonError(error?.message || 'Failed to fetch matches');
  }
}


