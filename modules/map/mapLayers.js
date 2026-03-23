/**
 * Map Layers Manager
 * 
 * Provides centralized management of Leaflet layer groups (bus markers, route drafts,
 * stops, terminals, user location, etc.) with show/hide/clear operations.
 * 
 * Integrates with the global state.map and state.layerGroups.
 */

import { state, updateState } from '../../core/stateManager.js';

// Layer group names as constants
export const LAYER = {
    BUS: 'bus',
    ROUTE_DRAFT: 'routeDraft',
    STOP: 'stop',
    TERMINAL: 'terminal',
    USER: 'user',
    OVERLAY: 'overlay',
    BASE: 'base'
};

// Initialize layerGroups in state if not present
if (!state.layerGroups) {
    updateState('layerGroups', {});
}

/**
 * Ensure a layer group exists in state and on the map.
 * If the group doesn't exist, creates a new L.LayerGroup and adds it to the map.
 * @param {string} name - Layer group identifier (use LAYER constants)
 * @returns {L.LayerGroup} The layer group instance
 */
export function ensureLayerGroup(name) {
    if (!state.map) {
        console.warn('Map not initialized, cannot create layer group');
        return null;
    }

    if (!state.layerGroups[name]) {
        const group = L.layerGroup().addTo(state.map);
        state.layerGroups[name] = group;
    }
    return state.layerGroups[name];
}

/**
 * Add a Leaflet layer (marker, polyline, polygon, etc.) to a named group.
 * If the group doesn't exist, it will be created automatically.
 * @param {string} groupName - Target layer group
 * @param {L.Layer} layer - Leaflet layer instance
 */
export function addLayer(groupName, layer) {
    const group = ensureLayerGroup(groupName);
    if (group && layer) {
        group.addLayer(layer);
    }
}

/**
 * Remove a specific layer from a group.
 * @param {string} groupName
 * @param {L.Layer} layer
 */
export function removeLayer(groupName, layer) {
    const group = state.layerGroups[groupName];
    if (group && layer) {
        group.removeLayer(layer);
    }
}

/**
 * Remove all layers from a group (clears the group).
 * @param {string} groupName
 */
export function clearLayer(groupName) {
    const group = state.layerGroups[groupName];
    if (group) {
        group.clearLayers();
    }
}

/**
 * Show a layer group (adds it to the map if it was previously removed).
 * @param {string} groupName
 */
export function showLayer(groupName) {
    const group = state.layerGroups[groupName];
    if (group && !state.map.hasLayer(group)) {
        group.addTo(state.map);
    }
}

/**
 * Hide a layer group (removes it from the map but keeps layers in memory).
 * @param {string} groupName
 */
export function hideLayer(groupName) {
    const group = state.layerGroups[groupName];
    if (group && state.map.hasLayer(group)) {
        state.map.removeLayer(group);
    }
}

/**
 * Toggle visibility of a layer group.
 * @param {string} groupName
 * @returns {boolean} New visibility state (true = visible)
 */
export function toggleLayer(groupName) {
    const group = state.layerGroups[groupName];
    if (!group) return false;
    if (state.map.hasLayer(group)) {
        state.map.removeLayer(group);
        return false;
    } else {
        group.addTo(state.map);
        return true;
    }
}

/**
 * Check if a layer group is currently visible on the map.
 * @param {string} groupName
 * @returns {boolean}
 */
export function isLayerVisible(groupName) {
    const group = state.layerGroups[groupName];
    return group && state.map.hasLayer(group);
}

/**
 * Get the layer group instance.
 * @param {string} groupName
 * @returns {L.LayerGroup|null}
 */
export function getLayerGroup(groupName) {
    return state.layerGroups[groupName] || null;
}

/**
 * Remove a layer group entirely (clears layers and removes from map).
 * @param {string} groupName
 */
export function removeLayerGroup(groupName) {
    const group = state.layerGroups[groupName];
    if (group) {
        if (state.map.hasLayer(group)) {
            state.map.removeLayer(group);
        }
        group.clearLayers();
        delete state.layerGroups[groupName];
    }
}

/**
 * Initialize default layer groups (called after map is ready).
 */
export function initDefaultLayers() {
    ensureLayerGroup(LAYER.BUS);
    ensureLayerGroup(LAYER.ROUTE_DRAFT);
    ensureLayerGroup(LAYER.STOP);
    ensureLayerGroup(LAYER.TERMINAL);
    ensureLayerGroup(LAYER.USER);
    ensureLayerGroup(LAYER.OVERLAY);
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.mapLayers = {
        ensureLayerGroup,
        addLayer,
        removeLayer,
        clearLayer,
        showLayer,
        hideLayer,
        toggleLayer,
        isLayerVisible,
        getLayerGroup,
        removeLayerGroup,
        LAYER
    };
}