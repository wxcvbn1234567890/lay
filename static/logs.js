// Configuration globale
const API_BASE = '';
let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
let logsPerPage = 50;
let sortColumn = 'timestamp';
let sortDirection = 'desc';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeLogs();
    loadBotStatus();
});

async function initializeLogs() {
    try {
        await Promise.all([
            loadServers(),
            loadLogs()
        ]);
    } catch (error) {
        console.error('Erreur initialisation logs:', error);
    }
}

async function loadServers() {
    try {
        const response = await fetch(`${API_BASE}/api/guilds`);
        const servers = await response.json();
        
        const select = document.getElementById('server-filter');
        select.innerHTML = '<option value="">Tous les serveurs</option>';
        
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

async function loadLogs() {
    try {
        const response = await fetch(`${API_BASE}/api/logs?limit=1000`);
        allLogs = await response.json();
        
        filteredLogs = [...allLogs];
        updateLogsDisplay();
        
    } catch (error) {
        console.error('Erreur chargement logs:', error);
        document.getElementById('logs-tbody').innerHTML = `
            <tr><td colspan=\"7\">
                <div class=\"error-state\">
                    <i class=\"fas fa-exclamation-circle\"></i>
                    <p>Erreur lors du chargement des logs</p>
                </div>
            </td></tr>
        `;
    }
}

function filterLogs() {
    const serverFilter = document.getElementById('server-filter').value;
    const actionFilter = document.getElementById('action-filter').value;
    const moderatorFilter = document.getElementById('moderator-filter').value.toLowerCase();
    const targetFilter = document.getElementById('target-filter').value.toLowerCase();
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    filteredLogs = allLogs.filter(log => {
        const matchesServer = !serverFilter || log.guild_id === serverFilter;
        const matchesAction = !actionFilter || log.action === actionFilter;
        const matchesModerator = !moderatorFilter || log.moderator.toLowerCase().includes(moderatorFilter);
        const matchesTarget = !targetFilter || log.target.toLowerCase().includes(targetFilter);
        
        let matchesDate = true;
        if (dateFrom || dateTo) {
            const logDate = new Date(log.timestamp).toISOString().split('T')[0];
            if (dateFrom && logDate < dateFrom) matchesDate = false;
            if (dateTo && logDate > dateTo) matchesDate = false;
        }
        
        return matchesServer && matchesAction && matchesModerator && matchesTarget && matchesDate;
    });
    
    currentPage = 1;
    updateLogsDisplay();
}

function sortLogs(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }
    
    filteredLogs.sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];
        
        if (column === 'timestamp') {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        }
        
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    updateLogsDisplay();
    updateSortIndicators();
}

function updateSortIndicators() {
    document.querySelectorAll('.logs-table th i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const currentHeader = document.querySelector(`th[onclick=\"sortLogs('${sortColumn}')\"] i`);
    if (currentHeader) {
        currentHeader.className = `fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
    }
}

function updateLogsDisplay() {
    updateLogsStats();
    displayLogs();
    updatePagination();
}

function updateLogsStats() {
    const totalCount = allLogs.length;
    const filteredCount = filteredLogs.length;
    
    document.getElementById('logs-count').textContent = `${totalCount} logs au total`;
    
    const filteredElement = document.getElementById('logs-filtered');
    if (filteredCount !== totalCount) {
        filteredElement.textContent = `(${filteredCount} affichés après filtrage)`;
        filteredElement.style.display = 'inline';
    } else {
        filteredElement.style.display = 'none';
    }
}

function displayLogs() {
    const tbody = document.getElementById('logs-tbody');
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan=\"7\">
                <div class=\"empty-state\">
                    <i class=\"fas fa-inbox\"></i>
                    <p>Aucun log correspondant aux critères</p>
                </div>
            </td></tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const pageData = filteredLogs.slice(startIndex, endIndex);
    
    const html = pageData.map(log => `
        <tr>
            <td>${formatDateTime(log.timestamp)}</td>
            <td>
                <span class=\"action-badge-small ${log.action}\">
                    <i class=\"fas ${getActionIcon(log.action)}\"></i>
                    ${log.action.toUpperCase()}
                </span>
            </td>
            <td>${escapeHtml(log.moderator)}</td>
            <td>${escapeHtml(log.target)}</td>
            <td>${log.duration || '-'}</td>
            <td>${escapeHtml(log.reason || '-')}</td>
            <td>
                <button class=\"btn-sm btn-secondary\" onclick=\"viewLogDetails('${log.id}')\">
                    <i class=\"fas fa-eye\"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Bouton précédent
    html += `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick=\"changePage(${currentPage - 1})\">
            <i class=\"fas fa-chevron-left\"></i>
        </button>
    `;
    
    // Numéros de page
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button onclick=\"changePage(1)\">1</button>`;
        if (startPage > 2) {
            html += '<span>...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button ${i === currentPage ? 'class=\"active\"' : ''} onclick=\"changePage(${i})\">${i}</button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span>...</span>';
        }
        html += `<button onclick=\"changePage(${totalPages})\">${totalPages}</button>`;
    }
    
    // Bouton suivant
    html += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick=\"changePage(${currentPage + 1})\">
            <i class=\"fas fa-chevron-right\"></i>
        </button>
    `;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    displayLogs();
    updatePagination();
}

function clearFilters() {
    document.getElementById('server-filter').value = '';
    document.getElementById('action-filter').value = '';
    document.getElementById('moderator-filter').value = '';
    document.getElementById('target-filter').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    
    filteredLogs = [...allLogs];
    currentPage = 1;
    updateLogsDisplay();
}

function viewLogDetails(logId) {
    const log = allLogs.find(l => l.id == logId);
    if (!log) return;
    
    const details = `
        ID: ${log.id}
        Date: ${formatDateTime(log.timestamp)}
        Action: ${log.action}
        Modérateur: ${log.moderator}
        Cible: ${log.target}
        Durée: ${log.duration || 'N/A'}
        Raison: ${log.reason || 'Aucune raison spécifiée'}
        Serveur ID: ${log.guild_id}
        Canal ID: ${log.channel_id || 'N/A'}
    `;
    
    alert(details);
}

async function exportLogs() {
    try {
        const csvContent = generateCSV(filteredLogs);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Erreur export logs:', error);
        alert('Erreur lors de l\\'export des logs');
    }
}

function generateCSV(logs) {
    const headers = ['ID', 'Date/Heure', 'Action', 'Modérateur', 'Cible', 'Durée', 'Raison', 'Serveur ID', 'Canal ID'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
        const row = [
            log.id,
            log.timestamp,
            log.action,
            `\"${log.moderator}\"`,
            `\"${log.target}\"`,
            log.duration || '',
            `\"${log.reason || ''}\"`,
            log.guild_id,
            log.channel_id || ''
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\\n');
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

function refreshLogs() {
    loadLogs();
    loadBotStatus();
}

// Fonctions utilitaires
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}