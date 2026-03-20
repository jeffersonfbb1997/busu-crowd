import { db } from "../../services/firebaseService.js";
import { ref, set, onDisconnect, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../../core/stateManager.js";
import { getServerTime } from "../../services/timeService.js";
import { updateUserPointer } from "../../services/pointerService.js";

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
        const rawLat = p.coords.latitude;
        const rawLng = p.coords.longitude;

        // Log raw coordinates for debugging
        console.log(`GPS raw coordinates: ${rawLat.toFixed(6)}, ${rawLng.toFixed(6)}`);

        // Filter by accuracy - increased to 200m for desktop compatibility
        // Desktop GPS typically has lower accuracy (100-200m) compared to mobile devices
        if (accuracy > 200) {
            console.log(`GPS accuracy too low: ${accuracy}m > 200m threshold, skipping update`);
            return; // Skip unreliable positions
        }

        // Log accuracy for debugging
        console.log(`GPS accuracy: ${accuracy}m (${accuracy <= 50 ? 'High' : accuracy <= 150 ? 'Medium' : 'Low'}) - ${accuracy <= 200 ? 'ACCEPTED' : 'REJECTED'}`);

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

        // Track user position using the pointer service with accuracy parameter
        // The service handles smoothing and validation (no marker creation)
        console.log(`Calling updateUserPointer with accuracy=${accuracy}m`);
        const updateResult = updateUserPointer(data.lat, data.lng, accuracy);
        console.log(`updateUserPointer returned: ${updateResult ? 'SUCCESS' : 'FAILED'}`);

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
    
    // DO NOT remove user marker when stopping GPS transmission
    // User marker should remain visible unless GPS signal is blocked
    console.log('GPS transmission stopped - user marker remains visible');
    
    localStorage.removeItem('busu_active_line');
    const btn = document.getElementById('action-btn');
    const icon = document.getElementById('action-icon');
    if (btn) btn.classList.remove('active');
    if (icon) icon.className = 'bi bi-broadcast';
}
