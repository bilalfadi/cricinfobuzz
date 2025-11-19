/**
 * API Client - Fetches live data via API server
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export async function getNews() {
  try {
    const res = await fetch(`${API_URL}/api/news`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export async function getMatches() {
  try {
    const res = await fetch(`${API_URL}/api/matches`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

export async function getVideos() {
  try {
    const res = await fetch(`${API_URL}/api/videos`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

export async function extractPage(path: string, fullHTML: boolean = false) {
  try {
    // Use /api/extract endpoint which supports all paths
    const url = `${API_URL}/api/extract?path=${encodeURIComponent(path)}&html=true`;
    console.log(`📡 Fetching from: ${url} (fullHTML: ${fullHTML})`);
    
    const controller = new AbortController();
    const timeout = fullHTML ? 60000 : 30000; // 60s for full HTML, 30s for fast mode
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ API Error ${res.status}:`, errorText);
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log(`✅ Data received:`, {
      elements: data?.elements?.length || 0,
      cssClasses: data?.css?.allClasses?.length || 0,
      images: data?.images?.length || 0,
      newsCards: data?.newsCards?.length || 0,
      matchesList: data?.matchesList?.length || 0,
    });
    
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Request timeout after 60 seconds');
      throw new Error('Request timeout. The server is taking too long to respond.');
    }
    console.error('❌ Error extracting page:', error);
    throw error;
  }
}

