const scraper = require('./frontend/src/lib/server/scraper');

if (require.main === module) {
  scraper.main().catch(console.error);
}

module.exports = scraper;
