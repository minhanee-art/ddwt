/**
 * @typedef {Object} TireProduct
 * @property {string} id - Unique Identifier (GTIN or Manufacturer Code)
 * @property {string} gtin - Global Trade Item Number (SSOT)
 * @property {string} mfgCode - Manufacturer Product Code
 * @property {string} brand - Brand Name
 * @property {string} model - Model Name
 * @property {string} size - Full Size String (e.g., "245/45R19")
 * @property {TireSpecs} specs - ISO/ETRTO Specifications
 * @property {string} type - Vehicle Type (Sedan, SUV, Truck)
 * @property {string[]} features - Key Features (ACES/PIES mapped)
 * @property {string} origin - Country of Origin
 * @property {string} season - Seasonality (All-Season, Winter, Summer)
 * @property {PerformanceRatings} performance - Quantified Performance Data
 * @property {string} imageUrl - Product Image URL
 */

/**
 * @typedef {Object} TireSpecs
 * @property {number} sectionWidth - e.g., 245
 * @property {number} aspectRatio - e.g., 45
 * @property {number} rimDiameter - e.g., 19
 * @property {number} loadIndex - e.g., 98
 * @property {string} speedRating - e.g., "V"
 */

/**
 * @typedef {Object} PerformanceRatings
 * @property {number} fuelEfficiency - 1-5 Scale or Grade
 * @property {number} wetGrip - 1-5 Scale or Grade
 * @property {number} noiseLevel - Decibels (dB)
 * @property {number} brakingDist - Braking Distance (m) (Auto Bild verified)
 */

/**
 * @typedef {Object} InventoryRecord
 * @property {string} productId - Links to TireProduct.id
 * @property {number} stockQty - Available Quantity
 * @property {number} cost - Unit Cost
 * @property {string} location - Warehouse Location ID
 * @property {'store' | 'warehouse'} type - Inventory Source Type
 * @property {number} reorderPoint - Minimum stock level before reorder
 */

export const BRANDS = [
    'Hankook', 'Kumho', 'Nexen', 'Michelin', 'Continental',
    'Pirelli', 'Bridgestone', 'Dunlop', 'Goodyear', 'Yokohama',
    'Toyo', 'Falken'
];
