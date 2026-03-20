import { state, updateState } from "../../core/stateManager.js";
import { COMPANIES } from "../../config/systemConfig.js";
import { getDistanceMeters } from "../../utils/geoUtils.js";

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
    console.log(`Current systemTTL: ${state.systemTTL}ms, systemRadius: ${state.systemRadius || 5}km`);
    
    const now = Date.now();
    
    // Get user's current position for radius filtering
    let userPosition = null;
    if (window.pointerService && window.pointerService.getPointerPosition) {
        userPosition = window.pointerService.getPointerPosition();
        console.log('User position for radius filtering:', userPosition);
    }
    
    // Clear old markers that are no longer active
    for (const key in state.markers) {
        let shouldRemove = false;
        
        if (!configLinhas[key]) {
            // Line no longer exists in config
            shouldRemove = true;
            console.log(`Line ${key} removed from config, marking marker for removal`);
        } else {
            // Check if there are any active GPS entries for this line
            const lineGps = gpsData[key];
            let hasActive = false;
            
            if (lineGps) {
                console.log(`Line ${key} has ${Object.keys(lineGps).length} GPS entries`);
                for (const uid in lineGps) {
                    const gpsData = lineGps[uid];
                    const accuracy = gpsData.acc || gpsData.accuracy || 0;
                    const age = now - gpsData.timestamp;
                    
                    // Check if data is fresh AND accurate (accuracy gate: <= 200 meters for desktop compatibility)
                    if (age < (state.systemTTL || 45000) && accuracy <= 200) {
                        hasActive = true;
                        console.log(`Line ${key} has active GPS: age=${age}ms, accuracy=${accuracy}m`);
                        break;
                    } else {
                        console.log(`Line ${key} GPS rejected: age=${age}ms (TTL=${state.systemTTL}), accuracy=${accuracy}m (max=200)`);
                    }
                }
            } else {
                console.log(`Line ${key} has no GPS data`);
            }
            
            if (!hasActive) {
                shouldRemove = true;
                console.log(`Line ${key} has no active GPS, marking marker for removal`);
            }
        }
        
        if (shouldRemove) {
            state.map.removeLayer(state.markers[key]);
            delete state.markers[key];
            console.log(`Removed marker for line ${key}`);
        }
    }
    
    // Create or update markers for each line with active GPS data
    console.log('GPS data keys:', Object.keys(gpsData));
    console.log('Config lines:', Object.keys(configLinhas).map(k => `${k}: ${configLinhas[k].id}`));
    
    for (const key in configLinhas) {
        const c = configLinhas[key];
        let latA = 0, lngA = 0, cnt = 0;
        
        console.log(`Processing line ${key} (${c.id})`);
        
        if (gpsData[key]) {
            console.log(`  Has GPS data: ${Object.keys(gpsData[key]).length} users`);
            for (const uid in gpsData[key]) {
                const gpsPoint = gpsData[key][uid];
                const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
                const age = now - gpsPoint.timestamp;
                
                // Apply accuracy gate: only include data with accuracy <= 200 meters (desktop compatibility)
                if (age < (state.systemTTL || 45000) && accuracy <= 200) {
                    latA += gpsPoint.lat;
                    lngA += gpsPoint.lng;
                    cnt++;
                    console.log(`    Included: user ${uid}, accuracy=${accuracy}m, age=${age}ms`);
                } else {
                    console.log(`    Excluded: user ${uid}, accuracy=${accuracy}m, age=${age}ms`);
                }
            }
        } else {
            console.log(`  No GPS data for this line`);
        }
        
        if (cnt > 0) {
            const mLat = latA / cnt;
            const mLng = lngA / cnt;
            const comp = COMPANIES[c.company || 'atlantico'];
            
            // Apply radius filtering if user position is available
            let withinRadius = true;
            if (userPosition && state.systemRadius) {
                const distanceMeters = getDistanceMeters(
                    userPosition.lat, userPosition.lng,
                    mLat, mLng
                );
                const distanceKm = distanceMeters / 1000;
                const radiusKm = state.systemRadius || 5;
                
                withinRadius = distanceKm <= radiusKm;
                console.log(`Line ${c.id}: distance=${distanceKm.toFixed(2)}km, radius=${radiusKm}km, withinRadius=${withinRadius}`);
                
                if (!withinRadius) {
                    console.log(`Line ${c.id} is outside ${radiusKm}km radius, skipping marker`);
                    // Remove marker if it exists and is outside radius
                    if (state.markers[key]) {
                        state.map.removeLayer(state.markers[key]);
                        delete state.markers[key];
                        console.log(`Removed marker for line ${key} (outside radius)`);
                    }
                    continue; // Skip to next line
                }
            }
            
            console.log(`Line ${c.id}: ${cnt} active GPS points, average position ${mLat.toFixed(6)}, ${mLng.toFixed(6)}`);
            
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
                console.log(`Bus marker HTML: ${busPinHtml}`);
                
                // Add click event to show bus details in bottom card (no popup)
                marker.on('click', () => {
                    updateBusDetailsCard(key, c, comp, cnt, mLat, mLng);
                });
                
                // Store marker in state
                state.markers[key] = marker;
            }
            
            /**
             * Update the bus details card in the bottom UI when a bus marker is clicked
             * @param {string} lineKey - Firebase key of the line
             * @param {object} lineConfig - Line configuration data
             * @param {object} company - Company information
             * @param {number} activeCount - Number of active collaborators
             * @param {number} lat - Latitude
             * @param {number} lng - Longitude
             */
            /**
             * Adjust color brightness by a percentage
             * @param {string} color - Hex color code (e.g., #1a73e8)
             * @param {number} percent - Percentage to adjust (-100 to 100)
             * @returns {string} Adjusted hex color
             */
            function adjustColorBrightness(color, percent) {
                // Remove # if present
                let hex = color.replace('#', '');
                
                // Parse the hex color
                let r = parseInt(hex.substring(0, 2), 16);
                let g = parseInt(hex.substring(2, 4), 16);
                let b = parseInt(hex.substring(4, 6), 16);
                
                // Adjust brightness
                r = Math.max(0, Math.min(255, r + (r * percent / 100)));
                g = Math.max(0, Math.min(255, g + (g * percent / 100)));
                b = Math.max(0, Math.min(255, b + (b * percent / 100)));
                
                // Convert back to hex
                const toHex = (c) => {
                    const hex = Math.round(c).toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                };
                
                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            }
            
            /**
             * Get street name from coordinates using OpenStreetMap Nominatim API
             * @param {number} lat - Latitude
             * @param {number} lng - Longitude
             * @returns {Promise<string>} Street name or formatted coordinates
             */
            async function getStreetNameFromCoords(lat, lng) {
                if (lat === 0 && lng === 0) return 'Localização GPS';
                
                try {
                    // Use OpenStreetMap Nominatim API for reverse geocoding
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
                    );
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Extract street name from address
                    if (data.address) {
                        // Try to get road (street name)
                        if (data.address.road) {
                            return data.address.road;
                        }
                        // Fallback to other address components
                        if (data.address.neighbourhood) {
                            return data.address.neighbourhood;
                        }
                        if (data.address.suburb) {
                            return data.address.suburb;
                        }
                        if (data.address.city) {
                            return data.address.city;
                        }
                    }
                    
                    // If no address found, return formatted coordinates
                    const latDir = lat >= 0 ? 'N' : 'S';
                    const lngDir = lng >= 0 ? 'E' : 'W';
                    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
                    
                } catch (error) {
                    console.warn('Reverse geocoding failed:', error);
                    // Fallback to formatted coordinates
                    const latDir = lat >= 0 ? 'N' : 'S';
                    const lngDir = lng >= 0 ? 'E' : 'W';
                    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
                }
            }
            
            async function updateBusDetailsCard(lineKey, lineConfig, company, activeCount, lat, lng) {
                try {
                    console.log(`updateBusDetailsCard called for line ${lineConfig.id}, setting data-bus-selected=true`);
                    
                    // Get street name from GPS coordinates using reverse geocoding
                    let streetLocation = 'Localização GPS';
                    if (lat !== 0 && lng !== 0) {
                        streetLocation = await getStreetNameFromCoords(lat, lng);
                    }
                    
                    // Get route/trajectory data (via/subtítulo from line config)
                    const routeInfo = lineConfig.via || 'Trajeto principal';
                    
                    // Determine if bus is delayed (simulated logic - in production,
                    // this would compare scheduled vs actual times)
                    const isDelayed = Math.random() > 0.7; // 30% chance of being delayed for demo
                    
                    // Determine AC and accessibility status (simulated from line config)
                    const hasAC = lineConfig.id.includes('2') || lineConfig.id.includes('7') || Math.random() > 0.5;
                    const hasAccessibility = lineConfig.id.includes('1') || lineConfig.id.includes('6') || Math.random() > 0.3;
                    const acStatus = hasAC ? (Math.random() > 0.2 ? 'OK' : 'NOK') : null;
                    const accessibilityStatus = hasAccessibility ? (Math.random() > 0.1 ? 'OK' : 'NOK') : null;
                    
                    // Update bus details container
                    const container = document.getElementById('bus-details-container');
                    if (!container) return;
                    
                    // Show the container
                    container.style.display = 'block';
                    
                    // Hide the legacy status display
                    const statusDisplay = document.getElementById('status-display');
                    if (statusDisplay) {
                        statusDisplay.style.display = 'none';
                    }
                    
                    // Mark that a bus is selected in the bottom card
                    const bottomCard = document.getElementById('bottom-info-card');
                    if (bottomCard) {
                        bottomCard.setAttribute('data-bus-selected', 'true');
                        console.log(`Set data-bus-selected=true on bottom card`);
                    }
                    
                    // Update line information
                    document.getElementById('bus-line-code').textContent = lineConfig.id;
                    document.getElementById('bus-destination').textContent = lineConfig.nome;
                    document.getElementById('bus-company-logo').src = company.favicon;
                    document.getElementById('bus-company-name').textContent = company.name || 'Companhia';
                    
                    // Update bus line badge color to match the globe marker
                    const busLineBadge = document.getElementById('bus-line-badge');
                    if (busLineBadge && lineConfig.cor) {
                        // Create a gradient using the line color
                        const baseColor = lineConfig.cor;
                        // Create a slightly darker shade for gradient
                        const darkerColor = adjustColorBrightness(baseColor, -30);
                        busLineBadge.style.background = `linear-gradient(135deg, ${baseColor}, ${darkerColor})`;
                        console.log(`Updated bus line badge color to ${baseColor}`);
                    }
                    
                    // Update street location with route info as subtitle
                    const streetLocationElement = document.getElementById('bus-street-location');
                    if (streetLocationElement) {
                        streetLocationElement.innerHTML = `${streetLocation}<br><small class="text-muted">${routeInfo}</small>`;
                    }
                    
                    // Update delay status
                    const delaySection = document.getElementById('bus-delay-section');
                    const delayBadge = document.getElementById('bus-delay-badge');
                    const delayText = document.getElementById('bus-delay-text');
                    
                    if (isDelayed) {
                        delaySection.style.display = 'block';
                        delayText.textContent = 'Atrasado • 15 min';
                        delayBadge.className = 'delay-badge';
                    } else {
                        delaySection.style.display = 'none';
                    }
                    
                    // Update AC feature
                    const acFeature = document.getElementById('ac-feature');
                    const acStatusElement = document.getElementById('ac-status');
                    
                    if (hasAC && acStatus) {
                        acFeature.style.display = 'flex';
                        acStatusElement.textContent = acStatus;
                        acStatusElement.className = `feature-status ${acStatus === 'OK' ? 'text-success' : 'text-warning'}`;
                    } else {
                        acFeature.style.display = 'none';
                    }
                    
                    // Update accessibility feature
                    const accessibilityFeature = document.getElementById('accessibility-feature');
                    const accessibilityStatusElement = document.getElementById('accessibility-status');
                    
                    if (hasAccessibility && accessibilityStatus) {
                        accessibilityFeature.style.display = 'flex';
                        accessibilityStatusElement.textContent = accessibilityStatus;
                        accessibilityStatusElement.className = `feature-status ${accessibilityStatus === 'OK' ? 'text-success' : 'text-warning'}`;
                    } else {
                        accessibilityFeature.style.display = 'none';
                    }
                    
                    // Show/hide entire features section based on whether any features are available
                    const featuresSection = document.getElementById('features-section');
                    if (featuresSection) {
                        if ((hasAC && acStatus) || (hasAccessibility && accessibilityStatus)) {
                            featuresSection.style.display = 'block';
                        } else {
                            featuresSection.style.display = 'none';
                        }
                    }
                    
                    // Update status dot
                    const statusDot = document.querySelector('#bus-status-indicator .status-dot');
                    if (statusDot) {
                        statusDot.className = `status-dot ${activeCount > 0 ? 'active' : 'inactive'}`;
                    }
                    
                    // Ensure bottom card is expanded
                    if (window.toggleBottomCard && document.getElementById('bottom-info-card').classList.contains('minimized')) {
                        window.toggleBottomCard();
                    }
                    
                    console.log(`Bus details updated for line ${lineConfig.id}`);
                    
                } catch (error) {
                    console.error('Error updating bus details card:', error);
                }
            }
            
            /**
             * Close the bus details card and restore default display
             */
            function closeBusDetailsCard() {
                try {
                    // Hide bus details container
                    const container = document.getElementById('bus-details-container');
                    if (container) {
                        container.style.display = 'none';
                    }
                    
                    // Show the legacy status display
                    const statusDisplay = document.getElementById('status-display');
                    if (statusDisplay) {
                        statusDisplay.style.display = 'block';
                    }
                    
                    console.log('Bus details card closed, restored default display');
                    
                } catch (error) {
                    console.error('Error closing bus details card:', error);
                }
            }
            
            /**
             * Show bus details when a bus item is clicked in the list
             * @param {string} lineKey - Firebase key of the line
             */
            function showBusDetails(lineKey) {
                try {
                    // Get line configuration from state
                    const lineConfig = state.configLinhas[lineKey];
                    if (!lineConfig) {
                        console.error('Line configuration not found for key:', lineKey);
                        return;
                    }
                    
                    // Get company information
                    const comp = COMPANIES[lineConfig.company || 'atlantico'];
                    
                    // Get current GPS data to determine active count and position
                    let activeCount = 0;
                    let lat = 0, lng = 0;
                    const gpsData = state.gpsData || {};
                    
                    if (gpsData[lineKey]) {
                        const now = Date.now();
                        for (let uid in gpsData[lineKey]) {
                            const gpsPoint = gpsData[lineKey][uid];
                            const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
                            if (now - gpsPoint.timestamp < (state.systemTTL || 45000) && accuracy <= 200) {
                                activeCount++;
                                lat += gpsPoint.lat;
                                lng += gpsPoint.lng;
                            }
                        }
                        
                        if (activeCount > 0) {
                            lat = lat / activeCount;
                            lng = lng / activeCount;
                        }
                    }
                    
                    // Call the update function
                    if (window.updateBusDetailsCard) {
                        updateBusDetailsCard(lineKey, lineConfig, comp, activeCount, lat, lng);
                    }
                    
                } catch (error) {
                    console.error('Error showing bus details:', error);
                }
            }
            
            // Expose functions globally
            window.updateBusDetailsCard = updateBusDetailsCard;
            window.showBusDetails = showBusDetails;
        } else {
            // Remove marker if no active GPS data
            if (state.markers[key]) {
                state.map.removeLayer(state.markers[key]);
                delete state.markers[key];
                console.log(`Removed bus marker for line ${key} (no active GPS)`);
            }
        }
    }
}