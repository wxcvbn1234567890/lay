// Configuration globale
const API_BASE = '';
let settings = {};
let unsavedChanges = false;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
    loadBotStatus();
    loadSystemInfo();
    setupChangeTracking();
});

async function initializeSettings() {
    try {
        await loadSettings();
        updateSystemStats();
    } catch (error) {
        console.error('Erreur initialisation paramètres:', error);
    }
}

async function loadSettings() {
    try {
        // Pour l'instant, on utilise des valeurs par défaut
        // Dans une implémentation complète, cela viendrait d'un API
        settings = {
            botPrefix: '+',
            botStatus: 'online',
            botActivity: 'Surveille les serveurs',
            autoMod: true,
            logActions: true,
            muteRole: 'Muted',
            adminRole: 'bot',
            webEnabled: true,
            webPort: 5000,
            refreshRate: 30,
            darkTheme: true,
            requirePermissions: true,
            maxWarns: 3,
            autoAction: 'none'
        };
        
        // Appliquer les paramètres à l'interface
        applySettingsToUI();
        
    } catch (error) {
        console.error('Erreur chargement paramètres:', error);
    }
}

function applySettingsToUI() {
    document.getElementById('bot-prefix').value = settings.botPrefix;
    document.getElementById('bot-status').value = settings.botStatus;
    document.getElementById('bot-activity').value = settings.botActivity;
    document.getElementById('auto-mod').checked = settings.autoMod;
    document.getElementById('log-actions').checked = settings.logActions;
    document.getElementById('mute-role').value = settings.muteRole;
    document.getElementById('admin-role').value = settings.adminRole;
    document.getElementById('web-enabled').checked = settings.webEnabled;
    document.getElementById('web-port').value = settings.webPort;
    document.getElementById('refresh-rate').value = settings.refreshRate;
    document.getElementById('dark-theme').checked = settings.darkTheme;
    document.getElementById('require-permissions').checked = settings.requirePermissions;
    document.getElementById('max-warns').value = settings.maxWarns;
    document.getElementById('auto-action').value = settings.autoAction;
}

function setupChangeTracking() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            unsavedChanges = true;
            updateSaveButton();
        });
    });
}

function updateSaveButton() {
    const saveButton = document.querySelector('.btn-primary');
    if (unsavedChanges) {
        saveButton.innerHTML = '<i class=\"fas fa-exclamation-circle\"></i> Modifications non sauvées';
        saveButton.classList.add('btn-warning');
        saveButton.classList.remove('btn-primary');
    } else {
        saveButton.innerHTML = '<i class=\"fas fa-save\"></i> Enregistrer';
        saveButton.classList.add('btn-primary');
        saveButton.classList.remove('btn-warning');
    }
}

