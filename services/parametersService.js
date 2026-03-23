import { subscribeParameters, saveParameter } from './firestoreService.js';
import { state, updateState } from '../core/stateManager.js';

/**
 * Initialize the global parameters listener
 * Listens to Firestore parameters collection and updates systemTTL and systemRadius
 */
export function initParametersListener() {
    subscribeParameters((params) => {
        // params is an object mapping paramKey -> paramValue
        const ttl = params.ttl;
        const radius = params.radius;
        
        // If no parameters documents exist, auto‑initialize defaults
        if (Object.keys(params).length === 0) {
            console.log('No parameters found, auto‑initializing defaults');
            autoInitializeDefaultParameters();
            return;
        }
        
        const hasTTL = ttl !== undefined;
        const hasRadius = radius !== undefined;
        
        if (hasTTL && hasRadius) {
            // Update systemTTL (convert seconds to milliseconds if needed)
            const systemTTL = typeof ttl === 'number' ? ttl * 1000 : 45000;
            // Update systemRadius
            const systemRadius = typeof radius === 'number' ? radius : 5;
            
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
            fixIncompleteParameters(params);
        }
        
        // Expose cleanup function globally
        window.triggerTTLCleanup = forceTTLCleanup;
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
 * Update system parameters in Firestore (admin only)
 * @param {Object} params - New parameters {ttl, radius}
 * @returns {Promise} Firebase set operation
 */
export async function updateSystemParameters(params) {
    // Validate parameters
    const validatedParams = {
        ttl: Math.max(10, Math.min(300, params.ttl || 45)), // 10-300 seconds
        radius: Math.max(1, Math.min(50, params.radius || 5)) // 1-50 km
    };
    
    // Save each parameter as separate document
    await Promise.all([
        saveParameter('ttl', validatedParams.ttl),
        saveParameter('radius', validatedParams.radius)
    ]);
}

/**
 * Fix incomplete parameters by merging with defaults
 * @param {Object} existingData - Existing parameters data (key->value)
 */
async function fixIncompleteParameters(existingData) {
    try {
        const ttl = existingData.ttl || 45;
        const radius = existingData.radius || 5;
        
        console.log('Fixing incomplete parameters:', { ttl, radius });
        await updateSystemParameters({ ttl, radius });
        
        // Update local state
        updateState('systemTTL', ttl * 1000);
        updateState('systemRadius', radius);
        
        console.log('Parameters fixed successfully');
        return true;
    } catch (error) {
        console.error('Error fixing incomplete parameters:', error);
        return false;
    }
}

/**
 * Auto-initialize default parameters in Firestore if they don't exist
 * This ensures the system always has valid parameters
 */
async function autoInitializeDefaultParameters() {
    try {
        const defaultParams = {
            ttl: 45,      // 45 seconds
            radius: 5     // 5 km
        };
        
        console.log('Auto-initializing default parameters:', defaultParams);
        await updateSystemParameters(defaultParams);
        
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
        // Target specifically the active-label inside the bottom-info-card
        const activeLabel = document.querySelector('#bottom-info-card .active-label');
        if (activeLabel) {
            // Update the label text with the new radius
            activeLabel.textContent = `EM TEMPO REAL • ${radius}KM`;
            console.log('Bottom card radius updated to:', radius, 'KM');
        } else {
            console.debug('Bottom card active label element not found yet, will update on next render');
        }
    } catch (error) {
        console.warn('Failed to update bottom card radius:', error.message);
    }
}

// Export for global access if needed
window.updateBottomCardRadius = updateBottomCardRadius;