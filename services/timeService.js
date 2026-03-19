import { db } from "./firebaseService.js";
import { ref, serverTimestamp, onValue, get } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// Server time offset in milliseconds (client time - server time)
let serverTimeOffset = 0;
let isOffsetCalculated = false;

/**
 * Calculate server time offset by comparing client time with Firebase server timestamp
 * @returns {Promise<number>} Server time offset in milliseconds
 */
export async function calculateServerTimeOffset() {
    try {
        console.log('Calculating server time offset...');
        
        // Create a reference to a temporary location
        const tempRef = ref(db, '.info/serverTimeOffset');
        
        // Get server time offset from Firebase
        const snapshot = await get(tempRef);
        const offset = snapshot.val();
        
        if (offset !== null) {
            serverTimeOffset = offset;
            isOffsetCalculated = true;
            console.log('Server time offset calculated:', serverTimeOffset, 'ms');
            return serverTimeOffset;
        } else {
            console.warn('Could not get server time offset, using 0');
            serverTimeOffset = 0;
            isOffsetCalculated = true;
            return 0;
        }
    } catch (error) {
        console.error('Error calculating server time offset:', error);
        serverTimeOffset = 0;
        isOffsetCalculated = true;
        return 0;
    }
}

/**
 * Get current server time (client time adjusted by offset)
 * @returns {number} Current server time in milliseconds
 */
export function getServerTime() {
    if (!isOffsetCalculated) {
        console.warn('Server time offset not calculated yet, using client time');
        return Date.now();
    }
    
    return Date.now() + serverTimeOffset;
}

/**
 * Adjust client timestamp to server time
 * @param {number} clientTimestamp - Client timestamp in milliseconds
 * @returns {number} Adjusted server timestamp
 */
export function adjustToServerTime(clientTimestamp) {
    if (!isOffsetCalculated) {
        return clientTimestamp;
    }
    
    return clientTimestamp + serverTimeOffset;
}

/**
 * Calculate packet delay using server time
 * @param {number} dataTimestamp - Timestamp from data (could be client or server time)
 * @param {boolean} isClientTime - Whether the timestamp is client time (needs adjustment)
 * @returns {number} Packet delay in milliseconds
 */
export function calculatePacketDelay(dataTimestamp, isClientTime = true) {
    const serverTime = getServerTime();
    const adjustedTimestamp = isClientTime ? adjustToServerTime(dataTimestamp) : dataTimestamp;
    
    return serverTime - adjustedTimestamp;
}

/**
 * Initialize time service and calculate offset
 */
export async function initTimeService() {
    await calculateServerTimeOffset();
    
    // Recalculate offset periodically (every 5 minutes)
    setInterval(async () => {
        await calculateServerTimeOffset();
    }, 5 * 60 * 1000);
    
    return serverTimeOffset;
}

/**
 * Get server timestamp for Firebase operations
 * @returns {Object} Firebase serverTimestamp placeholder
 */
export function getServerTimestamp() {
    return serverTimestamp();
}

/**
 * Check if time service is initialized
 * @returns {boolean} True if time service is ready
 */
export function isTimeServiceReady() {
    return isOffsetCalculated;
}

// Export current offset for debugging
export { serverTimeOffset, isOffsetCalculated };