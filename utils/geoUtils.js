/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lng1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lng2 - Longitude of second point in degrees
 * @returns {number} Distance in meters
 */
export const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
};

/**
 * Calculate distance between two coordinates in kilometers (legacy function)
 * @param {number} la1 - Latitude of first point in degrees
 * @param {number} lo1 - Longitude of first point in degrees
 * @param {number} la2 - Latitude of second point in degrees
 * @param {number} lo2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
export const calcDist = (la1, lo1, la2, lo2) => {
    return getDistanceMeters(la1, lo1, la2, lo2) / 1000;
};
