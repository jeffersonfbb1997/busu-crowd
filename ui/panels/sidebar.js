export const toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
};

export const switchView = (v) => {
    document.querySelectorAll('.sidebar-view').forEach(view => view.classList.remove('active'));
    const target = document.getElementById('view-' + v);
    if (target) target.classList.add('active');
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
