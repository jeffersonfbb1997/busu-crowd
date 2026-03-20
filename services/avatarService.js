/**
 * Avatar Service - Handles user avatar customization and night mode
 */

// Default avatar settings
const defaultAvatarSettings = {
    style: 'circle',
    color: 'blue',
    size: 'medium',
    nightMode: false,
    nightTheme: 'dark'
};

// Current avatar settings
let avatarSettings = { ...defaultAvatarSettings };

/**
 * Load avatar settings from localStorage
 */
export function loadAvatarSettings() {
    try {
        const saved = localStorage.getItem('busu_avatar_settings');
        if (saved) {
            avatarSettings = { ...defaultAvatarSettings, ...JSON.parse(saved) };
            console.log('Avatar settings loaded:', avatarSettings);
        }
        return avatarSettings;
    } catch (error) {
        console.error('Error loading avatar settings:', error);
        return defaultAvatarSettings;
    }
}

/**
 * Save avatar settings to localStorage
 */
export function saveAvatarSettings() {
    try {
        localStorage.setItem('busu_avatar_settings', JSON.stringify(avatarSettings));
        console.log('Avatar settings saved:', avatarSettings);
    } catch (error) {
        console.error('Error saving avatar settings:', error);
    }
}

/**
 * Update avatar settings
 */
export function updateAvatarSettings(newSettings) {
    avatarSettings = { ...avatarSettings, ...newSettings };
    saveAvatarSettings();
    applyAvatarSettings();
    return avatarSettings;
}

/**
 * Apply avatar settings to the user marker
 */
export function applyAvatarSettings() {
    const userMarker = window.state?.userMarker;
    if (!userMarker) {
        console.log('User marker not available yet, settings will be applied when created');
        return;
    }
    
    const icon = userMarker.getIcon();
    if (!icon) return;
    
    // Remove all existing style classes
    const classList = icon.options.className?.split(' ') || [];
    const baseClass = 'user-marker-icon';
    const newClasses = [baseClass];
    
    // Add style class
    newClasses.push(`style-${avatarSettings.style}`);
    
    // Add color class
    newClasses.push(`color-${avatarSettings.color}`);
    
    // Add size class
    newClasses.push(`size-${avatarSettings.size}`);
    
    // Update icon class
    icon.options.className = newClasses.join(' ');
    
    // Update the marker icon
    userMarker.setIcon(icon);
    
    console.log('Avatar settings applied:', avatarSettings);
}

/**
 * Reset avatar settings to default
 */
export function resetAvatarSettings() {
    avatarSettings = { ...defaultAvatarSettings };
    saveAvatarSettings();
    applyAvatarSettings();
    return avatarSettings;
}

/**
 * Get current avatar settings
 */
export function getAvatarSettings() {
    return { ...avatarSettings };
}

/**
 * Initialize avatar service
 */
export function initAvatarService() {
    loadAvatarSettings();
    
    // Apply settings after a short delay to ensure user marker is created
    setTimeout(() => {
        applyAvatarSettings();
    }, 1000);
    
    console.log('Avatar service initialized');
}

/**
 * Night mode functions
 */

/**
 * Toggle night mode
 */
export function toggleNightMode(enable) {
    avatarSettings.nightMode = enable !== undefined ? enable : !avatarSettings.nightMode;
    saveAvatarSettings();
    applyNightMode();
    return avatarSettings.nightMode;
}

/**
 * Apply night mode to the UI
 */
export function applyNightMode() {
    const body = document.body;
    const nightModeBtn = document.getElementById('nightModeBtn');
    const nightModeIcon = document.getElementById('nightModeIcon');
    const nightModeSwitch = document.getElementById('nightModeSwitch');
    
    if (avatarSettings.nightMode) {
        body.classList.add('night-mode');
        if (nightModeBtn) nightModeBtn.classList.add('active');
        if (nightModeIcon) nightModeIcon.className = 'bi bi-sun';
        if (nightModeSwitch) nightModeSwitch.checked = true;
    } else {
        body.classList.remove('night-mode');
        if (nightModeBtn) nightModeBtn.classList.remove('active');
        if (nightModeIcon) nightModeIcon.className = 'bi bi-moon';
        if (nightModeSwitch) nightModeSwitch.checked = false;
    }
    
    console.log('Night mode:', avatarSettings.nightMode ? 'ON' : 'OFF');
}

/**
 * Apply specific night mode theme
 */
export function applyNightModeTheme(theme) {
    avatarSettings.nightTheme = theme;
    saveAvatarSettings();
    
    // Remove existing theme classes
    document.body.classList.remove('theme-dark', 'theme-blue');
    
    // Add new theme class
    if (theme !== 'dark') {
        document.body.classList.add(`theme-${theme}`);
    }
    
    console.log('Night mode theme applied:', theme);
}

/**
 * Toggle night mode from UI button
 */
export function toggleNightModeUI() {
    const isNightMode = toggleNightMode();
    alert(`Modo Noturno ${isNightMode ? 'ativado' : 'desativado'}`);
}

/**
 * Select avatar style from UI
 */
export function selectAvatarStyle(style) {
    // Update UI buttons
    document.querySelectorAll('.btn-avatar-style').forEach(btn => {
        btn.classList.toggle('btn-avatar-selected', btn.dataset.style === style);
    });
    
    updateAvatarSettings({ style });
}

/**
 * Select avatar color from UI
 */
export function selectAvatarColor(color) {
    // Update UI buttons
    document.querySelectorAll('.btn-avatar-color').forEach(btn => {
        btn.classList.toggle('btn-avatar-color-selected', btn.dataset.color === color);
    });
    
    updateAvatarSettings({ color });
}

/**
 * Select avatar size from UI
 */
export function selectAvatarSize(size) {
    // Update UI buttons
    document.querySelectorAll('.btn-avatar-size').forEach(btn => {
        btn.classList.toggle('btn-avatar-size-selected', btn.dataset.size === size);
    });
    
    updateAvatarSettings({ size });
}

/**
 * Apply avatar settings from UI
 */
export function applyAvatarSettingsUI() {
    applyAvatarSettings();
    alert('Configurações do avatar aplicadas com sucesso!');
}

// Make functions available globally for HTML onclick handlers
// Expose functions to window immediately when module loads
if (typeof window !== 'undefined') {
    window.selectAvatarStyle = selectAvatarStyle;
    window.selectAvatarColor = selectAvatarColor;
    window.selectAvatarSize = selectAvatarSize;
    window.applyAvatarSettings = applyAvatarSettingsUI;
    window.resetAvatarSettings = () => {
        resetAvatarSettings();
        alert('Configurações do avatar restauradas para o padrão!');
    };
    window.toggleNightMode = toggleNightMode;
    window.toggleNightModeUI = toggleNightModeUI;
    window.applyNightModeTheme = applyNightModeTheme;
    console.log('Avatar service functions exposed to window');
}

// Also export exposeToWindow for manual calling if needed
export function exposeToWindow() {
    if (typeof window !== 'undefined') {
        window.selectAvatarStyle = selectAvatarStyle;
        window.selectAvatarColor = selectAvatarColor;
        window.selectAvatarSize = selectAvatarSize;
        window.applyAvatarSettings = applyAvatarSettingsUI;
        window.resetAvatarSettings = () => {
            resetAvatarSettings();
            alert('Configurações do avatar restauradas para o padrão!');
        };
        window.toggleNightMode = toggleNightMode;
        window.toggleNightModeUI = toggleNightModeUI;
        window.applyNightModeTheme = applyNightModeTheme;
        console.log('Avatar service functions exposed to window (manual)');
    }
}