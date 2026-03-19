import { db } from "../../services/firebaseService.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { processRawBusData, getBusDataStatistics, filterAdminData } from "../../modules/buses/dataProcessor.js";
import { state } from "../../core/stateManager.js";

// Global variables for monitor state
let monitorInterval = null;
let lastProcessedData = [];
let isMonitorActive = false;
let debugMarker = null;
let selectedSignal = null;

/**
 * Initialize the admin live monitor
 * Starts listening to Firebase bus data and processes it for admin view
 */
export function initAdminMonitor() {
    if (isMonitorActive) return;
    
    console.log('Initializing admin monitor...');
    isMonitorActive = true;
    
    // Start listening to bus data - GLOBAL LISTENER (no 5km radius filter)
    const busRef = ref(db, 'onibus');
    
    onValue(busRef, (snapshot) => {
        // Process raw data using the data processor
        const processedData = processRawBusData(snapshot);
        lastProcessedData = processedData;
        
        // Update monitor display
        updateMonitorDisplay(processedData);
        
        // Update statistics panel
        updateStatisticsPanel();
        
        // Auto-remove expired signals based on systemTTL
        autoRemoveExpiredSignals(processedData);
        
    }, (error) => {
        console.error('Error in admin monitor:', error);
        showMonitorError('Erro ao conectar com dados em tempo real');
    });
    
    // Start periodic updates for UI
    monitorInterval = setInterval(() => {
        if (lastProcessedData.length > 0) {
            updateMonitorDisplay(lastProcessedData);
            updateStatisticsPanel();
        }
    }, 5000); // Update every 5 seconds
}

/**
 * Generate HTML for a single Tech-Card with click functionality
 * @param {Object} signal - Processed bus signal data
 * @returns {string} HTML string for the Tech-Card
 */
function generateTechCardHTML(signal) {
    const delaySeconds = Math.floor(signal.packetDelay / 1000);
    const lagText = delaySeconds === 1 ? '1s atrás' : `${delaySeconds}s atrás`;
    
    // Determine accuracy color class
    let accuracyClass = 'tech-card-accuracy-green';
    if (signal.accuracy > 15 && signal.accuracy <= 50) {
        accuracyClass = 'tech-card-accuracy-yellow';
    } else if (signal.accuracy > 50) {
        accuracyClass = 'tech-card-accuracy-red';
    }
    
    // Determine company favicon
    const company = signal.lineKey.includes('L') ? 'atlantico' : 'viametro';
    const faviconPath = `assets/${company}-favicon.png`;
    
    // Shorten user ID for display
    const shortUserId = signal.userId.length > 8 ?
        signal.userId.substring(0, 8) + '...' : signal.userId;
    
    // Get line name (via) - extract from lineKey or use default
    const via = signal.lineKey || 'Via não identificada';
    
    // Check if signal is rejected (accuracy > 80m)
    const isRejected = signal.accuracy > 80;
    const rejectedBadge = isRejected ? '<span class="badge bg-danger ms-1" style="font-size: 8px;">REJEITADO</span>' : '';
    
    // Check if signal is expired
    const isExpired = signal.isExpired;
    
    return `
        <div class="tech-card ${accuracyClass} ${isExpired ? 'tech-card-expired-overlay' : ''}"
             onclick="window.flyToSignal(${signal.lat}, ${signal.lng}, '${signal.userId}', ${signal.accuracy})"
             style="cursor: pointer; position: relative;">
            ${isExpired ? '<span class="tech-card-expired">EXPIRADO</span>' : ''}
            
            <div class="tech-card-favicon">
                <img src="${faviconPath}" alt="${company}" onerror="this.style.display='none'">
            </div>
            
            <div class="tech-card-identity">
                <p class="tech-card-username">${shortUserId} ${rejectedBadge}</p>
                <p class="tech-card-via">${via}</p>
            </div>
            
            <div class="tech-card-metrics">
                <p class="tech-card-speed">${Math.round(signal.speed)}<span class="tech-card-speed-unit">km/h</span></p>
                <p class="tech-card-lag">${lagText}</p>
            </div>
            
            ${isRejected ? '<div class="position-absolute top-0 end-0 p-1"><i class="bi bi-exclamation-triangle text-danger" style="font-size: 10px;"></i></div>' : ''}
        </div>
    `;
}

/**
 * Update the monitor display with processed data using Tech-Card layout
 * @param {Array} data - Processed bus data
 */
