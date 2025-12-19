import { BRANDS } from './types';

/**
 * Generates a random integer between min and max (inclusive)
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generates a random price rounded to 1000
 */
const randomPrice = (min, max) => Math.round(randomInt(min, max) / 1000) * 1000;

const MODELS = {
    'Hankook': ['Ventus S1 evo3', 'Kinergy 4S2', 'Dynapro HPX', 'iON evo'],
    'Kumho': ['Solus TA51', 'Ecsta PS71', 'Crugen HP71', 'WinterCraft WP72'],
    'Nexen': ['Nfera Supreme', 'Roadian GTX', 'Nblue HD Plus', 'Winguard Sport 2'],
    'Michelin': ['Pilot Sport 5', 'Primacy 4+', 'CrossClimate 2', 'Alpin 6'],
    'Continental': ['ExtremeContact DWS06', 'ProContact TX', 'VikingContact 7'],
    'Pirelli': ['P Zero', 'Cinturato P7', 'Scorpion Verde', 'Sottozero 3'],
    'Bridgestone': ['Potenza Sport', 'Turanza T005', 'Blizzak DM-V3'],
    'Dunlop': ['SP Sport Maxx', 'Grandtrek PT3', 'Winter Maxx'],
    'Goodyear': ['Eagle F1 Asymmetric', 'Assurance WeatherReady', 'UltraGrip Performance'],
    'Yokohama': ['Advan Sport V105', 'Geolandar CV', 'BluEarth-GT'],
    'Toyo': ['Proxes Sport', 'Open Country A/T', 'Observe GSi-6'],
    'Falken': ['Azenis FK510', 'Ziex ZE960', 'Eurowinter HS01']
};

const SIZES = [
    '195/65R15', '205/55R16', '215/55R17', '225/45R17', '225/40R18',
    '245/45R18', '245/40R19', '235/55R19', '275/40R20', '255/35R19'
];

const TYPES = ['Sedan', 'SUV', 'Truck', 'EV'];
const SEASONS = ['All-Season', 'Summer', 'Winter'];
const ORIGINS = ['Korea', 'Germany', 'USA', 'Japan', 'China', 'Mexico'];

/**
 * Generates a mock product database
 * @param {number} count Number of products to generate
 * @returns {import('./types').TireProduct[]}
 */
export const generateProducts = (count = 1000) => {
    const products = [];
    for (let i = 0; i < count; i++) {
        const brand = BRANDS[randomInt(0, BRANDS.length - 1)];
        const models = MODELS[brand] || ['Generic Model'];
        const model = models[randomInt(0, models.length - 1)];
        const size = SIZES[randomInt(0, SIZES.length - 1)];
        const [width, rest] = size.split('/');
        const [aspect, rim] = rest.split('R');

        products.push({
            id: `GTIN-${10000000 + i}`,
            gtin: `${8800000000000 + i}`,
            mfgCode: `${brand.substring(0, 3).toUpperCase()}-${randomInt(1000, 9999)}`,
            brand,
            model,
            size,
            specs: {
                sectionWidth: parseInt(width),
                aspectRatio: parseInt(aspect),
                rimDiameter: parseInt(rim),
                loadIndex: randomInt(85, 110),
                speedRating: ['H', 'V', 'W', 'Y'][randomInt(0, 3)]
            },
            type: TYPES[randomInt(0, TYPES.length - 1)],
            features: ['Low Noise', 'Fuel Efficient', 'High Grip', 'Long Life'].slice(0, randomInt(1, 4)),
            origin: ORIGINS[randomInt(0, ORIGINS.length - 1)],
            season: SEASONS[randomInt(0, SEASONS.length - 1)],
            performance: {
                fuelEfficiency: randomInt(1, 5),
                wetGrip: randomInt(1, 5),
                noiseLevel: randomInt(68, 75),
                brakingDist: randomInt(35, 45) // meters
            },
            imageUrl: 'placeholder'
        });
    }
    return products;
};

/**
 * Generates inventory for a list of products
 * @param {import('./types').TireProduct[]} products 
 * @returns {import('./types').InventoryRecord[]}
 */
export const generateInventory = (products) => {
    return products.flatMap(product => {
        // 30% chance of having store stock
        const hasStoreStock = Math.random() > 0.7;
        // 90% chance of having warehouse stock
        const hasWarehouseStock = Math.random() > 0.1;

        const inventory = [];

        if (hasStoreStock) {
            inventory.push({
                productId: product.id,
                stockQty: randomInt(1, 8),
                cost: randomPrice(80000, 300000),
                location: 'STORE-A1',
                type: 'store',
                reorderPoint: 4
            });
        }

        if (hasWarehouseStock) {
            inventory.push({
                productId: product.id,
                stockQty: randomInt(10, 200),
                cost: randomPrice(70000, 280000), // Slightly cheaper cost
                location: 'WH-MAIN',
                type: 'warehouse',
                reorderPoint: 20
            });
        }

        return inventory;
    });
};
