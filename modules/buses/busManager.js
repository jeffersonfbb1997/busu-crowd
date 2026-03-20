import { COMPANIES } from "../../config/systemConfig.js";
import { calcDist } from "../../utils/geoUtils.js";
import { state, updateState } from "../../core/stateManager.js";
import { getPointerPosition } from "../../services/pointerService.js";

export function renderBusList(gpsData, configLinhas) {
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
                
                // Apply accuracy gate: include data with accuracy up to 200 meters (matching GPS collector filter)
                if (now - gpsPoint.timestamp < (state.systemTTL || 45000) && accuracy <= 200) {
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
            const comp = COMPANIES[c.company || 'atlantico'];
            drawerH += `<div class="d-flex align-items-center mb-3" onclick="map.flyTo([${mLt},${mLn}], 17)" style="cursor:pointer; border-left:3px solid ${c.cor}; padding-left:10px;"><div class="flex-grow-1"><div class="bus-title"><img src="${comp.favicon}" class="bus-logo-mini">${c.id}</div><div class="bus-subtitle" style="font-size:8px">${c.via.substring(0,20)}...</div></div></div>`;

            if (uLat) {
                const d = calcDist(uLat, uLng, mLt, mLn);
                const eta = Math.round(d / 0.33);
                statusH += `<div class="bus-item" onclick="map.flyTo([${mLt},${mLn}], 17); window.showBusDetails('${key}')" data-line-key="${key}"><div><div class="bus-title"><img src="${comp.favicon}" class="bus-logo-mini">${c.id} - ${c.nome}</div><div class="bus-subtitle">${c.via}</div></div><div class="status-box">${eta > 0 ? `<div class="eta-val">${eta} min</div><small style="font-size:8px; color:#aaa">${d.toFixed(1)}km</small>` : `<div class="neon-dot"></div>`}</div></div>`;
            } else {
                statusH += `<div class="bus-item" onclick="window.showBusDetails('${key}')" data-line-key="${key}"><div><div class="bus-title">${c.id} - ${c.nome}</div></div><div class="status-box"><div class="neon-dot"></div></div></div>`;
            }
        }
    }

    return { statusH, drawerH, tU, activeLines };
}
