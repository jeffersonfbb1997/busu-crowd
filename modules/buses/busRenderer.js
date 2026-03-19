import { COMPANIES } from "../../config/systemConfig.js";

export function renderLineLists(data) {
    const grid = document.getElementById('line-selection-grid');
    const admList = document.getElementById('admin-lines-list-crud');
    const plan = document.getElementById('planning-all-lines');
    
    if (!grid || !admList || !plan) return;

    grid.innerHTML = ''; admList.innerHTML = ''; plan.innerHTML = '';
    let countL = 0;

    for(let key in data) {
        const c = data[key];
        countL++;
        const comp = COMPANIES[c.company || 'atlantico'];
        
        grid.innerHTML += `<button class="list-group-item list-group-item-action d-flex align-items-center py-2" onclick="window.startTrack('${key}')"><img src="${comp.favicon}" class="bus-logo-mini"><div><div class="fw-bold small">${c.id} - ${c.nome}</div></div></button>`;
        
        admList.innerHTML += `
            <div class="list-group-item bus-item border-bottom px-0" onclick="window.loadLineForEdit('${key}')">
                <div class="d-flex align-items-center flex-grow-1">
                    <img src="${comp.favicon}" class="bus-logo-mini">
                    <div><div class="bus-title">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div>
                </div>
                <i class="bi bi-trash text-danger ms-auto px-2 fs-5" onclick="event.stopPropagation(); window.deleteLine('${key}')"></i>
            </div>`;

        plan.innerHTML += `<button class="nav-item-custom border-bottom" onclick="window.flyToMarker('${key}'); window.toggleSidebar();"><img src="${comp.favicon}" class="bus-logo-mini"><div><div class="fw-bold">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div></button>`;
    }
    const statLines = document.getElementById('stat-lines');
    if (statLines) statLines.innerText = countL;
}

export function updateBusUI(drawerH, statusH, tU) {
    const floatingList = document.getElementById('floating-active-list');
    const statusDisplay = document.getElementById('status-display');
    const statUsers = document.getElementById('stat-users');
    const globalCounter = document.getElementById('global-counter');
    const totalActiveText = document.getElementById('total-active-text');

    if (floatingList) floatingList.innerHTML = drawerH || '<small class="text-muted">Sem frota ativa</small>';
    if (statusDisplay) statusDisplay.innerHTML = statusH || '<small class="text-muted">Aguardando dados...</small>';
    if (statUsers) statUsers.innerText = tU;
    if (globalCounter) globalCounter.style.display = tU > 0 ? 'block' : 'none';
    if (totalActiveText) totalActiveText.innerText = `${tU} COLABORADORES ATIVOS`;
}
