/**
 * Map Controls Manager
 * 
 * Adds interactive controls to the Leaflet map: zoom, scale, layer switcher,
 * locate user button, and custom controls for toggling visibility of map features.
 */

import { LAYER, getLayerGroup, ensureLayerGroup, isLayerVisible, toggleLayer } from './mapLayers.js';
import { addLegendToMap, removeLegendFromMap } from '../../ui/mapUI/mapLegend.js';

let mapInstance = null;
let layerControl = null;
let zoomControl = null;
let scaleControl = null;
let fullscreenControl = null;

/**
 * Initialize all map controls and add them to the map.
 * Should be called after the map is created (e.g., in core/app.js).
 * @param {L.Map} map - Leaflet map instance
 */
export function initMapControls(map) {
    if (!map || !window.L) {
        console.warn('Map or Leaflet not available for controls');
        return;
    }
    mapInstance = map;

    // 1. Zoom control (top‑left corner)
    if (map.zoomControl) {
        map.zoomControl.setPosition('topleft');
        zoomControl = map.zoomControl;
    } else {
        zoomControl = L.control.zoom({ position: 'topleft' });
        zoomControl.addTo(map);
    }

    // 2. Scale control (bottom‑left)
    scaleControl = L.control.scale({ imperial: false, position: 'bottomleft' });
    scaleControl.addTo(map);

    // 3. Locate user control (top‑right) – only if Leaflet.Locate plugin is loaded
    if (L.control.locate) {
        const locateControl = L.control.locate({
            position: 'topright',
            drawCircle: true,
            follow: true,
            setView: 'once',
            keepCurrentZoomLevel: true,
            icon: 'bi bi-geo',
            iconLoading: 'bi bi-geo',
            metric: true,
            strings: {
                title: 'Localizar minha posição',
                popup: 'Você está dentro de {distance} metros deste ponto',
                outsideMapBoundsMsg: 'Você parece estar fora dos limites do mapa'
            }
        }).addTo(map);
    } else {
        console.warn('Leaflet.Locate plugin not available – skipping locate control');
    }

    // 4. Layer switcher (top‑right, below locate)
    initLayerSwitcher(map);

    // 5. Full‑screen toggle (top‑right)
    addFullscreenControl(map);

    // 6. Legend (bottom‑right)
    addLegendToMap(map);

}

/**
 * Create a Leaflet.Control.Layers for base maps and overlay layers.
 * Currently only OpenStreetMap is available as base layer.
 * Overlay layers are taken from mapLayers module.
 */
function initLayerSwitcher(map) {
    console.log('initLayerSwitcher called');
    if (layerControl) {
        map.removeControl(layerControl);
    }

    const baseLayers = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    };

    // Prepare overlay layers
    const overlayLayers = {};

    // Bus markers layer
    const busLayer = getLayerGroup(LAYER.BUS);
    if (busLayer) {
        overlayLayers['Ônibus ativos'] = busLayer;
    }

    // Stops layer
    const stopLayer = getLayerGroup(LAYER.STOP);
    if (stopLayer) {
        overlayLayers['Paradas'] = stopLayer;
    }

    // Terminals layer
    const terminalLayer = getLayerGroup(LAYER.TERMINAL);
    if (terminalLayer) {
        overlayLayers['Terminais'] = terminalLayer;
    }

    // User location layer
    const userLayer = getLayerGroup(LAYER.USER);
    if (userLayer) {
        overlayLayers['Minha localização'] = userLayer;
    }

    // Route draft layer
    const draftLayer = getLayerGroup(LAYER.ROUTE_DRAFT);
    if (draftLayer) {
        overlayLayers['Rascunho de rota'] = draftLayer;
    }

    // Overlay layer (additional layers)
    let overlayLayer = getLayerGroup(LAYER.OVERLAY);
    if (!overlayLayer) {
        overlayLayer = ensureLayerGroup(LAYER.OVERLAY);
        console.log('Created overlay layer group:', overlayLayer);
    }
    if (overlayLayer) {
        // Ensure overlay layer is not empty (Leaflet may hide empty groups)
        if (overlayLayer.getLayers().length === 0) {
            // Add a dummy invisible rectangle to keep the layer group non‑empty
            const dummyRect = L.rectangle([[0,0],[0,0]], { opacity: 0, fillOpacity: 0, interactive: false });
            overlayLayer.addLayer(dummyRect);
            console.log('Added dummy invisible rectangle to overlay layer');
        }
        overlayLayers['Camadas adicionais'] = overlayLayer;
        console.log('Added Camadas adicionais to overlayLayers, layer count:', overlayLayer.getLayers().length);
    } else {
        console.warn('Could not create overlay layer group');
    }

    console.log('Layer switcher overlay layers:', Object.keys(overlayLayers));

    // Create layer control and add to map
    layerControl = L.control.layers(baseLayers, overlayLayers, {
        collapsed: true,
        position: 'topright'
    }).addTo(map);
}

/**
 * Add a full‑screen toggle button (uses browser Fullscreen API).
 * @param {L.Map} map
 */
