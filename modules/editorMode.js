/**
 * Editor Mode Manager
 * 
 * Provides functions to activate/deactivate the map editor interface,
 * which replaces the user sidebar with a dedicated tool sidebar and
 * shows editor‑only map controls (zoom, scale, fullscreen, legend).
 */

import { state } from '../core/stateManager.js';
import { subscribeLines } from '../services/firestoreService.js';
import { COMPANIES } from '../config/systemConfig.js';

let editorSidebar = null;
let isEditorMode = false;
let unsubscribeLines = null;
let editorToolbar = null;

/**
 * Create the editor sidebar if it doesn't exist, otherwise show it.
 * The sidebar is positioned absolutely on the left side of the screen.
 */
function ensureEditorSidebar() {
    if (editorSidebar && document.contains(editorSidebar)) {
        editorSidebar.style.display = 'block';
        return editorSidebar;
    }

    // Create the sidebar container
    editorSidebar = document.createElement('div');
    editorSidebar.id = 'editor-sidebar';
    editorSidebar.className = 'editor-sidebar';
    editorSidebar.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 300px;
        background: #1e1e2f;
        z-index: 1000;
        overflow-y: auto;
        padding: 1rem;
        box-shadow: 2px 0 10px rgba(0,0,0,0.3);
        color: #f0f0f0;
        font-family: 'Inter', sans-serif;
    `;

    // Header with title and close button
    editorSidebar.innerHTML = `
        <div class="editor-header" style="margin-bottom: 1.5rem; border-bottom: 1px solid #444; padding-bottom: 1rem;">
            <h2 style="font-size: 1.5rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                <i class="bi bi-pencil-square"></i>
                Editor de Mapas
            </h2>
            <p style="font-size: 0.875rem; color: #aaa; margin-top: 0.5rem;">
                Ferramentas para criar e editar linhas, paradas, terminais e rotas.
            </p>
        </div>

        <!-- Tabs navigation (Bootstrap‑like) -->
        <ul class="nav nav-tabs editor-tabs" id="editor-tabs" role="tablist" style="border-bottom: 1px solid #444; margin-bottom: 1rem;">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="tab-lines" data-bs-toggle="tab" data-bs-target="#panel-lines" type="button" role="tab" aria-controls="panel-lines" aria-selected="true">
                    <i class="bi bi-bus-front me-1"></i> Linhas
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="tab-stops" data-bs-toggle="tab" data-bs-target="#panel-stops" type="button" role="tab" aria-controls="panel-stops" aria-selected="false">
                    <i class="bi bi-geo-alt me-1"></i> Paradas
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="tab-terminals" data-bs-toggle="tab" data-bs-target="#panel-terminals" type="button" role="tab" aria-controls="panel-terminals" aria-selected="false">
                    <i class="bi bi-flag me-1"></i> Terminais
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="tab-geometry" data-bs-toggle="tab" data-bs-target="#panel-geometry" type="button" role="tab" aria-controls="panel-geometry" aria-selected="false">
                    <i class="bi bi-node-plus me-1"></i> Geometria/Rotas
                </button>
            </li>
        </ul>

        <!-- Tab content -->
        <div class="tab-content" id="editor-tab-content" style="padding-top: 0.5rem;">
            <div class="tab-pane fade show active" id="panel-lines" role="tabpanel" aria-labelledby="tab-lines">
                <div class="d-grid gap-2 mb-3">
                    <button class="btn btn-primary btn-sm" onclick="window.openLineModal ? window.openLineModal() : console.warn('openLineModal not available');">
                        <i class="bi bi-plus-circle me-1"></i> Nova Linha
                    </button>
                </div>
                <div id="editor-lines-list">
                    <!-- List of lines will be loaded here -->
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-bus-front display-6 opacity-25 mb-2"></i>
                        <p class="small">Carregando linhas...</p>
                    </div>
                </div>
            </div>
            <div class="tab-pane fade" id="panel-stops" role="tabpanel" aria-labelledby="tab-stops">
                <div class="d-grid gap-2 mb-3">
                    <button class="btn btn-primary btn-sm" onclick="alert('Funcionalidade de paradas em breve.');">
                        <i class="bi bi-plus-circle me-1"></i> Nova Parada
                    </button>
                </div>
                <p class="small text-muted">Em breve: editor de paradas com clique no mapa.</p>
            </div>
            <div class="tab-pane fade" id="panel-terminals" role="tabpanel" aria-labelledby="tab-terminals">
                <div class="d-grid gap-2 mb-3">
                    <button class="btn btn-primary btn-sm" onclick="alert('Funcionalidade de terminais em breve.');">
                        <i class="bi bi-plus-circle me-1"></i> Novo Terminal
                    </button>
                </div>
                <p class="small text-muted">Em breve: editor de terminais.</p>
            </div>
            <div class="tab-pane fade" id="panel-geometry" role="tabpanel" aria-labelledby="tab-geometry">
                <div class="d-grid gap-2 mb-3">
                    <button class="btn btn-primary btn-sm" onclick="window.openRouteManager ? window.openRouteManager() : alert('Editor de rotas não disponível.');">
                        <i class="bi bi-pencil me-1"></i> Abrir Editor de Rotas
                    </button>
                </div>
                <p class="small text-muted">Use o editor de rotas para desenhar trajetos, adicionar paradas e terminais.</p>
            </div>
        </div>

        <!-- Footer with exit button -->
        <div class="editor-footer" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #444;">
            <button id="exit-editor-btn" class="btn btn-danger w-100" onclick="window.deactivateEditorMode(true)">
                <i class="bi bi-x-circle me-1"></i> Sair do Editor
            </button>
            <p class="small text-muted mt-2 text-center">
                Ao sair, a interface normal será restaurada.
            </p>
        </div>
    `;

    document.body.appendChild(editorSidebar);

    // Initialize Bootstrap tabs (if Bootstrap is loaded)
    if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
        const triggerTabList = editorSidebar.querySelectorAll('[data-bs-toggle="tab"]');
        triggerTabList.forEach(triggerEl => new bootstrap.Tab(triggerEl));
    }

    return editorSidebar;
}

/**
 * Create the editor toolbar if it doesn't exist, otherwise show it.
 * The toolbar is positioned absolutely at the top left of the screen.
 */
function ensureEditorToolbar() {
    if (editorToolbar && document.contains(editorToolbar)) {
        editorToolbar.style.display = 'flex';
        return editorToolbar;
    }

    // Create the toolbar container
    editorToolbar = document.createElement('div');
    editorToolbar.id = 'editor-toolbar';
    editorToolbar.className = 'editor-toolbar vertical';
    editorToolbar.style.cssText = `
        position: absolute;
        top: 149px;
        left: 5px;
        z-index: 10000;
        display: flex;
        gap: 8px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(0, 0, 0, 0.1);
    `;

    // Buttons for editor functions
    editorToolbar.innerHTML = `
        <button class="editor-toolbar-btn" title="Linhas" onclick="window.openLineModal ? window.openLineModal() : console.warn('openLineModal not available');">
            <i class="bi bi-bus-front"></i>
        </button>
        <button class="editor-toolbar-btn" title="Paradas" onclick="alert('Funcionalidade de paradas em breve.');">
            <i class="bi bi-geo-alt"></i>
        </button>
        <button class="editor-toolbar-btn" title="Terminais" onclick="alert('Funcionalidade de terminais em breve.');">
            <i class="bi bi-flag"></i>
        </button>
        <button class="editor-toolbar-btn" title="Rotas" onclick="window.openRouteManager ? window.openRouteManager() : alert('Editor de rotas não disponível.');">
            <i class="bi bi-node-plus"></i>
        </button>
        <button class="editor-toolbar-btn" title="Seleção" onclick="alert('Modo seleção em breve.');">
            <i class="bi bi-cursor"></i>
        </button>
        <button class="editor-toolbar-btn" title="Girar toolbar" onclick="this.parentElement.classList.toggle('vertical')">
            <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="editor-toolbar-btn" title="Sair do Editor" onclick="window.deactivateEditorMode(true);">
            <i class="bi bi-x-lg"></i>
        </button>
    `;

    document.getElementById('map').appendChild(editorToolbar);
    makeDraggable(editorToolbar);
    return editorToolbar;
}

/**
 * Make an element draggable via mouse events.
 * @param {HTMLElement} el
 */
function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    el.addEventListener('mousedown', (e) => {
        // Ignore if target is a button
        if (e.target.classList.contains('editor-toolbar-btn')) {
            return;
        }
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const style = window.getComputedStyle(el);
        initialLeft = parseInt(style.left) || 0;
        initialTop = parseInt(style.top) || 0;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        // Keep toolbar within viewport bounds
        const maxLeft = window.innerWidth - el.offsetWidth;
        const maxTop = window.innerHeight - el.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

/**
 * Load lines into the editor sidebar list.
 * Subscribes to Firestore lines collection and populates #editor-lines-list.
 */
function loadLinesForEditor() {
    if (unsubscribeLines) unsubscribeLines(); // Clean up previous subscription
    unsubscribeLines = subscribeLines((lines) => {
        const container = document.getElementById('editor-lines-list');
        if (!container) return;
        container.innerHTML = '';
        let count = 0;
        for (const key in lines) {
            const line = lines[key];
            const c = {
                id: line.lineId,
                nome: line.name,
                via: line.via,
                cor: line.color,
                company: line.company
            };
            const comp = COMPANIES[c.company || 'atlantico'];
            container.innerHTML += `
                <div class="list-group-item bus-item border-bottom px-0" onclick="window.loadLineForEdit('${key}')">
                    <div class="d-flex align-items-center flex-grow-1">
                        <img src="${comp.favicon}" class="bus-logo-mini">
                        <div><div class="bus-title">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div>
                    </div>
                    <i class="bi bi-trash text-danger ms-auto px-2 fs-5" onclick="event.stopPropagation(); window.deleteLineFirestore('${key}')"></i>
                </div>`;
            count++;
        }
        if (count === 0) {
            container.innerHTML = '<div class="text-center py-4 text-muted"><i class="bi bi-bus-front display-6 opacity-25 mb-2"></i><p class="small">Nenhuma linha cadastrada</p></div>';
        }
    });
}

/**
 * Show editor‑only map controls (zoom, scale, fullscreen, legend, layer switcher).
 * Assumes window.mapControls is available.
 */
function showEditorControls() {
    if (window.mapControls) {
        // Show controls that are hidden by default
        if (window.mapControls.showZoomControl) window.mapControls.showZoomControl();
        if (window.mapControls.showScaleControl) window.mapControls.showScaleControl();
        if (window.mapControls.showFullscreenControl) window.mapControls.showFullscreenControl();
        if (window.mapControls.showLegend) window.mapControls.showLegend();
        if (window.mapControls.showLayerSwitcher) window.mapControls.showLayerSwitcher();
    }
}

/**
 * Hide editor‑only map controls (return to common‑user view).
 */
function hideEditorControls() {
    if (window.mapControls) {
        if (window.mapControls.hideZoomControl) window.mapControls.hideZoomControl();
        if (window.mapControls.hideScaleControl) window.mapControls.hideScaleControl();
        if (window.mapControls.hideFullscreenControl) window.mapControls.hideFullscreenControl();
        if (window.mapControls.hideLegend) window.mapControls.hideLegend();
        if (window.mapControls.hideLayerSwitcher) window.mapControls.hideLayerSwitcher();
    }
}

function addEditorModeStyles() {
    const styleId = 'editor-mode-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        #map:not(.editor-mode) .leaflet-control-zoom,
        #map:not(.editor-mode) .leaflet-control-scale,
        #map:not(.editor-mode) .leaflet-control-fullscreen,
        #map:not(.editor-mode) .leaflet-control-legend,
        #map:not(.editor-mode) .leaflet-control-layers {
            display: none !important;
        }

        body.editor-mode-active .side-btns,
        body.editor-mode-active .bottom-ui,
        body.editor-mode-active .menu-trigger,
        body.editor-mode-active #lines-drawer {
            display: none !important;
        }

        /* Hide toolbar when editor mode inactive */
        body:not(.editor-mode-active) .editor-toolbar {
            display: none !important;
        }

        /* Editor toolbar */
        .editor-toolbar {
            transition: opacity 0.3s ease;
            cursor: move;
            user-select: none;
        }

        .editor-toolbar.vertical {
            flex-direction: column;
        }

        /* Move layers toggle to bottom left in editor mode */
        .editor-mode .leaflet-control-layers {
            top: auto !important;
            right: auto !important;
            bottom: 0 !important;
            left: 0 !important;
        }

        /* Move scale to bottom center in editor mode */
        .editor-mode .leaflet-control-scale {
            bottom: 0 !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            right: auto !important;
            top: auto !important;
        }

        .editor-toolbar-btn {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #5f6368;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .editor-toolbar-btn:hover {
            background: rgba(255, 255, 255, 1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            color: #1a73e8;
        }

        .editor-toolbar-btn:active {
            transform: translateY(0);
            transition: all 0.1s ease;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Activate the map editor mode.
 * - Hides the user sidebar.
 * - Shows the editor sidebar.
 * - Displays editor‑only map controls.
 * - Sets the global flag window.isEditorMode.
 */
export function activateEditorMode() {
    if (isEditorMode) return;
    console.log('Activating editor mode');

    // Hide user sidebar
    const userSidebar = document.getElementById('sidebar');
    if (userSidebar) {
        userSidebar.style.display = 'none';
    }

    // Ensure map is visible (in case it was hidden by admin panel)
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.style.display = 'block';
        mapContainer.style.opacity = '1';
    }

    // Editor sidebar is hidden (user requested removal)
    if (editorSidebar && editorSidebar.parentNode) {
        editorSidebar.style.display = 'none';
    }
    ensureEditorToolbar();

    // Add CSS styles for editor‑only controls (if not already added)
    addEditorModeStyles();

    // Add editor‑mode class to map container (CSS will show controls)
    if (mapContainer) {
        mapContainer.classList.add('editor-mode');
    }

    // Add class to body to hide UI elements
    document.body.classList.add('editor-mode-active');

    // Show editor controls
    showEditorControls();

    // Set global flag
    isEditorMode = true;
    window.isEditorMode = true;

    // Load lines list into the editor sidebar
    loadLinesForEditor();

    console.log('Editor mode activated');
}

/**
 * Deactivate the map editor mode.
 * - Removes/hides the editor sidebar.
 * - Shows the user sidebar.
 * - Hides editor‑only map controls.
 * - Clears the global flag.
 */
export function deactivateEditorMode(returnToAdmin = false) {
    if (!isEditorMode) return;
    console.log('Deactivating editor mode');

    // Hide editor sidebar
    if (editorSidebar) {
        editorSidebar.style.display = 'none';
    }

    // Hide editor toolbar
    if (editorToolbar) {
        editorToolbar.style.display = 'none';
    }

    // Show user sidebar only if not returning to admin panel
    if (!returnToAdmin) {
        const userSidebar = document.getElementById('sidebar');
        if (userSidebar) {
            userSidebar.style.display = '';
        }
    }

    // Hide editor controls
    hideEditorControls();

    // Remove editor‑mode class from map container (CSS will hide controls)
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.classList.remove('editor-mode');
    }

    // Remove class from body to restore UI elements
    document.body.classList.remove('editor-mode-active');

    // Unsubscribe from lines updates
    if (unsubscribeLines) {
        unsubscribeLines();
        unsubscribeLines = null;
    }

    // Reset flag
    isEditorMode = false;
    window.isEditorMode = false;

    // If returning to admin panel, open it
    console.log('Returning to admin panel?', returnToAdmin, typeof window.openAdminPanel);
    if (returnToAdmin && typeof window.openAdminPanel === 'function') {
        window.openAdminPanel();
    }

    console.log('Editor mode deactivated');
}

/**
 * Toggle editor mode on/off.
 */
export function toggleEditorMode() {
    if (isEditorMode) {
        deactivateEditorMode();
    } else {
        activateEditorMode();
    }
}

// Expose functions globally for backward compatibility
if (typeof window !== 'undefined') {
    window.activateEditorMode = activateEditorMode;
    window.deactivateEditorMode = deactivateEditorMode;
    window.toggleEditorMode = toggleEditorMode;
    window.loadLinesForEditor = loadLinesForEditor;
}