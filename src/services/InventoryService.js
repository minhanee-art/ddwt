import { generateProducts, generateInventory } from '../data/mockData';

class InventoryService {
    constructor() {
        this.products = [];
        this.inventory = [];
        this.initialized = false;
    }

    /**
     * Initialize the mock database
     */
    init() {
        if (this.initialized) return;

        console.log('Initializing Inventory Service...');
        // Simulate loading 120k products (scaled down to 2000 for browser performance)
        this.products = generateProducts(2000);
        this.inventory = generateInventory(this.products);
        this.initialized = true;
        console.log(`Loaded ${this.products.length} products and ${this.inventory.length} inventory records.`);
    }

    /**
     * Search products with filtering
     * @param {Object} criteria
     * @returns {Object[]} Enriched products with inventory info
     */


    /**
     * Fetch items for the Shop View.
     * Tries to fetch from the real proxy if configured, otherwise falls back to mock data.
     */
    async fetchShopItems(sizeSearch = '') {
        // Feature Flag: Set to true if you have the proxy working and want to try real fetch
        const ENABLE_REAL_FETCH = true;

        if (ENABLE_REAL_FETCH) {
            try {
                // Use the consolidated proxy endpoint (works for both local and Vercel)
                let url = '/api/inventory';
                const params = new URLSearchParams();
                if (sizeSearch) {
                    params.append('stx', sizeSearch);
                }

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                console.log(`Fetching from ${url}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('Network response was not ok');
                const text = await response.text();

                // Check if response is actually a login page (common issue with proxies)
                // However, stock_list_option.php returns HTML table on success
                if (text.includes('login') || text.includes('로그인') || (text.includes('<!DOCTYPE html>') && !text.includes('<table'))) {
                    console.warn("API returned login page. Falling back to mock data.");
                    return this.generateMockShopData();
                }

                const parsedData = this.parseShopData(text);
                // Return whatever the API gave us (empty if no valid items)
                return parsedData;

            } catch (err) {
                console.warn("Real fetch failed or timed out:", err);
                return []; // Return empty instead of mock if it actually fails
            }
        }

        // Only use mock data if real fetch is explicitly disabled
        return this.generateMockShopData();
    }

    generateMockShopData() {
        return new Promise(resolve => {
            setTimeout(() => {
                const shopData = this.products.map(p => {
                    const productInv = this.inventory.filter(i => i.productId === p.id);
                    const totalStock = productInv.reduce((sum, item) => sum + item.stockQty, 0);
                    return {
                        brand: p.brand,
                        model: p.model,
                        size: p.size,
                        partNo: `THH${Math.floor(Math.random() * 9000000) + 1000000}`, // Mock Unique Code format
                        type: p.type,
                        totalStock: totalStock,
                        apiPrice: 0, // Initialize mock with 0
                        factoryPrice: 0, // Initialize mock with 0
                        discountRate: 0
                    };
                });
                resolve(shopData);
            }, 600);
        });
    }

    parseShopData(responseBody) {
        console.log("Parsing API Response (stock_list_option)...");

        const parser = new DOMParser();
        const doc = parser.parseFromString(responseBody, 'text/html');
        // Select rows (filtering out the header row if possible, but our index check handles it)
        const rows = Array.from(doc.querySelectorAll('table.stock-list_table tbody tr'));

        if (rows.length === 0) {
            console.warn("No rows found in HTML response");
            return [];
        }

        const parsedItems = rows.map((row, rowIndex) => {
            const cols = Array.from(row.querySelectorAll('td'));
            if (cols.length < 5) return null;

            // Helper to get text or input value
            const getValue = (col) => {
                if (!col) return '';
                const input = col.querySelector('input[type="text"]');
                if (input) return input.value.trim();
                return col.textContent.trim();
            };

            const getText = (col) => col ? col.textContent.trim() : '';

            /**
             * Indices based on HTML analysis:
             * 1: Brand (Text)
             * 2: Model (Text)
             * 3: Part No (Text) -> New!
             * 4: Size (Text)
             * 5: Unique Code (Input value)
             * 9: Current Stock (Text)
             * 10: Price (Input value)
             */
            const rawBrand = getText(cols[1]);
            const rawModel = getText(cols[2]);
            const rawPartNo = getText(cols[3]); // Internal Part No
            const rawSize = getText(cols[4]);

            // USER REQUEST: Exclude discontinued products
            // The status is typically in the last or second to last column
            const lastColText = getText(cols[cols.length - 1]);
            const secondLastColText = getText(cols[cols.length - 2]);
            if (lastColText.includes('단종') || secondLastColText.includes('단종')) return null;

            // USER REQUEST: Show all products from the list, even if Unique Code is missing.
            const uniqueCode = getValue(cols[5]);

            // Stock is text in col 9 
            const stockQty = Number(getText(cols[9]).replace(/[^0-9]/g, '')) || 0;

            // Price is in input in col 10 (This is the "Supply Price" / 납품가)
            const supplyPrice = Number(getValue(cols[10]).replace(/[^0-9]/g, '')) || 0;

            return {
                brand: rawBrand,
                model: rawModel,
                size: rawSize,
                partNo: uniqueCode, // This is the Unique Code (Input value)
                internalCode: rawPartNo, // This is the Internal Part No (Text)
                supplyPrice: supplyPrice, // Isolated API price
                factoryPrice: 0, // Strictly 0 until merged with sheet
                totalStock: stockQty,
                discountRate: 0,
                type: ''
            };
        }).filter(item => item !== null);

        // Deduplicate Items
        const uniqueItems = [];
        const seen = new Set();

        parsedItems.forEach(item => {
            const key = `${item.brand}-${item.model}-${item.size}-${item.partNo}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueItems.push(item);
            }
        });

        return uniqueItems;
    }

