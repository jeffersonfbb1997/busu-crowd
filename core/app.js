import { db, auth, ADMIN_EMAIL } from '../services/firebaseService.js';
import { login, logout, subscribeToAuthChanges } from '../services/authService.js';
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

function handleAuthChange(u) {
    updateState('user', u);
    if(u) {
        document.getElementById('auth-area').innerHTML = `<div class="d-flex align-items-center p-2 bg-light rounded-3 shadow-sm mb-3"><img src="${u.photoURL}" width="34" class="rounded-circle me-2"><div class="flex-grow-1 small fw-bold">${u.displayName.split(' ')[0]}</div><i class="bi bi-box-arrow-right text-muted ms-2 cursor-pointer" onclick="window.fazerLogout()"></i></div>`;
        document.getElementById('action-btn').style.display = 'flex';
        if(u.email.toLowerCase() === ADMIN_EMAIL) document.getElementById('admin-entry').style.display = 'block';
        if(localStorage.getItem('busu_active_line')) iniciarGPS(localStorage.getItem('busu_active_line'));
    } else {
        document.getElementById('auth-area').innerHTML = `<button class="btn btn-primary btn-sm w-100 fw-bold rounded-pill" onclick="window.fazerLogin()"><i class="bi bi-google me-2"></i> LOGIN GOOGLE</button>`;
        document.getElementById('action-btn').style.display = 'none';
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
}
