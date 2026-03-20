import { db, auth, ADMIN_EMAIL } from '../services/firebaseService.js';
import { login, logout, subscribeToAuthChanges, isUserAdmin } from '../services/authService.js';
import { initParametersListener } from '../services/parametersService.js';
import { initTimeService } from '../services/timeService.js';
import { initMap } from '../modules/map/mapInit.js';
import { state, updateState } from './stateManager.js';
import { iniciarGPS, stopTrack } from '../modules/gps/gpsCollector.js';
import { renderBusList } from '../modules/buses/busManager.js';
import { renderBusMarkers } from '../modules/buses/busRenderer.js';
import { toggleSidebar, switchView, toggleDrawer, toggleBottomCard } from '../ui/panels/sidebar.js';
import { onMapClickForRoute, selectLineForRoute, saveRouteData, clearCurrentDraft } from '../admin/mapEditor/routeEditor.js';
import { COMPANIES } from '../config/systemConfig.js';
import { calcDist } from '../utils/geoUtils.js';
import { updateUserPointer, centerMapOnPointer, initPointerService } from '../services/pointerService.js';

import { ref, set, onValue, onDisconnect, remove, push } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

export function initApp() {
    // Initialize map
    const map = initMap('map');
    state.map = map;
    
    // Initialize state
    state.draftPolyline = L.polyline([], {color: '#1a73e8', weight: 4}).addTo(map);
    state.draftMarkers = L.layerGroup().addTo(map);
    
    // Expose functions to window
    window.toggleSidebar = toggleSidebar;
    window.switchView = switchView;
    window.toggleDrawer = toggleDrawer;
    window.toggleBottomCard = toggleBottomCard;
    window.geoCenter = geoCenter;
    
    // Bus details card functions
    window.closeBusDetailsCard = function() {
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
            
            // Remove bus selected attribute
            const bottomCard = document.getElementById('bottom-info-card');
            if (bottomCard) {
                bottomCard.removeAttribute('data-bus-selected');
            }
            
            console.log('Bus details card closed, restored default display');
            
        } catch (error) {
            console.error('Error closing bus details card:', error);
        }
    };
    window.fazerLogin = login;
    window.fazerLogout = logout;
    window.startTrack = startTrack;
    window.stopTrack = stopTrack;
    window.onActionClick = onActionClick;
    window.saveLine = saveLine;
    window.openRouteManager = openRouteManager;
    window.closeRouteManager = closeRouteManager;
    window.setRouteMode = setRouteMode;
    window.selectLineForRoute = selectLineForRoute;
    window.saveRouteData = saveRouteData;
    window.clearCurrentDraft = clearCurrentDraft;
    window.selectCompany = selectCompany;
    window.randomizeColor = randomizeColor;
    window.clearAdminForm = clearAdminForm;
    window.loadLineForEdit = loadLineForEdit;
    window.toggleSimulatedData = toggleSimulatedData;
    
    // Auth subscription
    subscribeToAuthChanges(handleAuthChange);
    
    // Initialize time service (server clock synchronization)
    const timeOffset = initTimeService();
    console.log('Time service initialized, offset:', timeOffset, 'ms');
    
    // Initialize system parameters listener
    initParametersListener();
    
    // Initialize pointer service
    initPointerService();
    
    // Add map click listener to close bus details card when clicking on empty map
    map.on('click', function(e) {
        // Check if the click is not on a marker
        // We'll close the bus details card on any map click for simplicity
        window.closeBusDetailsCard();
    });
    
    // Update bottom card with initial radius after a short delay
    setTimeout(() => {
        const initialRadius = state.systemRadius || 5;
        if (window.updateBottomCardRadius) {
            window.updateBottomCardRadius(initialRadius);
        }
    }, 1000);
    
    // Data listeners
    setupDataListeners();
    
    // Initial geo center - reduced from 2000ms to 500ms for faster loading
    setTimeout(() => geoCenter(), 500);
}

