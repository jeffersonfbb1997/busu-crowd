import { db } from "../../services/firebaseService.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../../core/stateManager.js";

export function onMapClickForRoute(e) {
    const { lat, lng } = e.latlng;
    if (!state.routeDraft.lineKey) return alert("Selecione uma linha!");
    if (state.routeMode === 'path') {
        state.routeDraft.path.push([lat, lng]);
        state.draftPolyline.setLatLngs(state.routeDraft.path);
    } else if (state.routeMode === 'stops') {
        state.routeDraft.stops.push({ lat, lng, id: Date.now() });
        L.circleMarker([lat, lng], { radius: 5, color: '#000', fillColor: '#fff', fillOpacity: 1 }).addTo(state.draftMarkers);
    } else if (state.routeMode === 'terminal') {
        state.routeDraft.terminals.push({ lat, lng });
        L.marker([lat, lng], { icon: L.divIcon({ html: '🏁', className: 'fs-5' }) }).addTo(state.draftMarkers);
    }
}

export function selectLineForRoute(key) {
    clearCurrentDraft();
    updateState('routeDraft', { ...state.routeDraft, lineKey: key });
    if (state.configLinhas[key]) state.draftPolyline.setStyle({ color: state.configLinhas[key].cor });
    alert("Linha " + state.configLinhas[key].id);
}

export function saveRouteData() {
    if (!state.routeDraft.lineKey) return alert("Erro");
    set(ref(db, `config/geometria/${state.routeDraft.lineKey}`), state.routeDraft).then(() => alert("Geometria salva!"));
}

export function clearCurrentDraft() {
    updateState('routeDraft', { lineKey: null, path: [], stops: [], terminals: [] });
    if (state.draftPolyline) state.draftPolyline.setLatLngs([]);
    if (state.draftMarkers) state.draftMarkers.clearLayers();
}
