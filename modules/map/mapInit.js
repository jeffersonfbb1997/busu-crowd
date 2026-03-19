import { state, updateState } from "../../core/stateManager.js";

export const initMap = () => {
    const map = L.map('map', { zoomControl: false }).setView([-14.7981, -39.0347], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    return map;
};

export const geoCenter = (map) => {
    navigator.geolocation.getCurrentPosition(p => {
        const lat = p.coords.latitude, lng = p.coords.longitude;
        map.flyTo([lat, lng], 17);
        if (state.userMarker) {
            state.userMarker.setLatLng([lat, lng]);
        } else {
            const userMarker = L.marker([lat, lng], { 
                icon: L.divIcon({ className:'user-marker-icon', iconSize:[14,14] }), 
                zIndexOffset: 4000 
            }).addTo(map);
            updateState('userMarker', userMarker);
        }
    }, null, {enableHighAccuracy:true});
};
