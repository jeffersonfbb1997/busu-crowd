/**
 * Firestore Service – abstraction for configuration data (lines, parameters, companies)
 * Replaces Realtime Database reads/writes for master data.
 */

import { firestore } from './firebaseService.js';
import { 
    collection, 
    doc, 
    onSnapshot, 
    setDoc, 
    deleteDoc, 
    query, 
    where,
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { COLLECTIONS, FIELD } from '../config/firestoreSchema.js';

// ==================== Lines ====================

/**
 * Subscribe to lines collection changes.
 * @param {function} callback - receives object mapping lineKey -> lineData
 */
export function subscribeLines(callback) {
    const linesRef = collection(firestore, COLLECTIONS.LINES);
    return onSnapshot(linesRef, (snapshot) => {
        const lines = {};
        snapshot.forEach(docSnap => {
            lines[docSnap.id] = docSnap.data();
        });
        callback(lines);
    });
}

/**
 * Save a line document (create or update).
 * @param {string} lineKey - document ID (usually same as line.id)
 * @param {object} data - line fields (id, nome, via, cor, company) plus any additional fields
 */
export async function saveLine(lineKey, data) {
    const lineDoc = doc(firestore, COLLECTIONS.LINES, lineKey);
    
    // Save with Portuguese field names to match Realtime Database
    // Also save with English field names for compatibility
    const docData = {
        // Portuguese field names (for Realtime Database compatibility)
        id: data.id,
        nome: data.nome,
        via: data.via || 'Principal',
        cor: data.cor,
        empresa: data.company,
        atualizadoEm: new Date().toISOString(),
        
        // English field names (for Firestore schema compatibility)
        [FIELD.LINE_ID]: data.id,
        [FIELD.LINE_NAME]: data.nome,
        [FIELD.LINE_VIA]: data.via || 'Principal',
        [FIELD.LINE_COLOR]: data.cor,
        [FIELD.LINE_COMPANY]: data.company,
        [FIELD.UPDATED_AT]: new Date().toISOString(),
    };
    
    // Add createdAt if not already present
    if (!data.createdAt) {
        docData.criadoEm = new Date().toISOString();
        docData[FIELD.CREATED_AT] = new Date().toISOString();
    }
    
    // Copy all other fields from data (for additional fields like departureLocation, etc.)
    for (const key in data) {
        if (!['id', 'nome', 'via', 'cor', 'company', 'empresa', 'criadoEm', 'atualizadoEm', 'createdAt', 'updatedAt'].includes(key)) {
            docData[key] = data[key];
        }
    }
    
    await setDoc(lineDoc, docData, { merge: true });
}

/**
 * Delete a line document.
 */
export async function deleteLine(lineKey) {
    await deleteDoc(doc(firestore, COLLECTIONS.LINES, lineKey));
}

// ==================== Parameters ====================

/**
 * Subscribe to parameters collection changes.
 * @param {function} callback - receives object mapping paramKey -> paramValue
 * @param {function} errorCallback - optional error callback
 */
export function subscribeParameters(callback, errorCallback) {
    const paramsRef = collection(firestore, COLLECTIONS.PARAMETERS);
    return onSnapshot(paramsRef,
        (snapshot) => {
            const params = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                params[data[FIELD.PARAM_KEY]] = data[FIELD.PARAM_VALUE];
            });
            callback(params);
        },
        (error) => {
            console.error('Firestore parameters listener error:', error);
            if (errorCallback) errorCallback(error);
        }
    );
}

/**
 * Save a parameter document.
 */
export async function saveParameter(key, value) {
    const paramDoc = doc(firestore, COLLECTIONS.PARAMETERS, key);
    await setDoc(paramDoc, {
        [FIELD.PARAM_KEY]: key,
        [FIELD.PARAM_VALUE]: value,
        [FIELD.UPDATED_AT]: new Date().toISOString(),
    }, { merge: true });
}

// ==================== Companies ====================

/**
 * Subscribe to companies collection changes.
 * @param {function} callback - receives object mapping companyKey -> companyData
 */
export function subscribeCompanies(callback) {
    const companiesRef = collection(firestore, COLLECTIONS.COMPANIES);
    return onSnapshot(companiesRef, (snapshot) => {
        const companies = {};
        snapshot.forEach(docSnap => {
            companies[docSnap.id] = docSnap.data();
        });
        callback(companies);
    });
}

/**
 * Save a company document.
 */
export async function saveCompany(companyKey, data) {
    const companyDoc = doc(firestore, COLLECTIONS.COMPANIES, companyKey);
    await setDoc(companyDoc, {
        [FIELD.COMPANY_ID]: data.id,
        [FIELD.COMPANY_NAME]: data.nome,
        [FIELD.COMPANY_LOGO]: data.logo,
        [FIELD.COMPANY_FAVICON]: data.favicon,
        [FIELD.COMPANY_COLOR]: data.cor,
        [FIELD.UPDATED_AT]: new Date().toISOString(),
        ...(data.createdAt ? {} : { [FIELD.CREATED_AT]: new Date().toISOString() }),
    }, { merge: true });
}

// ==================== Helper Queries ====================

/**
 * Get all stops for a given route.
 */
export async function getStopsForRoute(routeId) {
    const stopsRef = collection(firestore, COLLECTIONS.STOPS);
    const q = query(stopsRef, where(FIELD.STOP_ROUTE_ID, '==', routeId));
    const snapshot = await getDocs(q);
    const stops = [];
    snapshot.forEach(docSnap => {
        stops.push({ id: docSnap.id, ...docSnap.data() });
    });
    return stops;
}

/**
 * Get route document by line key.
 */
export async function getRoute(lineKey) {
    const routeDoc = await getDocs(doc(firestore, COLLECTIONS.ROUTES, lineKey));
    return routeDoc.exists() ? routeDoc.data() : null;
}