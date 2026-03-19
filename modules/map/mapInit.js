import { DEFAULT_VIEW, DEFAULT_ZOOM } from "../../config/systemConfig.js";

export let map;

export const initMap = (containerId) => {
    map = L.map(containerId, { zoomControl: false }).setView(DEFAULT_VIEW, DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    return map;
};
