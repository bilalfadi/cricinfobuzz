/**
 * COMPLETE SCRAPER
 * Extracts everything from source - HTML, CSS, JavaScript, Images, Data, Code
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.cricbuzz.com';

/**
 * Fetch HTML from source
 */
async function fetchPage(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract EVERYTHING from a page
 * @param {string} pagePath - Path to extract
 * @param {boolean} fastMode - If true, skip heavy data (rawHtml, elements, textContent)
 */
async function extractEverything(pagePath = '/', fastMode = false) {
  console.log(`\n🔍 Extracting from: ${pagePath}${fastMode ? ' (FAST MODE - News & Matches Only)' : ''}`);
  
  try {
    const url = pagePath.startsWith('http') ? pagePath : `${BASE_URL}${pagePath}`;
    const html = await fetchPage(url);
    
    if (!html) {
      console.error(`❌ Failed to fetch HTML from: ${url}`);
      return null;
    }
    
    if (!html || typeof html !== 'string' || html.length === 0) {
      console.error(`❌ Invalid HTML received from: ${url}`);
      return null;
    }
    
    let $;
    try {
      $ = cheerio.load(html);
    } catch (parseError) {
      console.error(`❌ Failed to parse HTML:`, parseError.message);
      return null;
    }
  
  // In ULTRA FAST mode, extract ONLY newsCards and matchesList
  if (fastMode) {
    const extracted = {
      newsCards: [],
      matchesList: [],
      htmlLength: html.length,
      fastMode: true,
    };
    
    // Extract newsCardsData from script tags (Cricbuzz's data structure)
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (!content) return;
      
      // Extract newsCardsData
      if (content.includes('newsCardsData')) {
        try {
          const regexArray = /newsCardsData["']?\s*[:=]\s*(\[[\s\S]*?\])/;
          const matchArray = content.match(regexArray);
          if (matchArray && matchArray[1]) {
            try {
              const newsCards = JSON.parse(matchArray[1]);
              if (Array.isArray(newsCards) && newsCards.length > 0) {
                extracted.newsCards = newsCards;
                console.log(`✅ Found ${newsCards.length} news cards`);
              }
            } catch (e) {
              // Try manual extraction if regex fails
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Extract matchesList
      if (content.includes('matchesList') || content.includes('matchList')) {
        try {
          const regexObj = /matchesList["']?\s*[:=]\s*(\{[\s\S]*?\})/;
          const matchObj = content.match(regexObj);
          if (matchObj && matchObj[1]) {
            try {
              const matchesListObj = JSON.parse(matchObj[1]);
              if (matchesListObj?.matches && Array.isArray(matchesListObj.matches)) {
                extracted.matchesList = matchesListObj.matches;
                console.log(`✅ Found ${matchesListObj.matches.length} matches`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
    
    console.log(`✅ Fast extraction complete: ${extracted.newsCards.length} news, ${extracted.matchesList.length} matches`);
    return extracted;
  }
  
  // Full extraction (slow mode)
  const extracted = {
    // 1. RAW HTML
    rawHtml: html,
    htmlLength: html.length,
    
    // 2. ALL HTML ELEMENTS with attributes (skip in fast mode)
    elements: [],
    
    // 3. ALL CSS
    css: {
      inline: [],
      styleTags: [],
      external: [],
      allClasses: new Set(),
      allIds: new Set(),
    },
    
    // 4. ALL JAVASCRIPT (skip details in fast mode)
    javascript: {
      inline: [],
      external: [],
      variables: {},
      functions: [],
    },
    
    // 5. ALL IMAGES (limit in fast mode)
    images: [],
    
    // 6. ALL LINKS (limit in fast mode)
    links: [],
    
    // 7. ALL DATA ATTRIBUTES
    dataAttributes: {},
    
    // 8. META TAGS
    meta: {},
    
    // 9. STRUCTURED DATA
    structuredData: [],
    
    // 10. ALL TEXT CONTENT (skip in fast mode)
    textContent: [],
    
    // 11. CRICBUZZ SPECIFIC DATA (PRIORITY)
    newsCards: [],
    matchesList: [],
  };
  
    // Extract classes and IDs from all elements (fast - no full extraction)
    $('*').each((i, el) => {
      const $el = $(el);
      const className = $el.attr('class') || '';
      const id = $el.attr('id') || '';
      
      // Collect classes and IDs
      if (className) {
        className.split(/\s+/).forEach(cls => extracted.css.allClasses.add(cls));
      }
      if (id) {
        extracted.css.allIds.add(id);
      }
    });
    
    // Extract all elements (this is slow but we're in full mode)
    $('*').each((i, el) => {
      const $el = $(el);
      const tag = el.tagName?.toLowerCase() || '';
      const id = $el.attr('id') || '';
      const className = $el.attr('class') || '';
      const text = $el.text().trim();
      
      // Get all attributes
      const attributes = {};
      if (el.attribs) {
        Object.keys(el.attribs).forEach(attr => {
          attributes[attr] = el.attribs[attr];
        });
      }
      
      extracted.elements.push({
        tag,
        id,
        className,
        attributes,
        text: text.substring(0, 200),
        html: $el.toString().substring(0, 500),
      });
      
      // Extract text content
      if (text && text.length > 10) {
        extracted.textContent.push({
          tag,
          id,
          className,
          text,
        });
      }
    });
    
    // Extract CSS
    $('[style]').each((i, el) => {
      const $el = $(el);
      extracted.css.inline.push({
        tag: el.tagName?.toLowerCase(),
        id: $el.attr('id'),
        className: $el.attr('class'),
        style: $el.attr('style'),
      });
    });
  
    $('style').each((i, el) => {
      const $el = $(el);
      extracted.css.styleTags.push({
        index: i,
        type: $el.attr('type'),
        media: $el.attr('media'),
        css: $el.html(),
      });
    });
  
    $('link[rel="stylesheet"]').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (href) {
        extracted.css.external.push({
          href: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          media: $el.attr('media'),
        });
      }
    });
  
    // Extract JavaScript
    $('script').each((i, el) => {
      const $el = $(el);
      const content = $el.html() || '';
      const src = $el.attr('src') || '';
      
      if (content) {
        extracted.javascript.inline.push({
          index: i,
          type: $el.attr('type'),
          content: content.substring(0, 1000),
          length: content.length,
        });
      }
      
      // Extract variables and functions (needed for newsCards/matchesList)
      const varMatches = content.match(/(?:var|let|const)\s+(\w+)\s*=/g);
      const funcMatches = content.match(/function\s+(\w+)\s*\(/g);
      
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.match(/(\w+)\s*=/)?.[1];
          if (varName) extracted.javascript.variables[varName] = true;
        });
      }
      
      if (funcMatches) {
        funcMatches.forEach(match => {
          const funcName = match.match(/function\s+(\w+)/)?.[1];
          if (funcName) extracted.javascript.functions.push(funcName);
        });
      }
      
      if (src) {
        extracted.javascript.external.push({
          src: src.startsWith('http') ? src : `${BASE_URL}${src}`,
          type: $el.attr('type'),
        });
      }
    });
    
    // Extract Images
    $('img').each((i, el) => {
      const $el = $(el);
      const src = $el.attr('src') || $el.attr('data-src') || '';
      if (src) {
        extracted.images.push({
          src: src.startsWith('http') ? src : `${BASE_URL}${src}`,
          alt: $el.attr('alt'),
          title: $el.attr('title'),
          className: $el.attr('class'),
          id: $el.attr('id'),
        });
      }
    });

    // Extract Links
    $('a').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      if (href) {
        extracted.links.push({
          href: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          text: $el.text().trim(),
          className: $el.attr('class'),
        });
      }
    });
    
    // Extract Meta Tags
    $('meta').each((i, el) => {
      const $el = $(el);
      const name = $el.attr('name') || $el.attr('property') || '';
      const content = $el.attr('content') || '';
      if (name && content) {
        extracted.meta[name] = content;
      }
    });
    
    // Extract Structured Data (JSON-LD)
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        extracted.structuredData.push(data);
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    // Extract newsCardsData from script tags (Cricbuzz's data structure)
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (!content) return;
      
      // Multiple patterns to find newsCardsData
      const patterns = [
        '"newsCardsData"',
        "'newsCardsData'",
        'newsCardsData',
        '"newsCards"',
        "'newsCards'",
      ];
      
      for (const pattern of patterns) {
        if (content.includes(pattern) || content.includes('newsCardsData')) {
          try {
            // Try regex to extract array
            const regexArray = /newsCardsData["']?\s*[:=]\s*(\[[\s\S]*?\])/;
          const matchArray = content.match(regexArray);
          if (matchArray && matchArray[1]) {
            try {
              const newsCards = JSON.parse(matchArray[1]);
              if (Array.isArray(newsCards) && newsCards.length > 0) {
                extracted.newsCards = newsCards;
                console.log(`✅ Found ${newsCards.length} news cards via regex`);
                break;
              }
            } catch (e) {
              // Try manual extraction
            }
          }
          
          // Manual extraction - find the key
          const keyPattern = pattern;
          const keyIndex = content.indexOf(keyPattern);
          if (keyIndex !== -1) {
            const colonIndex = content.indexOf(':', keyIndex);
            const equalsIndex = content.indexOf('=', keyIndex);
            const separatorIndex = colonIndex !== -1 && equalsIndex !== -1 
              ? Math.min(colonIndex, equalsIndex)
              : (colonIndex !== -1 ? colonIndex : equalsIndex);
            
            if (separatorIndex !== -1) {
              let arrStart = -1;
              for (let i = separatorIndex + 1; i < content.length; i += 1) {
                if (content[i] === '[') {
                  arrStart = i;
                  break;
                }
                if (!/\s/.test(content[i]) && content[i] !== '\\' && content[i] !== '=') break;
              }
              if (arrStart !== -1) {
                let depth = 0;
                let inString = false;
                let escapeNext = false;
                let arrEnd = -1;
                for (let i = arrStart; i < content.length; i += 1) {
                  const char = content[i];
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  if ((char === '"' || char === "'") && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  if (inString) continue;
                  if (char === '[') depth += 1;
                  else if (char === ']') {
                    depth -= 1;
                    if (depth === 0) {
                      arrEnd = i + 1;
                      break;
                    }
                  }
                }
                if (arrEnd !== -1) {
                  let arrStr = content.slice(arrStart, arrEnd);
                  arrStr = arrStr.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");
                  try {
                    const newsCards = JSON.parse(arrStr);
                    if (Array.isArray(newsCards) && newsCards.length > 0) {
                      extracted.newsCards = newsCards;
                      console.log(`✅ Found ${newsCards.length} news cards via manual extraction`);
                      break;
                    }
                  } catch (e) {
                    // Try alternative parsing
                  }
                }
              }
            }
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
    
    // Extract matchesList
    if (content.includes('matchesList') || content.includes('matchList')) {
      try {
        // Try regex first
        const regexObj = /matchesList["']?\s*[:=]\s*(\{[\s\S]*?\})/;
        const matchObj = content.match(regexObj);
        if (matchObj && matchObj[1]) {
          try {
            const matchesListObj = JSON.parse(matchObj[1]);
            if (matchesListObj?.matches && Array.isArray(matchesListObj.matches)) {
              extracted.matchesList = matchesListObj.matches;
              console.log(`✅ Found ${matchesListObj.matches.length} matches via regex`);
            }
          } catch (e) {
            // Try manual extraction
          }
        }
        
        // Manual extraction
        const patterns = ['"matchesList"', "'matchesList'", 'matchesList', '"matchList"', "'matchList'", 'matchList'];
        for (const pattern of patterns) {
          const keyIndex = content.indexOf(pattern);
          if (keyIndex !== -1) {
            const colonIndex = content.indexOf(':', keyIndex);
            const equalsIndex = content.indexOf('=', keyIndex);
            const separatorIndex = colonIndex !== -1 && equalsIndex !== -1 
              ? Math.min(colonIndex, equalsIndex)
              : (colonIndex !== -1 ? colonIndex : equalsIndex);
            
            if (separatorIndex !== -1) {
              let braceStart = -1;
              for (let i = separatorIndex + 1; i < content.length; i += 1) {
                if (content[i] === '{') {
                  braceStart = i;
                  break;
                }
                if (!/\s/.test(content[i]) && content[i] !== '\\' && content[i] !== '=') break;
              }
              if (braceStart !== -1) {
                let depth = 0;
                let inString = false;
                let escapeNext = false;
                let braceEnd = -1;
                for (let i = braceStart; i < content.length; i += 1) {
                  const char = content[i];
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  if ((char === '"' || char === "'") && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  if (inString) continue;
                  if (char === '{') depth += 1;
                  else if (char === '}') {
                    depth -= 1;
                    if (depth === 0) {
                      braceEnd = i + 1;
                      break;
                    }
                  }
                }
                if (braceEnd !== -1) {
                  let objStr = content.slice(braceStart, braceEnd);
                  objStr = objStr.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");
                  try {
                    const matchesListObj = JSON.parse(objStr);
                    if (matchesListObj?.matches && Array.isArray(matchesListObj.matches)) {
                      extracted.matchesList = matchesListObj.matches;
                      console.log(`✅ Found ${matchesListObj.matches.length} matches via manual extraction`);
                      break;
                    }
                  } catch (e) {
                    // Continue to next pattern
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    });
    
    // Convert Sets to Arrays
    extracted.css.allClasses = Array.from(extracted.css.allClasses);
    extracted.css.allIds = Array.from(extracted.css.allIds);
    
    // Log summary
    console.log(`✅ Extracted summary:`);
    console.log(`   - CSS Classes: ${extracted.css.allClasses.length}`);
    console.log(`   - CSS IDs: ${extracted.css.allIds.length}`);
    console.log(`   - Images: ${extracted.images.length}`);
    console.log(`   - Links: ${extracted.links.length}`);
    console.log(`   - News Cards: ${extracted.newsCards.length}`);
    console.log(`   - Matches: ${extracted.matchesList.length}`);
    console.log(`   - Raw HTML: ${extracted.rawHtml ? 'YES (' + Math.round(extracted.rawHtml.length / 1024) + 'KB)' : 'NO (fast mode)'}`);
    
    return extracted;
  } catch (extractError) {
    console.error(`❌ Error during extraction:`, extractError.message);
    console.error('Stack:', extractError.stack);
    return null;
  }
}

/**
 * Save extracted data to file
 */
function saveToFile(data, filename) {
  const outputDir = path.join(__dirname, 'extracted');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved to: ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Complete Scraper...\n');
  
  const pages = [
    '/',
    '/cricket-news',
    '/cricket-match/live-scores',
    '/cricket-series',
    '/cricket-videos',
  ];
  
  for (const page of pages) {
    try {
      const data = await extractEverything(page);
      if (data) {
        const filename = page.replace(/\//g, '_') || 'homepage';
        saveToFile(data, `${filename}.json`);
        
        console.log(`📊 Extracted:`);
        console.log(`   - Elements: ${data.elements.length}`);
        console.log(`   - CSS Classes: ${data.css.allClasses.length}`);
        console.log(`   - CSS IDs: ${data.css.allIds.length}`);
        console.log(`   - Inline Styles: ${data.css.inline.length}`);
        console.log(`   - Style Tags: ${data.css.styleTags.length}`);
        console.log(`   - External CSS: ${data.css.external.length}`);
        console.log(`   - JavaScript Files: ${data.javascript.external.length}`);
        console.log(`   - Inline Scripts: ${data.javascript.inline.length}`);
        console.log(`   - Variables: ${Object.keys(data.javascript.variables).length}`);
        console.log(`   - Functions: ${data.javascript.functions.length}`);
        console.log(`   - Images: ${data.images.length}`);
        console.log(`   - Links: ${data.links.length}`);
        console.log(`   - Text Content: ${data.textContent.length}`);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error processing ${page}:`, error.message);
    }
  }
  
  console.log('\n✅ Scraping complete! Check the "extracted" folder.');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractEverything, fetchPage };
