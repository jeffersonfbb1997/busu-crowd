/**
 * Migration script: transfer configuration data from Firebase Realtime Database
 * to Cloud Firestore.
 * 
 * This script is designed to be run in a browser environment where the user
 * is authenticated as an admin (jeffersonfbb1997@gmail.com or listed in config/admins).
 * 
 * Usage:
 * 1. Open the browser console on the Buzu admin panel.
 * 2. Import this module and call `runMigration()`.
 * 
 * Alternatively, load a temporary HTML page that includes this script.
 */

import { db, firestore } from '../services/firebaseService.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js';
import { collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';
import { COLLECTIONS, FIELD, GEOHASH_PRECISION } from '../config/firestoreSchema.js';

// Geohash library (loaded from CDN, ensure it's available globally)
// If not available, we can skip geohash calculation for now.
const geohash = window.geohash;

/**
 * Compute geohash for a given latitude and longitude.
 * Falls back to empty string if library not loaded.
 */
function computeGeohash(lat, lng) {
    if (typeof geohash === 'function') {
        return geohash.encode(lat, lng, GEOHASH_PRECISION);
    }
    console.warn('Geohash library not loaded, skipping geohash calculation.');
    return '';
}

/**
 * Migrate lines (config/linhas) to Firestore collection 'lines'.
 */
async function migrateLines() {
    console.log('Migrating lines...');
    const snapshot = await get(ref(db, 'config/linhas'));
    const lines = snapshot.val() || {};
    
    for (const [key, data] of Object.entries(lines)) {
        const lineDoc = doc(firestore, COLLECTIONS.LINES, key);
        await setDoc(lineDoc, {
            [FIELD.LINE_ID]: data.id,
            [FIELD.LINE_NAME]: data.nome,
            [FIELD.LINE_VIA]: data.via || 'Principal',
            [FIELD.LINE_COLOR]: data.cor,
            [FIELD.LINE_COMPANY]: data.company,
            [FIELD.CREATED_AT]: new Date().toISOString(),
            [FIELD.UPDATED_AT]: new Date().toISOString(),
        });
        console.log(`Line ${key} migrated.`);
    }
    console.log(`Lines migration complete: ${Object.keys(lines).length} lines.`);
}

/**
 * Migrate geometry (config/geometria) to Firestore collections 'routes' and 'stops'.
 */
async function migrateGeometry() {
    console.log('Migrating geometry...');
    const snapshot = await get(ref(db, 'config/geometria'));
    const geometries = snapshot.val() || {};
    
    for (const [lineKey, geo] of Object.entries(geometries)) {
        // Create route document
        const routeDoc = doc(firestore, COLLECTIONS.ROUTES, lineKey);
        await setDoc(routeDoc, {
            [FIELD.ROUTE_LINE_ID]: lineKey,
            [FIELD.ROUTE_PATH]: geo.path || [],
            [FIELD.ROUTE_LENGTH]: 0, // can be computed later with Turf.js
            [FIELD.CREATED_AT]: new Date().toISOString(),
            [FIELD.UPDATED_AT]: new Date().toISOString(),
        });
        
        // Migrate stops
        const stops = geo.stops || [];
        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            const stopId = `stop_${lineKey}_${i}`;
            const stopDoc = doc(firestore, COLLECTIONS.STOPS, stopId);
            await setDoc(stopDoc, {
                [FIELD.STOP_ROUTE_ID]: lineKey,
                [FIELD.STOP_LOCATION]: { lat: stop.lat, lng: stop.lng },
                [FIELD.STOP_GEOHASH]: computeGeohash(stop.lat, stop.lng),
                [FIELD.STOP_TYPE]: 'stop',
                [FIELD.STOP_SEQUENCE]: i,
                [FIELD.STOP_IS_ACTIVE]: true,
                [FIELD.CREATED_AT]: new Date().toISOString(),
                [FIELD.UPDATED_AT]: new Date().toISOString(),
            });
        }
        
        // Migrate terminals
        const terminals = geo.terminals || [];
        for (let i = 0; i < terminals.length; i++) {
            const term = terminals[i];
            const termId = `terminal_${lineKey}_${i}`;
            const termDoc = doc(firestore, COLLECTIONS.STOPS, termId);
            await setDoc(termDoc, {
                [FIELD.STOP_ROUTE_ID]: lineKey,
                [FIELD.STOP_LOCATION]: { lat: term.lat, lng: term.lng },
                [FIELD.STOP_GEOHASH]: computeGeohash(term.lat, term.lng),
                [FIELD.STOP_TYPE]: 'terminal',
                [FIELD.STOP_SEQUENCE]: i,
                [FIELD.STOP_IS_ACTIVE]: true,
                [FIELD.CREATED_AT]: new Date().toISOString(),
                [FIELD.UPDATED_AT]: new Date().toISOString(),
            });
        }
        
        console.log(`Geometry for line ${lineKey} migrated.`);
    }
    console.log('Geometry migration complete.');
}

/**
 * Migrate system parameters (config/parametros) to Firestore collection 'parameters'.
 */
async function migrateParameters() {
    console.log('Migrating parameters...');
    const snapshot = await get(ref(db, 'config/parametros'));
    const params = snapshot.val() || {};
    
    for (const [key, value] of Object.entries(params)) {
        const paramDoc = doc(firestore, COLLECTIONS.PARAMETERS, key);
        await setDoc(paramDoc, {
            [FIELD.PARAM_KEY]: key,
            [FIELD.PARAM_VALUE]: value,
            [FIELD.CREATED_AT]: new Date().toISOString(),
        });
    }
    console.log('Parameters migration complete.');
}

/**
 * Migrate companies (config/companies) to Firestore collection 'companies'.
 */
async function migrateCompanies() {
    console.log('Migrating companies...');
    const snapshot = await get(ref(db, 'config/companies'));
    const companies = snapshot.val() || {};
    
    for (const [key, data] of Object.entries(companies)) {
        const companyDoc = doc(firestore, COLLECTIONS.COMPANIES, key);
        await setDoc(companyDoc, {
            [FIELD.COMPANY_ID]: data.id,
            [FIELD.COMPANY_NAME]: data.nome,
            [FIELD.COMPANY_LOGO]: data.logo,
            [FIELD.COMPANY_FAVICON]: data.favicon,
            [FIELD.COMPANY_COLOR]: data.cor,
            [FIELD.CREATED_AT]: new Date().toISOString(),
        });
    }
    console.log('Companies migration complete.');
}

/**
 * Main migration function.
 * Runs all migration steps sequentially.
 */
export async function runMigration() {
    try {
        console.log('Starting migration from Realtime Database to Firestore...');
        await migrateLines();
        await migrateGeometry();
        await migrateParameters();
        await migrateCompanies();
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

/**
 * Utility to check if migration is needed (compare counts).
 */
export async function checkMigrationStatus() {
    // Implement if needed
    console.log('Migration status check not yet implemented.');
}