/**
 * Geo Service
 * 
 * Geospatial utilities: geocoding, reverse geocoding, routing, geohash encoding,
 * and other location‑based services.
 * 
 * Integrates with external APIs (when configured) and provides fallback
 * implementations using Turf.js and local algorithms.
 */

import { computePathLength as geometryComputePathLength, measureDistance } from '../admin/mapEditor/geometryTools.js';

// External service endpoints (can be configured via environment)
const GEOCODING_API = 'https://nominatim.openstreetmap.org/search';
const REVERSE_GEOCODING_API = 'https://nominatim.openstreetmap.org/reverse';
const ROUTING_API = 'https://router.project-osrm.org/route/v1';

// Cache for geocoding results to avoid excessive API calls
const geocodingCache = new Map();
const reverseGeocodingCache = new Map();

/**
 * Geocode a place name into coordinates (latitude, longitude).
 * Uses OpenStreetMap Nominatim (requires attribution and rate limiting).
 * @param {string} query - Place name, address, or landmark
 * @param {Object} options - { limit, countrycodes, viewbox }
 * @returns {Promise<Array>} Array of results [{ lat, lng, display_name, ... }]
 */
export async function geocode(query, options = {}) {
    const cacheKey = JSON.stringify({ query, options });
    if (geocodingCache.has(cacheKey)) {
        return geocodingCache.get(cacheKey);
    }
    
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: options.limit || 5,
        countrycodes: options.countrycodes || 'br',
        'accept-language': 'pt-BR'
    });
    
    if (options.viewbox) {
        params.append('viewbox', options.viewbox.join(','));
    }
    
    try {
        const response = await fetch(`${GEOCODING_API}?${params}`);
        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }
        const results = await response.json();
        const formatted = results.map(r => ({
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            displayName: r.display_name,
            type: r.type,
            importance: r.importance
        }));
        geocodingCache.set(cacheKey, formatted);
        return formatted;
    } catch (error) {
        console.error('Geocoding failed:', error);
        return [];
    }
}

/**
 * Reverse geocode coordinates into a human‑readable address.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Address object or null
 */
export async function reverseGeocode(lat, lng) {
    const cacheKey = `${lat},${lng}`;
    if (reverseGeocodingCache.has(cacheKey)) {
        return reverseGeocodingCache.get(cacheKey);
    }
    
    const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        'accept-language': 'pt-BR',
        zoom: 18
    });
    
    try {
        const response = await fetch(`${REVERSE_GEOCODING_API}?${params}`);
        if (!response.ok) {
            throw new Error(`Reverse geocoding API error: ${response.status}`);
        }
        const data = await response.json();
        const address = {
            lat,
            lng,
            displayName: data.display_name,
            address: data.address,
            osmId: data.osm_id,
            type: data.type
        };
        reverseGeocodingCache.set(cacheKey, address);
        return address;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return null;
    }
}

/**
 * Compute a route between two or more points using OSRM.
 * Returns geometry and turn‑by‑turn instructions.
 * @param {Array<[number, number]>} points - Array of [lat, lng] waypoints
 * @param {Object} options - { profile: 'driving' | 'walking' | 'cycling' }
 * @returns {Promise<Object>} Route result { geometry, distance, duration, steps }
 */
