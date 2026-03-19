import { state } from "../../core/stateManager.js";

export const createBusMarker = (c, mLt, mLn, map) => {
    return L.marker([mLt, mLn], { 
        icon: L.divIcon({ 
            className: 'custom-pin', 
            html: `<div class="bus-pin" style="background:${c.cor}"><span>${c.id}</span></div>`, 
            iconSize: [42, 42], 
            iconAnchor: [21, 42] 
        }) 
    }).addTo(map).bindPopup(`<b>${c.id}</b>`);
};

export const updateUserMarker = (lat, lng, map) => {
    if (state.userMarker) {
        state.userMarker.setLatLng([lat, lng]);
    } else {
        const marker = L.marker([lat, lng], { 
            icon: L.divIcon({ className: 'user-marker-icon', iconSize: [14, 14] }), 
            zIndexOffset: 4000 
        }).addTo(map);
        return marker;
    }
    return state.userMarker;
};
