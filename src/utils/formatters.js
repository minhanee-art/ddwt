/**
 * Brand Name Mapping (English to Hangul)
 */
export const BRAND_KO_MAP = {
    'Hankook': '한국타이어',
    'Kumho': '금호타이어',
    'Nexen': '넥센타이어',
    'Michelin': '미쉐린',
    'Continental': '콘티넨탈',
    'Pirelli': '피렐리',
    'Bridgestone': '브리지스톤',
    'Dunlop': '던롭',
    'Goodyear': '굿이어',
    'Yokohama': '요코하마',
    'Toyo': '토요타이어',
    'Falken': '팔켄',
    'Laufenn': '라우펜',
    'All': '전체'
};

/**
 * Normalizes a size string for search comparison.
 * Removes all non-digit characters.
 * Example: "245/45R18" -> "2454518"
 * @param {string} sizeStr 
 * @returns {string}
 */
export const normalizeSize = (sizeStr) => {
    if (!sizeStr) return '';
    return sizeStr.replace(/\D/g, '');
};

/**
 * Get the display name for a brand (preferring Hangul if available).
 * @param {string} brandName 
 * @returns {string}
 */
export const getBrandDisplayName = (brandName) => {
    return BRAND_KO_MAP[brandName] || brandName;
};
