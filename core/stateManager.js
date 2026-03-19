export const state = {
    user: null,
    isAdmin: false,
    watchID: null,
    currentLineKey: null,
    userMarker: null,
    markers: {},
    configLinhas: {},
    adminSelectedCompany: 'atlantico'
};

export const updateState = (key, value) => {
    state[key] = value;
};
