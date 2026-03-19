import { db } from "../../services/firebaseService.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { processRawBusData, getBusDataStatistics, filterAdminData } from "../../modules/buses/dataProcessor.js";
import { state } from "../../core/stateManager.js";

// Global variables for monitor state
let monitorInterval = null;
let lastProcessedData = [];
let isMonitorActive = false;

/**
 * Initialize the admin live monitor
 * Starts listening to Firebase bus data and processes it for admin view
 */
export function initAdminMonitor() {
    if (isMonitorActive) return;
    
    console.log('Initializing admin monitor...');
    isMonitorActive = true;
    
    // Start listening to bus data
    const busRef = ref(db, 'onibus');
    
    onValue(busRef, (snapshot) => {
        // Process raw data using the data processor
        const processedData = processRawBusData(snapshot);
        lastProcessedData = processedData;
        
        // Update monitor display
        updateMonitorDisplay(processedData);
        
        // Update statistics panel
        updateStatisticsPanel();
        
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
 * Generate HTML for a single Tech-Card
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
    
    return `
        <div class="tech-card ${accuracyClass} ${signal.isExpired ? 'tech-card-expired-overlay' : ''}">
            ${signal.isExpired ? '<span class="tech-card-expired">EXPIRADO</span>' : ''}
            
            <div class="tech-card-favicon">
                <img src="${faviconPath}" alt="${company}" onerror="this.style.display='none'">
            </div>
            
            <div class="tech-card-identity">
                <p class="tech-card-username">${shortUserId}</p>
                <p class="tech-card-via">${via}</p>
            </div>
            
            <div class="tech-card-metrics">
                <p class="tech-card-speed">${Math.round(signal.speed)}<span class="tech-card-speed-unit">km/h</span></p>
                <p class="tech-card-lag">${lagText}</p>
            </div>
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
    
    // Create HTML for monitor
    let html = `
        <div class="monitor-header bg-dark text-white p-3 rounded-top">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="bi bi-speedometer2 me-2"></i>Monitor Vivo - Torre de Controle</h5>
                <span class="badge bg-primary">${filteredData.length} sinais</span>
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
            <div class="row g-2">
                <div class="col-4 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #34A853; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>≤15m</small>
                </div>
                <div class="col-4 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #FBBC04; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>15-50m</small>
                </div>
                <div class="col-4 text-center">
                    <span class="d-block" style="width: 10px; height: 10px; background: #EA4335; border-radius: 2px; margin: 0 auto 4px;"></span>
                    <small>>50m</small>
                </div>
            </div>
            <div class="text-center mt-2 text-muted">
                <small>Legenda: Precisão do GPS (borda lateral)</small>
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
 * Get last processed data
 * @returns {Array} Last processed data
 */
export function getLastProcessedData() {
    return [...lastProcessedData];
}