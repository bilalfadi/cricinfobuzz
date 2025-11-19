type ExtractEverythingFn = (path?: string, fastMode?: boolean) => Promise<any>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const scraperModule = require('../../../../scraper.js') as {
  extractEverything: ExtractEverythingFn;
};

export const extractEverything: ExtractEverythingFn = scraperModule.extractEverything;


