import { db } from "./firebaseService.js";
import { ref, serverTimestamp, set, onValue, get } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

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
        
        // Firebase Realtime Database doesn't have .info/serverTimeOffset
        // We'll use a simpler approach: write a timestamp and read it back
        // The server will replace serverTimestamp() with actual server time
        
        const tempRef = ref(db, '_timeCheck/' + Date.now());
        
        // Write with server timestamp
        const startTime = Date.now();
        await set(tempRef, {
            clientStart: startTime,
            timestamp: serverTimestamp()
        });
        
        // Immediately read back (Firebase will have replaced serverTimestamp)
        const snapshot = await get(tempRef);
        const data = snapshot.val();
        
        if (data && data.timestamp) {
            // The timestamp field now contains the server time
            const serverTime = data.timestamp;
            const endTime = Date.now();
            
            // Simple offset calculation (server - client)
            // Account for network latency with simple approximation
            const latency = (endTime - startTime) / 2;
            serverTimeOffset = (serverTime + latency) - startTime;
            
            isOffsetCalculated = true;
            console.log('Server time offset calculated:', serverTimeOffset, 'ms');
            
            // Clean up the temporary node
            await remove(tempRef);
            
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
    try {
        await calculateServerTimeOffset();
        
        // Only set up periodic recalculation if the first attempt succeeded
        // Recalculate offset periodically (every 5 minutes)
        setInterval(async () => {
            await calculateServerTimeOffset();
        }, 5 * 60 * 1000);
    } catch (error) {
        console.warn('Time service initialization failed, using client time. Error:', error.message);
        serverTimeOffset = 0;
        isOffsetCalculated = true;
    }
    
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