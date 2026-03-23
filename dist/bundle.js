var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// services/firebaseService.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
var firebaseConfig, app, db, auth, firestore, ADMIN_EMAIL;
var init_firebaseService = __esm({
  "services/firebaseService.js"() {
    firebaseConfig = {
      apiKey: "AIzaSyB7qohXZb_DYFplLOtt5YiqbahwhNYGPck",
      authDomain: "busu-crowd.firebaseapp.com",
      projectId: "busu-crowd",
      storageBucket: "busu-crowd.firebasestorage.app",
      messagingSenderId: "48985646106",
      appId: "1:48985646106:web:1c7b80091855ad01609da3"
    };
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    firestore = getFirestore(app);
    ADMIN_EMAIL = "jeffersonfbb1997@gmail.com";
  }
});

// services/authService.js
var authService_exports = {};
__export(authService_exports, {
  ADMIN_EMAIL: () => ADMIN_EMAIL,
  auth: () => auth,
  isUserAdmin: () => isUserAdmin,
  isUserMasterAdmin: () => isUserMasterAdmin,
  login: () => login,
  logout: () => logout,
  subscribeToAuthChanges: () => subscribeToAuthChanges
});
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
var provider, login, logout, subscribeToAuthChanges, isUserAdmin, isUserMasterAdmin;
var init_authService = __esm({
  "services/authService.js"() {
    init_firebaseService();
    provider = new GoogleAuthProvider();
    login = () => signInWithPopup(auth, provider);
    logout = () => signOut(auth).then(() => {
      localStorage.removeItem("busu_active_line");
      location.reload();
    });
    subscribeToAuthChanges = (callback) => {
      onAuthStateChanged(auth, callback);
    };
    isUserAdmin = async (user) => {
      if (!user) return false;
      if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return true;
      }
      try {
        const adminRef = ref(db, `config/admins/${user.uid}`);
        const snapshot = await get(adminRef);
        return snapshot.exists();
      } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
    };
    isUserMasterAdmin = (user) => {
      if (!user || !user.email) return false;
      return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    };
  }
});

// config/firestoreSchema.js
var COLLECTIONS, FIELD, VALIDATION;
var init_firestoreSchema = __esm({
  "config/firestoreSchema.js"() {
    COLLECTIONS = {
      LINES: "lines",
      ROUTES: "routes",
      STOPS: "stops",
      PARAMETERS: "parameters",
      COMPANIES: "companies"
    };
    FIELD = {
      // Common fields
      ID: "id",
      CREATED_AT: "createdAt",
      UPDATED_AT: "updatedAt",
      CREATED_BY: "createdBy",
      // Lines collection
      LINE_ID: "lineId",
      LINE_NAME: "name",
      LINE_VIA: "via",
      LINE_COLOR: "color",
      LINE_COMPANY: "company",
      // Routes collection
      ROUTE_LINE_ID: "lineId",
      // reference to lines document ID
      ROUTE_PATH: "path",
      // array of [lat, lng]
      ROUTE_LENGTH: "length",
      // in meters, computed by Turf.js
      ROUTE_BOUNDS: "bounds",
      // {north, south, east, west}
      // Stops collection (includes terminals)
      STOP_ROUTE_ID: "routeId",
      // reference to routes document ID
      STOP_LOCATION: "location",
      // {lat, lng}
      STOP_GEOHASH: "geohash",
      // string, precision 9
      STOP_TYPE: "type",
      // 'stop' or 'terminal'
      STOP_NAME: "name",
      STOP_DESCRIPTION: "description",
      STOP_SEQUENCE: "sequence",
      // order along the route
      STOP_IS_ACTIVE: "isActive",
      // Parameters collection
      PARAM_KEY: "key",
      PARAM_VALUE: "value",
      // Companies collection
      COMPANY_ID: "id",
      COMPANY_NAME: "name",
      COMPANY_LOGO: "logo",
      COMPANY_FAVICON: "favicon",
      COMPANY_COLOR: "color"
    };
    VALIDATION = {
      MIN_DISTANCE_BETWEEN_STOPS: 100,
      // meters
      MAX_DISTANCE_FROM_ROUTE: 50
      // meters
    };
  }
});

// services/firestoreService.js
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
function subscribeLines(callback) {
  const linesRef = collection(firestore, COLLECTIONS.LINES);
  return onSnapshot(linesRef, (snapshot) => {
    const lines = {};
    snapshot.forEach((docSnap) => {
      lines[docSnap.id] = docSnap.data();
    });
    callback(lines);
  });
}
async function saveLine(lineKey, data) {
  const lineDoc = doc(firestore, COLLECTIONS.LINES, lineKey);
  const docData = {
    // Portuguese field names (for Realtime Database compatibility)
    id: data.id,
    nome: data.nome,
    via: data.via || "Principal",
    cor: data.cor,
    empresa: data.company,
    atualizadoEm: (/* @__PURE__ */ new Date()).toISOString(),
    // English field names (for Firestore schema compatibility)
    [FIELD.LINE_ID]: data.id,
    [FIELD.LINE_NAME]: data.nome,
    [FIELD.LINE_VIA]: data.via || "Principal",
    [FIELD.LINE_COLOR]: data.cor,
    [FIELD.LINE_COMPANY]: data.company,
    [FIELD.UPDATED_AT]: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!data.createdAt) {
    docData.criadoEm = (/* @__PURE__ */ new Date()).toISOString();
    docData[FIELD.CREATED_AT] = (/* @__PURE__ */ new Date()).toISOString();
  }
  for (const key in data) {
    if (!["id", "nome", "via", "cor", "company", "empresa", "criadoEm", "atualizadoEm", "createdAt", "updatedAt"].includes(key)) {
      docData[key] = data[key];
    }
  }
  await setDoc(lineDoc, docData, { merge: true });
}
async function deleteLine(lineKey) {
  await deleteDoc(doc(firestore, COLLECTIONS.LINES, lineKey));
}
function subscribeParameters(callback, errorCallback) {
  const paramsRef = collection(firestore, COLLECTIONS.PARAMETERS);
  return onSnapshot(
    paramsRef,
    (snapshot) => {
      const params = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        params[data[FIELD.PARAM_KEY]] = data[FIELD.PARAM_VALUE];
      });
      callback(params);
    },
    (error) => {
      console.error("Firestore parameters listener error:", error);
      if (errorCallback) errorCallback(error);
    }
  );
}
async function saveParameter(key, value) {
  const paramDoc = doc(firestore, COLLECTIONS.PARAMETERS, key);
  await setDoc(paramDoc, {
    [FIELD.PARAM_KEY]: key,
    [FIELD.PARAM_VALUE]: value,
    [FIELD.UPDATED_AT]: (/* @__PURE__ */ new Date()).toISOString()
  }, { merge: true });
}
var init_firestoreService = __esm({
  "services/firestoreService.js"() {
    init_firebaseService();
    init_firestoreSchema();
  }
});

// core/stateManager.js
var state, updateState;
var init_stateManager = __esm({
  "core/stateManager.js"() {
    state = {
      user: null,
      watchID: null,
      currentLineKey: null,
      adminSelectedCompany: "atlantico",
      map: null,
      markers: {},
      layerGroups: {},
      configLinhas: {},
      routeDraft: { lineKey: null, path: [], stops: [], terminals: [] },
      routeMode: "path",
      draftPolyline: null,
      draftMarkers: null,
      // System parameters from Firebase
      systemTTL: 45e3,
      // Default 45 seconds in milliseconds
      systemRadius: 5
      // Default 5 km
    };
    updateState = (key, value) => {
      state[key] = value;
    };
  }
});

// services/parametersService.js
var parametersService_exports = {};
__export(parametersService_exports, {
  forceTTLCleanup: () => forceTTLCleanup,
  getSystemParameters: () => getSystemParameters,
  initParametersListener: () => initParametersListener,
  updateSystemParameters: () => updateSystemParameters
});
function initParametersListener() {
  subscribeParameters((params) => {
    const ttl = params.ttl;
    const radius = params.radius;
    if (Object.keys(params).length === 0) {
      console.log("No parameters found, auto\u2011initializing defaults");
      autoInitializeDefaultParameters();
      return;
    }
    const hasTTL = ttl !== void 0;
    const hasRadius = radius !== void 0;
    if (hasTTL && hasRadius) {
      const systemTTL = typeof ttl === "number" ? ttl * 1e3 : 45e3;
      const systemRadius = typeof radius === "number" ? radius : 5;
      console.log("System parameters updated:", { systemTTL, systemRadius });
      updateState("systemTTL", systemTTL);
      updateState("systemRadius", systemRadius);
      updateBottomCardRadius(systemRadius);
      if (window.triggerTTLCleanup) {
        window.triggerTTLCleanup();
      }
    } else {
      console.log("Parameters incomplete, fixing...");
      fixIncompleteParameters(params);
    }
    window.triggerTTLCleanup = forceTTLCleanup;
  }, (error) => {
    console.error("Error listening to parameters:", error);
    updateState("systemTTL", 45e3);
    updateState("systemRadius", 5);
  });
}
function getSystemParameters() {
  return {
    systemTTL: state.systemTTL,
    systemRadius: state.systemRadius
  };
}
async function updateSystemParameters(params) {
  const validatedParams = {
    ttl: Math.max(10, Math.min(300, params.ttl || 45)),
    // 10-300 seconds
    radius: Math.max(1, Math.min(50, params.radius || 5))
    // 1-50 km
  };
  await Promise.all([
    saveParameter("ttl", validatedParams.ttl),
    saveParameter("radius", validatedParams.radius)
  ]);
}
async function fixIncompleteParameters(existingData) {
  try {
    const ttl = existingData.ttl || 45;
    const radius = existingData.radius || 5;
    console.log("Fixing incomplete parameters:", { ttl, radius });
    await updateSystemParameters({ ttl, radius });
    updateState("systemTTL", ttl * 1e3);
    updateState("systemRadius", radius);
    console.log("Parameters fixed successfully");
    return true;
  } catch (error) {
    console.error("Error fixing incomplete parameters:", error);
    return false;
  }
}
async function autoInitializeDefaultParameters() {
  try {
    const defaultParams = {
      ttl: 45,
      // 45 seconds
      radius: 5
      // 5 km
    };
    console.log("Auto-initializing default parameters:", defaultParams);
    await updateSystemParameters(defaultParams);
    updateState("systemTTL", 45e3);
    updateState("systemRadius", 5);
    console.log("Default parameters initialized successfully");
    return true;
  } catch (error) {
    console.error("Error auto-initializing default parameters:", error);
    return false;
  }
}
function forceTTLCleanup() {
  console.log("Forcing TTL cleanup with current TTL:", state.systemTTL);
  if (window.triggerBusDataUpdate) {
    window.triggerBusDataUpdate();
  }
  if (window.updateAdminMonitor) {
    window.updateAdminMonitor();
  }
  return true;
}
function updateBottomCardRadius(radius) {
  try {
    const activeLabel = document.querySelector("#bottom-info-card .active-label");
    if (activeLabel) {
      activeLabel.textContent = `EM TEMPO REAL \u2022 ${radius}KM`;
      console.log("Bottom card radius updated to:", radius, "KM");
    } else {
      console.debug("Bottom card active label element not found yet, will update on next render");
    }
  } catch (error) {
    console.warn("Failed to update bottom card radius:", error.message);
  }
}
var init_parametersService = __esm({
  "services/parametersService.js"() {
    init_firestoreService();
    init_stateManager();
    window.updateBottomCardRadius = updateBottomCardRadius;
  }
});

// core/app.js
init_firebaseService();
init_authService();
init_parametersService();

// services/timeService.js
init_firebaseService();
import { ref as ref2, serverTimestamp, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
var serverTimeOffset = 0;
var isOffsetAvailable = false;
var isListening = false;
function initTimeService() {
  if (isListening) {
    console.debug("Time service already initialized");
    return serverTimeOffset;
  }
  console.log("Initializing time service using Firebase .info/serverTimeOffset");
  try {
    const serverTimeOffsetRef = ref2(db, ".info/serverTimeOffset");
    onValue(serverTimeOffsetRef, (snapshot) => {
      const offset = snapshot.val();
      if (offset !== null) {
        serverTimeOffset = offset;
        isOffsetAvailable = true;
        console.debug("Server time offset updated:", serverTimeOffset, "ms");
      } else {
        console.debug("Server time offset not available, using client time");
        isOffsetAvailable = false;
        serverTimeOffset = 0;
      }
    }, (error) => {
      console.warn("Error listening to server time offset:", error.message);
      console.warn("Falling back to client time");
      isOffsetAvailable = false;
      serverTimeOffset = 0;
    });
    isListening = true;
    setTimeout(() => {
      if (!isOffsetAvailable) {
        console.debug("Server time offset not received yet, continuing with client time");
      }
    }, 1e3);
  } catch (error) {
    console.warn("Failed to initialize time service:", error.message);
    console.warn("Application will use client time");
    isOffsetAvailable = false;
    serverTimeOffset = 0;
  }
  return serverTimeOffset;
}
function getServerTime() {
  if (!isOffsetAvailable) {
    return Date.now();
  }
  return Date.now() + serverTimeOffset;
}

// core/app.js
init_firestoreService();

// config/systemConfig.js
var COMPANIES = {
  atlantico: { name: "Atl\xE2ntico", favicon: "assets/atlantico-favicon.png" },
  viametro: { name: "Via Metro", favicon: "assets/viametro-favicon.png" }
};
var DEFAULT_VIEW = [-14.7981, -39.0347];
var DEFAULT_ZOOM = 15;

// config/mapConfig.js
var TILE_LAYERS = {
  OPENSTREETMAP: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc"
  },
  OPENSTREETMAP_HOT: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team",
    maxZoom: 19
  },
  CARTO_DARK: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  },
  CARTO_LIGHT: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  }
};
var DEFAULT_TILE_LAYER = "OPENSTREETMAP";
var MAP_BOUNDS = [
  [-14.9, -39.2],
  // southwest
  [-14.7, -38.9]
  // northeast
];
var MAX_ZOOM = 18;
var MIN_ZOOM = 12;
var CONTROL_POSITIONS = {
  ZOOM: "topleft",
  SCALE: "bottomleft",
  LOCATE: "topright",
  LAYERS: "topright"
};
var COMPANY_MAP_STYLES = {
  atlantico: {
    tileLayer: TILE_LAYERS.OPENSTREETMAP,
    defaultColor: "#1a73e8",
    // blue
    highlightColor: "#0d47a1"
  },
  viametro: {
    tileLayer: TILE_LAYERS.CARTO_DARK,
    defaultColor: "#e53935",
    // red
    highlightColor: "#b71c1c"
  }
};
function getTileLayerForCompany(companyId) {
  return COMPANY_MAP_STYLES[companyId]?.tileLayer || TILE_LAYERS[DEFAULT_TILE_LAYER];
}
function getCompanyColor(companyId) {
  return COMPANY_MAP_STYLES[companyId]?.defaultColor || "#1a73e8";
}
function createTileLayer(key) {
  const config = TILE_LAYERS[key];
  if (!config) {
    console.warn(`Tile layer "${key}" not found, using default.`);
    return L.tileLayer(TILE_LAYERS[DEFAULT_TILE_LAYER].url, TILE_LAYERS[DEFAULT_TILE_LAYER]);
  }
  return L.tileLayer(config.url, config);
}
function getDefaultMapOptions() {
  return {
    center: DEFAULT_VIEW,
    zoom: DEFAULT_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomControl: false,
    // we add controls separately
    maxBounds: MAP_BOUNDS.length ? MAP_BOUNDS : null,
    attributionControl: true
  };
}
if (typeof window !== "undefined") {
  window.mapConfig = {
    TILE_LAYERS,
    DEFAULT_TILE_LAYER,
    MAP_BOUNDS,
    MAX_ZOOM,
    MIN_ZOOM,
    CONTROL_POSITIONS,
    COMPANY_MAP_STYLES,
    getTileLayerForCompany,
    getCompanyColor,
    createTileLayer,
    getDefaultMapOptions
  };
}

