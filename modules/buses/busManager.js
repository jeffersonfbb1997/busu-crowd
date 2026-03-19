import { db } from "../../services/firebaseService.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { state, updateState } from "../../core/stateManager.js";
import { COMPANIES } from "../../config/systemConfig.js";
import { calcDist } from "../../utils/geoUtils.js";
import { createBusMarker } from "../map/mapLayers.js";
import { renderLineLists, updateBusUI } from "./busRenderer.js";

export function initBusListeners(map) {
    onValue(ref(db, 'config/linhas'), snap => {
        const data = snap.val() || {};
        updateState('configLinhas', data);
        renderLineLists(data);
    });

    onValue(ref(db, 'onibus'), snap => {
        const gpsData = snap.val() || {};
        processGpsData(gpsData, map);
    });
}

function processGpsData(gpsData, map) {
    const now = Date.now();
    let statusH = "", drawerH = "", tU = 0;
    const uLat = state.userMarker ? state.userMarker.getLatLng().lat : null;
    const uLng = state.userMarker ? state.userMarker.getLatLng().lng : null;

    for(let key in state.configLinhas) {
        const c = state.configLinhas[key];
        let latA=0, lngA=0, cnt=0;
        if(gpsData[key]) {
            for(let uid in gpsData[key]) {
                if(now - gpsData[key][uid].timestamp < 45000) { 
                    latA += gpsData[key][uid].lat; 
                    lngA += gpsData[key][uid].lng; 
                    cnt++; 
                }
            }
        }
        tU += cnt;

        if(cnt > 0) {
            const mLt = latA/cnt, mLn = lngA/cnt;
            if(!state.markers[key]) {
                state.markers[key] = createBusMarker(c, mLt, mLn, map);
            }
            state.markers[key].setLatLng([mLt, mLn]);
            
            const comp = COMPANIES[c.company || 'atlantico'];
            drawerH += `<div class="d-flex align-items-center mb-3" onclick="window.map.flyTo([${mLt},${mLn}], 17)" style="cursor:pointer; border-left:3px solid ${c.cor}; padding-left:10px;"><div class="flex-grow-1"><div class="bus-title"><img src="${comp.favicon}" class="bus-logo-mini">${c.id}</div><div class="bus-subtitle" style="font-size:8px">${c.via.substring(0,20)}...</div></div></div>`;

            if (uLat) {
                const d = calcDist(uLat, uLng, mLt, mLn);
                if(d <= 5) {
                    const eta = Math.round(d / 0.33);
                    statusH += `<div class="bus-item" onclick="window.map.flyTo([${mLt},${mLn}], 17)"><div><div class="bus-title"><img src="${comp.favicon}" class="bus-logo-mini">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div><div class="status-box">${eta > 0 ? `<div class="eta-val">` + eta + ` min</div><small style="font-size:8px; color:#aaa">` + d.toFixed(1) + `km</small>` : `<div class="neon-dot"></div>`}</div></div>`;
                }
            } else {
                statusH += `<div class="bus-item"><div><div class="bus-title">${c.id} - ${c.nome}</div></div><div class="status-box"><div class="neon-dot"></div></div></div>`;
            }
        } else if(state.markers[key]) { 
            map.removeLayer(state.markers[key]); 
            delete state.markers[key]; 
        }
    }
    
    updateBusUI(drawerH, statusH, tU);
}
