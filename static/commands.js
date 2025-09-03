// Configuration globale
const API_BASE = '';
let currentServer = null;
let servers = [];
let users = [];
let channels = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeCommands();
    loadBotStatus();
    loadCommandHistory();
    setupFormHandler();
});

async function initializeCommands() {
    try {
        await loadServers();
        updateCommandButtons();
    } catch (error) {
        console.error('Erreur initialisation commandes:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
}

async function loadServers() {
    try {
        const response = await fetch(`${API_BASE}/api/guilds`);
        servers = await response.json();
        
        populateServerSelect('server-select', servers);
        populateServerSelect('modal-server', servers);
        
    } catch (error) {
        console.error('Erreur chargement serveurs:', error);
        showNotification('Impossible de charger les serveurs', 'error');
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

async function loadCommandHistory() {
    try {
        const response = await fetch(`${API_BASE}/api/logs?limit=20`);
        const history = await response.json();
        
        const container = document.getElementById('command-history');
        
        if (!history || history.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucune commande exécutée récemment</p></div>';
            return;
        }
        
        const html = history.map(item => `
            <div class="history-item">
                <div class="history-badge ${item.action}">
                    <i class="fas ${getActionIcon(item.action)}"></i>
                </div>
                <div class="history-details">
                    <div class="history-action">
                        <strong>${item.action.toUpperCase()}</strong> ${escapeHtml(item.target)}
                    </div>
                    <div class="history-info">
                        Par ${escapeHtml(item.moderator)} • ${formatRelativeTime(item.timestamp)}
                        ${item.reason ? ` • ${escapeHtml(item.reason)}` : ''}
                    </div>
                </div>
                <div class="history-status success">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement historique:', error);
        document.getElementById('command-history').innerHTML = 
            '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Erreur de chargement</p></div>';
    }
}

function populateServerSelect(selectId, serverList) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Garder la première option
    const firstOption = select.querySelector('option');
    select.innerHTML = '';
    if (firstOption) {
        select.appendChild(firstOption);
    }
    
    serverList.forEach(server => {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = server.name;
        select.appendChild(option);
    });
}

async function onServerSelect() {
    const select = document.getElementById('server-select');
    const serverId = select.value;
    
    if (!serverId) {
        currentServer = null;
        updateCommandButtons();
        return;
    }
    
    currentServer = serverId;
    updateCommandButtons();
    
    // Charger les utilisateurs et canaux du serveur
    await Promise.all([
        loadServerUsers(serverId),
        loadServerChannels(serverId)
    ]);
}

async function loadServerUsers(serverId) {
    try {
        const response = await fetch(`${API_BASE}/api/guild/${serverId}/members`);
        users = await response.json();
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        users = [];
    }
}

async function loadServerChannels(serverId) {
    try {
        const response = await fetch(`${API_BASE}/api/guild/${serverId}/channels`);
        channels = await response.json();
    } catch (error) {
        console.error('Erreur chargement canaux:', error);
        channels = [];
    }
}

function updateCommandButtons() {
    const buttons = document.querySelectorAll('.btn-command');
    buttons.forEach(button => {
        button.disabled = !currentServer;
    });
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

// Modal Functions
function openCommandModal(command) {
    if (!currentServer) {
        showNotification('Veuillez d\'abord sélectionner un serveur', 'warning');
        return;
    }
    
    const modal = document.getElementById('command-modal');
    const title = document.getElementById('modal-title');
    const commandInput = document.getElementById('modal-command');
    const userGroup = document.getElementById('user-group');
    const channelGroup = document.getElementById('channel-group');
    const durationGroup = document.getElementById('duration-group');
    
    // Configuration du modal selon la commande
    commandInput.value = command;
    title.textContent = `Exécuter: ${command.toUpperCase()}`;
    
    // Définir les champs requis selon la commande
    if (['lock', 'unlock'].includes(command)) {
        userGroup.style.display = 'none';
        channelGroup.style.display = 'block';
        populateChannelSelect();
    } else {
        userGroup.style.display = 'block';
        channelGroup.style.display = 'none';
        populateUserSelect();
    }
    
    // Gérer le champ durée
    durationGroup.style.display = ['mute', 'ban'].includes(command) ? 'block' : 'none';
    
    // Pré-sélectionner le serveur
    document.getElementById('modal-server').value = currentServer;
    
    modal.style.display = 'flex';
}

function closeCommandModal() {
    const modal = document.getElementById('command-modal');
    modal.style.display = 'none';
    
    // Reset form
    document.getElementById('command-form').reset();
}

function populateUserSelect() {
    const select = document.getElementById('modal-user');
    select.innerHTML = '<option value="">Sélectionner un utilisateur</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.display_name} (${user.name})`;
        select.appendChild(option);
    });
}

function populateChannelSelect() {
    const select = document.getElementById('modal-channel');
    select.innerHTML = '<option value="">Sélectionner un canal</option>';
    
    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `#${channel.name}`;
        select.appendChild(option);
    });
}

function setupFormHandler() {
    const form = document.getElementById('command-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await executeCommand();
    });
    
    // Fermer modal avec Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCommandModal();
        }
    });
    
    // Fermer modal en cliquant à l'extérieur
    document.getElementById('command-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCommandModal();
        }
    });
}

