import { state } from "../../core/stateManager.js";
import { calculatePacketDelay, getServerTime } from "../../services/timeService.js";

/**
 * Raw data processing engine for admin monitor
 * Processes bus data from Firebase and extracts detailed information
 */

// Global store for processed data
const processedDataStore = {
    rawSignals: [],
    processedUsers: new Map(),
    lastUpdate: null
};

/**
 * Process raw bus data from Firebase snapshot
 * @param {Object} snapshot - Firebase snapshot of onibus node
 * @returns {Array} Processed data array for admin monitor
 */
export function processRawBusData(snapshot) {
    const rawData = snapshot.val() || {};
    const now = Date.now();
    const processedData = [];
    
    // Reset store for new processing cycle
    processedDataStore.rawSignals = [];
    processedDataStore.processedUsers.clear();
    
    // Process each line
    for (const [lineKey, lineData] of Object.entries(rawData)) {
        if (!lineData || typeof lineData !== 'object') continue;
        
        // Process each user in the line
        for (const [userId, userData] of Object.entries(lineData)) {
            if (!userData || typeof userData !== 'object') continue;
            
            // Calculate packet delay using server time
            const packetDelay = calculatePacketDelay(userData.timestamp || now, true);
            
            // Create processed data object
            const processedUser = {
                userId,
                lineKey,
                lat: userData.lat || 0,
                lng: userData.lng || 0,
                speed: userData.speed || 0,
                accuracy: userData.acc || userData.accuracy || 0,
                heading: userData.heading || null,
                timestamp: userData.timestamp || now,
                packetDelay, // Time difference in milliseconds (server-adjusted)
                isExpired: packetDelay > (state.systemTTL || 45000),
                dataAge: Math.floor(packetDelay / 1000), // Age in seconds
                isAccurate: (userData.acc || userData.accuracy || 0) <= 80 // Accuracy gate
            };
            
            // Store in global store
            processedDataStore.rawSignals.push(processedUser);
            processedDataStore.processedUsers.set(`${lineKey}_${userId}`, processedUser);
            
            // Add to output array
            processedData.push(processedUser);
        }
    }
    
    processedDataStore.lastUpdate = now;
    
    // Sort by packet delay (most delayed first)
    processedData.sort((a, b) => b.packetDelay - a.packetDelay);
    
    return processedData;
}

/**
 * Get statistics about current bus data
 * @returns {Object} Statistics object
 */
export function getBusDataStatistics() {
    const signals = processedDataStore.rawSignals;
    const now = Date.now();
    
    if (signals.length === 0) {
        return {
            totalSignals: 0,
            activeUsers: 0,
            expiredSignals: 0,
            averageDelay: 0,
            maxDelay: 0,
            linesActive: 0
        };
    }
    
    const expiredSignals = signals.filter(s => s.isExpired).length;
    const uniqueLines = new Set(signals.map(s => s.lineKey)).size;
    const uniqueUsers = new Set(signals.map(s => s.userId)).size;
    
    const totalDelay = signals.reduce((sum, s) => sum + s.packetDelay, 0);
    const averageDelay = Math.floor(totalDelay / signals.length);
    const maxDelay = Math.max(...signals.map(s => s.packetDelay));
    
    return {
        totalSignals: signals.length,
        activeUsers: uniqueUsers,
        expiredSignals,
        averageDelay,
        maxDelay,
        linesActive: uniqueLines,
        lastUpdate: processedDataStore.lastUpdate
    };
}

/**
 * Filter data by specific criteria for admin monitor
 * @param {Array} data - Processed data array
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered data
 */
export function filterAdminData(data, filters = {}) {
    let filtered = [...data];
    
    // Filter by expiration status
    if (filters.showOnlyExpired) {
        filtered = filtered.filter(item => item.isExpired);
    }
    
    // Filter by minimum delay
    if (filters.minDelay) {
        filtered = filtered.filter(item => item.packetDelay >= filters.minDelay);
    }
    
    // Filter by line
    if (filters.lineKey) {
        filtered = filtered.filter(item => item.lineKey === filters.lineKey);
    }
    
    // Filter by accuracy threshold
    if (filters.maxAccuracy) {
        filtered = filtered.filter(item => item.accuracy <= filters.maxAccuracy);
    }
    
    return filtered;
}

/**
 * Get data for specific user across all lines
 * @param {string} userId - User ID to search for
 * @returns {Array} User's signals across all lines
 */
export function getUserSignals(userId) {
    return processedDataStore.rawSignals.filter(signal => signal.userId === userId);
}

/**
 * Get all unique lines currently active
 * @returns {Array} Array of line keys
 */
export function getActiveLines() {
    const lines = new Set();
    processedDataStore.rawSignals.forEach(signal => {
        lines.add(signal.lineKey);
    });
    return Array.from(lines);
}

/**
 * Check if data needs refresh based on TTL
 * @returns {boolean} True if data needs refresh
 */
export function needsDataRefresh() {
    if (!processedDataStore.lastUpdate) return true;
    
    const timeSinceLastUpdate = Date.now() - processedDataStore.lastUpdate;
    const refreshThreshold = Math.min(state.systemTTL || 45000, 30000); // Max 30 seconds
    
    return timeSinceLastUpdate > refreshThreshold;
}