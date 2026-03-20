/**
 * Pointer Service - Enhanced implementation with GPS stabilization
 * Features:
 * - Real distance calculation in meters (Haversine formula)
 * - Accuracy filtering
 * - Smoothing algorithm to reduce oscillation
 * - Jump filter to prevent teleportation
 * - Comprehensive debugging logs
 * 
 * MODIFIED: Removed user marker/pointer creation - only tracks position for geolocation
 */

import { state } from '../core/stateManager.js';
import { getDistanceMeters } from '../utils/geoUtils.js';

// Position tracking for stabilization
let lastValidPosition = null;
let lastUpdateTime = null;
const MIN_DISTANCE_THRESHOLD = 10; // 10 meters minimum movement
const MAX_JUMP_DISTANCE = 50; // 50 meters maximum jump (anti-teleport)
const SMOOTHING_FACTOR = 0.5; // 50% smoothing (average between old and new)

/**
 * Apply smoothing between last valid position and new position
 * @param {number} newLat - New latitude
 * @param {number} newLng - New longitude
 * @returns {Object} Smoothed { lat, lng }
 */
function applySmoothing(newLat, newLng) {
    if (!lastValidPosition) {
        return { lat: newLat, lng: newLng };
    }
    
    // Simple weighted average smoothing
    const smoothedLat = (lastValidPosition.lat * (1 - SMOOTHING_FACTOR)) + (newLat * SMOOTHING_FACTOR);
    const smoothedLng = (lastValidPosition.lng * (1 - SMOOTHING_FACTOR)) + (newLng * SMOOTHING_FACTOR);
    
    console.log(`Smoothing applied: (${newLat.toFixed(6)}, ${newLng.toFixed(6)}) -> (${smoothedLat.toFixed(6)}, ${smoothedLng.toFixed(6)})`);
    return { lat: smoothedLat, lng: smoothedLng };
}

/**
 * Validate position change to prevent jumps and oscillations
 * @param {number} newLat - New latitude
 * @param {number} newLng - New longitude
 * @param {number} accuracy - GPS accuracy in meters (optional)
 * @returns {Object} Validation result { isValid: boolean, distance: number, reason: string }
 */
function validatePosition(newLat, newLng, accuracy = null) {
    // If no previous position, always valid (first update)
    if (!lastValidPosition) {
        return { isValid: true, distance: 0, reason: 'First position' };
    }
    
    // Calculate real distance in meters
    const distance = getDistanceMeters(
        lastValidPosition.lat, lastValidPosition.lng,
        newLat, newLng
    );
    
    // Check accuracy (if provided)
    if (accuracy !== null && accuracy > 100) {
        return { 
            isValid: false, 
            distance, 
            reason: `Accuracy too low: ${accuracy}m > 100m threshold` 
        };
    }
    
    // Check for jumps (teleportation)
    if (distance > MAX_JUMP_DISTANCE) {
        return { 
            isValid: false, 
            distance, 
            reason: `Jump too large: ${distance.toFixed(1)}m > ${MAX_JUMP_DISTANCE}m threshold` 
        };
    }
    
    // Check minimum movement threshold
    if (distance < MIN_DISTANCE_THRESHOLD) {
        return { 
            isValid: false, 
            distance, 
            reason: `Movement too small: ${distance.toFixed(1)}m < ${MIN_DISTANCE_THRESHOLD}m threshold` 
        };
    }
    
    return { isValid: true, distance, reason: 'Valid movement' };
}

/**
 * Track user position without creating a visual marker on the map
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} accuracy - GPS accuracy in meters (optional)
 * @param {boolean} forceUpdate - Force update even if position hasn't changed much
 * @returns {boolean} True if position was updated, false otherwise
 */
export function updateUserPointer(lat, lng, accuracy = null, forceUpdate = false) {
    // Check if map is available (still needed for some operations)
    if (!state.map || !window.L) {
        console.warn('Map or Leaflet not available for pointer tracking');
        return false;
    }
    
    // Log incoming position with accuracy
    console.log(`GPS Position received: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, accuracy=${accuracy !== null ? accuracy + 'm' : 'unknown'}`);
    
    // Validate position (unless forced)
    if (!forceUpdate) {
        const validation = validatePosition(lat, lng, accuracy);
        console.log(`Position validation: ${validation.reason}, distance=${validation.distance.toFixed(1)}m`);
        
        if (!validation.isValid) {
            console.log(`Position rejected: ${validation.reason}`);
            return false;
        }
    }
    
    // Apply smoothing
    const smoothedPosition = applySmoothing(lat, lng);
    
    // Update last valid position (NO MARKER CREATED)
    lastValidPosition = smoothedPosition;
    lastUpdateTime = Date.now();
    
    console.log(`Position tracked (no marker): ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)} (smoothed)`);
    return true;
}

/**
 * Clear tracked position data
 */
export function removeUserPointer() {
    lastValidPosition = null;
    lastUpdateTime = null;
    console.log('Position tracking reset');
}

/**
 * Center map on tracked position
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} zoom - Zoom level (optional)
 */
export function centerMapOnPointer(lat, lng, zoom = 17) {
    if (state.map) {
        state.map.flyTo([lat, lng], zoom);
        console.log('Map centered on position:', lat.toFixed(6), lng.toFixed(6));
    }
}

/**
 * Get current tracked position
 * @returns {Object|null} { lat, lng } or null if no position tracked
 */
export function getPointerPosition() {
    return lastValidPosition;
}

/**
 * Check if position is being tracked
 * @returns {boolean}
 */
export function hasPointer() {
    return !!lastValidPosition;
}

/**
 * Get stabilization statistics for debugging
 * @returns {Object} Statistics object
 */
export function getStabilizationStats() {
    return {
        lastValidPosition,
        lastUpdateTime,
        minDistanceThreshold: MIN_DISTANCE_THRESHOLD,
        maxJumpDistance: MAX_JUMP_DISTANCE,
        smoothingFactor: SMOOTHING_FACTOR
    };
}

/**
 * Initialize pointer service with stabilization (no markers)
 */
export function initPointerService() {
    console.log('Pointer service initialized - position tracking only (no markers)');
    console.log(`Settings: MIN_DISTANCE_THRESHOLD=${MIN_DISTANCE_THRESHOLD}m, MAX_JUMP_DISTANCE=${MAX_JUMP_DISTANCE}m, SMOOTHING_FACTOR=${SMOOTHING_FACTOR}`);
    
    // Reset any existing state
    lastValidPosition = null;
    lastUpdateTime = null;
    
    // Expose functions to window for debugging
    window.pointerService = {
        updateUserPointer,
        removeUserPointer,
        centerMapOnPointer,
        getPointerPosition,
        hasPointer,
        getStabilizationStats,
        validatePosition: (lat, lng, acc) => validatePosition(lat, lng, acc) // Expose for testing
    };
}