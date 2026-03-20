import { db } from "./firebaseService.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../core/stateManager.js";

/**
 * Initialize the global parameters listener
 * Listens to Firebase config/parametros and updates systemTTL and systemRadius
 */
export function initParametersListener() {
    const parametersRef = ref(db, 'config/parametros');
    
    onValue(parametersRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data && typeof data === 'object') {
            // Check if required parameters exist
            const hasTTL = data.ttl !== undefined || data.systemTTL !== undefined;
            const hasRadius = data.radius !== undefined || data.systemRadius !== undefined;
            
            if (hasTTL && hasRadius) {
                // Update systemTTL (convert seconds to milliseconds if needed)
                const ttl = data.ttl || data.systemTTL || 45;
                const systemTTL = typeof ttl === 'number' ? ttl * 1000 : 45000;
                
                // Update systemRadius
                const systemRadius = data.radius || data.systemRadius || 5;
                
                console.log('System parameters updated:', { systemTTL, systemRadius });
                
                // Update global state
                updateState('systemTTL', systemTTL);
                updateState('systemRadius', systemRadius);
                
                // Update bottom card label with new radius
                updateBottomCardRadius(systemRadius);
                
                // Trigger cleanup if TTL changed
                if (window.triggerTTLCleanup) {
                    window.triggerTTLCleanup();
                }
            } else {
                // Parameters exist but are incomplete, fix them
                console.log('Parameters incomplete, fixing...');
                fixIncompleteParameters(data);
            }
            
            // Expose cleanup function globally
            window.triggerTTLCleanup = forceTTLCleanup;
        } else {
            // Use default values if no parameters exist
            console.log('No parameters found, using defaults');
            updateState('systemTTL', 45000);
            updateState('systemRadius', 5);
            
            // Auto-initialize default parameters in Firebase
            autoInitializeDefaultParameters();
        }
    }, (error) => {
        console.error('Error listening to parameters:', error);
        // Use default values on error
        updateState('systemTTL', 45000);
        updateState('systemRadius', 5);
    });
}

/**
 * Get current system parameters
 * @returns {Object} Current system parameters
 */
export function getSystemParameters() {
    return {
        systemTTL: state.systemTTL,
        systemRadius: state.systemRadius
    };
}

/**
 * Update system parameters in Firebase (admin only)
 * @param {Object} params - New parameters {ttl, radius}
 * @returns {Promise} Firebase set operation
 */
export async function updateSystemParameters(params) {
    const { set } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js");
    const parametersRef = ref(db, 'config/parametros');
    
    // Validate parameters
    const validatedParams = {
        ttl: Math.max(10, Math.min(300, params.ttl || 45)), // 10-300 seconds
        radius: Math.max(1, Math.min(50, params.radius || 5)) // 1-50 km
    };
    
    return set(parametersRef, validatedParams);
}

/**
 * Fix incomplete parameters by merging with defaults
 * @param {Object} existingData - Existing parameters data
 */
async function fixIncompleteParameters(existingData) {
    try {
        const { set } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js");
        const parametersRef = ref(db, 'config/parametros');
        
        // Merge existing data with defaults
        const fixedParams = {
            ttl: existingData.ttl || existingData.systemTTL || 45,
            radius: existingData.radius || existingData.systemRadius || 5
        };
        
        console.log('Fixing incomplete parameters:', fixedParams);
        await set(parametersRef, fixedParams);
        
        // Update local state
        updateState('systemTTL', fixedParams.ttl * 1000);
        updateState('systemRadius', fixedParams.radius);
        
        console.log('Parameters fixed successfully');
        return true;
    } catch (error) {
        console.error('Error fixing incomplete parameters:', error);
        return false;
    }
}

/**
 * Auto-initialize default parameters in Firebase if they don't exist
 * This ensures the system always has valid parameters
 */
async function autoInitializeDefaultParameters() {
    try {
        const { set } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js");
        const parametersRef = ref(db, 'config/parametros');
        
        const defaultParams = {
            ttl: 45,      // 45 seconds
            radius: 5     // 5 km
        };
        
        console.log('Auto-initializing default parameters:', defaultParams);
        await set(parametersRef, defaultParams);
        
        // Update local state
        updateState('systemTTL', 45000); // 45 seconds in milliseconds
        updateState('systemRadius', 5);
        
        console.log('Default parameters initialized successfully');
        return true;
    } catch (error) {
        console.error('Error auto-initializing default parameters:', error);
        return false;
    }
}

/**
 * Force cleanup of expired markers based on current TTL
 * This function should be called when TTL changes to immediately clean up expired data
 */
export function forceTTLCleanup() {
    console.log('Forcing TTL cleanup with current TTL:', state.systemTTL);
    
    // Trigger marker cleanup by simulating a data update
    if (window.triggerBusDataUpdate) {
        window.triggerBusDataUpdate();
    }
    
    // Also trigger admin monitor update if active
    if (window.updateAdminMonitor) {
        window.updateAdminMonitor();
    }
    
    return true;
}

/**
 * Update the bottom card label with the current radius value
 * @param {number} radius - The radius in kilometers
 */
function updateBottomCardRadius(radius) {
    try {
        const activeLabel = document.querySelector('.active-label');
        if (activeLabel) {
            // Update the label text with the new radius
            activeLabel.textContent = `EM TEMPO REAL • ${radius}KM`;
            console.log('Bottom card radius updated to:', radius, 'KM');
        } else {
            console.debug('Active label element not found yet, will update on next render');
        }
    } catch (error) {
        console.warn('Failed to update bottom card radius:', error.message);
    }
}

// Export for global access if needed
window.updateBottomCardRadius = updateBottomCardRadius;