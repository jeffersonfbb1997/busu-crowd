export const state = {
    user: null,
    watchID: null,
    currentLineKey: null,
    userMarker: null,
    adminSelectedCompany: 'atlantico',
    markers: {},
    configLinhas: {},
    routeDraft: { lineKey: null, path: [], stops: [], terminals: [] },
    routeMode: 'path',
    draftPolyline: null,
    draftMarkers: null
};

export const updateState = (key, value) => {
    state[key] = value;
};
