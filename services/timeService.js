import { db } from "./firebaseService.js";
import { ref, serverTimestamp, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// Server time offset in milliseconds (client time - server time)
let serverTimeOffset = 0;
let isOffsetAvailable = false;
let isListening = false;

/**
 * Initialize time service using Firebase's native .info/serverTimeOffset
 * This approach doesn't require any write permissions, only read access to .info
 */
export function initTimeService() {
    if (isListening) {
        console.debug('Time service already initialized');
        return serverTimeOffset;
    }
    
    console.log('Initializing time service using Firebase .info/serverTimeOffset');
    
    try {
        // Firebase Realtime Database provides .info/serverTimeOffset natively
        // This is a special location that returns the server's time offset
        const serverTimeOffsetRef = ref(db, ".info/serverTimeOffset");
        
        // Listen for changes to the server time offset
        onValue(serverTimeOffsetRef, (snapshot) => {
            const offset = snapshot.val();
            if (offset !== null) {
                serverTimeOffset = offset;
                isOffsetAvailable = true;
                console.debug('Server time offset updated:', serverTimeOffset, 'ms');
            } else {
                console.debug('Server time offset not available, using client time');
                isOffsetAvailable = false;
                serverTimeOffset = 0;
            }
        }, (error) => {
            console.warn('Error listening to server time offset:', error.message);
            console.warn('Falling back to client time');
            isOffsetAvailable = false;
            serverTimeOffset = 0;
        });
        
        isListening = true;
        
        // Mark as available immediately (will be updated when Firebase responds)
        // This prevents blocking while waiting for Firebase response
        setTimeout(() => {
            if (!isOffsetAvailable) {
                console.debug('Server time offset not received yet, continuing with client time');
            }
        }, 1000);
        
    } catch (error) {
        console.warn('Failed to initialize time service:', error.message);
        console.warn('Application will use client time');
        isOffsetAvailable = false;
        serverTimeOffset = 0;
    }
    
    return serverTimeOffset;
}

/**
 * Get current server time (client time adjusted by offset)
 * @returns {number} Current server time in milliseconds
 */
export function getServerTime() {
    if (!isOffsetAvailable) {
        // Fallback to client time if server offset is not available
        return Date.now();
    }
    
    return Date.now() + serverTimeOffset;
}

/**
 * Get server timestamp for Firebase operations
 * @returns {Object} Firebase serverTimestamp placeholder
 */
export function getServerTimestamp() {
    return serverTimestamp();
}

/**
 * Adjust client timestamp to server time
 * @param {number} clientTimestamp - Client timestamp in milliseconds
 * @returns {number} Adjusted server timestamp
 */
export function adjustToServerTime(clientTimestamp) {
    if (!isOffsetAvailable) {
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
 * Check if time service is initialized and server time is available
 * @returns {boolean} True if server time offset is available
 */
export function isTimeServiceReady() {
    return isOffsetAvailable;
}

/**
 * Get current server time offset (for debugging/monitoring)
 * @returns {number} Current server time offset in milliseconds
 */
export function getServerTimeOffset() {
    return serverTimeOffset;
}

// Legacy function for backward compatibility (no longer does calculation)
export async function calculateServerTimeOffset() {
    console.debug('calculateServerTimeOffset() is deprecated - using Firebase .info/serverTimeOffset');
    return serverTimeOffset;
}