function geoCenter() {
    console.log('Starting geoCenter function...');
    
    // Check if map is available
    if (!state.map) {
        console.error('Map not available in geoCenter');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(p => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const accuracy = p.coords.accuracy;
        
        console.log('Geolocation success:', { lat, lng, accuracy: accuracy + 'm' });
        
        // Create user pin (blue circle marker) when GPS locates user
        updateUserPointer(lat, lng, accuracy, true); // forceUpdate = true
        
        // Center map on user location
        centerMapOnPointer(lat, lng, 17);
        
        console.log('User pin created and map centered on user location');
        
    }, (error) => {
        console.warn('Geolocation error:', error);
        
        // Fallback to default location if geolocation fails
        const defaultLat = -14.81929, defaultLng = -39.036015;
        centerMapOnPointer(defaultLat, defaultLng, 15);
        
        console.log('Geolocation failed, centered on default location');
        
    }, {enableHighAccuracy: true, timeout: 5000, maximumAge: 0});
}

function startTrack(key) {
    if (document.activeElement) document.activeElement.blur();
    updateState('currentLineKey', key);
    localStorage.setItem('busu_active_line', key);
    const modalEl = document.getElementById('modalLine');
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();
    iniciarGPS(key);
}

function onActionClick() {
    state.watchID ? stopTrack() : new bootstrap.Modal(document.getElementById('modalLine')).show();
}

async function handleAuthChange(u) {
    updateState('user', u);
    if(u) {
        // Modern user profile card
        document.getElementById('auth-area').innerHTML = `
            <div class="user-profile-card d-flex align-items-center p-3 mb-4">
                <div class="user-avatar-wrapper position-relative">
                    <img src="${u.photoURL}" width="40" class="rounded-circle user-avatar" alt="${u.displayName}">
                    <div class="user-status-indicator bg-success"></div>
                </div>
                <div class="user-info ms-3 flex-grow-1">
                    <div class="user-name fw-bold">${u.displayName.split(' ')[0]}</div>
                    <div class="user-email small text-muted">${u.email ? u.email.substring(0, 20) + (u.email.length > 20 ? '...' : '') : 'Usuário'}</div>
                </div>
                <button class="btn-logout btn btn-outline-light border-0 p-2 rounded-circle" onclick="window.fazerLogout()" title="Sair">
                    <i class="bi bi-box-arrow-right text-muted"></i>
                </button>
            </div>`;
        document.getElementById('action-btn').style.display = 'flex';
        
        // Check if user is admin (master admin or listed in Firebase admins)
        const isAdmin = await isUserAdmin(u);
        if (isAdmin) {
            document.getElementById('admin-entry').style.display = 'block';
            // Update admin button style
            document.querySelector('#admin-entry button').className = 'btn-admin-panel w-100 py-3 fw-bold';
        } else {
            document.getElementById('admin-entry').style.display = 'none';
        }
        
        if(localStorage.getItem('busu_active_line')) iniciarGPS(localStorage.getItem('busu_active_line'));
    } else {
        // Modern login button
        document.getElementById('auth-area').innerHTML = `
            <div class="auth-promo-card text-center p-4 mb-4">
                <div class="auth-icon mb-3">
                    <i class="bi bi-shield-check display-4 text-primary"></i>
                </div>
                <h6 class="fw-bold mb-2">Acesse sua conta</h6>
                <p class="small text-muted mb-3">Faça login para contribuir com dados em tempo real e acessar recursos exclusivos.</p>
                <button class="btn-login-modern w-100 py-3 fw-bold" onclick="window.fazerLogin()">
                    <i class="bi bi-google me-2"></i> Continuar com Google
                </button>
                <div class="mt-3 small text-muted">
                    <i class="bi bi-lock me-1"></i> Seus dados estão seguros
                </div>
            </div>`;
        document.getElementById('action-btn').style.display = 'none';
        document.getElementById('admin-entry').style.display = 'none';
    }
}