// modules/map/mapInit.js
var map;
var initMap = (containerId) => {
  const options = getDefaultMapOptions();
  options.zoomControl = false;
  map = L.map(containerId, options);
  const tileLayer = createTileLayer(DEFAULT_TILE_LAYER);
  tileLayer.addTo(map);
  return map;
};

// modules/map/mapLayers.js
init_stateManager();
var LAYER = {
  BUS: "bus",
  ROUTE_DRAFT: "routeDraft",
  STOP: "stop",
  TERMINAL: "terminal",
  USER: "user",
  OVERLAY: "overlay",
  BASE: "base"
};
if (!state.layerGroups) {
  updateState("layerGroups", {});
}
function ensureLayerGroup(name) {
  if (!state.map) {
    console.warn("Map not initialized, cannot create layer group");
    return null;
  }
  if (!state.layerGroups[name]) {
    const group = L.layerGroup().addTo(state.map);
    state.layerGroups[name] = group;
  }
  return state.layerGroups[name];
}
function addLayer(groupName, layer) {
  const group = ensureLayerGroup(groupName);
  if (group && layer) {
    group.addLayer(layer);
  }
}
function removeLayer(groupName, layer) {
  const group = state.layerGroups[groupName];
  if (group && layer) {
    group.removeLayer(layer);
  }
}
function clearLayer(groupName) {
  const group = state.layerGroups[groupName];
  if (group) {
    group.clearLayers();
  }
}
function showLayer(groupName) {
  const group = state.layerGroups[groupName];
  if (group && !state.map.hasLayer(group)) {
    group.addTo(state.map);
  }
}
function hideLayer(groupName) {
  const group = state.layerGroups[groupName];
  if (group && state.map.hasLayer(group)) {
    state.map.removeLayer(group);
  }
}
function toggleLayer(groupName) {
  const group = state.layerGroups[groupName];
  if (!group) return false;
  if (state.map.hasLayer(group)) {
    state.map.removeLayer(group);
    return false;
  } else {
    group.addTo(state.map);
    return true;
  }
}
function isLayerVisible(groupName) {
  const group = state.layerGroups[groupName];
  return group && state.map.hasLayer(group);
}
function getLayerGroup(groupName) {
  return state.layerGroups[groupName] || null;
}
function removeLayerGroup(groupName) {
  const group = state.layerGroups[groupName];
  if (group) {
    if (state.map.hasLayer(group)) {
      state.map.removeLayer(group);
    }
    group.clearLayers();
    delete state.layerGroups[groupName];
  }
}
function initDefaultLayers() {
  ensureLayerGroup(LAYER.BUS);
  ensureLayerGroup(LAYER.ROUTE_DRAFT);
  ensureLayerGroup(LAYER.STOP);
  ensureLayerGroup(LAYER.TERMINAL);
  ensureLayerGroup(LAYER.USER);
  ensureLayerGroup(LAYER.OVERLAY);
}
if (typeof window !== "undefined") {
  window.mapLayers = {
    ensureLayerGroup,
    addLayer,
    removeLayer,
    clearLayer,
    showLayer,
    hideLayer,
    toggleLayer,
    isLayerVisible,
    getLayerGroup,
    removeLayerGroup,
    LAYER
  };
}

// ui/mapUI/mapLegend.js
var legendControl = null;
var mapInstance = null;
function createLegendControl(map2) {
  mapInstance = map2;
  const LegendControl = L.Control.extend({
    onAdd: function(map3) {
      const container = L.DomUtil.create("div", "leaflet-control leaflet-control-legend");
      container.style.backgroundColor = "white";
      container.style.padding = "10px";
      container.style.borderRadius = "4px";
      container.style.boxShadow = "0 1px 5px rgba(0,0,0,0.2)";
      container.style.maxWidth = "200px";
      container.style.fontFamily = "Inter, sans-serif";
      container.style.fontSize = "12px";
      container.style.zIndex = "1000";
      const header = L.DomUtil.create("div", "legend-header", container);
      header.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="color: #333;">Legenda</strong>
                    <button class="legend-close" style="background: none; border: none; color: #999; cursor: pointer; font-size: 14px;">\xD7</button>
                </div>
            `;
      const content = L.DomUtil.create("div", "legend-content", container);
      content.style.maxHeight = "300px";
      content.style.overflowY = "auto";
      const closeBtn = header.querySelector(".legend-close");
      L.DomEvent.on(closeBtn, "click", () => {
        container.style.display = "none";
      });
      this.updateLegend(content);
      this.interval = setInterval(() => this.updateLegend(content), 5e3);
      return container;
    },
    onRemove: function(map3) {
      if (this.interval) clearInterval(this.interval);
    },
    updateLegend: function(contentElement) {
      if (!mapInstance) return;
      const visibleLayers = getVisibleLayerInfo();
      const html = generateLegendItemsHTML(visibleLayers);
      contentElement.innerHTML = html;
    }
  });
  legendControl = new LegendControl({ position: "bottomright" });
  return legendControl;
}
function getVisibleLayerInfo() {
  const layers = [];
  if (isLayerVisible(LAYER.BUS)) {
    layers.push({
      name: "\xD4nibus ativos",
      icon: '<div style="display:inline-block; width:12px; height:12px; background-color:#1a73e8; border-radius:50%; border:2px solid white; box-shadow:0 0 4px #1a73e8;"></div>',
      description: "Ve\xEDculos transmitindo GPS em tempo real"
    });
  }
  if (isLayerVisible(LAYER.STOP)) {
    layers.push({
      name: "Paradas",
      icon: '<span style="color:#4caf50; font-size:14px;">\u25CF</span>',
      description: "Pontos de parada ao longo das rotas"
    });
  }
  if (isLayerVisible(LAYER.TERMINAL)) {
    layers.push({
      name: "Terminais",
      icon: '<span style="color:#ff9800; font-size:14px;">\u25A0</span>',
      description: "Pontos de in\xEDcio/fim das linhas"
    });
  }
  if (isLayerVisible(LAYER.USER)) {
    layers.push({
      name: "Minha localiza\xE7\xE3o",
      icon: '<div style="display:inline-block; width:12px; height:12px; background-color:#e91e63; border-radius:50%; border:2px solid white; box-shadow:0 0 4px #e91e63;"></div>',
      description: "Sua posi\xE7\xE3o atual (GPS)"
    });
  }
  if (isLayerVisible(LAYER.ROUTE_DRAFT)) {
    layers.push({
      name: "Rascunho de rota",
      icon: '<span style="color:#9c27b0; font-size:14px;">\u2501</span>',
      description: "Rota sendo desenhada no editor"
    });
  }
  if (isLayerVisible(LAYER.OVERLAY)) {
    layers.push({
      name: "Camadas adicionais",
      icon: '<div style="display:inline-block; width:12px; height:12px; background:repeating-linear-gradient(45deg, #999, #999 2px, white 2px, white 4px);"></div>',
      description: "Outras camadas tempor\xE1rias"
    });
  }
  return layers;
}
function generateLegendItemsHTML(visibleLayers) {
  if (visibleLayers.length === 0) {
    return `
            <div class="legend-empty">
                <small class="text-muted">Nenhuma camada vis\xEDvel</small>
            </div>
        `;
  }
  const items = visibleLayers.map((layer) => `
        <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 8px;">
            <div class="legend-icon" style="margin-right: 8px; width: 20px; text-align: center;">
                ${layer.icon}
            </div>
            <div class="legend-text">
                <div class="legend-name" style="font-weight: 600; color: #333;">${layer.name}</div>
                <div class="legend-description" style="font-size: 10px; color: #666;">${layer.description}</div>
            </div>
        </div>
    `).join("");
  return items;
}
function addLegendToMap(map2) {
  if (legendControl) {
    map2.removeControl(legendControl);
  }
  legendControl = createLegendControl(map2);
  legendControl.addTo(map2);
}
function removeLegendFromMap() {
  if (legendControl && mapInstance) {
    mapInstance.removeControl(legendControl);
    legendControl = null;
  }
}
function refreshLegend() {
  if (legendControl && mapInstance) {
    const container = legendControl.getContainer();
    if (container) {
      const content = container.querySelector(".legend-content");
      if (content) {
        legendControl.updateLegend(content);
      }
    }
  }
}
if (typeof window !== "undefined") {
  window.mapLegend = {
    addLegendToMap,
    removeLegendFromMap,
    refreshLegend
  };
}

// modules/map/mapControls.js
var mapInstance2 = null;
var layerControl = null;
var zoomControl = null;
var scaleControl = null;
var fullscreenControl = null;
function initMapControls(map2) {
  if (!map2 || !window.L) {
    console.warn("Map or Leaflet not available for controls");
    return;
  }
  mapInstance2 = map2;
  if (map2.zoomControl) {
    map2.zoomControl.setPosition("topleft");
    zoomControl = map2.zoomControl;
  } else {
    zoomControl = L.control.zoom({ position: "topleft" });
    zoomControl.addTo(map2);
  }
  scaleControl = L.control.scale({ imperial: false, position: "bottomleft" });
  scaleControl.addTo(map2);
  if (L.control.locate) {
    const locateControl = L.control.locate({
      position: "topright",
      drawCircle: true,
      follow: true,
      setView: "once",
      keepCurrentZoomLevel: true,
      icon: "bi bi-geo",
      iconLoading: "bi bi-geo",
      metric: true,
      strings: {
        title: "Localizar minha posi\xE7\xE3o",
        popup: "Voc\xEA est\xE1 dentro de {distance} metros deste ponto",
        outsideMapBoundsMsg: "Voc\xEA parece estar fora dos limites do mapa"
      }
    }).addTo(map2);
  } else {
    console.warn("Leaflet.Locate plugin not available \u2013 skipping locate control");
  }
  initLayerSwitcher(map2);
  addFullscreenControl(map2);
  addLegendToMap(map2);
}
function initLayerSwitcher(map2) {
  console.log("initLayerSwitcher called");
  if (layerControl) {
    map2.removeControl(layerControl);
  }
  const baseLayers = {
    "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
  };
  const overlayLayers = {};
  const busLayer = getLayerGroup(LAYER.BUS);
  if (busLayer) {
    overlayLayers["\xD4nibus ativos"] = busLayer;
  }
  const stopLayer = getLayerGroup(LAYER.STOP);
  if (stopLayer) {
    overlayLayers["Paradas"] = stopLayer;
  }
  const terminalLayer = getLayerGroup(LAYER.TERMINAL);
  if (terminalLayer) {
    overlayLayers["Terminais"] = terminalLayer;
  }
  const userLayer = getLayerGroup(LAYER.USER);
  if (userLayer) {
    overlayLayers["Minha localiza\xE7\xE3o"] = userLayer;
  }
  const draftLayer = getLayerGroup(LAYER.ROUTE_DRAFT);
  if (draftLayer) {
    overlayLayers["Rascunho de rota"] = draftLayer;
  }
  let overlayLayer = getLayerGroup(LAYER.OVERLAY);
  if (!overlayLayer) {
    overlayLayer = ensureLayerGroup(LAYER.OVERLAY);
    console.log("Created overlay layer group:", overlayLayer);
  }
  if (overlayLayer) {
    if (overlayLayer.getLayers().length === 0) {
      const dummyRect = L.rectangle([[0, 0], [0, 0]], { opacity: 0, fillOpacity: 0, interactive: false });
      overlayLayer.addLayer(dummyRect);
      console.log("Added dummy invisible rectangle to overlay layer");
    }
    overlayLayers["Camadas adicionais"] = overlayLayer;
    console.log("Added Camadas adicionais to overlayLayers, layer count:", overlayLayer.getLayers().length);
  } else {
    console.warn("Could not create overlay layer group");
  }
  console.log("Layer switcher overlay layers:", Object.keys(overlayLayers));
  layerControl = L.control.layers(baseLayers, overlayLayers, {
    collapsed: true,
    position: "topright"
  }).addTo(map2);
}
function addFullscreenControl(map2) {
  if (!map2 || !document.fullscreenEnabled) {
    console.debug("Fullscreen API not supported, skipping fullscreen control");
    return;
  }
  const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-fullscreen");
  container.innerHTML = `
        <button class="fullscreen-toggle" title="Tela cheia">
            <i class="bi bi-arrows-fullscreen"></i>
        </button>
    `;
  const button = container.querySelector("button");
  L.DomEvent.on(button, "click", function(e) {
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    const mapContainer = map2.getContainer();
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  });
  L.DomEvent.disableClickPropagation(container);
  const FullscreenControl = L.Control.extend({
    onAdd: function(map3) {
      return container;
    }
  });
  fullscreenControl = new FullscreenControl({ position: "topright" });
  fullscreenControl.addTo(map2);
}
function refreshLayerSwitcher() {
  console.log("refreshLayerSwitcher called");
  if (!mapInstance2) return;
  if (layerControl) {
    mapInstance2.removeControl(layerControl);
  }
  initLayerSwitcher(mapInstance2);
}
function showLayerSwitcher() {
  console.log("showLayerSwitcher called");
  if (!mapInstance2) return;
  refreshLayerSwitcher();
}
function hideLayerSwitcher() {
  console.log("hideLayerSwitcher called");
  if (mapInstance2 && layerControl) {
    mapInstance2.removeControl(layerControl);
  }
}
function showZoomControl() {
  if (mapInstance2 && zoomControl) {
    zoomControl.addTo(mapInstance2);
  }
}
function hideZoomControl() {
  console.log("hideZoomControl called");
  if (mapInstance2 && zoomControl) {
    mapInstance2.removeControl(zoomControl);
  }
}
function showScaleControl() {
  if (mapInstance2 && scaleControl) {
    scaleControl.addTo(mapInstance2);
  }
}
function hideScaleControl() {
  console.log("hideScaleControl called");
  if (mapInstance2 && scaleControl) {
    mapInstance2.removeControl(scaleControl);
  }
}
function showFullscreenControl() {
  if (mapInstance2 && fullscreenControl) {
    fullscreenControl.addTo(mapInstance2);
  }
}
function hideFullscreenControl() {
  console.log("hideFullscreenControl called");
  if (mapInstance2 && fullscreenControl) {
    mapInstance2.removeControl(fullscreenControl);
  }
}
function showLegend() {
  if (mapInstance2) {
    addLegendToMap(mapInstance2);
  }
}
function hideLegend() {
  console.log("hideLegend called");
  removeLegendFromMap();
}
function addCustomControl(html, onClick, position = "topright") {
  if (!mapInstance2) return null;
  const CustomControl = L.Control.extend({
    onAdd: function(map2) {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control custom-control");
      container.innerHTML = html;
      L.DomEvent.on(container, "click", onClick);
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });
  const control = new CustomControl({ position });
  control.addTo(mapInstance2);
  return control;
}
function addLayerToggleControl(layerName, label, position = "topright") {
  const html = `
        <button class="leaflet-control-layer-toggle" title="${label}">
            <i class="bi bi-eye"></i>
            <span>${label}</span>
        </button>
    `;
  const onClick = () => {
    const nowVisible = toggleLayer(layerName);
    const icon = this._container.querySelector(".bi");
    if (icon) {
      icon.className = nowVisible ? "bi bi-eye-fill" : "bi bi-eye";
    }
  };
  return addCustomControl(html, onClick, position);
}
function toggleLayerWithControl(layerName) {
  const newState = toggleLayer(layerName);
  refreshLayerSwitcher();
  return newState;
}
if (typeof window !== "undefined") {
  window.mapControls = {
    initMapControls,
    refreshLayerSwitcher,
    showLayerSwitcher,
    hideLayerSwitcher,
    showZoomControl,
    hideZoomControl,
    showScaleControl,
    hideScaleControl,
    showFullscreenControl,
    hideFullscreenControl,
    showLegend,
    hideLegend,
    addCustomControl,
    addLayerToggleControl,
    toggleLayerWithControl
  };
}

// core/app.js
init_stateManager();

// modules/gps/gpsCollector.js
init_firebaseService();
init_stateManager();
import { ref as ref3, set, onDisconnect, remove, serverTimestamp as serverTimestamp2 } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// services/pointerService.js
init_stateManager();

// utils/geoUtils.js
var getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3;
  const \u03C61 = lat1 * Math.PI / 180;
  const \u03C62 = lat2 * Math.PI / 180;
  const \u0394\u03C6 = (lat2 - lat1) * Math.PI / 180;
  const \u0394\u03BB = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(\u0394\u03C6 / 2) ** 2 + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
var calcDist = (la1, lo1, la2, lo2) => {
  return getDistanceMeters(la1, lo1, la2, lo2) / 1e3;
};

// services/pointerService.js
var lastValidPosition = null;
var lastUpdateTime = null;
var userMarker = null;
var MIN_DISTANCE_THRESHOLD = 10;
var MAX_JUMP_DISTANCE = 50;
var SMOOTHING_FACTOR = 0.5;
function applySmoothing(newLat, newLng) {
  if (!lastValidPosition) {
    return { lat: newLat, lng: newLng };
  }
  const smoothedLat = lastValidPosition.lat * (1 - SMOOTHING_FACTOR) + newLat * SMOOTHING_FACTOR;
  const smoothedLng = lastValidPosition.lng * (1 - SMOOTHING_FACTOR) + newLng * SMOOTHING_FACTOR;
  console.log(`Smoothing applied: (${newLat.toFixed(6)}, ${newLng.toFixed(6)}) -> (${smoothedLat.toFixed(6)}, ${smoothedLng.toFixed(6)})`);
  return { lat: smoothedLat, lng: smoothedLng };
}
function validatePosition(newLat, newLng, accuracy = null) {
  if (!lastValidPosition) {
    return { isValid: true, distance: 0, reason: "First position" };
  }
  const distance = getDistanceMeters(
    lastValidPosition.lat,
    lastValidPosition.lng,
    newLat,
    newLng
  );
  if (accuracy !== null && accuracy > 200) {
    return {
      isValid: false,
      distance,
      reason: `Accuracy too low: ${accuracy}m > 200m threshold`
    };
  }
  if (distance > MAX_JUMP_DISTANCE) {
    return {
      isValid: false,
      distance,
      reason: `Jump too large: ${distance.toFixed(1)}m > ${MAX_JUMP_DISTANCE}m threshold`
    };
  }
  if (distance < MIN_DISTANCE_THRESHOLD) {
    return {
      isValid: false,
      distance,
      reason: `Movement too small: ${distance.toFixed(1)}m < ${MIN_DISTANCE_THRESHOLD}m threshold`
    };
  }
  return { isValid: true, distance, reason: "Valid movement" };
}
function updateUserPointer(lat, lng, accuracy = null, forceUpdate = false) {
  if (!state.map || !window.L) {
    console.warn("Map or Leaflet not available for pointer tracking");
    return false;
  }
  ensureLayerGroup(LAYER.USER);
  console.log(`GPS Position received: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, accuracy=${accuracy !== null ? accuracy + "m" : "unknown"}`);
  if (!forceUpdate) {
    const validation = validatePosition(lat, lng, accuracy);
    console.log(`Position validation: ${validation.reason}, distance=${validation.distance.toFixed(1)}m`);
    if (!validation.isValid) {
      console.log(`Position rejected: ${validation.reason}`);
      return false;
    }
  }
  const smoothedPosition = applySmoothing(lat, lng);
  lastValidPosition = smoothedPosition;
  lastUpdateTime = Date.now();
  if (!userMarker) {
    const userIcon = L.divIcon({
      className: "user-marker-icon",
      html: '<div style="background: #1a73e8; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #1a73e8;"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    userMarker = L.marker([smoothedPosition.lat, smoothedPosition.lng], {
      icon: userIcon,
      zIndexOffset: 1e3
      // Ensure marker appears above bus markers
    });
    addLayer(LAYER.USER, userMarker);
    userMarker.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 180px;">
                <div class="fw-bold mb-1">Sua localiza\xE7\xE3o</div>
                <div class="small text-muted mb-2">Transmitindo GPS em tempo real</div>
                <div class="d-flex justify-content-between">
                    <span class="small">Lat:</span>
                    <span class="small fw-bold">${smoothedPosition.lat.toFixed(6)}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="small">Lng:</span>
                    <span class="small fw-bold">${smoothedPosition.lng.toFixed(6)}</span>
                </div>
                ${accuracy !== null ? `<div class="d-flex justify-content-between">
                    <span class="small">Precis\xE3o:</span>
                    <span class="small fw-bold">${accuracy.toFixed(0)}m</span>
                </div>` : ""}
            </div>
        `);
    console.log(`User marker created at: ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)}`);
  } else {
    userMarker.setLatLng([smoothedPosition.lat, smoothedPosition.lng]);
    console.log(`User marker updated to: ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)}`);
  }
  if (forceUpdate || !lastUpdateTime) {
    centerMapOnPointer(smoothedPosition.lat, smoothedPosition.lng, 17);
  }
  console.log(`Position tracked with marker: ${smoothedPosition.lat.toFixed(6)}, ${smoothedPosition.lng.toFixed(6)} (smoothed)`);
  return true;
}
function removeUserPointer() {
  if (userMarker && state.map) {
    removeLayer(LAYER.USER, userMarker);
    console.log("User marker removed from map");
  }
  lastValidPosition = null;
  lastUpdateTime = null;
  userMarker = null;
  console.log("Position tracking and marker reset");
}
function centerMapOnPointer(lat, lng, zoom = 17) {
  if (state.map) {
    state.map.flyTo([lat, lng], zoom);
    console.log("Map centered on position:", lat.toFixed(6), lng.toFixed(6));
  }
}
function getPointerPosition() {
  return lastValidPosition;
}
function hasPointer() {
  return !!lastValidPosition;
}
function getStabilizationStats() {
  return {
    lastValidPosition,
    lastUpdateTime,
    minDistanceThreshold: MIN_DISTANCE_THRESHOLD,
    maxJumpDistance: MAX_JUMP_DISTANCE,
    smoothingFactor: SMOOTHING_FACTOR
  };
}
function initPointerService() {
  console.log("Pointer service initialized - with marker creation");
  console.log(`Settings: MIN_DISTANCE_THRESHOLD=${MIN_DISTANCE_THRESHOLD}m, MAX_JUMP_DISTANCE=${MAX_JUMP_DISTANCE}m, SMOOTHING_FACTOR=${SMOOTHING_FACTOR}`);
  lastValidPosition = null;
  lastUpdateTime = null;
  userMarker = null;
  window.pointerService = {
    updateUserPointer,
    removeUserPointer,
    centerMapOnPointer,
    getPointerPosition,
    hasPointer,
    getStabilizationStats,
    validatePosition: (lat, lng, acc) => validatePosition(lat, lng, acc)
    // Expose for testing
  };
}

// modules/gps/gpsCollector.js
function iniciarGPS(key) {
  if (state.watchID) navigator.geolocation.clearWatch(state.watchID);
  updateState("currentLineKey", key);
  const btn = document.getElementById("action-btn");
  const icon = document.getElementById("action-icon");
  if (btn) {
    btn.classList.add("active");
    icon.className = "bi bi-arrow-repeat rotate-animation";
  }
  const watchID = navigator.geolocation.watchPosition((p) => {
    const speedKmh = (p.coords.speed || 0) * 3.6;
    const accuracy = p.coords.accuracy || 0;
    const rawLat = p.coords.latitude;
    const rawLng = p.coords.longitude;
    console.log(`GPS raw coordinates: ${rawLat.toFixed(6)}, ${rawLng.toFixed(6)}`);
    if (accuracy > 200) {
      console.log(`GPS accuracy too low: ${accuracy}m > 200m threshold, skipping update`);
      return;
    }
    console.log(`GPS accuracy: ${accuracy}m (${accuracy <= 50 ? "High" : accuracy <= 150 ? "Medium" : "Low"}) - ${accuracy <= 200 ? "ACCEPTED" : "REJECTED"}`);
    if (icon) icon.className = "bi bi-stop-circle-fill";
    const data = {
      lat: parseFloat(p.coords.latitude.toFixed(6)),
      // 6 decimal places for efficiency
      lng: parseFloat(p.coords.longitude.toFixed(6)),
      // 6 decimal places for efficiency
      speed: parseFloat(speedKmh.toFixed(1)),
      // Speed in km/h
      acc: parseFloat(accuracy.toFixed(0)),
      // Accuracy in meters
      heading: p.coords.heading || null,
      // Direction (0-360 degrees)
      timestamp: getServerTime(),
      // Server-adjusted timestamp
      clientTimestamp: Date.now(),
      // Original client timestamp for debugging
      serverTimestamp: serverTimestamp2()
      // Firebase server timestamp placeholder
    };
    console.log(`GPS data received: ${data.lat}, ${data.lng}, accuracy: ${data.acc}m`);
    console.log(`Calling updateUserPointer with accuracy=${accuracy}m`);
    const updateResult = updateUserPointer(data.lat, data.lng, accuracy);
    console.log(`updateUserPointer returned: ${updateResult ? "SUCCESS" : "FAILED"}`);
    const trackRef = ref3(db, `onibus/${key}/${state.user.uid}`);
    set(trackRef, data).then(() => {
      console.log("GPS data written to Firebase successfully");
    }).catch((error) => {
      console.error("Error writing GPS data to Firebase:", error);
    });
    onDisconnect(trackRef).remove();
  }, (error) => {
    console.warn("Erro de sensor:", error.message, error.code);
    if (icon) icon.className = "bi bi-exclamation-triangle-fill text-warning";
  }, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 1e4
  });
  updateState("watchID", watchID);
}
function stopTrack() {
  if (state.watchID) {
    navigator.geolocation.clearWatch(state.watchID);
    updateState("watchID", null);
  }
  if (state.currentLineKey && state.user) {
    remove(ref3(db, `onibus/${state.currentLineKey}/${state.user.uid}`));
  }
  console.log("GPS transmission stopped - user marker remains visible");
  localStorage.removeItem("busu_active_line");
  const btn = document.getElementById("action-btn");
  const icon = document.getElementById("action-icon");
  if (btn) btn.classList.remove("active");
  if (icon) icon.className = "bi bi-broadcast";
}