    /**
     * Search products with filtering
         * @param {Object} criteria
         * @returns {Object[]} Enriched products with inventory info
         */
    search(criteria = {}) {
        const { query, brand, type, season } = criteria;
        const lowerQuery = query?.toLowerCase() || '';

        return this.products.filter(p => {
            const matchesQuery = !lowerQuery ||
                p.size.includes(lowerQuery) ||
                p.model.toLowerCase().includes(lowerQuery) ||
                p.brand.toLowerCase().includes(lowerQuery);

            const matchesBrand = !brand || brand === 'All' || p.brand === brand;
            const matchesType = !type || type === 'All' || p.type === type;
            const matchesSeason = !season || season === 'All' || p.season === season;

            return matchesQuery && matchesBrand && matchesType && matchesSeason;
        }).map(product => {
            // Attach inventory summary
            const productInv = this.inventory.filter(i => i.productId === product.id);
            const storeStock = productInv.find(i => i.type === 'store')?.stockQty || 0;
            const warehouseStock = productInv.find(i => i.type === 'warehouse')?.stockQty || 0;
            const price = productInv[0]?.cost ? Math.round(productInv[0].cost * 1.2) : 0; // Retail price = Cost * 1.2

            return {
                ...product,
                storeStock,
                warehouseStock,
                price,
                totalStock: storeStock + warehouseStock
            };
        }).sort((a, b) => {
            // Smart Recommendation: Sort by Store Stock desc, then Price asc
            if (a.storeStock !== b.storeStock) return b.storeStock - a.storeStock;
            return a.price - b.price;
        });
    }

    /**
     * Simulate placing an order
     * @param {string} productId 
     * @param {number} qty 
     * @param {'store' | 'warehouse'} source 
     */
    placeOrder(productId, qty, source) {
        const record = this.inventory.find(i => i.productId === productId && i.type === source);
        if (!record) throw new Error('Inventory record not found');
        if (record.stockQty < qty) throw new Error('Insufficient stock');

        record.stockQty -= qty;

        // Check Reorder Point
        if (record.stockQty <= record.reorderPoint) {
            console.warn(`[ALERT] Low stock for ${productId} at ${source}. Current: ${record.stockQty}, Reorder Point: ${record.reorderPoint}`);
            // In a real app, this would trigger an automatic PO
        }

        return true;
    }

    /**
     * USER REQUEST: Fetch factory prices from shop/list.php (via AJAX)
     * This helps fill in missing factory prices that are not in the Google Sheet.
     */
    async fetchFactoryPrices(sizeSearch) {
        try {
            const params = new URLSearchParams();
            params.append('stx', sizeSearch);
            params.append('ca_id', '10'); // Default tire category
            params.append('srch_type', 'tire');

            const response = await fetch('/api/shop_ajax', {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.ok) return {};

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.product_list_wrap');

            const priceMap = {}; // Key: "model|size", Value: Price

            items.forEach(item => {
                // The list_more.php returns HTML chunks with items
                // Using .title for model and .english_title_box span for size
                // .sub_price contains the factory price
                const model = item.querySelector('.title')?.textContent?.trim();
                const size = item.querySelector('.english_title_box span')?.textContent?.trim();
                const priceText = item.querySelector('.sub_price')?.textContent?.trim();

                if (model && size && priceText) {
                    const cleanPrice = Number(priceText.replace(/[^0-9]/g, ''));
                    // Normalize the key: remove non-alphanumeric, lowercase
                    const normModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normSize = size.replace(/[^0-9]/g, '');
                    const key = `${normModel}|${normSize}`;
                    priceMap[key] = cleanPrice;
                    console.log(`[Scraper] Found Shop Price: ${model} ${size} -> ${cleanPrice} (Key: ${key})`);
                }
            });

            return priceMap;
        } catch (error) {
            console.error("Failed to fetch shop prices:", error);
            return {};
        }
    }
}

export const inventoryService = new InventoryService();