function setupDataListeners() {
    // Lines config listener
    onValue(ref(db, 'config/linhas'), snap => {
        const data = snap.val() || {};
        const grid = document.getElementById('line-selection-grid');
        const admList = document.getElementById('admin-lines-list-crud');
        const routeAdminList = document.getElementById('route-admin-list');
        const plan = document.getElementById('planning-all-lines');
        
        grid.innerHTML = ''; admList.innerHTML = ''; routeAdminList.innerHTML = ''; plan.innerHTML = '';
        let countL = 0;

        for(let key in data) {
            const c = data[key]; state.configLinhas[key] = c; countL++;
            const comp = COMPANIES[c.company || 'atlantico'];
            
            // Modern line card for modal
            const isActive = state.activeLineKeys && state.activeLineKeys.includes(key);
            // For demo purposes, simulate some lines having AC and accessibility features
            // In production, these would come from line configuration
            const hasAC = c.id.includes('2') || c.id.includes('7'); // Example logic
            const hasAccessibility = c.id.includes('1') || c.id.includes('6'); // Example logic
            
            const acFeature = hasAC ? '<span class="feature-badge ac"><i class="bi bi-snow"></i> AR</span>' : '';
            const accessibilityFeature = hasAccessibility ? '<span class="feature-badge accessibility"><i class="bi bi-wheelchair"></i> ACESS</span>' : '';
            
            grid.innerHTML += `
                <div class="line-card" onclick="window.startTrack('${key}')" data-line-id="${c.id}" data-line-name="${c.nome}" data-line-route="${c.via}" data-line-key="${key}" data-line-active="${isActive}">
                    <div class="line-status ${isActive ? 'active' : 'inactive'}"></div>
                    <div class="line-card-header">
                        <div class="line-code">${c.id}</div>
                        <div class="line-destination">${c.nome}</div>
                        <img src="${comp.favicon}" class="line-company-logo" alt="${c.company}">
                    </div>
                    <div class="line-route">${c.via || 'Via principal'}</div>
                    <div class="line-features">
                        ${acFeature}
                        ${accessibilityFeature}
                    </div>
                </div>
            `;
            
            admList.innerHTML += `
                <div class="list-group-item bus-item border-bottom px-0" onclick="window.loadLineForEdit('${key}')">
                    <div class="d-flex align-items-center flex-grow-1">
                        <img src="${comp.favicon}" class="bus-logo-mini">
                        <div><div class="bus-title">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div>
                    </div>
                    <i class="bi bi-trash text-danger ms-auto px-2 fs-5" onclick="event.stopPropagation(); remove(ref(db, 'config/linhas/${key}'))"></i>
                </div>`;

            routeAdminList.innerHTML += `<div class="list-group-item adm-route-item p-2 small border-bottom" onclick="window.selectLineForRoute('${key}')"><img src="${comp.favicon}" width="12" class="me-2"><b>${c.id}</b> - ${c.via}</div>`;
            plan.innerHTML += `<button class="nav-item-custom border-bottom" onclick="if(state.markers['${key}']) state.map.flyTo(state.markers['${key}'].getLatLng(), 17); window.toggleSidebar();"><img src="${comp.favicon}" class="bus-logo-mini"><div><div class="fw-bold">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div></button>`;
        }
        document.getElementById('stat-lines').innerText = countL;
    });

    // GPS data listener
    onValue(ref(db, 'onibus'), snap => {
        const gpsData = snap.val() || {};
        const { statusH, drawerH, tU, activeLines } = renderBusList(gpsData, state.configLinhas);
        
        // Store active line keys for modal filtering
        state.activeLineKeys = [];
        for (let key in state.configLinhas) {
            if (gpsData[key]) {
                let hasActive = false;
                for (let uid in gpsData[key]) {
                    const gpsPoint = gpsData[key][uid];
                    const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
                    const now = Date.now();
                    if (now - gpsPoint.timestamp < (state.systemTTL || 45000) && accuracy <= 200) {
                        hasActive = true;
                        break;
                    }
                }
                if (hasActive) {
                    state.activeLineKeys.push(key);
                }
            }
        }
        
        // Render bus markers on the map
        renderBusMarkers(gpsData, state.configLinhas);
        
        document.getElementById('floating-active-list').innerHTML = drawerH || '<small class="text-muted">Sem frota ativa</small>';
        document.getElementById('status-display').innerHTML = statusH || '<small class="text-muted">Aguardando dados...</small>';
        
        // Update FROTA ATIVA label with active bus lines count
        const frotaLabel = document.getElementById('frota-ativa-label');
        if (frotaLabel) {
            frotaLabel.textContent = `FROTA ATIVA (${activeLines})`;
        }
        
        document.getElementById('stat-users').innerText = tU;
        document.getElementById('global-counter').style.display = tU > 0 ? 'block' : 'none';
        document.getElementById('total-active-text').innerText = `${tU} COLABORADORES ATIVOS`;
        
        // Update modal line cards if modal is open
        updateModalLineCards();
    });
}