// modules/buses/busManager.js
init_stateManager();
function renderBusList(gpsData, configLinhas) {
  const now = Date.now();
  let statusH = "", drawerH = "", tU = 0, activeLines = 0;
  const userPosition = getPointerPosition();
  const uLat = userPosition ? userPosition.lat : null;
  const uLng = userPosition ? userPosition.lng : null;
  for (let key in configLinhas) {
    const c = configLinhas[key];
    let latA = 0, lngA = 0, cnt = 0;
    if (gpsData[key]) {
      for (let uid in gpsData[key]) {
        const gpsPoint = gpsData[key][uid];
        const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
        if (now - gpsPoint.timestamp < (state.systemTTL || 45e3) && accuracy <= 200) {
          latA += gpsPoint.lat;
          lngA += gpsPoint.lng;
          cnt++;
        }
      }
    }
    tU += cnt;
    if (cnt > 0) {
      activeLines++;
      const mLt = latA / cnt, mLn = lngA / cnt;
      const comp = COMPANIES[c.company || "atlantico"];
      drawerH += `<div class="d-flex align-items-center mb-3" onclick="map.flyTo([${mLt},${mLn}], 17)" style="cursor:pointer; border-left:3px solid ${c.cor}; padding-left:10px;"><div class="flex-grow-1"><div class="bus-title"><img src="${comp.favicon}" class="bus-logo-mini">${c.id}</div><div class="bus-subtitle" style="font-size:8px">${c.via.substring(0, 20)}...</div></div></div>`;
      const hasAC = c.id.includes("2") || c.id.includes("7");
      const hasAccessibility = c.id.includes("1") || c.id.includes("6");
      const acFeature = hasAC ? '<span class="feature-badge ac"><i class="bi bi-snow"></i> AR</span>' : "";
      const accessibilityFeature = hasAccessibility ? '<span class="feature-badge accessibility"><i class="bi bi-wheelchair"></i> ACESS</span>' : "";
      let etaBadge = "";
      let onclickAction = `window.showBusDetails('${key}')`;
      if (uLat) {
        const d = calcDist(uLat, uLng, mLt, mLn);
        const eta = Math.round(d / 0.33);
        onclickAction = `map.flyTo([${mLt},${mLn}], 17); window.showBusDetails('${key}')`;
        if (eta > 0) {
          etaBadge = `<span class="line-eta-badge">${eta} min</span>`;
        }
      }
      statusH += `
                <div class="line-card active" onclick="${onclickAction}" data-line-key="${key}" data-line-active="true">
                    <div class="line-status active"></div>
                    <div class="line-card-header">
                        <div class="line-code">${c.id}</div>
                        <div class="line-destination">${c.nome}</div>
                        <img src="${comp.favicon}" class="line-company-logo" alt="${c.company}">
                    </div>
                    <div class="line-route">${c.via}</div>
                    <div class="line-features">
                        ${acFeature}
                        ${accessibilityFeature}
                        ${etaBadge}
                    </div>
                </div>
            `;
    }
  }
  return { statusH, drawerH, tU, activeLines };
}

// modules/buses/busRenderer.js
init_stateManager();

