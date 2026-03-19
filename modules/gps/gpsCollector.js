import { db } from "../../services/firebaseService.js";
import { ref, set, onDisconnect, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../../core/stateManager.js";
import { getServerTime } from "../../services/timeService.js";

/**
 * Enhanced GPS data collector with refined data structure
 * @param {string} key - Line key for the bus route
 */
export function iniciarGPS(key) {
    if (state.watchID) navigator.geolocation.clearWatch(state.watchID);
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

        // Filter by accuracy (max 80 meters for quality data, but still accept up to 200 for backup)
        // Data with accuracy > 80m will be filtered out in rendering and processing
        if (accuracy > 200) {
            console.log(`GPS accuracy too low: ${accuracy}m, skipping update`);
            return; // Extreme accuracy issues
        }

        if (icon) icon.className = 'bi bi-stop-circle-fill';

        // Enhanced data structure with rounded coordinates and additional fields
        const data = {
            lat: parseFloat(p.coords.latitude.toFixed(6)),      // 6 decimal places for efficiency
            lng: parseFloat(p.coords.longitude.toFixed(6)),     // 6 decimal places for efficiency
            speed: parseFloat(speedKmh.toFixed(1)),            // Speed in km/h
            acc: parseFloat(accuracy.toFixed(0)),              // Accuracy in meters
            heading: p.coords.heading || null,                 // Direction (0-360 degrees)
            timestamp: getServerTime(),                        // Server-adjusted timestamp
            clientTimestamp: Date.now(),                       // Original client timestamp for debugging
            serverTimestamp: serverTimestamp()                 // Firebase server timestamp placeholder
        };

        console.log(`GPS data received: ${data.lat}, ${data.lng}, accuracy: ${data.acc}m`);

        const trackRef = ref(db, `onibus/${key}/${state.user.uid}`);
        set(trackRef, data).then(() => {
            console.log('GPS data written to Firebase successfully');
        }).catch(error => {
            console.error('Error writing GPS data to Firebase:', error);
        });
        onDisconnect(trackRef).remove();

    }, (error) => {
        console.warn("Erro de sensor:", error.message, error.code);
        if (icon) icon.className = 'bi bi-exclamation-triangle-fill text-warning';
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
    
    if (state.currentLineKey && state.user) {
        remove(ref(db, `onibus/${state.currentLineKey}/${state.user.uid}`));
    }
    
    localStorage.removeItem('busu_active_line');
    const btn = document.getElementById('action-btn');
    const icon = document.getElementById('action-icon');
    if (btn) btn.classList.remove('active');
    if (icon) icon.className = 'bi bi-broadcast';
}
