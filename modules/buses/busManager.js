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

            // Determine features
            const hasAC = c.id.includes('2') || c.id.includes('7');
            const hasAccessibility = c.id.includes('1') || c.id.includes('6');
            const acFeature = hasAC ? '<span class="feature-badge ac"><i class="bi bi-snow"></i> AR</span>' : '';
            const accessibilityFeature = hasAccessibility ? '<span class="feature-badge accessibility"><i class="bi bi-wheelchair"></i> ACESS</span>' : '';

            let etaBadge = '';
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
