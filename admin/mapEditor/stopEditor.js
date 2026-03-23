/**
 * Stop Editor Module
 * 
 * Provides functions to manage stops (paradas) and terminals in Firestore.
 * Integrates with Leaflet map for visual editing.
 */

import { firestore } from "../../services/firebaseService.js";
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { COLLECTIONS, FIELD } from "../../config/firestoreSchema.js";
import { LAYER, ensureLayerGroup } from "../../modules/map/mapLayers.js";

let currentMap = null;
let stopMarkers = null;

/**
 * Initialize the stop editor with a Leaflet map instance.
 * @param {L.Map} map
 */
export function initStopEditor(map) {
    currentMap = map;
    stopMarkers = ensureLayerGroup(LAYER.STOP);
    // Layer group already added to map by ensureLayerGroup
}

/**
 * Load stops for a given route and display them on the map.
 * @param {string} routeId - Firestore document ID of the route
 */
export async function loadStopsForRoute(routeId) {
    if (!currentMap) {
        console.error('Stop editor not initialized with map.');
        return;
    }
    
    clearStopMarkers();
    
    try {
        const stopsRef = collection(firestore, COLLECTIONS.STOPS);
        const q = query(stopsRef, where(FIELD.STOP_ROUTE_ID, '==', routeId));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const latLng = [data[FIELD.STOP_LOCATION].lat, data[FIELD.STOP_LOCATION].lng];
            const type = data[FIELD.STOP_TYPE];
            const name = data[FIELD.STOP_NAME] || (type === 'terminal' ? 'Terminal' : 'Parada');
            
            const marker = L.marker(latLng, {
                icon: type === 'terminal' 
                    ? L.divIcon({ html: '🏁', className: 'fs-5' })
                    : L.divIcon({ html: '●', className: 'fs-6', iconSize: [10, 10] })
            }).bindPopup(`
                <strong>${name}</strong><br/>
                ${type === 'terminal' ? 'Terminal' : 'Parada'} ${data[FIELD.STOP_SEQUENCE] || ''}<br/>
                <button class="btn btn-sm btn-danger mt-1" onclick="window.deleteStop('${docSnap.id}')">Remover</button>
            `);
            
            marker.stopId = docSnap.id;
            stopMarkers.addLayer(marker);
        });
        
        console.log(`Loaded ${snapshot.size} stops for route ${routeId}`);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                lat: data[FIELD.STOP_LOCATION].lat,
                lng: data[FIELD.STOP_LOCATION].lng,
                type: data[FIELD.STOP_TYPE],
                name: data[FIELD.STOP_NAME] || '',
                description: data[FIELD.STOP_DESCRIPTION] || '',
                sequence: data[FIELD.STOP_SEQUENCE] || 0,
                isActive: data[FIELD.STOP_IS_ACTIVE] || true
            };
        });
    } catch (error) {
        console.error('Error loading stops:', error);
        return [];
    }
}

/**
 * Add a new stop (or terminal) to Firestore and map.
 * @param {number} lat
 * @param {number} lng
 * @param {string} routeId
 * @param {object} options - { type, name, description, sequence }
 */
export async function addStop(lat, lng, routeId, options = {}) {
    const {
        type = 'stop',
        name = '',
        description = '',
        sequence = 0,
    } = options;
    
    // Compute geohash
    const geohash = computeGeohash(lat, lng);
    
    // Generate a unique ID
    const stopId = `stop_${routeId}_${Date.now()}`;
    
    try {
        const stopDoc = doc(firestore, COLLECTIONS.STOPS, stopId);
        await setDoc(stopDoc, {
            [FIELD.STOP_ROUTE_ID]: routeId,
            [FIELD.STOP_LOCATION]: { lat, lng },
            [FIELD.STOP_GEOHASH]: geohash,
            [FIELD.STOP_TYPE]: type,
            [FIELD.STOP_NAME]: name,
            [FIELD.STOP_DESCRIPTION]: description,
            [FIELD.STOP_SEQUENCE]: sequence,
            [FIELD.STOP_IS_ACTIVE]: true,
            [FIELD.CREATED_AT]: new Date().toISOString(),
            [FIELD.UPDATED_AT]: new Date().toISOString(),
        });
        
        // Add marker to map if editor is initialized
        if (currentMap) {
            const marker = L.marker([lat, lng], {
                icon: type === 'terminal' 
                    ? L.divIcon({ html: '🏁', className: 'fs-5' })
                    : L.divIcon({ html: '●', className: 'fs-6', iconSize: [10, 10] })
            }).bindPopup(`
                <strong>${name || type}</strong><br/>
                <button class="btn btn-sm btn-danger mt-1" onclick="window.deleteStop('${stopId}')">Remover</button>
            `);
            marker.stopId = stopId;
            stopMarkers.addLayer(marker);
        }
        
        console.log(`Stop ${stopId} added.`);
        return stopId;
    } catch (error) {
        console.error('Error adding stop:', error);
        throw error;
    }
}

/**
 * Delete a stop from Firestore and map.
 * @param {string} stopId
 */
export async function deleteStop(stopId) {
    try {
        await deleteDoc(doc(firestore, COLLECTIONS.STOPS, stopId));
        
        // Remove marker from map
        stopMarkers.eachLayer(layer => {
            if (layer.stopId === stopId) {
                stopMarkers.removeLayer(layer);
            }
        });
        
        console.log(`Stop ${stopId} deleted.`);
    } catch (error) {
        console.error('Error deleting stop:', error);
        throw error;
    }
}

/**
 * Clear all stop markers from the map.
 */
export function clearStopMarkers() {
    stopMarkers.clearLayers();
}

/**
 * Compute geohash using external library if available.
 */
function computeGeohash(lat, lng) {
    if (typeof window.geohash === 'function') {
        return window.geohash.encode(lat, lng, 9);
    }
    console.warn('Geohash library not loaded.');
    return '';
}

// Make functions available globally for inline event handlers (optional)
window.deleteStop = deleteStop;