// ui/mapUI/mapMarkers.js
function createBusMarker(lat, lng, line, active = true) {
  const color = line.cor || getCompanyColor(line.company);
  const size = active ? 24 : 20;
  const pulseClass = active ? "bus-marker-pulse" : "";
  const html = `
        <div class="bus-marker ${pulseClass}" style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 8px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: ${size * 0.6}px;
        " title="${line.id} - ${line.nome}">
            ${line.id}
        </div>
    `;
  const icon = L.divIcon({
    html,
    className: "bus-marker-icon",
    iconSize: [size + 6, size + 6],
    iconAnchor: [size / 2 + 3, size / 2 + 3]
  });
  return L.marker([lat, lng], { icon, zIndexOffset: active ? 1e3 : 500 });
}
function createStopMarker(lat, lng, options = {}) {
  const { name = "", sequence = "", isTerminal = false } = options;
  const size = isTerminal ? 16 : 12;
  const color = isTerminal ? "#ff9800" : "#4caf50";
  const symbol = isTerminal ? "\u{1F3C1}" : "\u25CF";
  const html = `
        <div class="stop-marker" style="
            font-size: ${size}px;
            color: ${color};
            text-shadow: 0 0 4px white;
            line-height: 1;
        " title="${name}">
            ${symbol}
        </div>
    `;
  const icon = L.divIcon({
    html,
    className: "stop-marker-icon",
    iconSize: [size * 1.5, size * 1.5],
    iconAnchor: [size * 0.75, size * 0.75]
  });
  return L.marker([lat, lng], { icon, zIndexOffset: 300 });
}
function createTerminalMarker(lat, lng, name = "Terminal") {
  return createStopMarker(lat, lng, { name, isTerminal: true });
}
function createUserMarker(lat, lng, accuracy = null) {
  const html = `
        <div class="user-marker" style="
            background: #1a73e8;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px #1a73e8;
        " title="Sua localiza\xE7\xE3o">
        </div>
    `;
  const icon = L.divIcon({
    html,
    className: "user-marker-icon",
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  const marker = L.marker([lat, lng], { icon, zIndexOffset: 2e3 });
  if (accuracy && accuracy > 0) {
    marker.accuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      stroke: false,
      fillColor: "#1a73e8",
      fillOpacity: 0.15
    });
  }
  return marker;
}
function createRoutePointMarker(lat, lng, index) {
  const html = `
        <div class="route-point-marker" style="
            background: #ff5722;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 6px #ff5722;
            font-size: 8px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        " title="Ponto ${index}">
            ${index}
        </div>
    `;
  const icon = L.divIcon({
    html,
    className: "route-point-marker-icon",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
  return L.marker([lat, lng], { icon, draggable: true });
}
function createCircleMarker(lat, lng, radius, color = "#1a73e8") {
  return L.circle([lat, lng], {
    radius,
    stroke: true,
    color,
    weight: 2,
    opacity: 0.7,
    fillColor: color,
    fillOpacity: 0.1
  });
}
function createCustomMarker(lat, lng, html, iconOptions = {}) {
  const defaultOptions = {
    className: "custom-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  };
  const icon = L.divIcon({ ...defaultOptions, ...iconOptions, html });
  return L.marker([lat, lng], { icon });
}
if (typeof window !== "undefined") {
  window.mapMarkers = {
    createBusMarker,
    createStopMarker,
    createTerminalMarker,
    createUserMarker,
    createRoutePointMarker,
    createCircleMarker,
    createCustomMarker
  };
}

// admin/mapEditor/geometryTools.js
var turf2 = window.turf || null;
function computePathLength(path) {
  if (!path || path.length < 2) return 0;
  if (turf2) {
    try {
      const line = turf2.lineString(path);
      return turf2.length(line, { units: "meters" });
    } catch (e) {
      console.warn("Turf length calculation failed:", e);
    }
  }
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [lat1, lng1] = path[i - 1];
    const [lat2, lng2] = path[i];
    total += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return total;
}
function computePolygonArea(rings) {
  if (!rings || rings.length === 0) return 0;
  if (turf2) {
    try {
      const polygon = turf2.polygon(rings);
      return turf2.area(polygon);
    } catch (e) {
      console.warn("Turf area calculation failed:", e);
    }
  }
  console.warn("Turf not available; polygon area fallback not implemented");
  return 0;
}
function measureDistance(lat1, lng1, lat2, lng2) {
  if (turf2) {
    const from = turf2.point([lng1, lat1]);
    const to = turf2.point([lng2, lat2]);
    return turf2.distance(from, to, { units: "meters" });
  }
  return haversineDistance(lat1, lng1, lat2, lng2);
}
function nearestPointOnLine(point, line) {
  if (!turf2 || line.length < 2) {
    return { point, distance: 0, index: 0 };
  }
  const turfLine = turf2.lineString(line);
  const turfPoint = turf2.point([point[1], point[0]]);
  const snapped = turf2.nearestPointOnLine(turfLine, turfPoint);
  return {
    point: [snapped.geometry.coordinates[1], snapped.geometry.coordinates[0]],
    distance: snapped.properties.dist,
    index: snapped.properties.index
  };
}
function simplifyPath(path, tolerance = 10) {
  if (!turf2 || path.length < 3) return path;
  const line = turf2.lineString(path);
  const simplified = turf2.simplify(line, { tolerance: tolerance / 1e3, highQuality: true });
  return simplified.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
}
function pointInPolygon(point, polygon) {
  if (!turf2) {
    return rayCasting(point, polygon);
  }
  const turfPolygon = turf2.polygon([polygon]);
  const turfPoint = turf2.point([point[1], point[0]]);
  return turf2.booleanPointInPolygon(turfPoint, turfPolygon);
}
function computeCentroid(coords) {
  if (!turf2 || coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];
  const line = turf2.lineString(coords);
  const centroid = turf2.centroid(line);
  const [lng, lat] = centroid.geometry.coordinates;
  return [lat, lng];
}
function createBuffer(center, radius, steps = 32) {
  if (!turf2) {
    return approximateCircle(center, radius, steps);
  }
  const point = turf2.point([center[1], center[0]]);
  const buffered = turf2.buffer(point, radius / 1e3, { units: "kilometers" });
  const coordinates = buffered.geometry.coordinates[0];
  return coordinates.map((coord) => [coord[1], coord[0]]);
}
function validateGeometry(path, stops, terminals, constraints) {
  const errors = [];
  if (!turf2) return errors;
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const from = turf2.point([stops[i].lng, stops[i].lat]);
      const to = turf2.point([stops[j].lng, stops[j].lat]);
      const distance = turf2.distance(from, to, { units: "meters" });
      if (distance < constraints.MIN_DISTANCE_BETWEEN_STOPS) {
        errors.push(`Paradas ${i + 1} e ${j + 1} est\xE3o muito pr\xF3ximas (${distance.toFixed(1)} m).`);
      }
    }
  }
  if (path.length >= 2) {
    const routeLine = turf2.lineString(path);
    stops.forEach((stop, idx) => {
      const stopPoint = turf2.point([stop.lng, stop.lat]);
      const distance = turf2.pointToLineDistance(stopPoint, routeLine, { units: "meters" });
      if (distance > constraints.MAX_DISTANCE_FROM_ROUTE) {
        errors.push(`Parada ${idx + 1} est\xE1 muito longe do trajeto (${distance.toFixed(1)} m).`);
      }
    });
  }
  return errors;
}
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const \u03C61 = lat1 * Math.PI / 180;
  const \u03C62 = lat2 * Math.PI / 180;
  const \u0394\u03C6 = (lat2 - lat1) * Math.PI / 180;
  const \u0394\u03BB = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(\u0394\u03C6 / 2) * Math.sin(\u0394\u03C6 / 2) + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) * Math.sin(\u0394\u03BB / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function rayCasting(point, polygon) {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function approximateCircle(center, radius, steps) {
  const [lat, lng] = center;
  const points = [];
  const earthRadius = 6371e3;
  const angularDistance = radius / earthRadius;
  for (let i = 0; i < steps; i++) {
    const angle = i * 2 * Math.PI / steps;
    const latRad = lat * Math.PI / 180;
    const lngRad = lng * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(angle));
    const lng2 = lngRad + Math.atan2(
      Math.sin(angle) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat2)
    );
    points.push([lat2 * 180 / Math.PI, lng2 * 180 / Math.PI]);
  }
  points.push(points[0]);
  return points;
}
function isTurfAvailable() {
  return !!turf2;
}
if (typeof window !== "undefined") {
  window.geometryTools = {
    computePathLength,
    computePolygonArea,
    measureDistance,
    nearestPointOnLine,
    simplifyPath,
    pointInPolygon,
    computeCentroid,
    createBuffer,
    validateGeometry,
    isTurfAvailable
  };
}

// services/geoService.js
var GEOCODING_API = "https://nominatim.openstreetmap.org/search";
var REVERSE_GEOCODING_API = "https://nominatim.openstreetmap.org/reverse";
var ROUTING_API = "https://router.project-osrm.org/route/v1";
var geocodingCache = /* @__PURE__ */ new Map();
var reverseGeocodingCache = /* @__PURE__ */ new Map();
async function geocode(query3, options = {}) {
  const cacheKey = JSON.stringify({ query: query3, options });
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey);
  }
  const params = new URLSearchParams({
    q: query3,
    format: "json",
    limit: options.limit || 5,
    countrycodes: options.countrycodes || "br",
    "accept-language": "pt-BR"
  });
  if (options.viewbox) {
    params.append("viewbox", options.viewbox.join(","));
  }
  try {
    const response = await fetch(`${GEOCODING_API}?${params}`);
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    const results = await response.json();
    const formatted = results.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
      type: r.type,
      importance: r.importance
    }));
    geocodingCache.set(cacheKey, formatted);
    return formatted;
  } catch (error) {
    console.error("Geocoding failed:", error);
    return [];
  }
}
async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat},${lng}`;
  if (reverseGeocodingCache.has(cacheKey)) {
    return reverseGeocodingCache.get(cacheKey);
  }
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: "json",
    "accept-language": "pt-BR",
    zoom: 18
  });
  try {
    const response = await fetch(`${REVERSE_GEOCODING_API}?${params}`);
    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }
    const data = await response.json();
    const address = {
      lat,
      lng,
      displayName: data.display_name,
      address: data.address,
      osmId: data.osm_id,
      type: data.type
    };
    reverseGeocodingCache.set(cacheKey, address);
    return address;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}
async function route(points, options = {}) {
  if (!points || points.length < 2) {
    throw new Error("At least two points are required for routing");
  }
  const profile = options.profile || "driving";
  const coordinates = points.map((p) => `${p[1]},${p[0]}`).join(";");
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    steps: "true",
    annotations: "false"
  });
  try {
    const response = await fetch(
      `${ROUTING_API}/${profile}/${coordinates}?${params}`
    );
    if (!response.ok) {
      throw new Error(`Routing API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== "Ok") {
      console.warn("Routing API returned non\u2011OK:", data);
      return null;
    }
    const route2 = data.routes[0];
    const geometry = route2.geometry;
    const distance = route2.distance;
    const duration = route2.duration;
    const steps = route2.legs.flatMap((leg) => leg.steps);
    return { geometry, distance, duration, steps };
  } catch (error) {
    console.error("Routing failed:", error);
    return null;
  }
}
function computeGeohash(lat, lng, precision = 9) {
  if (typeof window.geohash === "function") {
    return window.geohash.encode(lat, lng, precision);
  }
  console.warn("Geohash library not loaded");
  return "";
}
function decodeGeohash(geohash) {
  if (typeof window.geohash === "function") {
    return window.geohash.decode(geohash);
  }
  console.warn("Geohash library not loaded");
  return { lat: 0, lng: 0, bounds: { n: 0, s: 0, e: 0, w: 0 } };
}
function computeBoundingBox(points) {
  if (!points || points.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }
  let north = -90, south = 90, east = -180, west = 180;
  points.forEach(([lat, lng]) => {
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  });
  return { north, south, east, west };
}
function pointInBoundingBox(point, bbox) {
  const [lat, lng] = point;
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}
function computeCentroid2(points) {
  if (!points || points.length === 0) return [0, 0];
  let sumLat = 0, sumLng = 0;
  points.forEach(([lat, lng]) => {
    sumLat += lat;
    sumLng += lng;
  });
  return [sumLat / points.length, sumLng / points.length];
}
async function snapToRoad(point) {
  console.warn("snapToRoad not fully implemented \u2013 returning original point");
  return point;
}
function computePathLength2(path) {
  return computePathLength(path);
}
function computeDistance(lat1, lng1, lat2, lng2) {
  return measureDistance(lat1, lng1, lat2, lng2);
}
function formatDistance(meters) {
  if (meters < 1e3) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1e3).toFixed(1).replace(".", ",")} km`;
  }
}
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)} seg`;
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round(seconds % 3600 / 60);
    return `${hours} h ${minutes} min`;
  }
}
if (typeof window !== "undefined") {
  window.geoService = {
    geocode,
    reverseGeocode,
    route,
    computeGeohash,
    decodeGeohash,
    computeBoundingBox,
    pointInBoundingBox,
    computeCentroid: computeCentroid2,
    snapToRoad,
    computePathLength: computePathLength2,
    computeDistance,
    formatDistance,
    formatDuration
  };
}

// ui/mapUI/mapPopups.js
function createBusPopup(bus, gps = {}) {
  const time = gps.timestamp ? new Date(gps.timestamp).toLocaleTimeString("pt-BR") : "Desconhecido";
  const accuracy = gps.accuracy ? `${gps.accuracy.toFixed(0)} m` : "N/A";
  const speed = bus.speed ? `${bus.speed.toFixed(1)} km/h` : "N/A";
  const direction = bus.direction ? `${bus.direction}\xB0` : "N/A";
  return `
        <div class="bus-popup" style="font-family: 'Inter', sans-serif; min-width: 200px;">
            <div class="fw-bold mb-2" style="color: #1a73e8;">${bus.lineId} - ${bus.lineName}</div>
            <div class="small text-muted mb-2">${bus.via || "Via principal"}</div>
            
            <table class="table table-sm table-borderless mb-2">
                <tr>
                    <td class="small text-muted">\xDAltima transmiss\xE3o:</td>
                    <td class="small fw-bold">${time}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Precis\xE3o:</td>
                    <td class="small fw-bold">${accuracy}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Velocidade:</td>
                    <td class="small fw-bold">${speed}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Dire\xE7\xE3o:</td>
                    <td class="small fw-bold">${direction}</td>
                </tr>
            </table>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.startTrack('${bus.lineKey}')">
                    <i class="bi bi-play-circle"></i> Transmitir
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.toggleSidebar()">
                    <i class="bi bi-info-circle"></i> Detalhes
                </button>
            </div>
        </div>
    `;
}
function createStopPopup(stop) {
  const isTerminal = stop.type === "terminal";
  const icon = isTerminal ? "\u{1F3C1}" : "\u25CF";
  const typeText = isTerminal ? "Terminal" : "Parada";
  return `
        <div class="stop-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-1">${icon} ${stop.name || typeText} ${stop.sequence ? `#${stop.sequence}` : ""}</div>
            <div class="small text-muted mb-2">${typeText} \u2022 Linha ${stop.routeId || "N/A"}</div>
            
            ${stop.description ? `<p class="small mb-2">${stop.description}</p>` : ""}
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.openRouteManager()">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteStop('${stop.id}')">
                    <i class="bi bi-trash"></i> Remover
                </button>
            </div>
        </div>
    `;
}
function createTerminalPopup(terminal) {
  return createStopPopup({ ...terminal, type: "terminal" });
}
function createUserPopup(user) {
  const time = user.timestamp ? new Date(user.timestamp).toLocaleTimeString("pt-BR") : "Agora";
  const accuracy = user.accuracy ? `${user.accuracy.toFixed(0)} m` : "Desconhecida";
  return `
        <div class="user-popup" style="font-family: 'Inter', sans-serif; min-width: 200px;">
            <div class="fw-bold mb-2">Sua localiza\xE7\xE3o</div>
            <div class="small text-muted mb-2">Transmitindo GPS em tempo real</div>
            
            <table class="table table-sm table-borderless mb-2">
                <tr>
                    <td class="small text-muted">Latitude:</td>
                    <td class="small fw-bold">${user.lat.toFixed(6)}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Longitude:</td>
                    <td class="small fw-bold">${user.lng.toFixed(6)}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Precis\xE3o:</td>
                    <td class="small fw-bold">${accuracy}</td>
                </tr>
                <tr>
                    <td class="small text-muted">Atualizado:</td>
                    <td class="small fw-bold">${time}</td>
                </tr>
            </table>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.geoCenter()">
                    <i class="bi bi-geo"></i> Centralizar
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.stopTrack()">
                    <i class="bi bi-stop-circle"></i> Parar transmiss\xE3o
                </button>
            </div>
        </div>
    `;
}
function createRoutePointPopup(point) {
  return `
        <div class="route-point-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-2">Ponto ${point.index} do trajeto</div>
            <div class="small text-muted mb-2">Lat: ${point.lat.toFixed(6)}<br>Lng: ${point.lng.toFixed(6)}</div>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.moveRoutePoint(${point.index})">
                    <i class="bi bi-arrows-move"></i> Mover
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteRoutePoint(${point.index})">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
}
function createCirclePopup(circle) {
  const area = circle.area ? formatDistance(circle.area) : "N/A";
  const radius = circle.radius ? formatDistance(circle.radius) : "N/A";
  return `
        <div class="circle-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-2">Raio de cobertura</div>
            <div class="small text-muted mb-2">Raio: ${radius}<br>\xC1rea: ${area}</div>
            
            <div class="d-flex justify-content-between mt-2">
                <button class="btn btn-sm btn-outline-primary" onclick="window.adjustRadius()">
                    <i class="bi bi-sliders"></i> Ajustar
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.removeCircle()">
                    <i class="bi bi-x-circle"></i> Remover
                </button>
            </div>
        </div>
    `;
}
function createCustomPopup(title, body, buttons = []) {
  const buttonsHtml = buttons.map((btn) => `
        <button class="btn btn-sm ${btn.class || "btn-outline-primary"}" onclick="${btn.onClick}">
            ${btn.label}
        </button>
    `).join("");
  return `
        <div class="custom-popup" style="font-family: 'Inter', sans-serif; min-width: 180px;">
            <div class="fw-bold mb-2">${title}</div>
            <div class="small text-muted mb-2">${body}</div>
            ${buttonsHtml ? `<div class="d-flex justify-content-between mt-2">${buttonsHtml}</div>` : ""}
        </div>
    `;
}
if (typeof window !== "undefined") {
  window.mapPopups = {
    createBusPopup,
    createStopPopup,
    createTerminalPopup,
    createUserPopup,
    createRoutePointPopup,
    createCirclePopup,
    createCustomPopup
  };
}

