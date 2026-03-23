/**
 * Firestore Collection Schema for Buzu Infrastructure Master Data
 * 
 * This file defines the collection names, field names, and data structures
 * used for storing geographic infrastructure (routes, stops, terminals)
 * and configuration data (lines, parameters, companies).
 * 
 * All collections are stored in Firestore, while high-frequency live data
 * remains in Firebase Realtime Database.
 */

export const COLLECTIONS = {
    LINES: 'lines',
    ROUTES: 'routes',
    STOPS: 'stops',
    PARAMETERS: 'parameters',
    COMPANIES: 'companies',
};

export const FIELD = {
    // Common fields
    ID: 'id',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
    CREATED_BY: 'createdBy',
    
    // Lines collection
    LINE_ID: 'lineId',
    LINE_NAME: 'name',
    LINE_VIA: 'via',
    LINE_COLOR: 'color',
    LINE_COMPANY: 'company',
    
    // Routes collection
    ROUTE_LINE_ID: 'lineId', // reference to lines document ID
    ROUTE_PATH: 'path', // array of [lat, lng]
    ROUTE_LENGTH: 'length', // in meters, computed by Turf.js
    ROUTE_BOUNDS: 'bounds', // {north, south, east, west}
    
    // Stops collection (includes terminals)
    STOP_ROUTE_ID: 'routeId', // reference to routes document ID
    STOP_LOCATION: 'location', // {lat, lng}
    STOP_GEOHASH: 'geohash', // string, precision 9
    STOP_TYPE: 'type', // 'stop' or 'terminal'
    STOP_NAME: 'name',
    STOP_DESCRIPTION: 'description',
    STOP_SEQUENCE: 'sequence', // order along the route
    STOP_IS_ACTIVE: 'isActive',
    
    // Parameters collection
    PARAM_KEY: 'key',
    PARAM_VALUE: 'value',
    
    // Companies collection
    COMPANY_ID: 'id',
    COMPANY_NAME: 'name',
    COMPANY_LOGO: 'logo',
    COMPANY_FAVICON: 'favicon',
    COMPANY_COLOR: 'color',
};

/**
 * Default geohash precision for stops (9 characters ≈ 2m precision)
 */
export const GEOHASH_PRECISION = 9;

/**
 * Validation constants used by Turf.js
 */
export const VALIDATION = {
    MIN_DISTANCE_BETWEEN_STOPS: 100, // meters
    MAX_DISTANCE_FROM_ROUTE: 50, // meters
};