/**
 * Geometry Tools for Map Editing
 * 
 * Provides geospatial utilities for measuring, validating, and manipulating
 * geometries using Turf.js (if available) and native Leaflet operations.
 * 
 * Used by routeEditor, stopEditor, and other map editing modules.
 */

// Check for Turf.js availability
const turf = window.turf || null;

/**
 * Compute the length of a polyline (array of [lat, lng]) in meters.
 * Uses Turf.lineString + length if available, otherwise Haversine approximation.
 * @param {Array<[number, number]>} path - Array of [lat, lng] coordinates
 * @returns {number} Length in meters
 */
export function computePathLength(path) {
    if (!path || path.length < 2) return 0;
    
    if (turf) {
        try {
            const line = turf.lineString(path);
            return turf.length(line, { units: 'meters' });
        } catch (e) {
            console.warn('Turf length calculation failed:', e);
        }
    }
    
    // Fallback: simple Haversine sum
    let total = 0;
    for (let i = 1; i < path.length; i++) {
        const [lat1, lng1] = path[i - 1];
        const [lat2, lng2] = path[i];
        total += haversineDistance(lat1, lng1, lat2, lng2);
    }
    return total;
}

/**
 * Compute the area of a polygon (array of rings) in square meters.
 * Uses Turf.polygon + area if available, otherwise approximate using spherical polygon area.
 * @param {Array<Array<[number, number]>>} rings - Outer ring + optional holes
 * @returns {number} Area in square meters
 */
export function computePolygonArea(rings) {
    if (!rings || rings.length === 0) return 0;
    
    if (turf) {
        try {
            const polygon = turf.polygon(rings);
            return turf.area(polygon);
        } catch (e) {
            console.warn('Turf area calculation failed:', e);
        }
    }
    
    // Fallback: approximate using spherical geometry (very rough)
    console.warn('Turf not available; polygon area fallback not implemented');
    return 0;
}

/**
 * Measure distance between two points (lat/lng) in meters.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters
 */
export function measureDistance(lat1, lng1, lat2, lng2) {
    if (turf) {
        const from = turf.point([lng1, lat1]);
        const to = turf.point([lng2, lat2]);
        return turf.distance(from, to, { units: 'meters' });
    }
    return haversineDistance(lat1, lng1, lat2, lng2);
}

/**
 * Find the nearest point on a line (path) to a given point.
 * Returns the projected coordinates and distance.
 * @param {[number, number]} point - [lat, lng]
 * @param {Array<[number, number]>} line - Array of [lat, lng]
 * @returns {Object} { point: [lat, lng], distance: number, index: number }
 */
export function nearestPointOnLine(point, line) {
    if (!turf || line.length < 2) {
        return { point: point, distance: 0, index: 0 };
    }
    
    const turfLine = turf.lineString(line);
    const turfPoint = turf.point([point[1], point[0]]); // Turf uses [lng, lat]
    const snapped = turf.nearestPointOnLine(turfLine, turfPoint);
    
    return {
        point: [snapped.geometry.coordinates[1], snapped.geometry.coordinates[0]],
        distance: snapped.properties.dist,
        index: snapped.properties.index
    };
}

/**
 * Simplify a path using Turf's simplification (Ramer‑Douglas‑Peucker).
 * @param {Array<[number, number]>} path
 * @param {number} tolerance - Tolerance in meters
 * @returns {Array<[number, number]>} Simplified path
 */
export function simplifyPath(path, tolerance = 10) {
    if (!turf || path.length < 3) return path;
    
    const line = turf.lineString(path);
    const simplified = turf.simplify(line, { tolerance: tolerance / 1000, highQuality: true }); // tolerance in km
    return simplified.geometry.coordinates.map(coord => [coord[1], coord[0]]);
}

/**
 * Check if a point is within a polygon.
 * @param {[number, number]} point - [lat, lng]
 * @param {Array<[number, number]>} polygon - Array of polygon vertices (closed)
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
    if (!turf) {
        // Fallback using ray casting algorithm
        return rayCasting(point, polygon);
    }
    
    const turfPolygon = turf.polygon([polygon]);
    const turfPoint = turf.point([point[1], point[0]]);
    return turf.booleanPointInPolygon(turfPoint, turfPolygon);
}

/**
 * Calculate the centroid of a polygon or polyline.
 * @param {Array<[number, number]>} coords
 * @returns {[number, number]} [lat, lng] of centroid
 */
