/**
 * Map Configuration
 * 
 * Centralized configuration for Leaflet map: tile layers, bounds, zoom limits,
 * and company‑specific map styles.
 */

import { COMPANIES, DEFAULT_VIEW, DEFAULT_ZOOM } from './systemConfig.js';

// Default map view (already defined in systemConfig, re‑export for convenience)
export { DEFAULT_VIEW, DEFAULT_ZOOM };

// Tile layer configurations
export const TILE_LAYERS = {
    OPENSTREETMAP: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: 'abc'
    },
    OPENSTREETMAP_HOT: {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
        maxZoom: 19
    },
    CARTO_DARK: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
    },
    CARTO_LIGHT: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
    }
};

// Default tile layer key
export const DEFAULT_TILE_LAYER = 'OPENSTREETMAP';

// Map bounds (optional) – restrict panning to a specific area
// Format: [[south, west], [north, east]]
export const MAP_BOUNDS = [
    [-14.9, -39.2], // southwest
    [-14.7, -38.9]  // northeast
];

// Maximum zoom level allowed
export const MAX_ZOOM = 18;

// Minimum zoom level allowed
export const MIN_ZOOM = 12;

// Default map control positions
export const CONTROL_POSITIONS = {
    ZOOM: 'topleft',
    SCALE: 'bottomleft',
    LOCATE: 'topright',
    LAYERS: 'topright'
};

// Company‑specific map styling (e.g., custom tile layers per company)
export const COMPANY_MAP_STYLES = {
    atlantico: {
        tileLayer: TILE_LAYERS.OPENSTREETMAP,
        defaultColor: '#1a73e8', // blue
        highlightColor: '#0d47a1'
    },
    viametro: {
        tileLayer: TILE_LAYERS.CARTO_DARK,
        defaultColor: '#e53935', // red
        highlightColor: '#b71c1c'
    }
};

/**
 * Get the appropriate tile layer configuration for a company.
 * Falls back to OpenStreetMap if company not found.
 * @param {string} companyId - Company identifier (e.g., 'atlantico', 'viametro')
 * @returns {Object} Tile layer configuration
 */
export function getTileLayerForCompany(companyId) {
    return COMPANY_MAP_STYLES[companyId]?.tileLayer || TILE_LAYERS[DEFAULT_TILE_LAYER];
}

/**
 * Get the default color for a company (used for routes, markers, etc.).
 * @param {string} companyId
 * @returns {string} CSS color
 */
export function getCompanyColor(companyId) {
    return COMPANY_MAP_STYLES[companyId]?.defaultColor || '#1a73e8';
}

/**
 * Create a Leaflet tile layer instance based on configuration key.
 * @param {string} key - One of TILE_LAYERS keys
 * @returns {L.TileLayer} Configured tile layer
 */
export function createTileLayer(key) {
    const config = TILE_LAYERS[key];
    if (!config) {
        console.warn(`Tile layer "${key}" not found, using default.`);
        return L.tileLayer(TILE_LAYERS[DEFAULT_TILE_LAYER].url, TILE_LAYERS[DEFAULT_TILE_LAYER]);
    }
    return L.tileLayer(config.url, config);
}

/**
 * Get the default map options for Leaflet map initialization.
 * @returns {Object} Options object
 */
export function getDefaultMapOptions() {
    return {
        center: DEFAULT_VIEW,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomControl: false, // we add controls separately
        maxBounds: MAP_BOUNDS.length ? MAP_BOUNDS : null,
        attributionControl: true
    };
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.mapConfig = {
        TILE_LAYERS,
        DEFAULT_TILE_LAYER,
        MAP_BOUNDS,
        MAX_ZOOM,
        MIN_ZOOM,
        CONTROL_POSITIONS,
        COMPANY_MAP_STYLES,
        getTileLayerForCompany,
        getCompanyColor,
        createTileLayer,
        getDefaultMapOptions
    };
}