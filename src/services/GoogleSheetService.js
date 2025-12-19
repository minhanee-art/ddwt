import Papa from 'papaparse';

// Consolidated Sheet URL from User (Corrected to output CSV)
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTHpRh8_kaiBQQaXE0i8nz2tH8uAwm1I1oS6hHQF87C5-LrlDcNTbRKN5xCVeEtbgro8pA2LAjRgT8V/pub?gid=903841373&single=true&output=csv';

// Cache configuration
let cachedSheetData = null;
let lastFetchTime = 0;
const CACHE_TTL = 1 * 60 * 1000; // 1 minute in milliseconds

/**
 * Service to fetch Data (Price, DOT, Info) from Google Sheets
 */
export const googleSheetService = {
    /**
     * Fetches all product data from the configured Google Sheet CSV.
     * Uses in-memory caching to improve performance.
     */
    fetchSheetData: async (forceRefresh = false) => {
        const now = Date.now();
        if (!forceRefresh && cachedSheetData && (now - lastFetchTime < CACHE_TTL)) {
            console.log('Serving Google Sheet data from cache');
            return Promise.resolve(cachedSheetData);
        }

        try {
            console.log('Fetching Google Sheet data from network...');
            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            const csvText = await response.text();

            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const parsedData = results.data.map(row => {
                            // Extract Key Fields
                            const code = row['code'] ? String(row['code']).trim() : '';
                            const size = row['size'] ? String(row['size']).trim() : '';
                            const brand = row['brand'] ? String(row['brand']).trim() : '';
                            const model = row['model'] ? String(row['model']).trim() : '';
                            const price = row['factory price'] ? row['factory price'].replace(/[^0-9]/g, '') : '0';

                            // Extract DOT columns (e.g., "DOT #1-1", "DOT #1-2" ... "DOT #1-9")
                            const dotList = [];
                            Object.keys(row).forEach(key => {
                                if (key.includes('#')) {
                                    const val = row[key] ? row[key].trim() : '';
                                    // Clean up label: "DOT #1-1" -> "#1-1"
                                    const label = key.replace('DOT ', '').trim();
                                    if (val && val !== '0' && val !== '-') {
                                        dotList.push(`${label}: ${val}`);
                                    }
                                }
                            });

                            return {
                                code: code,
                                size: size,
                                brand: brand,
                                model: model,
                                factoryPrice: Number(price),
                                dotList: dotList
                            };
                        }).filter(item => {
                            return item.code && item.code !== '0';
                        });

                        // Update Cache
                        cachedSheetData = parsedData;
                        lastFetchTime = Date.now();

                        resolve(parsedData);
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching Google Sheet data:', error);
            // Return cached data if available even if expired on error
            if (cachedSheetData) return Promise.resolve(cachedSheetData);
            return [];
        }
    }
};