function updateMonitorDisplay(data) {
    const container = document.getElementById('admin-monitor-container');
    if (!container) return;
    
    // Filter data if needed (show all signals for admin)
    const filteredData = filterAdminData(data, {
        // Admin sees all signals, no distance filtering
        showOnlyExpired: false
    });
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate health metrics
    const totalSignals = filteredData.length;
    const activeUsers = new Set(filteredData.map(s => s.userId)).size;
    const rejectedSignals = filteredData.filter(s => s.accuracy > 80).length;
    const expiredSignals = filteredData.filter(s => s.isExpired).length;
    
    // Create HTML for monitor with health badges
    let html = `
        <div class="monitor-header bg-dark text-white p-3 rounded-top">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="bi bi-speedometer2 me-2"></i>Monitor Vivo - Torre de Controle</h5>
                <div class="d-flex gap-2">
                    <span class="badge bg-success">${activeUsers} ativos</span>
                    <span class="badge ${rejectedSignals > 0 ? 'bg-warning' : 'bg-secondary'}">${rejectedSignals} rejeitados</span>
                    <span class="badge bg-primary">${totalSignals} sinais</span>
                </div>
            </div>
            <div class="small mt-2 opacity-75">
                <i class="bi bi-info-circle me-1"></i>
                Sistema TTL: ${Math.floor((state.systemTTL || 45000) / 1000)}s |
                Atualizado: ${new Date().toLocaleTimeString()}
            </div>
        </div>
        
        <div class="monitor-body p-3">
            <div class="monitor-tech-cards-container">
    `;
    
    if (filteredData.length === 0) {
        html += `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-inbox display-4"></i>
                <p class="mt-3">Nenhum sinal de GPS ativo no momento</p>
                <small class="d-block mt-2">Aguardando transmissões dos usuários...</small>
            </div>
        `;
    } else {
        // Group by line for better organization
        const linesMap = new Map();
        filteredData.forEach(item => {
            if (!linesMap.has(item.lineKey)) {
                linesMap.set(item.lineKey, []);
            }
            linesMap.get(item.lineKey).push(item);
        });
        
        // Display by line groups
        for (const [lineKey, lineSignals] of linesMap.entries()) {
            html += `
                <div class="line-group mb-3">
                    <div class="d-flex align-items-center mb-2">
                        <span class="badge bg-secondary me-2">${lineSignals.length}</span>
                        <h6 class="mb-0" style="font-size: 11px; font-weight: 700; color: #5f6368;">
                            LINHA ${lineKey}
                        </h6>
                    </div>
            `;
            
            // Add all Tech-Cards for this line
            lineSignals.forEach(signal => {
                html += generateTechCardHTML(signal);
            });
            
            html += `</div>`;
        }
    }
    
    html += `
            </div>
        </div>
        
        <div class="monitor-footer bg-light p-3 border-top small">
            <div class="row g-3">
                <div class="col-3 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #34A853; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>≤15m</small>
                </div>
                <div class="col-3 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #FBBC04; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>15-50m</small>
                </div>
                <div class="col-3 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #EA4335; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>>50m</small>
                </div>
                <div class="col-3 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #DC3545; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>>80m (REJEITADO)</small>
                </div>
            </div>
            <div class="text-center mt-2 text-muted">
                <small>Clique em qualquer sinal para voo tático no mapa</small>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Update the statistics panel with current data
 */
function updateStatisticsPanel() {
    const stats = getBusDataStatistics();
    const container = document.getElementById('admin-stats-container');
    
    if (!container) return;
    
    const html = `
        <div class="row g-3">
            <div class="col-6 col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center p-3">
                        <h4 class="mb-0">${stats.totalSignals}</h4>
                        <small>Sinais Totais</small>
                    </div>
                </div>
            </div>
            
            <div class="col-6 col-md-3">
                <div class="card ${stats.expiredSignals > 0 ? 'bg-danger' : 'bg-success'} text-white">
                    <div class="card-body text-center p-3">
                        <h4 class="mb-0">${stats.expiredSignals}</h4>
                        <small>Sinais Expirados</small>
                    </div>
                </div>
            </div>
            
            <div class="col-6 col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center p-3">
                        <h4 class="mb-0">${stats.activeUsers}</h4>
                        <small>Usuários Ativos</small>
                    </div>
                </div>
            </div>
            
            <div class="col-6 col-md-3">
                <div class="card bg-warning text-dark">
                    <div class="card-body text-center p-3">
                        <h4 class="mb-0">${Math.floor(stats.averageDelay / 1000)}s</h4>
                        <small>Atraso Médio</small>
                    </div>
                </div>
            </div>
            
            <div class="col-12">
                <div class="card">
                    <div class="card-body p-3">
                        <div class="row small">
                            <div class="col-md-4">
                                <span class="text-muted">Linhas ativas:</span>
                                <strong class="ms-2">${stats.linesActive}</strong>
                            </div>
                            <div class="col-md-4">
                                <span class="text-muted">Atraso máximo:</span>
                                <strong class="ms-2">${Math.floor(stats.maxDelay / 1000)}s</strong>
                            </div>
                            <div class="col-md-4">
                                <span class="text-muted">Última atualização:</span>
                                <strong class="ms-2">${stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString() : 'N/A'}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Show error message in monitor
 * @param {string} message - Error message to display
 */
function showMonitorError(message) {
    const container = document.getElementById('admin-monitor-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
}

/**
 * Stop the admin monitor
 */
export function stopAdminMonitor() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
    isMonitorActive = false;
    console.log('Admin monitor stopped');
}

/**
 * Check if monitor is active
 * @returns {boolean} True if monitor is active
 */
export function isMonitorRunning() {
    return isMonitorActive;
}

/**
 * Auto-remove expired signals based on systemTTL
 * @param {Array} data - Processed data
 */
function autoRemoveExpiredSignals(data) {
    const expiredSignals = data.filter(signal => signal.isExpired);
    if (expiredSignals.length > 0) {
        console.log(`Auto-removing ${expiredSignals.length} expired signals`);
        // In a real implementation, this would remove from Firebase
        // For now, we just log it
    }
}

/**
 * Fly to signal location on map with tactical zoom
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} userId - User ID
 * @param {number} accuracy - Accuracy in meters
 */
export function flyToSignal(lat, lng, userId, accuracy) {
    if (!state.map) {
        console.error('Map not initialized');
        return;
    }
    
    console.log(`Flying to signal: ${userId} at (${lat}, ${lng}) with accuracy ${accuracy}m`);
    
    // Smooth flyTo with tactical zoom (level 18)
    state.map.flyTo([lat, lng], 18, {
        duration: 1.5, // 1.5 seconds duration
        easeLinearity: 0.25
    });
    
    // Create or move debug marker
    if (!debugMarker) {
        // Create a blue translucent circle for first click
        debugMarker = L.circle([lat, lng], {
            radius: 15, // 15m radius
            color: '#1a73e8',
            fillColor: '#1a73e8',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(state.map);
        
        // Add a marker in the center
        const centerMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'debug-marker',
                html: '<div style="background: #1a73e8; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #1a73e8;"></div>',
                iconSize: [16, 16]
            }),
            zIndexOffset: 5000
        }).addTo(state.map);
        
        debugMarker.centerMarker = centerMarker;
        
        // Add popup with signal info
        debugMarker.bindPopup(`
            <div class="p-2">
                <h6 class="mb-1">Sinal Selecionado</h6>
                <p class="mb-1 small"><strong>Usuário:</strong> ${userId}</p>
                <p class="mb-1 small"><strong>Precisão:</strong> ${accuracy}m</p>
                <p class="mb-0 small"><strong>Posição:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            </div>
        `).openPopup();
        
    } else {
        // Move existing debug marker
        debugMarker.setLatLng([lat, lng]);
        debugMarker.setRadius(15);
        
        if (debugMarker.centerMarker) {
            debugMarker.centerMarker.setLatLng([lat, lng]);
        }
        
        // Update popup
        debugMarker.getPopup().setContent(`
            <div class="p-2">
                <h6 class="mb-1">Sinal Selecionado</h6>
                <p class="mb-1 small"><strong>Usuário:</strong> ${userId}</p>
                <p class="mb-1 small"><strong>Precisão:</strong> ${accuracy}m</p>
                <p class="mb-0 small"><strong>Posição:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            </div>
        `).openPopup();
    }
    
    // Store selected signal
    selectedSignal = { lat, lng, userId, accuracy };
    
    // Highlight the clicked card in the UI
    highlightSelectedCard(userId);
}

