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
    
    // Auth subscription
    subscribeToAuthChanges(handleAuthChange);
    
    // Initialize time service (server clock synchronization)
    initTimeService().then(offset => {
        console.log('Time service initialized with offset:', offset, 'ms');
    });
    
    // Initialize system parameters listener
    initParametersListener();
    
    // Data listeners
    setupDataListeners();
    
    // Initial geo center
    setTimeout(() => geoCenter(), 2000);
}

function geoCenter() {
    navigator.geolocation.getCurrentPosition(p => {
        const lat = p.coords.latitude, lng = p.coords.longitude;
        state.map.flyTo([lat, lng], 17);
        if (state.userMarker) state.userMarker.setLatLng([lat, lng]);
        else state.userMarker = L.marker([lat, lng], { icon: L.divIcon({ className:'user-marker-icon', iconSize:[14,14] }), zIndexOffset: 4000 }).addTo(state.map);
    }, null, {enableHighAccuracy:true});
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
            
            grid.innerHTML += `<button class="list-group-item list-group-item-action d-flex align-items-center py-2" onclick="window.startTrack('${key}')"><img src="${comp.favicon}" class="bus-logo-mini"><div><div class="fw-bold small">${c.id} - ${c.nome}</div></div></button>`;
            
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
        const { statusH, drawerH, tU } = renderBusList(gpsData, state.configLinhas);
        
        // Render bus markers on the map
        renderBusMarkers(gpsData, state.configLinhas);
        
        document.getElementById('floating-active-list').innerHTML = drawerH || '<small class="text-muted">Sem frota ativa</small>';
        document.getElementById('status-display').innerHTML = statusH || '<small class="text-muted">Aguardando dados...</small>';
        document.getElementById('stat-users').innerText = tU;
        document.getElementById('global-counter').style.display = tU > 0 ? 'block' : 'none';
        document.getElementById('total-active-text').innerText = `${tU} COLABORADORES ATIVOS`;
    });
}

// Admin functions
function saveLine() {
    const id = document.getElementById('admID').value;
    const key = document.getElementById('admDbKey').value || push(ref(db, 'config/linhas')).key;
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
    
    if (!ttlInput || !radiusInput) return;
    
    const ttl = parseInt(ttlInput.value);
    const radius = parseInt(radiusInput.value);
    
    // Validate inputs
    if (ttl < 10 || ttl > 300) {
        showParamsStatus('TTL deve estar entre 10 e 300 segundos', 'danger');
        return;
    }
    
    if (radius < 1 || radius > 50) {
        showParamsStatus('Raio deve estar entre 1 e 50 km', 'danger');
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
        showParamsStatus('Apenas administradores podem alterar parâmetros', 'danger');
        return;
    }
    
    // Save to Firebase
    try {
        const { updateSystemParameters } = await import('../services/parametersService.js');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>SALVANDO...';
        
        await updateSystemParameters({ ttl, radius });
        
        showParamsStatus('Parâmetros salvos com sucesso!', 'success');
        saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVO';
        
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
    
    // Load from current state
    const currentTTL = Math.floor((state.systemTTL || 45000) / 1000); // Convert ms to seconds
    const currentRadius = state.systemRadius || 5;
    
    ttlInput.value = currentTTL;
    radiusInput.value = currentRadius;
    
    showParamsStatus('Parâmetros atuais carregados', 'info');
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

// Expose functions to window
window.saveSystemParameters = saveSystemParameters;
window.loadCurrentParameters = loadCurrentParameters;
window.forceTTLCleanup = forceTTLCleanup;
window.deleteLine = deleteLine;

// Expose cleanup function from bus renderer
import { cleanupDeletedLineMarkers } from '../modules/buses/busRenderer.js';
window.cleanupDeletedLineMarkers = cleanupDeletedLineMarkers;