// Admin functions
function saveLine() {
    const id = document.getElementById('admID').value;
    // Use the line ID as the key for consistency
    // If editing an existing line, use the existing key from admDbKey
    const key = document.getElementById('admDbKey').value || id;
    if(!id) return alert("Erro");
    set(ref(db, `config/linhas/${key}`), {
        id,
        nome: document.getElementById('admNome').value,
        via: document.getElementById('admVia').value || "Principal",
        cor: document.getElementById('admCor').value,
        company: state.adminSelectedCompany
    }).then(() => { alert("OK"); clearAdminForm(); });
}

function openRouteManager() { 
    switchView('admin-routes'); 
    state.map.on('click', onMapClickForRoute); 
    state.map.getContainer().style.cursor = 'crosshair'; 
}

function closeRouteManager() { 
    state.map.off('click', onMapClickForRoute); 
    state.map.getContainer().style.cursor = ''; 
    switchView('admin-dashboard'); 
    clearCurrentDraft(); 
}

function setRouteMode(m) { 
    updateState('routeMode', m); 
    document.querySelectorAll('.route-mode-badge').forEach(b => b.classList.remove('active')); 
    document.getElementById(`btn-mode-${m}`).classList.add('active'); 
}

function selectCompany(id) { 
    document.querySelectorAll('.company-option').forEach(e => e.classList.remove('selected')); 
    document.getElementById('adm-opt-'+id).classList.add('selected'); 
    updateState('adminSelectedCompany', id); 
}

function randomizeColor() { 
    document.getElementById('admCor').value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'); 
}

function clearAdminForm() {
    document.getElementById('admDbKey').value = "";
    document.getElementById('admID').value = "";
    document.getElementById('admNome').value = "";
    document.getElementById('admVia').value = "";
    
    // Hide delete button when form is cleared
    document.getElementById('delete-line-btn').style.display = 'none';
}

function loadLineForEdit(key) {
    const c = state.configLinhas[key];
    if (!c) return;
    document.getElementById('admDbKey').value = key;
    document.getElementById('admID').value = c.id;
    document.getElementById('admNome').value = c.nome;
    document.getElementById('admVia').value = c.via;
    document.getElementById('admCor').value = c.cor;
    selectCompany(c.company || 'atlantico');
    
    // Show delete button when editing existing line
    document.getElementById('delete-line-btn').style.display = 'block';
}

