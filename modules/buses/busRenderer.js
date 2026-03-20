import { state, updateState } from "../../core/stateManager.js";
import { COMPANIES } from "../../config/systemConfig.js";

/**
 * Force cleanup of markers for deleted lines
 * This can be called when a line is deleted to immediately remove its marker
 */
export function cleanupDeletedLineMarkers(configLinhas) {
    if (!state.map) return;
    
    const now = Date.now();
    
    for (const key in state.markers) {
        if (!configLinhas[key]) {
            // Line no longer exists in config, remove marker immediately
            console.log('Removing marker for deleted line:', key);
            state.map.removeLayer(state.markers[key]);
            delete state.markers[key];
        }
    }
}

export function renderBusMarkers(gpsData, configLinhas) {
    // Check if map is initialized
    if (!state.map) {
        console.warn('Map not initialized yet');
        return;
    }
    
    console.log(`renderBusMarkers called with ${Object.keys(configLinhas).length} lines, ${Object.keys(gpsData).length} active GPS datasets`);
    
    const now = Date.now();
    
    // Clear old markers that are no longer active
    for (const key in state.markers) {
        let shouldRemove = false;
        
        if (!configLinhas[key]) {
            // Line no longer exists in config
            shouldRemove = true;
        } else {
            // Check if there are any active GPS entries for this line
            const lineGps = gpsData[key];
            let hasActive = false;
            
            if (lineGps) {
                for (const uid in lineGps) {
                    const gpsData = lineGps[uid];
                    const accuracy = gpsData.acc || gpsData.accuracy || 0;
                    
                    // Check if data is fresh AND accurate (accuracy gate: <= 200 meters for desktop compatibility)
                    if (now - gpsData.timestamp < (state.systemTTL || 45000) && accuracy <= 200) {
                        hasActive = true;
                        break;
                    }
                }
            }
            
            if (!hasActive) {
                shouldRemove = true;
            }
        }
        
        if (shouldRemove) {
            state.map.removeLayer(state.markers[key]);
            delete state.markers[key];
        }
    }
    
    // Create or update markers for each line with active GPS data
    for (const key in configLinhas) {
        const c = configLinhas[key];
        let latA = 0, lngA = 0, cnt = 0;
        
        if (gpsData[key]) {
            for (const uid in gpsData[key]) {
                const gpsPoint = gpsData[key][uid];
                const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
                
                // Apply accuracy gate: only include data with accuracy <= 80 meters
                if (now - gpsPoint.timestamp < (state.systemTTL || 45000) && accuracy <= 80) {
                    latA += gpsPoint.lat;
                    lngA += gpsPoint.lng;
                    cnt++;
                }
            }
        }
        
        if (cnt > 0) {
            const mLat = latA / cnt;
            const mLng = lngA / cnt;
            const comp = COMPANIES[c.company || 'atlantico'];
            
            // Create bus pin HTML with CSS variable for color
            const busPinHtml = `
                <div class="bus-pin" style="--bus-color: ${c.cor};">
                    <span>${c.id}</span>
                </div>
            `;
            
            // Create custom icon
            const busIcon = L.divIcon({
                html: busPinHtml,
                className: 'bus-marker-icon',
                iconSize: [42, 42],
                iconAnchor: [21, 42],
                popupAnchor: [0, -42]
            });
            
            if (state.markers[key]) {
                // Update existing marker position
                state.markers[key].setLatLng([mLat, mLng]);
                console.log(`Updated bus marker for line ${c.id} at ${mLat.toFixed(6)}, ${mLng.toFixed(6)}`);
            } else {
                // Create new marker
                const marker = L.marker([mLat, mLng], {
                    icon: busIcon,
                    zIndexOffset: 3000
                }).addTo(state.map);
                
                console.log(`Created new bus marker for line ${c.id} at ${mLat.toFixed(6)}, ${mLng.toFixed(6)} with color ${c.cor}`);
                
                // Add popup with bus info
                marker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; padding: 8px;">
                        <div style="font-weight: 800; font-size: 14px; color: #202124;">
                            <img src="${comp.favicon}" width="16" style="vertical-align: middle; margin-right: 6px;">
                            ${c.id} - ${c.nome}
                        </div>
                        <div style="font-size: 11px; color: #70757a; margin-top: 4px;">
                            ${c.via}
                        </div>
                        <div style="font-size: 10px; color: #34a853; margin-top: 6px; font-weight: 600;">
                            ${cnt} colaborador${cnt > 1 ? 'es' : ''} ativo${cnt > 1 ? 's' : ''}
                        </div>
                    </div>
                `);
                
                // Store marker in state
                state.markers[key] = marker;
            }
        } else {
            // Remove marker if no active GPS data
            if (state.markers[key]) {
                state.map.removeLayer(state.markers[key]);
                delete state.markers[key];
            }
        }
    }
}