async function executeCommand() {
    const executeBtn = document.getElementById('execute-btn');
    const originalContent = executeBtn.innerHTML;
    
    try {
        // Désactiver le bouton et afficher le loading
        executeBtn.disabled = true;
        executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exécution...';
        
        const formData = {
            command: document.getElementById('modal-command').value,
            guild_id: document.getElementById('modal-server').value,
            user_id: document.getElementById('modal-user').value,
            channel_id: document.getElementById('modal-channel').value,
            duration: document.getElementById('modal-duration').value,
            reason: document.getElementById('modal-reason').value
        };
        
        // Validation
        if (!formData.guild_id) {
            throw new Error('Veuillez sélectionner un serveur');
        }
        
        if (['lock', 'unlock'].includes(formData.command) && !formData.channel_id) {
            throw new Error('Veuillez sélectionner un canal');
        } else if (!['lock', 'unlock'].includes(formData.command) && !formData.user_id) {
            throw new Error('Veuillez sélectionner un utilisateur');
        }
        
        const response = await fetch(`${API_BASE}/api/command/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Commande ${formData.command} exécutée avec succès`, 'success');
            closeCommandModal();
            setTimeout(() => loadCommandHistory(), 1000); // Actualiser l'historique
        } else {
            throw new Error(result.message || 'Erreur lors de l\'exécution');
        }
        
    } catch (error) {
        console.error('Erreur exécution commande:', error);
        showNotification(error.message || 'Erreur lors de l\'exécution de la commande', 'error');
    } finally {
        executeBtn.disabled = false;
        executeBtn.innerHTML = originalContent;
    }
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notification-icon');
    const messageEl = document.getElementById('notification-message');
    
    // Définir l'icône selon le type
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    icon.className = icons[type] || icons.info;
    messageEl.textContent = message;
    notification.className = `notification show ${type}`;
    
    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        notification.className = 'notification';
    }, 5000);
}

// Fonctions utilitaires
function getActionIcon(action) {
    const icons = {
        'mute': 'fa-volume-mute',
        'unmute': 'fa-volume-up',
        'ban': 'fa-ban',
        'kick': 'fa-boot',
        'warn': 'fa-exclamation-triangle',
        'lock': 'fa-lock',
        'unlock': 'fa-unlock'
    };
    return icons[action] || 'fa-cog';
}

function formatRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}j`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function refreshData() {
    initializeCommands();
    loadCommandHistory();
    showNotification('Données actualisées', 'success');
}