/**
 * Highlight the selected card in the monitor
 * @param {string} userId - User ID to highlight
 */
function highlightSelectedCard(userId) {
    // Remove previous highlights
    document.querySelectorAll('.tech-card').forEach(card => {
        card.classList.remove('selected-signal');
    });
    
    // Add highlight to selected card
    document.querySelectorAll('.tech-card').forEach(card => {
        if (card.textContent.includes(userId)) {
            card.classList.add('selected-signal');
            card.style.boxShadow = '0 0 0 2px #1a73e8';
            card.style.border = '1px solid #1a73e8';
        }
    });
}

/**
 * Clear debug marker from map
 */
export function clearDebugMarker() {
    if (debugMarker) {
        state.map.removeLayer(debugMarker);
        if (debugMarker.centerMarker) {
            state.map.removeLayer(debugMarker.centerMarker);
        }
        debugMarker = null;
        selectedSignal = null;
        
        // Remove highlights
        document.querySelectorAll('.tech-card').forEach(card => {
            card.classList.remove('selected-signal');
            card.style.boxShadow = '';
            card.style.border = '';
        });
    }
}

/**
 * Get selected signal
 * @returns {Object} Selected signal data
 */
export function getSelectedSignal() {
    return selectedSignal;
}

/**
 * Get last processed data
 * @returns {Array} Last processed data
 */
export function getLastProcessedData() {
    return [...lastProcessedData];
}

// Expose functions to window
window.flyToSignal = flyToSignal;
window.clearDebugMarker = clearDebugMarker;
window.initAdminMonitor = initAdminMonitor;
window.getLastProcessedData = getLastProcessedData;