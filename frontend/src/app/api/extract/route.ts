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
    const sourcePath = searchParams.get('path') || '/';
    const fastMode = searchParams.get('fast') !== 'false';
    const fullHTML = searchParams.get('html') === 'true';

    console.log(
      `📥 API /api/extract -> path=${sourcePath}, fastMode=${fastMode}, fullHTML=${fullHTML}`,
    );

    const data = fullHTML
      ? await extractEverything(sourcePath, false)
      : await extractEverything(sourcePath, fastMode);

    if (!data) {
      return jsonError('Failed to fetch or parse data. Please try again later.', 500);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ /api/extract error:', error);
    return jsonError(error?.message || 'Internal server error while extracting data');
  }
}


