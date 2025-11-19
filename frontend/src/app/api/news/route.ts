import { NextResponse } from 'next/server';
import { extractEverything } from '@/lib/server/extractor';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const jsonError = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  try {
    console.log('📰 API /api/news -> Fetching live news');
    let data = await extractEverything('/', true);
    let news = data?.newsCards || [];

    if (!news || news.length === 0) {
      data = await extractEverything('/cricket-news', true);
      news = data?.newsCards || [];
    }

    console.log(`✅ API /api/news -> ${news.length} news items`);
    return NextResponse.json(news || []);
  } catch (error: any) {
    console.error('❌ /api/news error:', error);
    return jsonError(error?.message || 'Failed to fetch news');
  }
}