function addFullscreenControl(map) {
    if (!map || !document.fullscreenEnabled) {
        console.debug('Fullscreen API not supported, skipping fullscreen control');
        return;
    }

    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fullscreen');
    container.innerHTML = `
        <button class="fullscreen-toggle" title="Tela cheia">
            <i class="bi bi-arrows-fullscreen"></i>
        </button>
    `;
    const button = container.querySelector('button');
    L.DomEvent.on(button, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        const mapContainer = map.getContainer();
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });
    L.DomEvent.disableClickPropagation(container);

    const FullscreenControl = L.Control.extend({
        onAdd: function(map) {
            return container;
        }
    });
    fullscreenControl = new FullscreenControl({ position: 'topright' });
    fullscreenControl.addTo(map);
}

/**
 * Update the layer switcher (call after adding/removing layer groups).
 */
export function refreshLayerSwitcher() {
    console.log('refreshLayerSwitcher called');
    if (!mapInstance) return;
    if (layerControl) {
        mapInstance.removeControl(layerControl);
    }
    initLayerSwitcher(mapInstance);
}

/**
 * Show the layer switcher control (add to map if not already present).
 */
export function showLayerSwitcher() {
    console.log('showLayerSwitcher called');
    if (!mapInstance) return;
    refreshLayerSwitcher();
}

/**
 * Hide the layer switcher control (remove from map).
 */
export function hideLayerSwitcher() {
    console.log('hideLayerSwitcher called');
    if (mapInstance && layerControl) {
        mapInstance.removeControl(layerControl);
    }
}


/**
 * Show zoom control (add to map).
 */
export function showZoomControl() {
    if (mapInstance && zoomControl) {
        zoomControl.addTo(mapInstance);
    }
}

/**
 * Hide zoom control (remove from map).
 */
export function hideZoomControl() {
    console.log('hideZoomControl called');
    if (mapInstance && zoomControl) {
        mapInstance.removeControl(zoomControl);
    }
}

/**
 * Show scale control (add to map).
 */
export function showScaleControl() {
    if (mapInstance && scaleControl) {
        scaleControl.addTo(mapInstance);
    }
}

/**
 * Hide scale control (remove from map).
 */
export function hideScaleControl() {
    console.log('hideScaleControl called');
    if (mapInstance && scaleControl) {
        mapInstance.removeControl(scaleControl);
    }
}

/**
 * Show fullscreen control (add to map).
 */
export function showFullscreenControl() {
    if (mapInstance && fullscreenControl) {
        fullscreenControl.addTo(mapInstance);
    }
}

/**
 * Hide fullscreen control (remove from map).
 */
export function hideFullscreenControl() {
    console.log('hideFullscreenControl called');
    if (mapInstance && fullscreenControl) {
        mapInstance.removeControl(fullscreenControl);
    }
}

/**
 * Show legend control (add to map).
 */
export function showLegend() {
    if (mapInstance) {
        addLegendToMap(mapInstance);
    }
}

/**
 * Hide legend control (remove from map).
 */
export function hideLegend() {
    console.log('hideLegend called');
    removeLegendFromMap();
}

/**
 * Add a custom control (HTML button) to the map.
 * @param {string} html - HTML content of the control
 * @param {Function} onClick - Click handler
 * @param {string} position - Leaflet control position ('topleft', 'topright', etc.)
 * @returns {L.Control} The created control instance
 */
export function addCustomControl(html, onClick, position = 'topright') {
    if (!mapInstance) return null;

    const CustomControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-control');
            container.innerHTML = html;
            L.DomEvent.on(container, 'click', onClick);
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    const control = new CustomControl({ position });
    control.addTo(mapInstance);
    return control;
}

/**
 * Create a simple toggle button for a specific layer group.
 * @param {string} layerName - Layer identifier (see LAYER constants)
 * @param {string} label - Button label
 * @param {string} position - Control position
 * @returns {L.Control} The toggle control
 */
export function addLayerToggleControl(layerName, label, position = 'topright') {
    const html = `
        <button class="leaflet-control-layer-toggle" title="${label}">
            <i class="bi bi-eye"></i>
            <span>${label}</span>
        </button>
    `;
    const onClick = () => {
        const nowVisible = toggleLayer(layerName);
        // Update button icon
        const icon = this._container.querySelector('.bi');
        if (icon) {
            icon.className = nowVisible ? 'bi bi-eye-fill' : 'bi bi-eye';
        }
    };
    return addCustomControl(html, onClick, position);
}

/**
 * Programmatically toggle a layer group and update the layer switcher.
 * @param {string} layerName
 * @returns {boolean} New visibility state
 */
export function toggleLayerWithControl(layerName) {
    const newState = toggleLayer(layerName);
    refreshLayerSwitcher();
    return newState;
}

/**
 * Remove all custom controls (for cleanup).
 */
export function removeAllCustomControls() {
    // This would require tracking added controls; for simplicity we just reset.
    // In a production scenario you would keep references.
    console.warn('removeAllCustomControls not fully implemented');
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.mapControls = {
        initMapControls,
        refreshLayerSwitcher,
        showLayerSwitcher,
        hideLayerSwitcher,
        showZoomControl,
        hideZoomControl,
        showScaleControl,
        hideScaleControl,
        showFullscreenControl,
        hideFullscreenControl,
        showLegend,
        hideLegend,
        addCustomControl,
        addLayerToggleControl,
        toggleLayerWithControl
    };
}