// modules/buses/busRenderer.js
function cleanupDeletedLineMarkers(configLinhas) {
  if (!state.map) return;
  const now = Date.now();
  for (const key in state.markers) {
    if (!configLinhas[key]) {
      console.log("Removing marker for deleted line:", key);
      removeLayer(LAYER.BUS, state.markers[key]);
      delete state.markers[key];
    }
  }
}
function renderBusMarkers(gpsData, configLinhas) {
  if (!state.map) {
    console.warn("Map not initialized yet");
    return;
  }
  ensureLayerGroup(LAYER.BUS);
  console.log(`renderBusMarkers called with ${Object.keys(configLinhas).length} lines, ${Object.keys(gpsData).length} active GPS datasets`);
  console.log(`Current systemTTL: ${state.systemTTL}ms, systemRadius: ${state.systemRadius || 5}km`);
  const now = Date.now();
  let userPosition = null;
  if (window.pointerService && window.pointerService.getPointerPosition) {
    userPosition = window.pointerService.getPointerPosition();
    console.log("User position for radius filtering:", userPosition);
  }
  for (const key in state.markers) {
    let shouldRemove = false;
    if (!configLinhas[key]) {
      shouldRemove = true;
      console.log(`Line ${key} removed from config, marking marker for removal`);
    } else {
      const lineGps = gpsData[key];
      let hasActive = false;
      if (lineGps) {
        console.log(`Line ${key} has ${Object.keys(lineGps).length} GPS entries`);
        for (const uid in lineGps) {
          const gpsData2 = lineGps[uid];
          const accuracy = gpsData2.acc || gpsData2.accuracy || 0;
          const age = now - gpsData2.timestamp;
          if (age < (state.systemTTL || 45e3) && accuracy <= 200) {
            hasActive = true;
            console.log(`Line ${key} has active GPS: age=${age}ms, accuracy=${accuracy}m`);
            break;
          } else {
            console.log(`Line ${key} GPS rejected: age=${age}ms (TTL=${state.systemTTL}), accuracy=${accuracy}m (max=200)`);
          }
        }
      } else {
        console.log(`Line ${key} has no GPS data`);
      }
      if (!hasActive) {
        shouldRemove = true;
        console.log(`Line ${key} has no active GPS, marking marker for removal`);
      }
    }
    if (shouldRemove) {
      removeLayer(LAYER.BUS, state.markers[key]);
      delete state.markers[key];
      console.log(`Removed marker for line ${key}`);
    }
  }
  console.log("GPS data keys:", Object.keys(gpsData));
  console.log("Config lines:", Object.keys(configLinhas).map((k) => `${k}: ${configLinhas[k].id}`));
  for (const key in configLinhas) {
    const c = configLinhas[key];
    let latA = 0, lngA = 0, cnt = 0;
    console.log(`Processing line ${key} (${c.id})`);
    if (gpsData[key]) {
      console.log(`  Has GPS data: ${Object.keys(gpsData[key]).length} users`);
      for (const uid in gpsData[key]) {
        const gpsPoint = gpsData[key][uid];
        const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
        const age = now - gpsPoint.timestamp;
        if (age < (state.systemTTL || 45e3) && accuracy <= 200) {
          latA += gpsPoint.lat;
          lngA += gpsPoint.lng;
          cnt++;
          console.log(`    Included: user ${uid}, accuracy=${accuracy}m, age=${age}ms`);
        } else {
          console.log(`    Excluded: user ${uid}, accuracy=${accuracy}m, age=${age}ms`);
        }
      }
    } else {
      console.log(`  No GPS data for this line`);
    }
    if (cnt > 0) {
      let adjustColorBrightness = function(color, percent) {
        let hex = color.replace("#", "");
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        r = Math.max(0, Math.min(255, r + r * percent / 100));
        g = Math.max(0, Math.min(255, g + g * percent / 100));
        b = Math.max(0, Math.min(255, b + b * percent / 100));
        const toHex = (c2) => {
          const hex2 = Math.round(c2).toString(16);
          return hex2.length === 1 ? "0" + hex2 : hex2;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }, closeBusDetailsCard = function() {
        try {
          const container = document.getElementById("bus-details-container");
          if (container) {
            container.style.display = "none";
          }
          const statusDisplay = document.getElementById("status-display");
          if (statusDisplay) {
            statusDisplay.style.display = "block";
          }
          console.log("Bus details card closed, restored default display");
        } catch (error) {
          console.error("Error closing bus details card:", error);
        }
      }, showBusDetails = function(lineKey) {
        try {
          const lineConfig = state.configLinhas[lineKey];
          if (!lineConfig) {
            console.error("Line configuration not found for key:", lineKey);
            return;
          }
          const comp2 = COMPANIES[lineConfig.company || "atlantico"];
          let activeCount = 0;
          let lat = 0, lng = 0;
          const gpsData2 = state.gpsData || {};
          if (gpsData2[lineKey]) {
            const now2 = Date.now();
            for (let uid in gpsData2[lineKey]) {
              const gpsPoint = gpsData2[lineKey][uid];
              const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
              if (now2 - gpsPoint.timestamp < (state.systemTTL || 45e3) && accuracy <= 200) {
                activeCount++;
                lat += gpsPoint.lat;
                lng += gpsPoint.lng;
              }
            }
            if (activeCount > 0) {
              lat = lat / activeCount;
              lng = lng / activeCount;
            }
          }
          if (window.updateBusDetailsCard) {
            updateBusDetailsCard(lineKey, lineConfig, comp2, activeCount, lat, lng);
          }
        } catch (error) {
          console.error("Error showing bus details:", error);
        }
      };
      const mLat = latA / cnt;
      const mLng = lngA / cnt;
      const comp = COMPANIES[c.company || "atlantico"];
      let withinRadius = true;
      if (userPosition && state.systemRadius) {
        const distanceMeters = getDistanceMeters(
          userPosition.lat,
          userPosition.lng,
          mLat,
          mLng
        );
        const distanceKm = distanceMeters / 1e3;
        const radiusKm = state.systemRadius || 5;
        withinRadius = distanceKm <= radiusKm;
        console.log(`Line ${c.id}: distance=${distanceKm.toFixed(2)}km, radius=${radiusKm}km, withinRadius=${withinRadius}`);
        if (!withinRadius) {
          console.log(`Line ${c.id} is outside ${radiusKm}km radius, skipping marker`);
          if (state.markers[key]) {
            removeLayer(LAYER.BUS, state.markers[key]);
            delete state.markers[key];
            console.log(`Removed marker for line ${key} (outside radius)`);
          }
          continue;
        }
      }
      console.log(`Line ${c.id}: ${cnt} active GPS points, average position ${mLat.toFixed(6)}, ${mLng.toFixed(6)}`);
      const busIcon = null;
      if (state.markers[key]) {
        state.markers[key].setLatLng([mLat, mLng]);
        console.log(`Updated bus marker for line ${c.id} at ${mLat.toFixed(6)}, ${mLng.toFixed(6)}`);
      } else {
        let firstGps = null;
        if (gpsData[key]) {
          const entries = Object.values(gpsData[key]);
          for (const gps2 of entries) {
            if (gps2.acc <= 200 && now - gps2.timestamp < (state.systemTTL || 45e3)) {
              firstGps = gps2;
              break;
            }
          }
        }
        const bus = {
          lineId: c.id,
          lineName: c.nome,
          via: c.via,
          company: c.company,
          speed: firstGps ? firstGps.speed : void 0,
          direction: firstGps ? firstGps.heading : void 0,
          lineKey: key
        };
        const gps = firstGps ? { accuracy: firstGps.acc, timestamp: firstGps.timestamp } : {};
        const marker = createBusMarker(mLat, mLng, c, true);
        marker.zIndexOffset = 3e3;
        addLayer(LAYER.BUS, marker);
        console.log(`Created new bus marker for line ${c.id} at ${mLat.toFixed(6)}, ${mLng.toFixed(6)} with color ${c.cor}`);
        marker.bindPopup(createBusPopup(bus, gps));
        marker.on("click", () => {
          updateBusDetailsCard(key, c, comp, cnt, mLat, mLng);
        });
        state.markers[key] = marker;
      }
      async function getStreetNameFromCoords(lat, lng) {
        if (lat === 0 && lng === 0) return "Localiza\xE7\xE3o GPS";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.address) {
            if (data.address.road) {
              return data.address.road;
            }
            if (data.address.neighbourhood) {
              return data.address.neighbourhood;
            }
            if (data.address.suburb) {
              return data.address.suburb;
            }
            if (data.address.city) {
              return data.address.city;
            }
          }
          const latDir = lat >= 0 ? "N" : "S";
          const lngDir = lng >= 0 ? "E" : "W";
          return `${Math.abs(lat).toFixed(6)}\xB0${latDir}, ${Math.abs(lng).toFixed(6)}\xB0${lngDir}`;
        } catch (error) {
          console.warn("Reverse geocoding failed:", error);
          const latDir = lat >= 0 ? "N" : "S";
          const lngDir = lng >= 0 ? "E" : "W";
          return `${Math.abs(lat).toFixed(6)}\xB0${latDir}, ${Math.abs(lng).toFixed(6)}\xB0${lngDir}`;
        }
      }
      async function updateBusDetailsCard(lineKey, lineConfig, company, activeCount, lat, lng) {
        try {
          console.log(`updateBusDetailsCard called for line ${lineConfig.id}, setting data-bus-selected=true`);
          let streetLocation = "Localiza\xE7\xE3o GPS";
          if (lat !== 0 && lng !== 0) {
            streetLocation = await getStreetNameFromCoords(lat, lng);
          }
          const routeInfo = lineConfig.via || "Trajeto principal";
          const isDelayed = true;
          const hasAC = lineConfig.id.includes("2") || lineConfig.id.includes("7") || Math.random() > 0.5;
          const hasAccessibility = lineConfig.id.includes("1") || lineConfig.id.includes("6") || Math.random() > 0.3;
          const hasWiFi = lineConfig.id.includes("3") || lineConfig.id.includes("8") || Math.random() > 0.4;
          const acStatus = hasAC ? Math.random() > 0.2 ? "OK" : "NOK" : null;
          const accessibilityStatus = hasAccessibility ? "OK" : null;
          const wifiStatus = hasWiFi ? "OK" : null;
          const container = document.getElementById("bus-details-container");
          if (!container) return;
          container.style.display = "block";
          const statusDisplay = document.getElementById("status-display");
          if (statusDisplay) {
            statusDisplay.style.display = "none";
          }
          const bottomCard = document.getElementById("bottom-info-card");
          if (bottomCard) {
            bottomCard.setAttribute("data-bus-selected", "true");
            console.log(`Set data-bus-selected=true on bottom card`);
          }
          document.getElementById("bus-line-code").textContent = lineConfig.id;
          document.getElementById("bus-destination").textContent = lineConfig.nome;
          document.getElementById("bus-company-logo").src = company.favicon;
          document.getElementById("bus-subtitle").textContent = routeInfo;
          const busLineBadge = document.getElementById("bus-line-badge");
          if (busLineBadge && lineConfig.cor) {
            const baseColor = lineConfig.cor;
            const darkerColor = adjustColorBrightness(baseColor, -30);
            busLineBadge.style.background = `linear-gradient(135deg, ${baseColor}, ${darkerColor})`;
            console.log(`Updated bus line badge color to ${baseColor}`);
          }
          const streetLocationElement = document.getElementById("bus-street-location");
          if (streetLocationElement) {
            streetLocationElement.innerHTML = `${streetLocation}`;
          }
          const lastTransmissionElement = document.getElementById("bus-last-transmission");
          const accuracyElement = document.getElementById("bus-accuracy");
          const speedElement = document.getElementById("bus-speed");
          const directionElement = document.getElementById("bus-direction");
          if (lastTransmissionElement && accuracyElement && speedElement && directionElement) {
            let lastTransmission = "Desconhecido";
            let accuracy = "N/A";
            let speed = "N/A";
            let direction = "N/A";
            if (state.gpsData && state.gpsData[lineKey]) {
              const now2 = Date.now();
              const entries = Object.values(state.gpsData[lineKey]);
              let latestGps = null;
              let latestTimestamp = 0;
              for (const gps of entries) {
                if (gps.timestamp > latestTimestamp && gps.acc <= 200 && now2 - gps.timestamp < (state.systemTTL || 45e3)) {
                  latestGps = gps;
                  latestTimestamp = gps.timestamp;
                }
              }
              if (latestGps) {
                lastTransmission = new Date(latestGps.timestamp).toLocaleTimeString("pt-BR");
                accuracy = `${latestGps.acc.toFixed(0)} m`;
                speed = latestGps.speed ? `${latestGps.speed.toFixed(1)} km/h` : "N/A";
                direction = latestGps.heading ? `${latestGps.heading}\xB0` : "N/A";
              }
            }
            lastTransmissionElement.textContent = lastTransmission;
            accuracyElement.textContent = accuracy;
            speedElement.textContent = speed;
            directionElement.textContent = direction;
          }
          const delaySection = document.getElementById("bus-delay-section");
          const delayBadge = document.getElementById("bus-delay-badge");
          const delayText = document.getElementById("bus-delay-text");
          if (isDelayed) {
            delaySection.style.display = "block";
            delayText.textContent = "Atrasado \u2022 15 min";
            delayBadge.className = "delay-badge";
          } else {
            delaySection.style.display = "none";
          }
          const acFeature = document.getElementById("ac-feature");
          const acStatusElement = document.getElementById("ac-status");
          if (hasAC && acStatus) {
            acFeature.style.display = "flex";
            acStatusElement.textContent = acStatus;
            acStatusElement.className = `feature-status ${acStatus === "OK" ? "text-success" : "text-warning"}`;
          } else {
            acFeature.style.display = "none";
          }
          const accessibilityFeature = document.getElementById("accessibility-feature");
          const accessibilityStatusElement = document.getElementById("accessibility-status");
          if (hasAccessibility && accessibilityStatus) {
            accessibilityFeature.style.display = "flex";
            accessibilityStatusElement.textContent = accessibilityStatus;
            accessibilityStatusElement.className = `feature-status ${accessibilityStatus === "OK" ? "text-success" : "text-warning"}`;
          } else {
            accessibilityFeature.style.display = "none";
          }
          const wifiFeature = document.getElementById("wifi-feature");
          const wifiStatusElement = document.getElementById("wifi-status");
          if (hasWiFi && wifiStatus) {
            wifiFeature.style.display = "flex";
            wifiStatusElement.textContent = wifiStatus;
            wifiStatusElement.className = `feature-status ${wifiStatus === "OK" ? "text-success" : "text-warning"}`;
          } else {
            wifiFeature.style.display = "none";
          }
          const featuresSection = document.getElementById("features-section");
          if (featuresSection) {
            if (hasAC && acStatus || hasAccessibility && accessibilityStatus || hasWiFi && wifiStatus) {
              featuresSection.style.display = "block";
            } else {
              featuresSection.style.display = "none";
            }
          }
          const statusDot = document.querySelector("#bus-status-indicator .status-dot");
          if (statusDot) {
            statusDot.className = `status-dot ${activeCount > 0 ? "active" : "inactive"}`;
          }
          if (window.toggleBottomCard && document.getElementById("bottom-info-card").classList.contains("minimized")) {
            window.toggleBottomCard();
          }
          console.log(`Bus details updated for line ${lineConfig.id}`);
        } catch (error) {
          console.error("Error updating bus details card:", error);
        }
      }
      window.updateBusDetailsCard = updateBusDetailsCard;
      window.showBusDetails = showBusDetails;
    } else {
      if (state.markers[key]) {
        state.map.removeLayer(state.markers[key]);
        delete state.markers[key];
        console.log(`Removed bus marker for line ${key} (no active GPS)`);
      }
    }
  }
}