async function deleteLine() {
    const key = document.getElementById('admDbKey').value;
    if (!key) {
        alert('Selecione uma linha para excluir');
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir a linha ${key}?`)) {
        return;
    }
    
    // Check if user is admin
    if (!state.user) {
        alert('Usuário não autenticado');
        return;
    }
    
    const { isUserAdmin } = await import('../services/authService.js');
    const isAdmin = await isUserAdmin(state.user);
    
    if (!isAdmin) {
        alert('Apenas administradores podem excluir linhas');
        return;
    }
    
    try {
        const { ref, remove } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js");
        
        // Delete line from Firebase
        await remove(ref(db, `config/linhas/${key}`));
        
        // Also delete any active GPS data for this line
        await remove(ref(db, `onibus/${key}`));
        
        // Clear form
        clearAdminForm();
        
        // Hide delete button
        document.getElementById('delete-line-btn').style.display = 'none';
        
        // Force immediate marker cleanup
        if (window.cleanupDeletedLineMarkers) {
            window.cleanupDeletedLineMarkers(state.configLinhas);
        }
        
        alert('Linha excluída com sucesso!');
        
    } catch (error) {
        console.error('Error deleting line:', error);
        alert('Erro ao excluir linha: ' + error.message);
    }
}

// Admin Settings Functions
async function saveSystemParameters() {
    const ttlInput = document.getElementById('system-ttl-input');
    const radiusInput = document.getElementById('system-radius-input');
    const saveBtn = document.getElementById('save-params-btn');
    const statusDiv = document.getElementById('params-status');
    const ttlWarning = document.getElementById('ttl-warning');
    
    if (!ttlInput || !radiusInput) return;
    
    const ttlSeconds = parseInt(ttlInput.value);
    const radiusKm = parseInt(radiusInput.value);
    
    // Show/hide TTL warning
    if (ttlWarning) {
        ttlWarning.style.display = ttlSeconds < 5 ? 'block' : 'none';
    }
    
    // Validate inputs - Block saving if values are dangerous (TTL < 5 seconds)
    if (ttlSeconds < 5) {
        showParamsStatus('ERRO: TTL menor que 5 segundos é perigoso para o sistema', 'danger');
        return;
    }
    
    if (ttlSeconds > 300) {
        showParamsStatus('TTL deve ser no máximo 300 segundos', 'danger');
        return;
    }
    
    if (radiusKm < 1 || radiusKm > 100) {
        showParamsStatus('Raio deve estar entre 1 e 100 km', 'danger');
        return;
    }
    
    // Check if user is admin
    if (!state.user) {
        showParamsStatus('Usuário não autenticado', 'danger');
        return;
    }
    
    const { isUserAdmin } = await import('../services/authService.js');
    const isAdmin = await isUserAdmin(state.user);
    
    if (!isAdmin) {
        showParamsStatus('Apenas administradores autorizados podem alterar parâmetros', 'danger');
        // Show admin security alert
        const adminAlert = document.getElementById('admin-security-alert');
        if (adminAlert) adminAlert.style.display = 'block';
        return;
    }
    
    // Convert seconds to milliseconds for Firebase storage
    const ttlMilliseconds = ttlSeconds * 1000;
    
    // Save to Firebase
    try {
        const { updateSystemParameters } = await import('../services/parametersService.js');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>SALVANDO...';
        
        await updateSystemParameters({
            ttl: ttlMilliseconds, // Store as milliseconds
            radius: radiusKm
        });
        
        showParamsStatus(`Parâmetros salvos com sucesso! TTL: ${ttlSeconds}s (${ttlMilliseconds}ms), Raio: ${radiusKm}km`, 'success');
        saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVO';
        
        // Update health metrics display
        updateHealthMetricsDisplay();
        
        // Re-enable button after 2 seconds
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVAR PARÂMETROS';
        }, 2000);
        
    } catch (error) {
        console.error('Error saving parameters:', error);
        showParamsStatus('Erro ao salvar parâmetros: ' + error.message, 'danger');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVAR PARÂMETROS';
    }
}

function loadCurrentParameters() {
    const ttlInput = document.getElementById('system-ttl-input');
    const radiusInput = document.getElementById('system-radius-input');
    
    if (!ttlInput || !radiusInput) return;
    
    // Load from current state (fetch from Firebase config/parametros)
    const currentTTL = Math.floor((state.systemTTL || 45000) / 1000); // Convert ms to seconds
    const currentRadius = state.systemRadius || 5;
    
    ttlInput.value = currentTTL;
    radiusInput.value = currentRadius;
    
    // Update TTL warning display
    const ttlWarning = document.getElementById('ttl-warning');
    if (ttlWarning) {
        ttlWarning.style.display = currentTTL < 5 ? 'block' : 'none';
    }
    
    showParamsStatus('Valores atuais carregados do Firebase', 'info');
    
    // Also update admin permissions status
    updateAdminPermissionsStatus();
}

function showParamsStatus(message, type = 'info') {
    const statusDiv = document.getElementById('params-status');
    if (!statusDiv) return;
    
    const alertClass = type === 'success' ? 'alert-success' :
                      type === 'danger' ? 'alert-danger' :
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    statusDiv.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show py-2" role="alert">
            <small>${message}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = statusDiv.querySelector('.alert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => statusDiv.innerHTML = '', 300);
        }
    }, 5000);
}

async function forceTTLCleanup() {
    const btn = document.getElementById('force-cleanup-btn');
    if (!btn) return;
    
    // Check if user is admin
    if (!state.user) {
        alert('Usuário não autenticado');
        return;
    }
    
    const { isUserAdmin } = await import('../services/authService.js');
    const isAdmin = await isUserAdmin(state.user);
    
    if (!isAdmin) {
        alert('Apenas administradores podem forçar limpeza');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>LIMPEZA EM ANDAMENTO...';
    
    // Trigger cleanup through global function
    if (window.triggerTTLCleanup) {
        window.triggerTTLCleanup();
        showParamsStatus('Limpeza forçada executada', 'success');
    } else {
        showParamsStatus('Função de limpeza não disponível', 'warning');
    }
    
    // Re-enable button after 3 seconds
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash me-1"></i>FORÇAR LIMPEZA DE SINAIS EXPIRADOS';
    }, 3000);
}

function toggleSimulatedData() {
    const btn = document.getElementById('simulate-data-btn');
    const statUsers = document.getElementById('stat-users');
    const statLines = document.getElementById('stat-lines');
    
    if (!btn || !statUsers || !statLines) return;
    
    // Check if data is currently simulated
    const isSimulated = btn.classList.contains('btn-success');
    
    if (isSimulated) {
        // Clear simulated data
        statUsers.textContent = '0';
        statLines.textContent = '4'; // Keep the base value from the HTML
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-secondary');
        btn.innerHTML = '<i class="bi bi-database me-1"></i> Simular Dados Fictícios';
        
        // Show notification
        showParamsStatus('Dados fictícios removidos', 'info');
        
        // Fallback alert if params-status not found
        if (!document.getElementById('params-status')) {
            alert('Dados fictícios removidos');
        }
    } else {
        // Insert simulated data
        const randomUsers = Math.floor(Math.random() * 50) + 20; // 20-70 users
        const randomLines = Math.floor(Math.random() * 10) + 4; // 4-14 lines
        
        statUsers.textContent = randomUsers.toString();
        statLines.textContent = randomLines.toString();
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-success');
        btn.innerHTML = '<i class="bi bi-database-fill-check me-1"></i> Limpar Dados Fictícios';
        
        // Show notification
        showParamsStatus(`Dados fictícios inseridos: ${randomUsers} usuários, ${randomLines} linhas`, 'success');
        
        // Fallback alert if params-status not found
        if (!document.getElementById('params-status')) {
            alert(`Dados fictícios inseridos: ${randomUsers} usuários ativos, ${randomLines} linhas`);
        }
    }
}

/**
 * Update health metrics display in admin settings
 */
function updateHealthMetricsDisplay() {
    // Get data from live monitor if available
    if (window.getLastProcessedData) {
        const lastData = window.getLastProcessedData();
        const activeUsers = new Set(lastData.map(s => s.userId)).size;
        const rejectedSignals = lastData.filter(s => s.accuracy > 80).length;
        
        const activeUsersEl = document.getElementById('health-active-users');
        const rejectedSignalsEl = document.getElementById('health-rejected-signals');
        
        if (activeUsersEl) activeUsersEl.textContent = activeUsers;
        if (rejectedSignalsEl) rejectedSignalsEl.textContent = rejectedSignals;
    }
}

/**
 * Update admin permissions status display
 */
async function updateAdminPermissionsStatus() {
    const permissionsStatus = document.getElementById('admin-permissions-status');
    const adminAlert = document.getElementById('admin-security-alert');
    
    if (!permissionsStatus) return;
    
    if (!state.user) {
        permissionsStatus.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Usuário não autenticado</span>';
        if (adminAlert) adminAlert.style.display = 'block';
        return;
    }
    
    try {
        const { isUserAdmin } = await import('../services/authService.js');
        const isAdmin = await isUserAdmin(state.user);
        
        if (isAdmin) {
            permissionsStatus.innerHTML = '<span class="text-success"><i class="bi bi-shield-check me-1"></i>Administrador autorizado</span>';
            if (adminAlert) adminAlert.style.display = 'none';
            
            // Enable admin features
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            permissionsStatus.innerHTML = '<span class="text-warning"><i class="bi bi-shield-exclamation me-1"></i>Usuário não administrador</span>';
            if (adminAlert) adminAlert.style.display = 'block';
            
            // Disable admin features
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    } catch (error) {
        console.error('Error checking admin permissions:', error);
        permissionsStatus.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Erro ao verificar permissões</span>';
    }
}

/**
 * Check and apply admin security on view switch
 */
function applyAdminSecurity() {
    if (!state.user) {
        // Hide admin-only features
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
        return;
    }
    
    // Check admin status and update UI
    updateAdminPermissionsStatus();
}

// Update modal line cards with current active status
function updateModalLineCards() {
    const lineCards = document.querySelectorAll('.line-card');
    lineCards.forEach(card => {
        const lineKey = card.getAttribute('data-line-key');
        const isActive = state.activeLineKeys && state.activeLineKeys.includes(lineKey);
        
        // Update status dot
        const statusDot = card.querySelector('.line-status');
        if (statusDot) {
            statusDot.className = `line-status ${isActive ? 'active' : 'inactive'}`;
        }
        
        // Update data attribute
        card.setAttribute('data-line-active', isActive);
    });
    
    // Trigger filter if modal is open to update visible count
    if (document.getElementById('modalLine')?.classList.contains('show')) {
        const filterLines = window.filterLines;
        if (typeof filterLines === 'function') {
            setTimeout(filterLines, 50);
        }
    }
}

// Modern modal search and filtering functionality
function initModalSearch() {
    const searchInput = document.getElementById('line-search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const showActiveOnlyCheckbox = document.getElementById('show-active-only');
    const lineCountElement = document.getElementById('line-count');
    
    if (!searchInput) return;
    
    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterLines();
        searchInput.focus();
    });
    
    // Search input event
    searchInput.addEventListener('input', () => {
        filterLines();
    });
    
    // Show active only checkbox
    showActiveOnlyCheckbox.addEventListener('change', () => {
        filterLines();
    });
    
    // Filter lines based on search and active filter
    function filterLines() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const showActiveOnly = showActiveOnlyCheckbox.checked;
        const lineCards = document.querySelectorAll('.line-card');
        
        let visibleCount = 0;
        
        lineCards.forEach(card => {
            const lineId = card.getAttribute('data-line-id') || '';
            const lineName = card.getAttribute('data-line-name') || '';
            const lineRoute = card.getAttribute('data-line-route') || '';
            const isActive = card.getAttribute('data-line-active') === 'true';
            
            // Apply active filter
            if (showActiveOnly && !isActive) {
                card.style.display = 'none';
                return;
            }
            
            // Apply search filter
            const matchesSearch = searchTerm === '' ||
                lineId.toLowerCase().includes(searchTerm) ||
                lineName.toLowerCase().includes(searchTerm) ||
                lineRoute.toLowerCase().includes(searchTerm);
            
            if (matchesSearch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update line count
        if (lineCountElement) {
            lineCountElement.textContent = `${visibleCount} linha${visibleCount !== 1 ? 's' : ''} encontrada${visibleCount !== 1 ? 's' : ''}`;
            
            // Show empty state if no results
            const grid = document.getElementById('line-selection-grid');
            const existingEmptyState = grid.querySelector('.empty-state');
            
            if (visibleCount === 0) {
                if (!existingEmptyState) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state';
                    emptyState.innerHTML = `
                        <div class="empty-state-icon">
                            <i class="bi bi-satellite"></i>
                        </div>
                        <div class="empty-state-text">
                            ${searchTerm ? `Nenhuma linha encontrada para "${searchTerm}"` : 'Nenhuma linha disponível para transmissão GPS'}
                        </div>
                    `;
                    grid.appendChild(emptyState);
                }
            } else if (existingEmptyState) {
                existingEmptyState.remove();
            }
        }
    }
    
    // Initialize filter on modal show
    const modalLine = document.getElementById('modalLine');
    if (modalLine) {
        modalLine.addEventListener('shown.bs.modal', () => {
            setTimeout(filterLines, 100); // Small delay to ensure cards are rendered
        });
    }
    
    // Expose filterLines globally for updateModalLineCards
    window.filterLines = filterLines;
    
    console.log('Modal search functionality initialized');
}

// Initialize modal search when app starts
setTimeout(initModalSearch, 1000);

// Expose functions to window
window.saveSystemParameters = saveSystemParameters;
window.loadCurrentParameters = loadCurrentParameters;
window.forceTTLCleanup = forceTTLCleanup;
window.deleteLine = deleteLine;
window.updateHealthMetricsDisplay = updateHealthMetricsDisplay;
window.applyAdminSecurity = applyAdminSecurity;

// Expose cleanup function from bus renderer
import { cleanupDeletedLineMarkers } from '../modules/buses/busRenderer.js';
window.cleanupDeletedLineMarkers = cleanupDeletedLineMarkers;

// Initialize admin security when app loads - reduced from 3000ms to 1000ms
setTimeout(() => {
    applyAdminSecurity();
    updateHealthMetricsDisplay();
}, 1000);
