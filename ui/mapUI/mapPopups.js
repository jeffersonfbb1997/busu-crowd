/**
 * Map Popups Factory
 * 
 * Generates HTML content for Leaflet popups for different map entities:
 * buses, stops, terminals, user location, etc.
 */

import { formatDistance, formatDuration } from '../../services/geoService.js';

/**
 * Create popup content for a bus marker.
 * @param {Object} bus - Bus data { lineId, lineName, via, company, speed?, direction?, timestamp }
 * @param {Object} gps - GPS data { lat, lng, accuracy, timestamp }
 * @returns {string} HTML string
 */
export function createBusPopup(bus, gps = {}) {
    const time = gps.timestamp ? new Date(gps.timestamp).toLocaleTimeString('pt-BR') : 'Desconhecido';
    const accuracy = gps.accuracy ? `${gps.accuracy.toFixed(0)} m` : 'N/A';
    const speed = bus.speed ? `${bus.speed.toFixed(1)} km/h` : 'N/A';
    const direction = bus.direction ? `${bus.direction}°` : 'N/A';
    
    return `
        <div class="bus-popup" style="font-family: 'Inter', sans-serif; min-width: 200px;">
            <div class="fw-bold mb-2" style="color: #1a73e8;">${bus.lineId} - ${bus.lineName}</div>
            <div class="small text-muted mb-2">${bus.via || 'Via principal'}</div>
            
            <table class="table table-sm table-borderless mb-2">
                <tr>
                    <td class="small text-muted">Última transmissão:</td>
                    <td class="small fw-bold">${time}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Precisão:</td>
                    <td class="small fw-bold">${accuracy}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Velocidade:</td>
                    <td class="small fw-bold">${speed}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Direção:</td>
                    <td class="small fw-bold">${direction}</td>
                </tr>
            </table>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.startTrack('${bus.lineKey}')">
                    <i class="bi bi-play-circle"></i> Transmitir
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.toggleSidebar()">
                    <i class="bi bi-info-circle"></i> Detalhes
                </button>
            </div>
        </div>
    `;
}

/**
 * Create popup content for a stop (parada).
 * @param {Object} stop - Stop data { name, sequence, type, description, routeId }
 * @returns {string} HTML string
 */
export function createStopPopup(stop) {
    const isTerminal = stop.type === 'terminal';
    const icon = isTerminal ? '🏁' : '●';
    const typeText = isTerminal ? 'Terminal' : 'Parada';
    
    return `
        <div class="stop-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-1">${icon} ${stop.name || typeText} ${stop.sequence ? `#${stop.sequence}` : ''}</div>
            <div class="small text-muted mb-2">${typeText} • Linha ${stop.routeId || 'N/A'}</div>
            
            ${stop.description ? `<p class="small mb-2">${stop.description}</p>` : ''}
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.openRouteManager()">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteStop('${stop.id}')">
                    <i class="bi bi-trash"></i> Remover
                </button>
            </div>
        </div>
    `;
}

/**
 * Create popup content for a terminal.
 * @param {Object} terminal - Terminal data (same as stop but with extra fields)
 * @returns {string} HTML string
 */
export function createTerminalPopup(terminal) {
    return createStopPopup({ ...terminal, type: 'terminal' });
}

/**
 * Create popup content for user location marker.
 * @param {Object} user - { lat, lng, accuracy, timestamp }
 * @returns {string} HTML string
 */
export function createUserPopup(user) {
    const time = user.timestamp ? new Date(user.timestamp).toLocaleTimeString('pt-BR') : 'Agora';
    const accuracy = user.accuracy ? `${user.accuracy.toFixed(0)} m` : 'Desconhecida';
    
    return `
        <div class="user-popup" style="font-family: 'Inter', sans-serif; min-width: 200px;">
            <div class="fw-bold mb-2">Sua localização</div>
            <div class="small text-muted mb-2">Transmitindo GPS em tempo real</div>
            
            <table class="table table-sm table-borderless mb-2">
                <tr>
                    <td class="small text-muted">Latitude:</td>
                    <td class="small fw-bold">${user.lat.toFixed(6)}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Longitude:</td>
                    <td class="small fw-bold">${user.lng.toFixed(6)}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Precisão:</td>
                    <td class="small fw-bold">${accuracy}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Atualizado:</td>
                    <td class="small fw-bold">${time}</td>
                </tr>
            </table>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.geoCenter()">
                    <i class="bi bi-geo"></i> Centralizar
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.stopTrack()">
                    <i class="bi bi-stop-circle"></i> Parar transmissão
                </button>
            </div>
        </div>
    `;
}

/**
 * Create popup content for a route point (editing).
 * @param {Object} point - { lat, lng, index, total }
 * @returns {string} HTML string
 */
export function createRoutePointPopup(point) {
    return `
        <div class="route-point-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-2">Ponto ${point.index} do trajeto</div>
            <div class="small text-muted mb-2">Lat: ${point.lat.toFixed(6)}<br>Lng: ${point.lng.toFixed(6)}</div>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.moveRoutePoint(${point.index})">
                    <i class="bi bi-arrows-move"></i> Mover
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteRoutePoint(${point.index})">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
}

/**
 * Create popup content for a generic circle (radius selection).
 * @param {Object} circle - { radius, area }
 * @returns {string} HTML string
 */
export function createCirclePopup(circle) {
    const area = circle.area ? formatDistance(circle.area) : 'N/A';
    const radius = circle.radius ? formatDistance(circle.radius) : 'N/A';
    
    return `
        <div class="circle-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-2">Raio de cobertura</div>
            <div class="small text-muted mb-2">Raio: ${radius}<br>Área: ${area}</div>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.adjustRadius()">
                    <i class="bi bi-sliders"></i> Ajustar
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.removeCircle()">
                    <i class="bi bi-x-circle"></i> Remover
                </button>
            </div>
        </div>
    `;
}

/**
 * Create a simple popup with custom title and content.
 * @param {string} title
 * @param {string} body - HTML body
 * @param {Array<{label, onClick, class}>} buttons - Array of button definitions
 * @returns {string} HTML string
 */
export function createCustomPopup(title, body, buttons = []) {
    const buttonsHtml = buttons.map(btn => `
        <button class="btn btn-sm ${btn.class || 'btn-outline-primary'}" onclick="${btn.onClick}">
            ${btn.label}
        </button>
    `).join('');
    
    return `
        <div class="custom-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-2">${title}</div>
            <div class="small text-muted mb-2">${body}</div>
            ${buttonsHtml ? `<div class="d-flex justify-content-between mt-2">${buttonsHtml}</div>` : ''}
        </div>
    `;
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.mapPopups = {
        createBusPopup,
        createStopPopup,
        createTerminalPopup,
        createUserPopup,
        createRoutePointPopup,
        createCirclePopup,
        createCustomPopup
    };
}