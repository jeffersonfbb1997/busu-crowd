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
    const isMin = document.getElementById('bottom-info-card').classList.toggle('minimized');
    const icon = document.getElementById('bottom-card-icon');
    if (icon) icon.className = isMin ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
};
