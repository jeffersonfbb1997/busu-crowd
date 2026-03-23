/**
 * Pointer Service - Enhanced implementation with GPS stabilization
 * Features:
 * - Real distance calculation in meters (Haversine formula)
 * - Accuracy filtering
 * - Smoothing algorithm to reduce oscillation
 * - Jump filter to prevent teleportation
 * - User marker creation and updates on map
 * - Comprehensive debugging logs
 */

import { state } from '../core/stateManager.js';
import { getDistanceMeters } from '../utils/geoUtils.js';
import { LAYER, addLayer, removeLayer, ensureLayerGroup } from '../modules/map/mapLayers.js';

// Position tracking for stabilization
let lastValidPosition = null;
let lastUpdateTime = null;
let userMarker = null; // Leaflet marker for user position
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
    
    // Check accuracy (if provided) - increased to 200m for desktop compatibility
    if (accuracy !== null && accuracy > 200) {
        return {
            isValid: false,
            distance,
            reason: `Accuracy too low: ${accuracy}m > 200m threshold`
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
 * Track user position and create/update visual marker on the map
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
    
    // Ensure user layer group exists
    ensureLayerGroup(LAYER.USER);
    
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
    
    // Update last valid position
    lastValidPosition = smoothedPosition;
    lastUpdateTime = Date.now();
    
    // Create or update user marker on map
    if (!userMarker) {
        // Create new marker with custom icon (blue circle with white border)
        const userIcon = L.divIcon({
            className: 'user-marker-icon',
            html: '<div style="background: #1a73e8; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #1a73e8;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        userMarker = L.marker([smoothedPosition.lat, smoothedPosition.lng], {
            icon: userIcon,
            zIndexOffset: 1000 // Ensure marker appears above bus markers
        });
        addLayer(LAYER.USER, userMarker);
        
        // Add popup with user info
        userMarker.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 180px;">
                <div class="fw-bold mb-1">Sua localização</div>
                <div class="small text-muted mb-2">Transmitindo GPS em tempo real</div>
                <div class="d-flex justify-content-between">
                    <span class="small">Lat:</span>
                    <span class="small fw-bold">${smoothedPosition.lat.toFixed(6)}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="small">Lng:</span>
                    <span class="small fw-bold">${smoothedPosition.lng.toFixed(6)}</span>
                </div>
                ${accuracy !== null ? `<div class="d-flex justify-content-between">
                    <span class="small">Precisão:</span>
                    <span class="small fw-bold">${accuracy.toFixed(0)}m</span>
                </div>` : ''}
            </div>
        `);
        
        console.log(`User marker created at: ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)}`);
    } else {
        // Update existing marker position
        userMarker.setLatLng([smoothedPosition.lat, smoothedPosition.lng]);
        console.log(`User marker updated to: ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)}`);
    }
    
    // Center map on user position (first time only)
    if (forceUpdate || !lastUpdateTime) {
        centerMapOnPointer(smoothedPosition.lat, smoothedPosition.lng, 17);
    }
    
    console.log(`Position tracked with marker: ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)} (smoothed)`);
    return true;
}

/**
 * Clear tracked position data and remove marker from map
 */
export function removeUserPointer() {
    // Remove marker from map if it exists
    if (userMarker && state.map) {
        removeLayer(LAYER.USER, userMarker);
        console.log('User marker removed from map');
    }
    
    lastValidPosition = null;
    lastUpdateTime = null;
    userMarker = null;
    console.log('Position tracking and marker reset');
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
 * Initialize pointer service with stabilization and marker creation
 */
export function initPointerService() {
    console.log('Pointer service initialized - with marker creation');
    console.log(`Settings: MIN_DISTANCE_THRESHOLD=${MIN_DISTANCE_THRESHOLD}m, MAX_JUMP_DISTANCE=${MAX_JUMP_DISTANCE}m, SMOOTHING_FACTOR=${SMOOTHING_FACTOR}`);
    
    // Reset any existing state
    lastValidPosition = null;
    lastUpdateTime = null;
    userMarker = null;
    
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