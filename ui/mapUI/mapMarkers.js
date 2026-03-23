/**
 * Map Markers Factory
 * 
 * Creates consistent Leaflet markers for different map entities:
 * buses, stops, terminals, user location, route points, etc.
 */

import { getCompanyColor } from '../../config/mapConfig.js';

/**
 * Create a bus marker for a given line.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} line - Line configuration { id, nome, via, cor, company }
 * @param {boolean} active - Whether the bus is currently transmitting
 * @returns {L.Marker} Leaflet marker instance
 */
export function createBusMarker(lat, lng, line, active = true) {
    const color = line.cor || getCompanyColor(line.company);
    const size = active ? 24 : 20;
    const pulseClass = active ? 'bus-marker-pulse' : '';
    
    const html = `
        <div class="bus-marker ${pulseClass}" style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 8px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: ${size * 0.6}px;
        " title="${line.id} - ${line.nome}">
            ${line.id}
        </div>
    `;
    
    const icon = L.divIcon({
        html,
        className: 'bus-marker-icon',
        iconSize: [size + 6, size + 6],
        iconAnchor: [size / 2 + 3, size / 2 + 3]
    });
    
    return L.marker([lat, lng], { icon, zIndexOffset: active ? 1000 : 500 });
}

/**
 * Create a stop (parada) marker.
 * @param {number} lat
 * @param {number} lng
 * @param {Object} options - { name, sequence, isTerminal }
 * @returns {L.Marker}
 */
export function createStopMarker(lat, lng, options = {}) {
    const { name = '', sequence = '', isTerminal = false } = options;
    const size = isTerminal ? 16 : 12;
    const color = isTerminal ? '#ff9800' : '#4caf50';
    const symbol = isTerminal ? '🏁' : '●';
    
    const html = `
        <div class="stop-marker" style="
            font-size: ${size}px;
            color: ${color};
            text-shadow: 0 0 4px white;
            line-height: 1;
        " title="${name}">
            ${symbol}
        </div>
    `;
    
    const icon = L.divIcon({
        html,
        className: 'stop-marker-icon',
        iconSize: [size * 1.5, size * 1.5],
        iconAnchor: [size * 0.75, size * 0.75]
    });
    
    return L.marker([lat, lng], { icon, zIndexOffset: 300 });
}

/**
 * Create a terminal marker (alternative to stop marker with terminal style).
 * @param {number} lat
 * @param {number} lng
 * @param {string} name
 * @returns {L.Marker}
 */
export function createTerminalMarker(lat, lng, name = 'Terminal') {
    return createStopMarker(lat, lng, { name, isTerminal: true });
}

/**
 * Create a user location marker (blue circle with accuracy ring).
 * @param {number} lat
 * @param {number} lng
 * @param {number} accuracy - Accuracy radius in meters (optional)
 * @returns {L.Marker}
 */
export function createUserMarker(lat, lng, accuracy = null) {
    const html = `
        <div class="user-marker" style="
            background: #1a73e8;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px #1a73e8;
        " title="Sua localização">
        </div>
    `;
    
    const icon = L.divIcon({
        html,
        className: 'user-marker-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    const marker = L.marker([lat, lng], { icon, zIndexOffset: 2000 });
    
    // Optionally add an accuracy circle layer
    if (accuracy && accuracy > 0) {
        marker.accuracyCircle = L.circle([lat, lng], {
            radius: accuracy,
            stroke: false,
            fillColor: '#1a73e8',
            fillOpacity: 0.15
        });
    }
    
    return marker;
}

/**
 * Create a route point marker (for editing routes).
 * @param {number} lat
 * @param {number} lng
 * @param {number} index - Point index in the path
 * @returns {L.Marker}
 */
export function createRoutePointMarker(lat, lng, index) {
    const html = `
        <div class="route-point-marker" style="
            background: #ff5722;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 6px #ff5722;
            font-size: 8px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        " title="Ponto ${index}">
            ${index}
        </div>
    `;
    
    const icon = L.divIcon({
        html,
        className: 'route-point-marker-icon',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
    
    return L.marker([lat, lng], { icon, draggable: true });
}

/**
 * Create a generic circle marker (e.g., for selection, radius).
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius - Radius in meters
 * @param {string} color - CSS color
 * @returns {L.Circle}
 */
export function createCircleMarker(lat, lng, radius, color = '#1a73e8') {
    return L.circle([lat, lng], {
        radius,
        stroke: true,
        color,
        weight: 2,
        opacity: 0.7,
        fillColor: color,
        fillOpacity: 0.1
    });
}

/**
 * Create a custom HTML marker with any content.
 * @param {number} lat
 * @param {number} lng
 * @param {string} html - HTML string
 * @param {Object} iconOptions - Options for L.divIcon
 * @returns {L.Marker}
 */
export function createCustomMarker(lat, lng, html, iconOptions = {}) {
    const defaultOptions = {
        className: 'custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    };
    const icon = L.divIcon({ ...defaultOptions, ...iconOptions, html });
    return L.marker([lat, lng], { icon });
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.mapMarkers = {
        createBusMarker,
        createStopMarker,
        createTerminalMarker,
        createUserMarker,
        createRoutePointMarker,
        createCircleMarker,
        createCustomMarker
    };
}