export const toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
};

export const switchView = (v) => {
    document.querySelectorAll('.sidebar-view').forEach(view => view.classList.remove('active'));
    const target = document.getElementById('view-' + v);
    if (target) target.classList.add('active');
    
    // Initialize admin monitor when admin dashboard is opened
    if (v === 'admin-dashboard' || v === 'admin-settings') {
        setTimeout(() => {
            // Load admin monitor if available
            if (window.initAdminMonitor) {
                window.initAdminMonitor();
            }
            
            // Apply admin security checks
            if (window.applyAdminSecurity) {
                window.applyAdminSecurity();
            }
            
            // Update health metrics
            if (window.updateHealthMetricsDisplay) {
                window.updateHealthMetricsDisplay();
            }
            
            // Load current parameters
            if (window.loadCurrentParameters) {
                window.loadCurrentParameters();
            }
        }, 100);
    }
    
    // Clear debug marker when leaving admin views
    if (v !== 'admin-dashboard' && v !== 'admin-settings' && v !== 'admin-lines' && v !== 'admin-routes') {
        if (window.clearDebugMarker) {
            window.clearDebugMarker();
        }
    }
};

export const toggleDrawer = () => {
    const isCol = document.getElementById('lines-drawer').classList.toggle('collapsed');
    document.getElementById('drawer-icon').className = isCol ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
};

export const toggleBottomCard = () => {
    const bottomCard = document.getElementById('bottom-info-card');
    const isMin = bottomCard.classList.toggle('minimized');
    const icon = document.getElementById('bottom-card-icon');
    if (icon) icon.className = isMin ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
    
    const hasBusSelected = bottomCard.getAttribute('data-bus-selected') === 'true';
    console.log(`toggleBottomCard: isMin=${isMin}, hasBusSelected=${hasBusSelected}, data-bus-selected="${bottomCard.getAttribute('data-bus-selected')}"`);
    
    // Get current display states for debugging
    const busDetailsContainer = document.getElementById('bus-details-container');
    const statusDisplay = document.getElementById('status-display');
    const busDetailsDisplay = busDetailsContainer ? window.getComputedStyle(busDetailsContainer).display : 'N/A';
    const statusDisplayDisplay = statusDisplay ? window.getComputedStyle(statusDisplay).display : 'N/A';
    console.log(`Current states: bus-details-container.display="${busDetailsDisplay}", status-display.display="${statusDisplayDisplay}"`);
    
    if (isMin) {
        // Card is being minimized (closed)
        // If a bus was selected, clear the selection (same as clicking on map)
        if (hasBusSelected) {
            console.log('Bus was selected, clearing selection...');
            // Call closeBusDetailsCard to clear bus selection
            if (window.closeBusDetailsCard) {
                window.closeBusDetailsCard();
            } else {
                // Fallback: manually clear the selection
                if (busDetailsContainer) {
                    busDetailsContainer.style.display = 'none';
                    console.log('Manually hid bus details container');
                }
                
                if (statusDisplay) {
                    statusDisplay.style.display = 'block';
                    console.log('Manually showed status display');
                }
                
                bottomCard.removeAttribute('data-bus-selected');
            }
            console.log('Bus selection cleared due to card minimization');
        } else {
            // No bus selected, just ensure default display
            if (busDetailsContainer) {
                busDetailsContainer.style.display = 'none';
                console.log('No bus selected, hiding bus details container');
            }
            
            if (statusDisplay) {
                statusDisplay.style.display = 'block';
                console.log('No bus selected, showing status display');
            }
            
            bottomCard.removeAttribute('data-bus-selected');
        }
        
        console.log('Bottom card minimized, default display restored');
    } else {
        // Card is being expanded (opened)
        // Check if a bus is selected (after potential clearing)
        const currentHasBusSelected = bottomCard.getAttribute('data-bus-selected') === 'true';
        console.log(`Expanding card, currentHasBusSelected=${currentHasBusSelected}`);
        
        if (!currentHasBusSelected) {
            // No bus selected, ensure default display is shown
            if (busDetailsContainer) {
                busDetailsContainer.style.display = 'none';
                console.log('Hiding bus details container (no bus selected)');
            }
            
            if (statusDisplay) {
                statusDisplay.style.display = 'block';
                console.log('Showing status display (no bus selected)');
            }
            
            console.log('Bottom card expanded, showing default display (no bus selected)');
        } else {
            // Bus is selected, ensure bus details are shown
            if (busDetailsContainer) {
                busDetailsContainer.style.display = 'block';
                console.log('Showing bus details container (bus selected)');
            }
            
            if (statusDisplay) {
                statusDisplay.style.display = 'none';
                console.log('Hiding status display (bus selected)');
            }
            
            console.log('Bottom card expanded, showing bus details (bus selected)');
        }
    }
    
    // Log final states
    const finalBusDetailsDisplay = busDetailsContainer ? window.getComputedStyle(busDetailsContainer).display : 'N/A';
    const finalStatusDisplayDisplay = statusDisplay ? window.getComputedStyle(statusDisplay).display : 'N/A';
    console.log(`Final states: bus-details-container.display="${finalBusDetailsDisplay}", status-display.display="${finalStatusDisplayDisplay}"`);
};
