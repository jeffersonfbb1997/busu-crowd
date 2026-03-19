import { state, updateState } from "./stateManager.js";
import { watchAuthState, fazerLogin, fazerLogout } from "../services/authService.js";
import { initMap, geoCenter } from "../modules/map/mapInit.js";
import { iniciarGPS, stopTrack } from "../modules/gps/gpsCollector.js";
import { initBusListeners } from "../modules/buses/busManager.js";
import { toggleSidebar, switchView, toggleDrawer, toggleBottomCard } from "../ui/panels/sidebar.js";
import { saveLine, deleteLine, loadLineForEdit, selectCompany, randomizeColor, clearAdminForm } from "../admin/dashboard/systemStats.js";

// Global map instance
const map = initMap();
window.map = map;

// Auth State handling
watchAuthState((user, isAdmin) => {
    updateState('user', user);
    updateState('isAdmin', isAdmin);
    
    const authArea = document.getElementById('auth-area');
    const actionBtn = document.getElementById('action-btn');
    const adminEntry = document.getElementById('admin-entry');

    if(user) {
        authArea.innerHTML = `<div class="d-flex align-items-center p-2 bg-light rounded-3 shadow-sm mb-3"><img src="${user.photoURL}" width="34" class="rounded-circle me-2"><div class="flex-grow-1 small fw-bold">${user.displayName.split(' ')[0]}</div><i class="bi bi-box-arrow-right text-muted ms-2 cursor-pointer" onclick="window.fazerLogout()"></i></div>`;
        actionBtn.style.display = 'flex';
        if(isAdmin) adminEntry.style.display = 'block';
        
        const storedLine = localStorage.getItem('busu_active_line');
        if(storedLine) iniciarGPS(storedLine);
    } else {
        authArea.innerHTML = `<button class="btn btn-primary btn-sm w-100 fw-bold rounded-pill" onclick="window.fazerLogin()"><i class="bi bi-google me-2"></i> LOGIN GOOGLE</button>`;
        actionBtn.style.display = 'none';
        adminEntry.style.display = 'none';
    }
});

// Initialize Data Listeners
initBusListeners(map);

// Expose functions to window
window.toggleSidebar = toggleSidebar;
window.switchView = switchView;
window.toggleDrawer = toggleDrawer;
window.toggleBottomCard = toggleBottomCard;
window.geoCenter = () => geoCenter(map);
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.startTrack = (key) => {
    if (document.activeElement) document.activeElement.blur();
    localStorage.setItem('busu_active_line', key);
    const modalEl = document.getElementById('modalLine');
    const modalInst = bootstrap.Modal.getInstance(modalEl);
    if (modalInst) modalInst.hide();
    iniciarGPS(key);
};
window.stopTrack = stopTrack;
window.onActionClick = () => state.watchID ? stopTrack() : new bootstrap.Modal(document.getElementById('modalLine')).show();
window.saveLine = saveLine;
window.deleteLine = deleteLine;
window.loadLineForEdit = loadLineForEdit;
window.selectCompany = selectCompany;
window.randomizeColor = randomizeColor;
window.clearAdminForm = clearAdminForm;
window.flyToMarker = (key) => {
    if(state.markers[key]) map.flyTo(state.markers[key].getLatLng(), 17);
};

// Initial position
window.onload = () => setTimeout(() => geoCenter(map), 2000);