export async function route(points, options = {}) {
    if (!points || points.length < 2) {
        throw new Error('At least two points are required for routing');
    }
    
    const profile = options.profile || 'driving';
    const coordinates = points.map(p => `${p[1]},${p[0]}`).join(';');
    const params = new URLSearchParams({
        geometries: 'geojson',
        overview: 'full',
        steps: 'true',
        annotations: 'false'
    });
    
    try {
        const response = await fetch(
            `${ROUTING_API}/${profile}/${coordinates}?${params}`
        );
        if (!response.ok) {
            throw new Error(`Routing API error: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.code !== 'Ok') {
            console.warn('Routing API returned non‑OK:', data);
            return null;
        }
        
        const route = data.routes[0];
        const geometry = route.geometry;
        const distance = route.distance; // meters
        const duration = route.duration; // seconds
        const steps = route.legs.flatMap(leg => leg.steps);
        
        return { geometry, distance, duration, steps };
    } catch (error) {
        console.error('Routing failed:', error);
        return null;
    }
}

/**
 * Compute a geohash for a given latitude and longitude.
 * Uses geohash-js library if available, otherwise returns empty string.
 * @param {number} lat
 * @param {number} lng
 * @param {number} precision - Character length (default 9)
 * @returns {string} Geohash
 */
export function computeGeohash(lat, lng, precision = 9) {
    if (typeof window.geohash === 'function') {
        return window.geohash.encode(lat, lng, precision);
    }
    console.warn('Geohash library not loaded');
    return '';
}

/**
 * Decode a geohash into latitude/longitude and bounding box.
 * @param {string} geohash
 * @returns {Object} { lat, lng, bounds: { n, s, e, w } }
 */
export function decodeGeohash(geohash) {
    if (typeof window.geohash === 'function') {
        return window.geohash.decode(geohash);
    }
    console.warn('Geohash library not loaded');
    return { lat: 0, lng: 0, bounds: { n: 0, s: 0, e: 0, w: 0 } };
}

/**
 * Calculate the bounding box that contains all given points.
 * @param {Array<[number, number]>} points - Array of [lat, lng]
 * @returns {Object} { north, south, east, west }
 */
export function computeBoundingBox(points) {
    if (!points || points.length === 0) {
        return { north: 0, south: 0, east: 0, west: 0 };
    }
    
    let north = -90, south = 90, east = -180, west = 180;
    points.forEach(([lat, lng]) => {
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lng > east) east = lng;
        if (lng < west) west = lng;
    });
    
    return { north, south, east, west };
}

/**
 * Check if a point is within a bounding box.
 * @param {[number, number]} point - [lat, lng]
 * @param {Object} bbox - { north, south, east, west }
 * @returns {boolean}
 */
export function pointInBoundingBox(point, bbox) {
    const [lat, lng] = point;
    return lat >= bbox.south && lat <= bbox.north &&
           lng >= bbox.west && lng <= bbox.east;
}

/**
 * Calculate the centroid of a set of points (simple average).
 * @param {Array<[number, number]>} points
 * @returns {[number, number]} [lat, lng]
 */
export function computeCentroid(points) {
    if (!points || points.length === 0) return [0, 0];
    
    let sumLat = 0, sumLng = 0;
    points.forEach(([lat, lng]) => {
        sumLat += lat;
        sumLng += lng;
    });
    return [sumLat / points.length, sumLng / points.length];
}

/**
 * Snap a point to the nearest road (requires routing API).
 * This is a placeholder; a real implementation would call a snap‑to‑road service.
 * @param {[number, number]} point
 * @returns {Promise<[number, number]>} Snapped coordinates
 */
export async function snapToRoad(point) {
    console.warn('snapToRoad not fully implemented – returning original point');
    return point;
}

/**
 * Calculate the length of a path (polyline) in meters.
 * Delegates to geometryTools.computePathLength.
 * @param {Array<[number, number]>} path
 * @returns {number} Length in meters
 */
export function computePathLength(path) {
    return geometryComputePathLength(path);
}

/**
 * Calculate the distance between two points in meters.
 * Delegates to geometryTools.measureDistance.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters
 */
export function computeDistance(lat1, lng1, lat2, lng2) {
    return measureDistance(lat1, lng1, lat2, lng2);
}

/**
 * Format a distance value in meters to a human‑readable string.
 * @param {number} meters
 * @returns {string} e.g., "1.2 km", "450 m"
 */
export function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    } else {
        return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
    }
}

/**
 * Format a duration value in seconds to a human‑readable string.
 * @param {number} seconds
 * @returns {string} e.g., "5 min", "1 h 23 min"
 */
export function formatDuration(seconds) {
    if (seconds < 60) {
        return `${Math.round(seconds)} seg`;
    } else if (seconds < 3600) {
        const minutes = Math.round(seconds / 60);
        return `${minutes} min`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        return `${hours} h ${minutes} min`;
    }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.geoService = {
        geocode,
        reverseGeocode,
        route,
        computeGeohash,
        decodeGeohash,
        computeBoundingBox,
        pointInBoundingBox,
        computeCentroid,
        snapToRoad,
        computePathLength,
        computeDistance,
        formatDistance,
        formatDuration
    };
}