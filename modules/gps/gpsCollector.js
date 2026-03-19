import { db } from "../../services/firebaseService.js";
import { ref, set, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../../core/stateManager.js";

export function iniciarGPS(key) {
    if(state.watchID) navigator.geolocation.clearWatch(state.watchID);
    updateState('currentLineKey', key);

    const btn = document.getElementById('action-btn');
    const icon = document.getElementById('action-icon');
    if (btn) {
        btn.classList.add('active');
        icon.className = 'bi bi-arrow-repeat rotate-animation';
    }

    const watchID = navigator.geolocation.watchPosition(p => {
        const speedKmh = (p.coords.speed || 0) * 3.6;
        const accuracy = p.coords.accuracy || 0;

        if (accuracy > 200) return; 

        icon.className = 'bi bi-stop-circle-fill';

        const data = { 
            lat: p.coords.latitude, 
            lng: p.coords.longitude, 
            timestamp: Date.now(), 
            speed: speedKmh.toFixed(1),
            accuracy: accuracy.toFixed(0)
        };

        const trackRef = ref(db, `onibus/${key}/${state.user.uid}`);
        set(trackRef, data);
        onDisconnect(trackRef).remove();

    }, (error) => {
        console.warn("Erro de sensor:", error.message);
        icon.className = 'bi bi-exclamation-triangle-fill text-warning';
    }, {
        enableHighAccuracy: true,
        maximumAge: 0, 
        timeout: 10000 
    });
    
    updateState('watchID', watchID);
}

export function stopTrack() {
    if (state.watchID) {
        navigator.geolocation.clearWatch(state.watchID);
        updateState('watchID', null);
    }
    if(state.currentLineKey && state.user) {
        remove(ref(db, `onibus/${state.currentLineKey}/${state.user.uid}`));
    }
    localStorage.removeItem('busu_active_line');
    const btn = document.getElementById('action-btn');
    const icon = document.getElementById('action-icon');
    if (btn) btn.classList.remove('active');
    if (icon) icon.className = 'bi bi-broadcast';
}
