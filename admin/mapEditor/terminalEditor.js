/**
 * Terminal Editor Module
 * 
 * Specialized functions for managing terminals (a subtype of stop).
 * Builds on stopEditor.js but adds terminal‑specific validation and defaults.
 */

import { addStop, deleteStop, loadStopsForRoute, clearStopMarkers } from './stopEditor.js';
import { computePathLength, nearestPointOnLine } from './geometryTools.js';

/**
 * Add a terminal at the given coordinates.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} routeId - Firestore route document ID
 * @param {Object} options - Additional terminal properties { name, description, capacity, facilities }
 * @returns {Promise<string>} Promise resolving to the stop ID
 */
export async function addTerminal(lat, lng, routeId, options = {}) {
    const terminalOptions = {
        type: 'terminal',
        name: options.name || 'Terminal',
        description: options.description || '',
        sequence: options.sequence || 0,
        capacity: options.capacity || null,
        facilities: options.facilities || []
    };
    
    // Use stopEditor's addStop with terminal type
    return addStop(lat, lng, routeId, terminalOptions);
}

/**
 * Delete a terminal by its stop ID.
 * @param {string} terminalId
 */
export async function deleteTerminal(terminalId) {
    return deleteStop(terminalId);
}

/**
 * Load terminals for a route (filter stops where type === 'terminal').
 * @param {string} routeId
 * @returns {Promise<Array>} Array of terminal documents
 */
export async function loadTerminalsForRoute(routeId) {
    // This function would need to query Firestore directly, but for simplicity
    // we rely on stopEditor's loadStopsForRoute which already loads all stops.
    // In practice, you'd filter after loading.
    console.warn('loadTerminalsForRoute not fully implemented – use loadStopsForRoute and filter by type');
    return [];
}

/**
 * Validate terminal placement relative to route path.
 * Ensures terminal is within reasonable distance of route start/end.
 * @param {[number, number]} terminalPoint - [lat, lng]
 * @param {Array<[number, number]>} routePath - Route geometry
 * @param {number} maxDistance - Maximum allowed distance in meters (default 100)
 * @returns {Object} { isValid: boolean, distance: number, message: string }
 */
export function validateTerminalPlacement(terminalPoint, routePath, maxDistance = 100) {
    if (!routePath || routePath.length < 2) {
        return { isValid: false, distance: 0, message: 'Route path too short' };
    }
    
    // Compute distance to nearest point on route
    const nearest = nearestPointOnLine(terminalPoint, routePath);
    const distance = nearest.distance;
    
    if (distance <= maxDistance) {
        return { 
            isValid: true, 
            distance, 
            message: `Terminal está a ${distance.toFixed(1)} m do trajeto.` 
        };
    } else {
        return { 
            isValid: false, 
            distance, 
            message: `Terminal muito longe do trajeto (${distance.toFixed(1)} m > ${maxDistance} m).` 
        };
    }
}

/**
 * Suggest terminal positions near the start and end of a route.
 * Returns two points: start terminal (first path point) and end terminal (last path point).
 * @param {Array<[number, number]>} routePath
 * @returns {Object} { start: [lat, lng], end: [lat, lng] }
 */
export function suggestTerminalPositions(routePath) {
    if (!routePath || routePath.length === 0) {
        return { start: null, end: null };
    }
    return {
        start: routePath[0],
        end: routePath[routePath.length - 1]
    };
}

/**
 * Calculate the optimal position for a terminal along a route
 * by finding the point on the route closest to a given reference point.
 * @param {[number, number]} referencePoint - [lat, lng]
 * @param {Array<[number, number]>} routePath
 * @returns {[number, number]} Suggested terminal coordinates
 */
export function suggestTerminalNearPoint(referencePoint, routePath) {
    const nearest = nearestPointOnLine(referencePoint, routePath);
    return nearest.point;
}

/**
 * Check if a route already has terminals (at least one terminal stop).
 * @param {string} routeId
 * @returns {Promise<boolean>}
 */
export async function routeHasTerminals(routeId) {
    // This would require querying Firestore; for now return false
    console.warn('routeHasTerminals not implemented – requires Firestore query');
    return false;
}

/**
 * Get terminal capacity statistics for a route.
 * @param {string} routeId
 * @returns {Promise<Object>} { totalCapacity, terminalsCount }
 */
export async function getTerminalCapacity(routeId) {
    // Placeholder
    return { totalCapacity: 0, terminalsCount: 0 };
}

/**
 * Initialize terminal‑specific UI (if any).
 * Could add custom markers, popups, or controls.
 * @param {L.Map} map
 */
export function initTerminalEditor(map) {
    console.log('Terminal editor initialized on map');
    // Optionally add a custom control for terminal management
}

// Re‑export relevant stopEditor functions for convenience
export { loadStopsForRoute, clearStopMarkers };

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.terminalEditor = {
        addTerminal,
        deleteTerminal,
        loadTerminalsForRoute,
        validateTerminalPlacement,
        suggestTerminalPositions,
        suggestTerminalNearPoint,
        routeHasTerminals,
        getTerminalCapacity,
        initTerminalEditor
    };
}