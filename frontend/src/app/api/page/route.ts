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
    const fullHTML = searchParams.get('html') !== 'false';

    console.log(`📄 API /api/page -> path=${sourcePath}, fullHTML=${fullHTML}`);

    const data = await extractEverything(sourcePath, !fullHTML);
    if (!data) {
      return jsonError('Failed to fetch or parse data. Please try again later.', 500);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ /api/page error:', error);
    return jsonError(error?.message || 'Failed to fetch page');
  }
}


