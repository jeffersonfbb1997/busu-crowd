export const state = {
    user: null,
    watchID: null,
    currentLineKey: null,
    adminSelectedCompany: 'atlantico',
    map: null,
    markers: {},
    configLinhas: {},
    routeDraft: { lineKey: null, path: [], stops: [], terminals: [] },
    routeMode: 'path',
    draftPolyline: null,
    draftMarkers: null,
    // System parameters from Firebase
    systemTTL: 45000, // Default 45 seconds in milliseconds
    systemRadius: 5    // Default 5 km
};

export const updateState = (key, value) => {
    state[key] = value;
};