// ui/panels/sidebar.js
var toggleSidebar = () => {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("sidebar-overlay").classList.toggle("active");
};
var switchView = (v) => {
  document.querySelectorAll(".sidebar-view").forEach((view) => view.classList.remove("active"));
  const target = document.getElementById("view-" + v);
  if (target) target.classList.add("active");
  if (v === "admin-dashboard" || v === "admin-settings") {
    setTimeout(() => {
      if (window.initAdminMonitor) {
        window.initAdminMonitor();
      }
      if (window.applyAdminSecurity) {
        window.applyAdminSecurity();
      }
      if (window.updateHealthMetricsDisplay) {
        window.updateHealthMetricsDisplay();
      }
      if (window.loadCurrentParameters) {
        window.loadCurrentParameters();
      }
    }, 100);
  }
  if (v !== "admin-dashboard" && v !== "admin-settings" && v !== "admin-lines" && v !== "admin-routes") {
    if (window.clearDebugMarker) {
      window.clearDebugMarker();
    }
  }
};
var toggleDrawer = () => {
  const isCol = document.getElementById("lines-drawer").classList.toggle("collapsed");
  document.getElementById("drawer-icon").className = isCol ? "bi bi-chevron-down" : "bi bi-chevron-up";
};
var toggleBottomCard = () => {
  const bottomCard = document.getElementById("bottom-info-card");
  const isMin = bottomCard.classList.toggle("minimized");
  const icon = document.getElementById("bottom-card-icon");
  if (icon) icon.className = isMin ? "bi bi-chevron-up" : "bi bi-chevron-down";
  const hasBusSelected = bottomCard.getAttribute("data-bus-selected") === "true";
  console.log(`toggleBottomCard: isMin=${isMin}, hasBusSelected=${hasBusSelected}, data-bus-selected="${bottomCard.getAttribute("data-bus-selected")}"`);
  const busDetailsContainer = document.getElementById("bus-details-container");
  const statusDisplay = document.getElementById("status-display");
  const busDetailsDisplay = busDetailsContainer ? window.getComputedStyle(busDetailsContainer).display : "N/A";
  const statusDisplayDisplay = statusDisplay ? window.getComputedStyle(statusDisplay).display : "N/A";
  console.log(`Current states: bus-details-container.display="${busDetailsDisplay}", status-display.display="${statusDisplayDisplay}"`);
  if (isMin) {
    if (hasBusSelected) {
      console.log("Bus was selected, clearing selection...");
      if (window.closeBusDetailsCard) {
        window.closeBusDetailsCard();
      } else {
        if (busDetailsContainer) {
          busDetailsContainer.style.display = "none";
          console.log("Manually hid bus details container");
        }
        if (statusDisplay) {
          statusDisplay.style.display = "block";
          console.log("Manually showed status display");
        }
        bottomCard.removeAttribute("data-bus-selected");
      }
      console.log("Bus selection cleared due to card minimization");
    } else {
      if (busDetailsContainer) {
        busDetailsContainer.style.display = "none";
        console.log("No bus selected, hiding bus details container");
      }
      if (statusDisplay) {
        statusDisplay.style.display = "block";
        console.log("No bus selected, showing status display");
      }
      bottomCard.removeAttribute("data-bus-selected");
    }
    console.log("Bottom card minimized, default display restored");
  } else {
    const currentHasBusSelected = bottomCard.getAttribute("data-bus-selected") === "true";
    console.log(`Expanding card, currentHasBusSelected=${currentHasBusSelected}`);
    if (!currentHasBusSelected) {
      if (busDetailsContainer) {
        busDetailsContainer.style.display = "none";
        console.log("Hiding bus details container (no bus selected)");
      }
      if (statusDisplay) {
        statusDisplay.style.display = "block";
        console.log("Showing status display (no bus selected)");
      }
      console.log("Bottom card expanded, showing default display (no bus selected)");
    } else {
      if (busDetailsContainer) {
        busDetailsContainer.style.display = "block";
        console.log("Showing bus details container (bus selected)");
      }
      if (statusDisplay) {
        statusDisplay.style.display = "none";
        console.log("Hiding status display (bus selected)");
      }
      console.log("Bottom card expanded, showing bus details (bus selected)");
    }
  }
  const finalBusDetailsDisplay = busDetailsContainer ? window.getComputedStyle(busDetailsContainer).display : "N/A";
  const finalStatusDisplayDisplay = statusDisplay ? window.getComputedStyle(statusDisplay).display : "N/A";
  console.log(`Final states: bus-details-container.display="${finalBusDetailsDisplay}", status-display.display="${finalStatusDisplayDisplay}"`);
};

// admin/mapEditor/routeEditor.js
init_firebaseService();
init_stateManager();
init_firestoreSchema();
import { doc as doc3, setDoc as setDoc3, collection as collection3, deleteDoc as deleteDoc3, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// admin/mapEditor/stopEditor.js
init_firebaseService();
init_firestoreSchema();
import { doc as doc2, setDoc as setDoc2, deleteDoc as deleteDoc2, collection as collection2, query as query2, where as where2, getDocs as getDocs2 } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
var currentMap = null;
var stopMarkers = null;
function initStopEditor(map2) {
  currentMap = map2;
  stopMarkers = ensureLayerGroup(LAYER.STOP);
}
async function loadStopsForRoute(routeId) {
  if (!currentMap) {
    console.error("Stop editor not initialized with map.");
    return;
  }
  clearStopMarkers();
  try {
    const stopsRef = collection2(firestore, COLLECTIONS.STOPS);
    const q = query2(stopsRef, where2(FIELD.STOP_ROUTE_ID, "==", routeId));
    const snapshot = await getDocs2(q);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const latLng = [data[FIELD.STOP_LOCATION].lat, data[FIELD.STOP_LOCATION].lng];
      const type = data[FIELD.STOP_TYPE];
      const name = data[FIELD.STOP_NAME] || (type === "terminal" ? "Terminal" : "Parada");
      const marker = L.marker(latLng, {
        icon: type === "terminal" ? L.divIcon({ html: "\u{1F3C1}", className: "fs-5" }) : L.divIcon({ html: "\u25CF", className: "fs-6", iconSize: [10, 10] })
      }).bindPopup(`
                <strong>${name}</strong><br/>
                ${type === "terminal" ? "Terminal" : "Parada"} ${data[FIELD.STOP_SEQUENCE] || ""}<br/>
                <button class="btn btn-sm btn-danger mt-1" onclick="window.deleteStop('${docSnap.id}')">Remover</button>
            `);
      marker.stopId = docSnap.id;
      stopMarkers.addLayer(marker);
    });
    console.log(`Loaded ${snapshot.size} stops for route ${routeId}`);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        lat: data[FIELD.STOP_LOCATION].lat,
        lng: data[FIELD.STOP_LOCATION].lng,
        type: data[FIELD.STOP_TYPE],
        name: data[FIELD.STOP_NAME] || "",
        description: data[FIELD.STOP_DESCRIPTION] || "",
        sequence: data[FIELD.STOP_SEQUENCE] || 0,
        isActive: data[FIELD.STOP_IS_ACTIVE] || true
      };
    });
  } catch (error) {
    console.error("Error loading stops:", error);
    return [];
  }
}
async function deleteStop(stopId) {
  try {
    await deleteDoc2(doc2(firestore, COLLECTIONS.STOPS, stopId));
    stopMarkers.eachLayer((layer) => {
      if (layer.stopId === stopId) {
        stopMarkers.removeLayer(layer);
      }
    });
    console.log(`Stop ${stopId} deleted.`);
  } catch (error) {
    console.error("Error deleting stop:", error);
    throw error;
  }
}
function clearStopMarkers() {
  stopMarkers.clearLayers();
}
window.deleteStop = deleteStop;