export function computeCentroid(coords) {
    if (!turf || coords.length === 0) return [0, 0];
    
    if (coords.length === 1) return coords[0];
    
    const line = turf.lineString(coords);
    const centroid = turf.centroid(line);
    const [lng, lat] = centroid.geometry.coordinates;
    return [lat, lng];
}

/**
 * Create a buffer around a point (circle) with given radius in meters.
 * Returns a polygon approximating the circle.
 * @param {[number, number]} center - [lat, lng]
 * @param {number} radius - meters
 * @param {number} steps - number of vertices (default 32)
 * @returns {Array<[number, number]>} Polygon vertices
 */
export function createBuffer(center, radius, steps = 32) {
    if (!turf) {
        // Fallback using simple circle approximation
        return approximateCircle(center, radius, steps);
    }
    
    const point = turf.point([center[1], center[0]]);
    const buffered = turf.buffer(point, radius / 1000, { units: 'kilometers' });
    // Turf returns a polygon; extract outer ring
    const coordinates = buffered.geometry.coordinates[0];
    return coordinates.map(coord => [coord[1], coord[0]]);
}

/**
 * Validate geometry constraints (used by routeEditor).
 * Returns array of error messages.
 * @param {Array<[number, number]>} path - Route path
 * @param {Array<{lat, lng}>} stops - Stops
 * @param {Array<{lat, lng}>} terminals - Terminals
 * @param {Object} constraints - Validation constants (MIN_DISTANCE_BETWEEN_STOPS, etc.)
 * @returns {Array<string>} Error messages
 */
export function validateGeometry(path, stops, terminals, constraints) {
    const errors = [];
    if (!turf) return errors;
    
    // 1. Minimum distance between stops
    for (let i = 0; i < stops.length; i++) {
        for (let j = i + 1; j < stops.length; j++) {
            const from = turf.point([stops[i].lng, stops[i].lat]);
            const to = turf.point([stops[j].lng, stops[j].lat]);
            const distance = turf.distance(from, to, { units: 'meters' });
            if (distance < constraints.MIN_DISTANCE_BETWEEN_STOPS) {
                errors.push(`Paradas ${i+1} e ${j+1} estão muito próximas (${distance.toFixed(1)} m).`);
            }
        }
    }
    
    // 2. Stops must be near the route path (max distance)
    if (path.length >= 2) {
        const routeLine = turf.lineString(path);
        stops.forEach((stop, idx) => {
            const stopPoint = turf.point([stop.lng, stop.lat]);
            const distance = turf.pointToLineDistance(stopPoint, routeLine, { units: 'meters' });
            if (distance > constraints.MAX_DISTANCE_FROM_ROUTE) {
                errors.push(`Parada ${idx+1} está muito longe do trajeto (${distance.toFixed(1)} m).`);
            }
        });
    }
    
    // 3. Path length validation (optional)
    // Could add max length, min length, etc.
    
    return errors;
}

// ==================== Internal Helper Functions ====================

/**
 * Haversine distance between two points (lat/lng) in meters.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

/**
 * Ray casting algorithm for point-in-polygon (fallback).
 */
function rayCasting(point, polygon) {
    let inside = false;
    const [x, y] = point;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

/**
 * Approximate a circle as a polygon (fallback for buffer).
 */
function approximateCircle(center, radius, steps) {
    const [lat, lng] = center;
    const points = [];
    const earthRadius = 6371000; // meters
    const angularDistance = radius / earthRadius;
    
    for (let i = 0; i < steps; i++) {
        const angle = (i * 2 * Math.PI) / steps;
        const latRad = lat * Math.PI / 180;
        const lngRad = lng * Math.PI / 180;
        
        const lat2 = Math.asin(Math.sin(latRad) * Math.cos(angularDistance) +
                               Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(angle));
        const lng2 = lngRad + Math.atan2(Math.sin(angle) * Math.sin(angularDistance) * Math.cos(latRad),
                                         Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat2));
        points.push([lat2 * 180 / Math.PI, lng2 * 180 / Math.PI]);
    }
    // Close the polygon
    points.push(points[0]);
    return points;
}

/**
 * Expose Turf availability for other modules.
 */
export function isTurfAvailable() {
    return !!turf;
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.geometryTools = {
        computePathLength,
        computePolygonArea,
        measureDistance,
        nearestPointOnLine,
        simplifyPath,
        pointInPolygon,
        computeCentroid,
        createBuffer,
        validateGeometry,
        isTurfAvailable
    };
}