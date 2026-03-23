/**
 * Map Legend Control
 * 
 * Provides a dynamic legend that reflects the currently visible map layers
 * (buses, stops, terminals, user location, etc.). The legend updates automatically
 * when layers are shown/hidden.
 */

import { LAYER, isLayerVisible } from '../../modules/map/mapLayers.js';

let legendControl = null;
let mapInstance = null;

/**
 * Create a Leaflet control that displays a legend.
 * The legend content is generated based on which layer groups are visible.
 * @param {L.Map} map - Leaflet map instance
 * @returns {L.Control} Legend control
 */
export function createLegendControl(map) {
    mapInstance = map;
    
    const LegendControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-legend');
            container.style.backgroundColor = 'white';
            container.style.padding = '10px';
            container.style.borderRadius = '4px';
            container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
            container.style.maxWidth = '200px';
            container.style.fontFamily = 'Inter, sans-serif';
            container.style.fontSize = '12px';
            container.style.zIndex = '1000';
            
            const header = L.DomUtil.create('div', 'legend-header', container);
            header.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="color: #333;">Legenda</strong>
                    <button class="legend-close" style="background: none; border: none; color: #999; cursor: pointer; font-size: 14px;">×</button>
                </div>
            `;
            
            const content = L.DomUtil.create('div', 'legend-content', container);
            content.style.maxHeight = '300px';
            content.style.overflowY = 'auto';
            
            // Close button handler
            const closeBtn = header.querySelector('.legend-close');
            L.DomEvent.on(closeBtn, 'click', () => {
                container.style.display = 'none';
            });
            
            this.updateLegend(content);

            // Update legend when layers change (via a custom event or polling)
            // Optimized: update every 5 seconds to reduce CPU usage
            this.interval = setInterval(() => this.updateLegend(content), 5000);

            return container;
        },

        onRemove: function(map) {
            if (this.interval) clearInterval(this.interval);
        },

        updateLegend: function(contentElement) {
            if (!mapInstance) return;

            const visibleLayers = getVisibleLayerInfo();
            const html = generateLegendItemsHTML(visibleLayers);
            contentElement.innerHTML = html;
        }
    });
    
    legendControl = new LegendControl({ position: 'bottomright' });
    return legendControl;
}

/**
 * Determine which layers are currently visible and gather their display information.
 * @returns {Array<Object>} List of visible layer descriptors
 */
function getVisibleLayerInfo() {
    const layers = [];
    
    // Bus layer
    if (isLayerVisible(LAYER.BUS)) {
        layers.push({
            name: 'Ônibus ativos',
            icon: '<div style="display:inline-block; width:12px; height:12px; background-color:#1a73e8; border-radius:50%; border:2px solid white; box-shadow:0 0 4px #1a73e8;"></div>',
            description: 'Veículos transmitindo GPS em tempo real'
        });
    }
    
    // Stop layer
    if (isLayerVisible(LAYER.STOP)) {
        layers.push({
            name: 'Paradas',
            icon: '<span style="color:#4caf50; font-size:14px;">●</span>',
            description: 'Pontos de parada ao longo das rotas'
        });
    }
    
    // Terminal layer
    if (isLayerVisible(LAYER.TERMINAL)) {
        layers.push({
            name: 'Terminais',
            icon: '<span style="color:#ff9800; font-size:14px;">■</span>',
            description: 'Pontos de início/fim das linhas'
        });
    }
    
    // User location layer
    if (isLayerVisible(LAYER.USER)) {
        layers.push({
            name: 'Minha localização',
            icon: '<div style="display:inline-block; width:12px; height:12px; background-color:#e91e63; border-radius:50%; border:2px solid white; box-shadow:0 0 4px #e91e63;"></div>',
            description: 'Sua posição atual (GPS)'
        });
    }
    
    // Route draft layer
    if (isLayerVisible(LAYER.ROUTE_DRAFT)) {
        layers.push({
            name: 'Rascunho de rota',
            icon: '<span style="color:#9c27b0; font-size:14px;">━</span>',
            description: 'Rota sendo desenhada no editor'
        });
    }
    
    // Overlay layer (additional layers)
    if (isLayerVisible(LAYER.OVERLAY)) {
        layers.push({
            name: 'Camadas adicionais',
            icon: '<div style="display:inline-block; width:12px; height:12px; background:repeating-linear-gradient(45deg, #999, #999 2px, white 2px, white 4px);"></div>',
            description: 'Outras camadas temporárias'
        });
    }
    
    return layers;
}

/**
 * Generate HTML for the legend based on visible layers.
 * @param {Array<Object>} visibleLayers
 * @returns {string} HTML string
 */
function generateLegendItemsHTML(visibleLayers) {
    if (visibleLayers.length === 0) {
        return `
            <div class="legend-empty">
                <small class="text-muted">Nenhuma camada visível</small>
            </div>
        `;
    }
    
    const items = visibleLayers.map(layer => `
        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 8px;">
            <div class="legend-icon" style="margin-right: 8px; width: 20px; text-align: center;">
                ${layer.icon}
            </div>
            <div class="legend-text">
                <div class="legend-name" style="font-weight: 600; color: #333;">${layer.name}</div>
                <div class="legend-description" style="font-size: 10px; color: #666;">${layer.description}</div>
            </div>
        </div>
    `).join('');
    
    return items;
}

/**
 * Add the legend control to the map.
 * @param {L.Map} map
 */
export function addLegendToMap(map) {
    if (legendControl) {
        map.removeControl(legendControl);
    }
    legendControl = createLegendControl(map);
    legendControl.addTo(map);
}

/**
 * Remove the legend control from the map.
 */
export function removeLegendFromMap() {
    if (legendControl && mapInstance) {
        mapInstance.removeControl(legendControl);
        legendControl = null;
    }
}

/**
 * Force a refresh of the legend content (e.g., after toggling layers).
 */
export function refreshLegend() {
    if (legendControl && mapInstance) {
        // Trigger updateLegend via the control instance
        const container = legendControl.getContainer();
        if (container) {
            const content = container.querySelector('.legend-content');
            if (content) {
                legendControl.updateLegend(content);
            }
        }
    }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.mapLegend = {
        addLegendToMap,
        removeLegendFromMap,
        refreshLegend
    };
}