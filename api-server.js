/**
 * API Server - Serves live cricket data
 */

const express = require('express');
const { extractEverything, fetchPage } = require('./scraper');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Cricinfobuzz API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      extract: '/api/extract?path=/&html=true',
      news: '/api/news',
      matches: '/api/matches',
      videos: '/api/videos',
      page: '/api/page?path=/',
      series: '/api/series',
      schedule: '/api/schedule',
      rankings: '/api/rankings',
      pointsTable: '/api/points-table'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get everything from a page (fast mode by default for homepage)
app.get('/api/extract', async (req, res) => {
  try {
    const path = req.query.path || '/';
    const fastMode = req.query.fast !== 'false'; // Default to fast mode
    const fullHTML = req.query.html === 'true'; // Get full HTML structure
    
    console.log(`📥 Extracting from: ${path} (fastMode: ${fastMode}, fullHTML: ${fullHTML})`);
    
    let data;
    if (fullHTML) {
      // Extract full HTML structure for exact clone
      data = await extractEverything(path, false); // Always full mode for HTML
    } else {
      // Fast mode - just data
      data = await extractEverything(path, fastMode);
    }
    
    // Check if data extraction failed
    if (!data) {
      console.error(`❌ Failed to extract data from: ${path}`);
      return res.status(500).json({ 
        error: 'Failed to fetch or parse data. Please try again later.',
        path: path 
      });
    }
    
    console.log(`✅ Extracted: ${data?.elements?.length || 0} elements, ${data?.css?.allClasses?.size || data?.css?.allClasses?.length || 0} CSS classes`);
    res.json(data);
  } catch (error) {
    console.error('❌ Extraction error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error while extracting data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get live news - Extract from homepage first (has newsCardsData) - FAST MODE
app.get('/api/news', async (req, res) => {
  try {
    console.log('📰 Fetching live news... (FAST MODE)');
    // Try homepage first (has newsCardsData) - FAST MODE
    let data = await extractEverything('/', true);
    let news = data?.newsCards || [];
    
    // If not found, try news page
    if (!news || news.length === 0) {
      data = await extractEverything('/cricket-news', true);
      news = data?.newsCards || [];
    }
    
    console.log(`✅ Fetched ${news.length} news items`);
    res.json(news);
  } catch (error) {
    console.error('❌ News API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get live matches - Extract from homepage (has matchesList) - FAST MODE
app.get('/api/matches', async (req, res) => {
  try {
    console.log('🏏 Fetching live matches... (FAST MODE)');
    // Try homepage first (has matchesList) - FAST MODE
    let data = await extractEverything('/', true);
    let matches = data?.matchesList || [];
    
    // If not found, try live-scores page
    if (!matches || matches.length === 0) {
      data = await extractEverything('/cricket-match/live-scores', true);
      matches = data?.matchesList || [];
    }
    
    console.log(`✅ Fetched ${matches.length} matches`);
    res.json(matches);
  } catch (error) {
    console.error('❌ Matches API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get videos
app.get('/api/videos', async (req, res) => {
  try {
    console.log('🎥 Fetching videos...');
    const data = await extractEverything('/cricket-videos', false); // Full HTML for exact design
    console.log(`✅ Fetched videos data`);
    res.json(data);
  } catch (error) {
    console.error('❌ Videos API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get any page dynamically - supports all cricket pages
// Use query parameter for path to support any URL
app.get('/api/page', async (req, res) => {
  try {
    // Get path from query parameter
    const path = req.query.path || '/';
    const fullHTML = req.query.html !== 'false'; // Default to full HTML
    
    console.log(`📄 Fetching page: ${path} (fullHTML: ${fullHTML})`);
    const data = await extractEverything(path, !fullHTML); // false = full mode
    console.log(`✅ Fetched page: ${path}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Page API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get series page
app.get('/api/series', async (req, res) => {
  try {
    console.log('📊 Fetching series...');
    const data = await extractEverything('/cricket-series', false);
    res.json(data);
  } catch (error) {
    console.error('❌ Series API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get schedule page
app.get('/api/schedule', async (req, res) => {
  try {
    console.log('📅 Fetching schedule...');
    const data = await extractEverything('/cricket-schedule/upcoming-series/international', false);
    res.json(data);
  } catch (error) {
    console.error('❌ Schedule API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get rankings page
app.get('/api/rankings', async (req, res) => {
  try {
    console.log('🏆 Fetching rankings...');
    const data = await extractEverything('/cricket-stats/rankings', false);
    res.json(data);
  } catch (error) {
    console.error('❌ Rankings API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get points table
app.get('/api/points-table', async (req, res) => {
  try {
    const seriesId = req.query.seriesId || '';
    const path = seriesId ? `/cricket-series/${seriesId}/points-table` : '/cricket-series';
    console.log(`📊 Fetching points table: ${path}`);
    const data = await extractEverything(path, false);
    res.json(data);
  } catch (error) {
    console.error('❌ Points table API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

