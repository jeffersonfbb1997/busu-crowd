import { getDefaultMapOptions, createTileLayer, DEFAULT_TILE_LAYER } from "../../config/mapConfig.js";

export let map;

/**
 * Initialize a Leaflet map in the given container.
 * Uses configuration from mapConfig.js for tile layer and map options.
 * @param {string} containerId - HTML element ID
 * @returns {L.Map} Leaflet map instance
 */
export const initMap = (containerId) => {
    const options = getDefaultMapOptions();
    // Ensure zoomControl is false (we add it via mapControls)
    options.zoomControl = false;
    
    map = L.map(containerId, options);
    
    // Add default tile layer
    const tileLayer = createTileLayer(DEFAULT_TILE_LAYER);
    tileLayer.addTo(map);
    
    return map;
};