// admin/mapEditor/routeEditor.js
function onMapClickForRoute(e) {
  const { lat, lng } = e.latlng;
  if (!state.routeDraft.lineKey) return alert("Selecione uma linha!");
  if (state.routeMode === "path") {
    state.routeDraft.path.push([lat, lng]);
    state.draftPolyline.setLatLngs(state.routeDraft.path);
  } else if (state.routeMode === "stops") {
    state.routeDraft.stops.push({ lat, lng, id: Date.now() });
    L.circleMarker([lat, lng], { radius: 5, color: "#000", fillColor: "#fff", fillOpacity: 1 }).addTo(state.draftMarkers);
  } else if (state.routeMode === "terminal") {
    state.routeDraft.terminals.push({ lat, lng });
    L.marker([lat, lng], { icon: L.divIcon({ html: "\u{1F3C1}", className: "fs-5" }) }).addTo(state.draftMarkers);
  }
}
async function selectLineForRoute(key) {
  clearCurrentDraft();
  updateState("routeDraft", { ...state.routeDraft, lineKey: key });
  if (state.configLinhas[key]) state.draftPolyline.setStyle({ color: state.configLinhas[key].cor });
  try {
    const routeDoc = await getDoc(doc3(firestore, COLLECTIONS.ROUTES, key));
    let path = [];
    if (routeDoc.exists()) {
      const routeData = routeDoc.data();
      path = routeData[FIELD.ROUTE_PATH] || [];
      if (state.draftPolyline) state.draftPolyline.setLatLngs(path);
    }
    const stopData = await loadStopsForRoute(key);
    const stops = [];
    const terminals = [];
    stopData.forEach((stop) => {
      const stopObj = { lat: stop.lat, lng: stop.lng, id: stop.id };
      if (stop.type === "terminal") {
        terminals.push(stopObj);
      } else {
        stops.push(stopObj);
      }
    });
    updateState("routeDraft", {
      lineKey: key,
      path,
      stops,
      terminals
    });
  } catch (err) {
    console.error("Error loading route from Firestore:", err);
  }
  alert("Linha " + state.configLinhas[key].id);
}
async function saveRouteData() {
  if (!state.routeDraft.lineKey) return alert("Erro: nenhuma linha selecionada.");
  const lineKey = state.routeDraft.lineKey;
  const routePath = state.routeDraft.path;
  const stops = state.routeDraft.stops;
  const terminals = state.routeDraft.terminals;
  if (routePath.length < 2) {
    alert("A rota precisa de pelo menos dois pontos.");
    return;
  }
  if (window.turf) {
    const validationErrors = validateWithTurf(routePath, stops, terminals);
    if (validationErrors.length > 0) {
      alert("Valida\xE7\xF5es falharam:\n" + validationErrors.join("\n"));
      return;
    }
  }
  try {
    const routeDoc = doc3(firestore, COLLECTIONS.ROUTES, lineKey);
    await setDoc3(routeDoc, {
      [FIELD.ROUTE_LINE_ID]: lineKey,
      [FIELD.ROUTE_PATH]: routePath,
      [FIELD.ROUTE_LENGTH]: computeRouteLength(routePath),
      [FIELD.CREATED_AT]: (/* @__PURE__ */ new Date()).toISOString(),
      [FIELD.UPDATED_AT]: (/* @__PURE__ */ new Date()).toISOString()
    }, { merge: true });
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const stopId = `stop_${lineKey}_${i}`;
      const stopDoc = doc3(firestore, COLLECTIONS.STOPS, stopId);
      await setDoc3(stopDoc, {
        [FIELD.STOP_ROUTE_ID]: lineKey,
        [FIELD.STOP_LOCATION]: { lat: stop.lat, lng: stop.lng },
        [FIELD.STOP_GEOHASH]: computeGeohash2(stop.lat, stop.lng),
        [FIELD.STOP_TYPE]: "stop",
        [FIELD.STOP_SEQUENCE]: i,
        [FIELD.STOP_IS_ACTIVE]: true,
        [FIELD.CREATED_AT]: (/* @__PURE__ */ new Date()).toISOString(),
        [FIELD.UPDATED_AT]: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    }
    for (let i = 0; i < terminals.length; i++) {
      const term = terminals[i];
      const termId = `terminal_${lineKey}_${i}`;
      const termDoc = doc3(firestore, COLLECTIONS.STOPS, termId);
      await setDoc3(termDoc, {
        [FIELD.STOP_ROUTE_ID]: lineKey,
        [FIELD.STOP_LOCATION]: { lat: term.lat, lng: term.lng },
        [FIELD.STOP_GEOHASH]: computeGeohash2(term.lat, term.lng),
        [FIELD.STOP_TYPE]: "terminal",
        [FIELD.STOP_SEQUENCE]: i,
        [FIELD.STOP_IS_ACTIVE]: true,
        [FIELD.CREATED_AT]: (/* @__PURE__ */ new Date()).toISOString(),
        [FIELD.UPDATED_AT]: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    }
    alert("Geometria salva no Firestore!");
  } catch (error) {
    console.error("Erro ao salvar no Firestore:", error);
    alert("Erro ao salvar.");
  }
}
function clearCurrentDraft() {
  updateState("routeDraft", { lineKey: null, path: [], stops: [], terminals: [] });
  if (state.draftPolyline) state.draftPolyline.setLatLngs([]);
  if (state.draftMarkers) state.draftMarkers.clearLayers();
}
function computeGeohash2(lat, lng) {
  if (typeof window.geohash === "function") {
    return window.geohash.encode(lat, lng, 9);
  }
  console.warn("Geohash library not loaded, skipping geohash calculation.");
  return "";
}
function computeRouteLength(path) {
  if (!window.turf || path.length < 2) return 0;
  try {
    const line = turf.lineString(path);
    return turf.length(line, { units: "meters" });
  } catch (e) {
    console.warn("Turf length calculation failed:", e);
    return 0;
  }
}
function validateWithTurf(path, stops, terminals) {
  const errors = [];
  if (!window.turf) return errors;
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const from = turf.point([stops[i].lng, stops[i].lat]);
      const to = turf.point([stops[j].lng, stops[j].lat]);
      const distance = turf.distance(from, to, { units: "meters" });
      if (distance < VALIDATION.MIN_DISTANCE_BETWEEN_STOPS) {
        errors.push(`Paradas ${i + 1} e ${j + 1} est\xE3o muito pr\xF3ximas (${distance.toFixed(1)} m).`);
      }
    }
  }
  if (path.length >= 2) {
    const routeLine = turf.lineString(path);
    stops.forEach((stop, idx) => {
      const stopPoint = turf.point([stop.lng, stop.lat]);
      const distance = turf.pointToLineDistance(stopPoint, routeLine, { units: "meters" });
      if (distance > VALIDATION.MAX_DISTANCE_FROM_ROUTE) {
        errors.push(`Parada ${idx + 1} est\xE1 muito longe do trajeto (${distance.toFixed(1)} m).`);
      }
    });
  }
  return errors;
}

// core/app.js
import { ref as ref4, set as set2, onValue as onValue2, onDisconnect as onDisconnect2, remove as remove2, push } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
function initApp() {
  console.time("initApp total");
  console.time("initApp map");
  if (typeof L === "undefined") {
    console.error("Leaflet (L) is not defined. Make sure Leaflet script is loaded before this module.");
    document.getElementById("map").innerHTML = '<div style="padding: 20px; color: red;">Erro: Leaflet n\xE3o carregou. Verifique a conex\xE3o.</div>';
    return;
  }
  let map2;
  try {
    map2 = initMap("map");
  } catch (error) {
    console.error("Failed to initialize map:", error);
    document.getElementById("map").innerHTML = `<div style="padding: 20px; color: red;">Erro ao inicializar mapa: ${error.message}</div>`;
    return;
  }
  if (!map2) {
    console.error("Map initialization returned null/undefined");
    return;
  }
  state.map = map2;
  console.timeEnd("initApp map");
  console.time("initApp layers");
  initDefaultLayers();
  initMapControls(map2);
  initStopEditor(map2);
  console.timeEnd("initApp layers");
  if (window.mapControls && window.mapControls.hideLayerSwitcher) {
    console.log("Hiding layer switcher");
    window.mapControls.hideLayerSwitcher();
  }
  if (window.mapControls && window.mapControls.hideZoomControl) {
    console.log("Hiding zoom control");
    window.mapControls.hideZoomControl();
  }
  if (window.mapControls && window.mapControls.hideScaleControl) {
    console.log("Hiding scale control");
    window.mapControls.hideScaleControl();
  }
  if (window.mapControls && window.mapControls.hideFullscreenControl) {
    console.log("Hiding fullscreen control");
    window.mapControls.hideFullscreenControl();
  }
  if (window.mapControls && window.mapControls.hideLegend) {
    console.log("Hiding legend");
    window.mapControls.hideLegend();
  }
  try {
    const loadingIndicator = document.getElementById("map-loading");
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
  } catch (e) {
    console.log("Could not hide loading indicator:", e);
  }
  const adminModal = document.getElementById("adminModal");
  if (adminModal) {
    adminModal.addEventListener("shown.bs.modal", () => {
      if (window.mapControls && window.mapControls.showLayerSwitcher) window.mapControls.showLayerSwitcher();
      if (window.mapControls && window.mapControls.showZoomControl) window.mapControls.showZoomControl();
      if (window.mapControls && window.mapControls.showScaleControl) window.mapControls.showScaleControl();
      if (window.mapControls && window.mapControls.showFullscreenControl) window.mapControls.showFullscreenControl();
      if (window.mapControls && window.mapControls.showLegend) window.mapControls.showLegend();
    });
    adminModal.addEventListener("hidden.bs.modal", () => {
      if (window.mapControls && window.mapControls.hideLayerSwitcher) window.mapControls.hideLayerSwitcher();
      if (window.mapControls && window.mapControls.hideZoomControl) window.mapControls.hideZoomControl();
      if (window.mapControls && window.mapControls.hideScaleControl) window.mapControls.hideScaleControl();
      if (window.mapControls && window.mapControls.hideFullscreenControl) window.mapControls.hideFullscreenControl();
      if (window.mapControls && window.mapControls.hideLegend) window.mapControls.hideLegend();
    });
  }
  ensureLayerGroup(LAYER.ROUTE_DRAFT);
  try {
    state.draftPolyline = L.polyline([], { color: "#1a73e8", weight: 4 });
    addLayer(LAYER.ROUTE_DRAFT, state.draftPolyline);
    state.draftMarkers = L.layerGroup();
    addLayer(LAYER.ROUTE_DRAFT, state.draftMarkers);
  } catch (error) {
    console.warn("Failed to initialize draft elements:", error);
    state.draftPolyline = null;
    state.draftMarkers = null;
  }
  window.toggleSidebar = toggleSidebar;
  window.switchView = switchView;
  window.toggleDrawer = toggleDrawer;
  window.toggleBottomCard = toggleBottomCard;
  window.geoCenter = geoCenter;
  window.closeBusDetailsCard = function() {
    try {
      const container = document.getElementById("bus-details-container");
      if (container) {
        container.style.display = "none";
      }
      const statusDisplay = document.getElementById("status-display");
      if (statusDisplay) {
        statusDisplay.style.display = "block";
      }
      const bottomCard = document.getElementById("bottom-info-card");
      if (bottomCard) {
        bottomCard.removeAttribute("data-bus-selected");
      }
      console.log("Bus details card closed, restored default display");
    } catch (error) {
      console.error("Error closing bus details card:", error);
    }
  };
  window.fazerLogin = login;
  window.fazerLogout = logout;
  window.startTrack = startTrack;
  window.stopTrack = stopTrack;
  window.onActionClick = onActionClick;
  window.saveLine = saveLine2;
  window.openRouteManager = openRouteManager;
  window.closeRouteManager = closeRouteManager;
  window.setRouteMode = setRouteMode;
  window.selectLineForRoute = selectLineForRoute;
  window.saveRouteData = saveRouteData;
  window.clearCurrentDraft = clearCurrentDraft;
  window.selectCompany = selectCompany;
  window.randomizeColor = randomizeColor;
  window.clearAdminForm = clearAdminForm;
  window.loadLineForEdit = loadLineForEdit;
  window.toggleSimulatedData = toggleSimulatedData;
  subscribeToAuthChanges(handleAuthChange);
  const timeOffset = initTimeService();
  console.log("Time service initialized, offset:", timeOffset, "ms");
  initParametersListener();
  initPointerService();
  map2.on("click", function(e) {
    window.closeBusDetailsCard();
  });
  setTimeout(() => {
    const initialRadius = state.systemRadius || 5;
    if (window.updateBottomCardRadius) {
      window.updateBottomCardRadius(initialRadius);
    }
  }, 1e3);
  console.time("initApp data listeners");
  setupDataListeners();
  console.timeEnd("initApp data listeners");
  setTimeout(() => geoCenter(), 500);
  console.timeEnd("initApp total");
}
function geoCenter() {
  console.time("initApp geolocation");
  console.log("Starting geoCenter function...");
  if (!state.map) {
    console.error("Map not available in geoCenter");
    return;
  }
  navigator.geolocation.getCurrentPosition((p) => {
    const lat = p.coords.latitude;
    const lng = p.coords.longitude;
    const accuracy = p.coords.accuracy;
    console.log("Geolocation success:", { lat, lng, accuracy: accuracy + "m" });
    updateUserPointer(lat, lng, accuracy, true);
    centerMapOnPointer(lat, lng, 17);
    console.log("User pin created and map centered on user location");
    console.timeEnd("initApp geolocation");
  }, (error) => {
    console.warn("Geolocation error:", error);
    const defaultLat = -14.81929, defaultLng = -39.036015;
    centerMapOnPointer(defaultLat, defaultLng, 15);
    console.log("Geolocation failed, centered on default location");
    console.timeEnd("initApp geolocation");
  }, { enableHighAccuracy: true, timeout: 5e3, maximumAge: 0 });
}
function startTrack(key) {
  if (document.activeElement) document.activeElement.blur();
  updateState("currentLineKey", key);
  localStorage.setItem("busu_active_line", key);
  const modalEl = document.getElementById("modalLine");
  const modalInst = bootstrap.Modal.getInstance(modalEl);
  if (modalInst) modalInst.hide();
  iniciarGPS(key);
}
function onActionClick() {
  state.watchID ? stopTrack() : new bootstrap.Modal(document.getElementById("modalLine")).show();
}
async function handleAuthChange(u) {
  updateState("user", u);
  if (u) {
    document.getElementById("auth-area").innerHTML = `
            <div class="user-profile-card d-flex align-items-center p-3 mb-4">
                <div class="user-avatar-wrapper position-relative">
                    <img src="${u.photoURL}" width="40" class="rounded-circle user-avatar" alt="${u.displayName}">
                    <div class="user-status-indicator bg-success"></div>
                </div>
                <div class="user-info ms-3 flex-grow-1">
                    <div class="user-name fw-bold">${u.displayName.split(" ")[0]}</div>
                    <div class="user-email small text-muted">${u.email ? u.email.substring(0, 20) + (u.email.length > 20 ? "..." : "") : "Usu\xE1rio"}</div>
                </div>
                <button class="btn-logout btn btn-outline-light border-0 p-2 rounded-circle" onclick="window.fazerLogout()" title="Sair">
                    <i class="bi bi-box-arrow-right text-muted"></i>
                </button>
            </div>`;
    document.getElementById("action-btn").style.display = "flex";
    const isAdmin = await isUserAdmin(u);
    if (isAdmin) {
      document.getElementById("admin-entry").style.display = "block";
      document.querySelector("#admin-entry button").className = "btn-admin-panel w-100 py-3 fw-bold";
    } else {
      document.getElementById("admin-entry").style.display = "none";
    }
    if (localStorage.getItem("busu_active_line")) iniciarGPS(localStorage.getItem("busu_active_line"));
  } else {
    document.getElementById("auth-area").innerHTML = `
            <div class="auth-promo-card text-center p-4 mb-4">
                <div class="auth-icon mb-3">
                    <i class="bi bi-shield-check display-4 text-primary"></i>
                </div>
                <h6 class="fw-bold mb-2">Acesse sua conta</h6>
                <p class="small text-muted mb-3">Fa\xE7a login para contribuir com dados em tempo real e acessar recursos exclusivos.</p>
                <button class="btn-login-modern w-100 py-3 fw-bold" onclick="window.fazerLogin()">
                    <i class="bi bi-google me-2"></i> Continuar com Google
                </button>
                <div class="mt-3 small text-muted">
                    <i class="bi bi-lock me-1"></i> Seus dados est\xE3o seguros
                </div>
            </div>`;
    document.getElementById("action-btn").style.display = "none";
    document.getElementById("admin-entry").style.display = "none";
  }
}
function setupDataListeners() {
  subscribeLines((lines) => {
    try {
      const grid = document.getElementById("line-selection-grid");
      const admList = document.getElementById("admin-lines-list-crud");
      const routeAdminList = document.getElementById("route-admin-list");
      const plan = document.getElementById("planning-all-lines");
      if (grid) grid.innerHTML = "";
      if (admList) admList.innerHTML = "";
      if (routeAdminList) routeAdminList.innerHTML = "";
      if (plan) plan.innerHTML = "";
      let countL = 0;
      for (let key in lines) {
        const line = lines[key];
        const c = {
          id: line.lineId,
          nome: line.name,
          via: line.via,
          cor: line.color,
          company: line.company
        };
        state.configLinhas[key] = c;
        countL++;
        const comp = COMPANIES[c.company || "atlantico"];
        const isActive = state.activeLineKeys && state.activeLineKeys.includes(key);
        const hasAC = c.id.includes("2") || c.id.includes("7");
        const hasAccessibility = c.id.includes("1") || c.id.includes("6");
        const acFeature = hasAC ? '<span class="feature-badge ac"><i class="bi bi-snow"></i> AR</span>' : "";
        const accessibilityFeature = hasAccessibility ? '<span class="feature-badge accessibility"><i class="bi bi-wheelchair"></i> ACESS</span>' : "";
        if (grid) {
          grid.innerHTML += `
                    <div class="line-card" onclick="window.startTrack('${key}')" data-line-id="${c.id}" data-line-name="${c.nome}" data-line-route="${c.via}" data-line-key="${key}" data-line-active="${isActive}">
                        <div class="line-status ${isActive ? "active" : "inactive"}"></div>
                        <div class="line-card-header">
                            <div class="line-code">${c.id}</div>
                            <div class="line-destination">${c.nome}</div>
                            <img src="${comp.favicon}" class="line-company-logo" alt="${c.company}">
                        </div>
                        <div class="line-route">${c.via || "Via principal"}</div>
                        <div class="line-features">
                            ${acFeature}
                            ${accessibilityFeature}
                        </div>
                    </div>
                `;
        }
        if (admList) {
          admList.innerHTML += `
                    <div class="list-group-item bus-item border-bottom px-0" onclick="window.loadLineForEdit('${key}')">
                        <div class="d-flex align-items-center flex-grow-1">
                            <img src="${comp.favicon}" class="bus-logo-mini">
                            <div><div class="bus-title">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div>
                        </div>
                        <i class="bi bi-trash text-danger ms-auto px-2 fs-5" onclick="event.stopPropagation(); deleteLineFirestore('${key}')"></i>
                    </div>`;
        }
        if (routeAdminList) {
          routeAdminList.innerHTML += `<div class="list-group-item adm-route-item p-2 small border-bottom" onclick="window.selectLineForRoute('${key}')"><img src="${comp.favicon}" width="12" class="me-2"><b>${c.id}</b> - ${c.via}</div>`;
        }
        if (plan) {
          plan.innerHTML += `<button class="nav-item-custom border-bottom" onclick="if(state.markers['${key}']) state.map.flyTo(state.markers['${key}'].getLatLng(), 17); window.toggleSidebar();"><img src="${comp.favicon}" class="bus-logo-mini"><div><div class="fw-bold">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div></button>`;
        }
      }
      const statLinesElement = document.getElementById("stat-lines");
      if (statLinesElement) {
        statLinesElement.innerText = countL;
      }
    } catch (error) {
      console.error("Error in subscribeLines callback:", error);
    }
  });
  onValue2(ref4(db, "onibus"), (snap) => {
    const gpsData = snap.val() || {};
    const { statusH, drawerH, tU, activeLines } = renderBusList(gpsData, state.configLinhas);
    state.activeLineKeys = [];
    for (let key in state.configLinhas) {
      if (gpsData[key]) {
        let hasActive = false;
        for (let uid in gpsData[key]) {
          const gpsPoint = gpsData[key][uid];
          const accuracy = gpsPoint.acc || gpsPoint.accuracy || 0;
          const now = Date.now();
          if (now - gpsPoint.timestamp < (state.systemTTL || 45e3) && accuracy <= 200) {
            hasActive = true;
            break;
          }
        }
        if (hasActive) {
          state.activeLineKeys.push(key);
        }
      }
    }
    renderBusMarkers(gpsData, state.configLinhas);
    document.getElementById("floating-active-list").innerHTML = drawerH || '<small class="text-muted">Sem frota ativa</small>';
    document.getElementById("status-display").innerHTML = statusH || '<small class="text-muted">Aguardando dados...</small>';
    const frotaLabel = document.getElementById("frota-ativa-label");
    if (frotaLabel) {
      frotaLabel.textContent = `FROTA ATIVA (${activeLines})`;
    }
    document.getElementById("stat-users").innerText = tU;
    document.getElementById("global-counter").style.display = tU > 0 ? "block" : "none";
    document.getElementById("total-active-text").innerText = `${tU} COLABORADORES ATIVOS`;
    updateModalLineCards();
  });
}
function saveLine2() {
  const id = document.getElementById("admID").value;
  const key = document.getElementById("admDbKey").value || id;
  if (!id) return alert("Erro");
  saveLine(key, {
    id,
    nome: document.getElementById("admNome").value,
    via: document.getElementById("admVia").value || "Principal",
    cor: document.getElementById("admCor").value,
    company: state.adminSelectedCompany
  }).then(() => {
    alert("OK");
    clearAdminForm();
  });
}
function deleteLineFirestore(key) {
  if (!confirm("Tem certeza que deseja excluir esta linha?")) return;
  deleteLine(key).then(() => {
    alert("Linha exclu\xEDda.");
  }).catch((err) => {
    console.error(err);
    alert("Erro ao excluir.");
  });
}
function openRouteManager() {
  switchView("admin-routes");
  state.map.on("click", onMapClickForRoute);
  state.map.getContainer().style.cursor = "crosshair";
}
function closeRouteManager() {
  state.map.off("click", onMapClickForRoute);
  state.map.getContainer().style.cursor = "";
  switchView("admin-dashboard");
  clearCurrentDraft();
}
function setRouteMode(m) {
  updateState("routeMode", m);
  document.querySelectorAll(".route-mode-badge").forEach((b) => b.classList.remove("active"));
  document.getElementById(`btn-mode-${m}`).classList.add("active");
}
function selectCompany(id) {
  document.querySelectorAll(".company-option").forEach((e) => e.classList.remove("selected"));
  document.getElementById("adm-opt-" + id).classList.add("selected");
  updateState("adminSelectedCompany", id);
}
function randomizeColor() {
  document.getElementById("admCor").value = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}
function clearAdminForm() {
  document.getElementById("admDbKey").value = "";
  document.getElementById("admID").value = "";
  document.getElementById("admNome").value = "";
  document.getElementById("admVia").value = "";
  document.getElementById("delete-line-btn").style.display = "none";
}
function loadLineForEdit(key) {
  const c = state.configLinhas[key];
  if (!c) return;
  document.getElementById("admDbKey").value = key;
  document.getElementById("admID").value = c.id;
  document.getElementById("admNome").value = c.nome;
  document.getElementById("admVia").value = c.via;
  document.getElementById("admCor").value = c.cor;
  selectCompany(c.company || "atlantico");
  document.getElementById("delete-line-btn").style.display = "block";
}
async function deleteLine2() {
  const key = document.getElementById("admDbKey").value;
  if (!key) {
    alert("Selecione uma linha para excluir");
    return;
  }
  if (!confirm(`Tem certeza que deseja excluir a linha ${key}?`)) {
    return;
  }
  if (!state.user) {
    alert("Usu\xE1rio n\xE3o autenticado");
    return;
  }
  const { isUserAdmin: isUserAdmin2 } = await Promise.resolve().then(() => (init_authService(), authService_exports));
  const isAdmin = await isUserAdmin2(state.user);
  if (!isAdmin) {
    alert("Apenas administradores podem excluir linhas");
    return;
  }
  try {
    const { ref: ref5, remove: remove3 } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js");
    await remove3(ref5(db, `config/linhas/${key}`));
    await remove3(ref5(db, `onibus/${key}`));
    clearAdminForm();
    document.getElementById("delete-line-btn").style.display = "none";
    if (window.cleanupDeletedLineMarkers) {
      window.cleanupDeletedLineMarkers(state.configLinhas);
    }
    alert("Linha exclu\xEDda com sucesso!");
  } catch (error) {
    console.error("Error deleting line:", error);
    alert("Erro ao excluir linha: " + error.message);
  }
}
async function saveSystemParameters() {
  const ttlInput = document.getElementById("system-ttl-input");
  const radiusInput = document.getElementById("system-radius-input");
  const saveBtn = document.getElementById("save-params-btn");
  const statusDiv = document.getElementById("params-status");
  const ttlWarning = document.getElementById("ttl-warning");
  if (!ttlInput || !radiusInput) return;
  const ttlSeconds = parseInt(ttlInput.value);
  const radiusKm = parseInt(radiusInput.value);
  if (ttlWarning) {
    ttlWarning.style.display = ttlSeconds < 5 ? "block" : "none";
  }
  if (ttlSeconds < 5) {
    showParamsStatus("ERRO: TTL menor que 5 segundos \xE9 perigoso para o sistema", "danger");
    return;
  }
  if (ttlSeconds > 300) {
    showParamsStatus("TTL deve ser no m\xE1ximo 300 segundos", "danger");
    return;
  }
  if (radiusKm < 1 || radiusKm > 100) {
    showParamsStatus("Raio deve estar entre 1 e 100 km", "danger");
    return;
  }
  if (!state.user) {
    showParamsStatus("Usu\xE1rio n\xE3o autenticado", "danger");
    return;
  }
  const { isUserAdmin: isUserAdmin2 } = await Promise.resolve().then(() => (init_authService(), authService_exports));
  const isAdmin = await isUserAdmin2(state.user);
  if (!isAdmin) {
    showParamsStatus("Apenas administradores autorizados podem alterar par\xE2metros", "danger");
    const adminAlert = document.getElementById("admin-security-alert");
    if (adminAlert) adminAlert.style.display = "block";
    return;
  }
  const ttlMilliseconds = ttlSeconds * 1e3;
  try {
    const { updateSystemParameters: updateSystemParameters2 } = await Promise.resolve().then(() => (init_parametersService(), parametersService_exports));
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>SALVANDO...';
    await updateSystemParameters2({
      ttl: ttlMilliseconds,
      // Store as milliseconds
      radius: radiusKm
    });
    showParamsStatus(`Par\xE2metros salvos com sucesso! TTL: ${ttlSeconds}s (${ttlMilliseconds}ms), Raio: ${radiusKm}km`, "success");
    saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVO';
    updateHealthMetricsDisplay();
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVAR PAR\xC2METROS';
    }, 2e3);
  } catch (error) {
    console.error("Error saving parameters:", error);
    showParamsStatus("Erro ao salvar par\xE2metros: " + error.message, "danger");
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>SALVAR PAR\xC2METROS';
  }
}
function loadCurrentParameters() {
  const ttlInput = document.getElementById("system-ttl-input");
  const radiusInput = document.getElementById("system-radius-input");
  if (!ttlInput || !radiusInput) return;
  const currentTTL = Math.floor((state.systemTTL || 45e3) / 1e3);
  const currentRadius = state.systemRadius || 5;
  ttlInput.value = currentTTL;
  radiusInput.value = currentRadius;
  const ttlWarning = document.getElementById("ttl-warning");
  if (ttlWarning) {
    ttlWarning.style.display = currentTTL < 5 ? "block" : "none";
  }
  showParamsStatus("Valores atuais carregados do Firebase", "info");
  updateAdminPermissionsStatus();
}
function showParamsStatus(message, type = "info") {
  const statusDiv = document.getElementById("params-status");
  if (!statusDiv) return;
  const alertClass = type === "success" ? "alert-success" : type === "danger" ? "alert-danger" : type === "warning" ? "alert-warning" : "alert-info";
  statusDiv.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show py-2" role="alert">
            <small>${message}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
  setTimeout(() => {
    const alert2 = statusDiv.querySelector(".alert");
    if (alert2) {
      alert2.classList.remove("show");
      setTimeout(() => statusDiv.innerHTML = "", 300);
    }
  }, 5e3);
}
async function forceTTLCleanup2() {
  const btn = document.getElementById("force-cleanup-btn");
  if (!btn) return;
  if (!state.user) {
    alert("Usu\xE1rio n\xE3o autenticado");
    return;
  }
  const { isUserAdmin: isUserAdmin2 } = await Promise.resolve().then(() => (init_authService(), authService_exports));
  const isAdmin = await isUserAdmin2(state.user);
  if (!isAdmin) {
    alert("Apenas administradores podem for\xE7ar limpeza");
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>LIMPEZA EM ANDAMENTO...';
  if (window.triggerTTLCleanup) {
    window.triggerTTLCleanup();
    showParamsStatus("Limpeza for\xE7ada executada", "success");
  } else {
    showParamsStatus("Fun\xE7\xE3o de limpeza n\xE3o dispon\xEDvel", "warning");
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-trash me-1"></i>FOR\xC7AR LIMPEZA DE SINAIS EXPIRADOS';
  }, 3e3);
}
function toggleSimulatedData() {
  const btn = document.getElementById("simulate-data-btn");
  const statUsers = document.getElementById("stat-users");
  const statLines = document.getElementById("stat-lines");
  if (!btn || !statUsers || !statLines) return;
  const isSimulated = btn.classList.contains("btn-success");
  if (isSimulated) {
    statUsers.textContent = "0";
    statLines.textContent = "4";
    btn.classList.remove("btn-success");
    btn.classList.add("btn-outline-secondary");
    btn.innerHTML = '<i class="bi bi-database me-1"></i> Simular Dados Fict\xEDcios';
    showParamsStatus("Dados fict\xEDcios removidos", "info");
    if (!document.getElementById("params-status")) {
      alert("Dados fict\xEDcios removidos");
    }
  } else {
    const randomUsers = Math.floor(Math.random() * 50) + 20;
    const randomLines = Math.floor(Math.random() * 10) + 4;
    statUsers.textContent = randomUsers.toString();
    statLines.textContent = randomLines.toString();
    btn.classList.remove("btn-outline-secondary");
    btn.classList.add("btn-success");
    btn.innerHTML = '<i class="bi bi-database-fill-check me-1"></i> Limpar Dados Fict\xEDcios';
    showParamsStatus(`Dados fict\xEDcios inseridos: ${randomUsers} usu\xE1rios, ${randomLines} linhas`, "success");
    if (!document.getElementById("params-status")) {
      alert(`Dados fict\xEDcios inseridos: ${randomUsers} usu\xE1rios ativos, ${randomLines} linhas`);
    }
  }
}
function updateHealthMetricsDisplay() {
  if (window.getLastProcessedData) {
    const lastData = window.getLastProcessedData();
    const activeUsers = new Set(lastData.map((s) => s.userId)).size;
    const rejectedSignals = lastData.filter((s) => s.accuracy > 80).length;
    const activeUsersEl = document.getElementById("health-active-users");
    const rejectedSignalsEl = document.getElementById("health-rejected-signals");
    if (activeUsersEl) activeUsersEl.textContent = activeUsers;
    if (rejectedSignalsEl) rejectedSignalsEl.textContent = rejectedSignals;
  }
}
async function updateAdminPermissionsStatus() {
  const permissionsStatus = document.getElementById("admin-permissions-status");
  const adminAlert = document.getElementById("admin-security-alert");
  if (!permissionsStatus) return;
  if (!state.user) {
    permissionsStatus.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Usu\xE1rio n\xE3o autenticado</span>';
    if (adminAlert) adminAlert.style.display = "block";
    return;
  }
  try {
    const { isUserAdmin: isUserAdmin2 } = await Promise.resolve().then(() => (init_authService(), authService_exports));
    const isAdmin = await isUserAdmin2(state.user);
    if (isAdmin) {
      permissionsStatus.innerHTML = '<span class="text-success"><i class="bi bi-shield-check me-1"></i>Administrador autorizado</span>';
      if (adminAlert) adminAlert.style.display = "none";
      document.querySelectorAll(".admin-only").forEach((el) => {
        el.style.display = "block";
      });
    } else {
      permissionsStatus.innerHTML = '<span class="text-warning"><i class="bi bi-shield-exclamation me-1"></i>Usu\xE1rio n\xE3o administrador</span>';
      if (adminAlert) adminAlert.style.display = "block";
      document.querySelectorAll(".admin-only").forEach((el) => {
        el.style.display = "none";
      });
    }
  } catch (error) {
    console.error("Error checking admin permissions:", error);
    permissionsStatus.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Erro ao verificar permiss\xF5es</span>';
  }
}
function applyAdminSecurity() {
  if (!state.user) {
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = "none";
    });
    return;
  }
  updateAdminPermissionsStatus();
}
function updateModalLineCards() {
  const lineCards = document.querySelectorAll(".line-card");
  lineCards.forEach((card) => {
    const lineKey = card.getAttribute("data-line-key");
    const isActive = state.activeLineKeys && state.activeLineKeys.includes(lineKey);
    const statusDot = card.querySelector(".line-status");
    if (statusDot) {
      statusDot.className = `line-status ${isActive ? "active" : "inactive"}`;
    }
    card.setAttribute("data-line-active", isActive);
  });
  if (document.getElementById("modalLine")?.classList.contains("show")) {
    const filterLines = window.filterLines;
    if (typeof filterLines === "function") {
      setTimeout(filterLines, 50);
    }
  }
}
function initModalSearch() {
  const searchInput = document.getElementById("line-search-input");
  const clearSearchBtn = document.getElementById("clear-search");
  const showActiveOnlyCheckbox = document.getElementById("show-active-only");
  const lineCountElement = document.getElementById("line-count");
  if (!searchInput) return;
  const modalLine = document.getElementById("modalLine");
  if (modalLine) {
    modalLine.addEventListener("click", (e) => {
      if (e.target.id === "clear-search") {
        searchInput.value = "";
        filterLines();
        searchInput.focus();
        e.preventDefault();
      }
    });
    modalLine.addEventListener("input", (e) => {
      if (e.target.id === "line-search-input") {
        filterLines();
      }
    });
    modalLine.addEventListener("change", (e) => {
      if (e.target.id === "show-active-only") {
        filterLines();
      }
    });
  }
  function filterLines() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const showActiveOnly = showActiveOnlyCheckbox.checked;
    const lineCards = document.querySelectorAll(".line-card");
    let visibleCount = 0;
    lineCards.forEach((card) => {
      const lineId = card.getAttribute("data-line-id") || "";
      const lineName = card.getAttribute("data-line-name") || "";
      const lineRoute = card.getAttribute("data-line-route") || "";
      const isActive = card.getAttribute("data-line-active") === "true";
      if (showActiveOnly && !isActive) {
        card.style.display = "none";
        return;
      }
      const matchesSearch = searchTerm === "" || lineId.toLowerCase().includes(searchTerm) || lineName.toLowerCase().includes(searchTerm) || lineRoute.toLowerCase().includes(searchTerm);
      if (matchesSearch) {
        card.style.display = "block";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });
    if (lineCountElement) {
      lineCountElement.textContent = `${visibleCount} linha${visibleCount !== 1 ? "s" : ""} encontrada${visibleCount !== 1 ? "s" : ""}`;
      const grid = document.getElementById("line-selection-grid");
      const existingEmptyState = grid.querySelector(".empty-state");
      if (visibleCount === 0) {
        if (!existingEmptyState) {
          const emptyState = document.createElement("div");
          emptyState.className = "empty-state";
          emptyState.innerHTML = `
                        <div class="empty-state-icon">
                            <i class="bi bi-satellite"></i>
                        </div>
                        <div class="empty-state-text">
                            ${searchTerm ? `Nenhuma linha encontrada para "${searchTerm}"` : "Nenhuma linha dispon\xEDvel para transmiss\xE3o GPS"}
                        </div>
                    `;
          grid.appendChild(emptyState);
        }
      } else if (existingEmptyState) {
        existingEmptyState.remove();
      }
    }
  }
  if (modalLine) {
    modalLine.addEventListener("shown.bs.modal", () => {
      setTimeout(filterLines, 100);
    });
  }
  window.filterLines = filterLines;
  console.log("Modal search functionality initialized");
}
setTimeout(initModalSearch, 1e3);
window.saveSystemParameters = saveSystemParameters;
window.loadCurrentParameters = loadCurrentParameters;
window.forceTTLCleanup = forceTTLCleanup2;
window.deleteLine = deleteLine2;
window.deleteLineFirestore = deleteLineFirestore;
window.updateHealthMetricsDisplay = updateHealthMetricsDisplay;
window.applyAdminSecurity = applyAdminSecurity;
window.cleanupDeletedLineMarkers = cleanupDeletedLineMarkers;
setTimeout(() => {
  applyAdminSecurity();
  updateHealthMetricsDisplay();
}, 1e3);
export {
  initApp
};
//# sourceMappingURL=bundle.js.map
