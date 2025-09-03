// Configuration globale
const API_BASE = '';
let currentServer = null;
let allUsers = [];
let filteredUsers = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeUsers();
    loadBotStatus();
});

async function initializeUsers() {
    try {
        await loadServers();
    } catch (error) {
        console.error('Erreur initialisation utilisateurs:', error);
    }
}

async function loadServers() {
    try {
        const response = await fetch(`${API_BASE}/api/guilds`);
        const servers = await response.json();
        
        const select = document.getElementById('server-select');
        select.innerHTML = '<option value="">Choisir un serveur...</option>';
        
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.id;
            option.textContent = server.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur chargement serveurs:', error);
    }
}

async function loadServerUsers() {
    const select = document.getElementById('server-select');
    const serverId = select.value;
    
    if (!serverId) {
        currentServer = null;
        displayUsers([]);
        return;
    }
    
    currentServer = serverId;
    
    try {
        const response = await fetch(`${API_BASE}/api/guild/${serverId}/members`);
        allUsers = await response.json();
        
        // Charger aussi les rôles
        await loadServerRoles(serverId);
        
        filteredUsers = [...allUsers];
        displayUsers(filteredUsers);
        
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        displayUsers([]);
    }
}

async function loadServerRoles(serverId) {
    try {
        // Pour l'instant, on utilise les rôles des utilisateurs
        const roleSet = new Set();
        allUsers.forEach(user => {
            if (user.roles) {
                user.roles.forEach(role => roleSet.add(role));
            }
        });
        
        const roleFilter = document.getElementById('role-filter');
        roleFilter.innerHTML = '<option value="">Tous les rôles</option>';
        
        Array.from(roleSet).forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            roleFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur chargement rôles:', error);
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-grid');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div class=\"loading\">Aucun utilisateur trouvé</div>';
        return;
    }
    
    const html = users.map(user => `
        <div class=\"user-card\" onclick=\"openUserModal('${user.id}', '${escapeHtml(user.display_name)}')\">
            <div class=\"user-header\">
                <div class=\"user-avatar\">
                    ${user.avatar ? `<img src=\"${user.avatar}\" alt=\"Avatar\">` : getInitials(user.display_name)}
                </div>
                <div class=\"user-info\">
                    <h4>${escapeHtml(user.display_name)}</h4>
                    <div class=\"user-username\">@${escapeHtml(user.name)}</div>
                </div>
            </div>
            
            <div class=\"user-status\">
                <div class=\"status-dot ${user.status}\"></div>
                <span>${getStatusText(user.status)}</span>
            </div>
            
            <div class=\"user-roles\">
                ${user.roles ? user.roles.slice(0, 3).map(role => 
                    `<span class=\"role-badge\">${escapeHtml(role)}</span>`
                ).join('') : ''}
                ${user.roles && user.roles.length > 3 ? `<span class=\"role-badge\">+${user.roles.length - 3}</span>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function filterUsers() {
    const searchTerm = document.getElementById('search-users').value.toLowerCase();
    const roleFilter = document.getElementById('role-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = user.display_name.toLowerCase().includes(searchTerm) || 
                            user.name.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || (user.roles && user.roles.includes(roleFilter));
        const matchesStatus = !statusFilter || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    displayUsers(filteredUsers);
}

function openUserModal(userId, userName) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const userInfo = document.getElementById('selected-user-info');
    
    title.textContent = `Actions pour ${userName}`;
    
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        userInfo.innerHTML = `
            <div class=\"user-modal-info\">
                <div class=\"user-avatar\">
                    ${user.avatar ? `<img src=\"${user.avatar}\" alt=\"Avatar\">` : getInitials(user.display_name)}
                </div>
                <div>
                    <h4>${escapeHtml(user.display_name)}</h4>
                    <p>@${escapeHtml(user.name)}</p>
                    <div class=\"user-status\">
                        <div class=\"status-dot ${user.status}\"></div>
                        <span>${getStatusText(user.status)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Stocker l'ID utilisateur pour les actions
    modal.dataset.userId = userId;
    modal.style.display = 'flex';
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.style.display = 'none';
}

async function openActionModal(action) {
    const modal = document.getElementById('user-modal');
    const userId = modal.dataset.userId;
    
    if (!userId || !currentServer) {
        alert('Erreur: Utilisateur ou serveur non sélectionné');
        return;
    }
    
    const reason = prompt(`Raison pour ${action}:`);
    if (reason === null) return; // Annulé
    
    let duration = null;
    if (['mute', 'ban'].includes(action)) {
        duration = prompt('Durée (optionnel, ex: 1h, 30m, 1d):');
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/command/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: action,
                guild_id: currentServer,
                user_id: userId,
                reason: reason || `Action ${action} depuis le dashboard web`,
                duration: duration
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Action ${action} exécutée avec succès`);
            closeUserModal();
            // Actualiser la liste des utilisateurs
            setTimeout(() => loadServerUsers(), 1000);
        } else {
            alert(`Erreur: ${result.message}`);
        }
        
    } catch (error) {
        console.error('Erreur exécution action:', error);
        alert('Erreur lors de l\\'exécution de l\\'action');
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

function refreshUsers() {
    if (currentServer) {
        loadServerUsers();
    }
    loadBotStatus();
}

// Fonctions utilitaires
function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function getStatusText(status) {
    const statusTexts = {
        'online': 'En ligne',
        'idle': 'Absent',
        'dnd': 'Ne pas déranger',
        'offline': 'Hors ligne'
    };
    return statusTexts[status] || 'Inconnu';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserModal();
    }
});

document.getElementById('user-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeUserModal();
    }
});