async function saveSettings() {
    try {
        // Récupérer les valeurs depuis l'interface
        const newSettings = {
            botPrefix: document.getElementById('bot-prefix').value,
            botStatus: document.getElementById('bot-status').value,
            botActivity: document.getElementById('bot-activity').value,
            autoMod: document.getElementById('auto-mod').checked,
            logActions: document.getElementById('log-actions').checked,
            muteRole: document.getElementById('mute-role').value,
            adminRole: document.getElementById('admin-role').value,
            webEnabled: document.getElementById('web-enabled').checked,
            webPort: parseInt(document.getElementById('web-port').value),
            refreshRate: parseInt(document.getElementById('refresh-rate').value),
            darkTheme: document.getElementById('dark-theme').checked,
            requirePermissions: document.getElementById('require-permissions').checked,
            maxWarns: parseInt(document.getElementById('max-warns').value),
            autoAction: document.getElementById('auto-action').value
        };
        
        // Validation
        if (!newSettings.botPrefix || newSettings.botPrefix.length > 3) {
            alert('Le préfixe doit contenir 1 à 3 caractères');
            return;
        }
        
        if (newSettings.webPort < 1000 || newSettings.webPort > 65535) {
            alert('Le port doit être entre 1000 et 65535');
            return;
        }
        
        if (newSettings.refreshRate < 10 || newSettings.refreshRate > 300) {
            alert('Le taux de rafraîchissement doit être entre 10 et 300 secondes');
            return;
        }
        
        // Dans une implémentation complète, on enverrait cela à l'API
        // const response = await fetch(`${API_BASE}/api/settings`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(newSettings)
        // });
        
        settings = newSettings;
        unsavedChanges = false;
        updateSaveButton();
        
        showNotification('Paramètres sauvegardés avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur sauvegarde paramètres:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}

async function restartBot() {
    if (!confirm('Êtes-vous sûr de vouloir redémarrer le bot ? Cela peut prendre quelques secondes.')) {
        return;
    }
    
    try {
        // Dans une implémentation complète, cela ferait un appel API
        showNotification('Redémarrage du bot en cours...', 'info');
        
        // Simulation du redémarrage
        setTimeout(() => {
            showNotification('Bot redémarré avec succès', 'success');
        }, 3000);
        
    } catch (error) {
        console.error('Erreur redémarrage bot:', error);
        showNotification('Erreur lors du redémarrage', 'error');
    }
}

async function testConnection() {
    try {
        showNotification('Test de la connexion...', 'info');
        
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();
        
        if (data.online) {
            showNotification(`Connexion OK - Latence: ${data.latency}ms`, 'success');
        } else {
            showNotification('Bot hors ligne', 'warning');
        }
        
    } catch (error) {
        console.error('Erreur test connexion:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

function exportSettings() {
    try {
        const configData = {
            version: '2.0.0',
            exported: new Date().toISOString(),
            settings: settings
        };
        
        const blob = new Blob([JSON.stringify(configData, null, 2)], { 
            type: 'application/json' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bot-config-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification('Configuration exportée', 'success');
        
    } catch (error) {
        console.error('Erreur export configuration:', error);
        showNotification('Erreur lors de l\\'export', 'error');
    }
}

function resetSettings() {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ? Cette action est irréversible.')) {
        return;
    }
    
    // Réinitialiser aux valeurs par défaut
    settings = {
        botPrefix: '+',
        botStatus: 'online',
        botActivity: '',
        autoMod: true,
        logActions: true,
        muteRole: 'Muted',
        adminRole: 'bot',
        webEnabled: true,
        webPort: 5000,
        refreshRate: 30,
        darkTheme: true,
        requirePermissions: true,
        maxWarns: 3,
        autoAction: 'none'
    };
    
    applySettingsToUI();
    unsavedChanges = true;
    updateSaveButton();
    
    showNotification('Paramètres réinitialisés', 'info');
}

async function loadSystemInfo() {
    try {
        // Informations système simulées
        document.getElementById('python-version').textContent = '3.10.18';
        document.getElementById('discordpy-version').textContent = '2.3.2';
        
        // Charger les stats du bot
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();
        
        document.getElementById('guild-count').textContent = data.guilds ? data.guilds.length : '0';
        
    } catch (error) {
        console.error('Erreur chargement info système:', error);
    }
}

async function updateSystemStats() {
    try {
        // Simulation du temps de fonctionnement
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - Math.floor(Math.random() * 24));
        const uptime = Math.floor((new Date() - startTime) / 1000);
        
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        document.getElementById('uptime').textContent = `${hours}h ${minutes}m`;
        
        // Simulation de l'usage mémoire
        const memoryUsage = (Math.random() * 100 + 50).toFixed(1);
        document.getElementById('memory-usage').textContent = `${memoryUsage} MB`;
        
    } catch (error) {
        console.error('Erreur mise à jour stats:', error);
    }
}

async function loadBotStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();
        updateBotStatus(data);
    } catch (error) {
        console.error('Erreur statut bot:', error);
    }
}

function updateBotStatus(data) {
    const statusElement = document.getElementById('bot-status');
    const indicator = statusElement.querySelector('.status-indicator');
    const statusText = statusElement.querySelector('.status-text');
    const statusDetail = statusElement.querySelector('.status-detail');
    
    if (data.online && data.user) {
        indicator.classList.add('online');
        indicator.classList.remove('offline');
        statusText.textContent = data.user.name;
        statusDetail.textContent = `En ligne • ${data.latency}ms`;
    } else {
        indicator.classList.add('offline');
        indicator.classList.remove('online');
        statusText.textContent = 'Bot Offline';
        statusDetail.textContent = 'Non connecté';
    }
}

function showNotification(message, type = 'info') {
    // Créer la notification si elle n'existe pas
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        notification.innerHTML = `
            <div class=\"notification-content\">
                <i id=\"notification-icon\"></i>
                <span id=\"notification-message\"></span>
            </div>
        `;
        document.body.appendChild(notification);
    }
    
    const icon = notification.querySelector('#notification-icon');
    const messageEl = notification.querySelector('#notification-message');
    
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    icon.className = icons[type] || icons.info;
    messageEl.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 5000);
}

// Auto-actualisation des stats
setInterval(() => {
    updateSystemStats();
    loadBotStatus();
}, 30000);