// Configuration globale
const API_BASE = '';
let refreshInterval;
let chartsInitialized = false;
let actionsChart, dailyChart;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    startAutoRefresh();
});

async function initializeDashboard() {
    try {
        await Promise.all([
            loadBotStatus(),
            loadStats(),
            loadRecentActions(),
            loadServers()
        ]);
        
        if (!chartsInitialized) {
            initializeCharts();
            chartsInitialized = true;
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
}

async function loadBotStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();
        
        updateBotStatus(data);
        updateStatsNumbers(data);
    } catch (error) {
        console.error('Erreur chargement statut bot:', error);
        updateBotStatus({ online: false });
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

function updateStatsNumbers(data) {
    const serversCount = document.getElementById('servers-count');
    const usersCount = document.getElementById('users-count');
    
    if (serversCount) {
        serversCount.textContent = data.guilds ? data.guilds.length : '0';
        animateNumber(serversCount);
    }
    
    if (usersCount) {
        usersCount.textContent = data.total_users ? formatNumber(data.total_users) : '0';
        animateNumber(usersCount);
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        const data = await response.json();
        
        const totalActions = document.getElementById('total-actions');
        const recentActivity = document.getElementById('recent-activity');
        
        if (totalActions) {
            totalActions.textContent = formatNumber(data.total_actions);
            animateNumber(totalActions);
        }
        
        if (recentActivity) {
            recentActivity.textContent = formatNumber(data.recent_activity);
            animateNumber(recentActivity);
        }
        
        // Mettre à jour les graphiques avec les nouvelles données
        if (chartsInitialized) {
            updateCharts(data);
        } else {
            // Stocker les données pour l'initialisation des graphiques
            window.statsData = data;
        }
        
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

async function loadRecentActions() {
    try {
        const response = await fetch(`${API_BASE}/api/logs?limit=10`);
        const data = await response.json();
        
        const container = document.getElementById('recent-actions-list');
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class=\"loading\">Aucune action récente</div>';
            return;
        }
        
        const html = data.map(action => `
            <div class=\"action-item\">
                <div class=\"action-badge ${action.action}\">
                    <i class=\"fas ${getActionIcon(action.action)}\"></i>
                </div>
                <div class=\"action-details\">
                    <div class=\"action-user\">${escapeHtml(action.target)} par ${escapeHtml(action.moderator)}</div>
                    <div class=\"action-reason\">${escapeHtml(action.reason || 'Aucune raison spécifiée')}</div>
                </div>
                <div class=\"action-time\">${formatRelativeTime(action.timestamp)}</div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement actions récentes:', error);
        document.getElementById('recent-actions-list').innerHTML = 
            '<div class=\"loading\">Erreur de chargement</div>';
    }
}

async function loadServers() {
    try {
        const response = await fetch(`${API_BASE}/api/guilds`);
        const data = await response.json();
        
        const container = document.getElementById('servers-grid');
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class=\"loading\">Aucun serveur connecté</div>';
            return;
        }
        
        const html = data.map(server => `
            <div class=\"server-card\" onclick=\"selectServer('${server.id}')\">
                <div class=\"server-name\">${escapeHtml(server.name)}</div>
                <div class=\"server-stats\">
                    <span><i class=\"fas fa-users\"></i> ${formatNumber(server.member_count)}</span>
                    <span><i class=\"fas fa-hashtag\"></i> ${server.channels}</span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement serveurs:', error);
        document.getElementById('servers-grid').innerHTML = 
            '<div class=\"loading\">Erreur de chargement</div>';
    }
}

function initializeCharts() {
    // Configuration commune pour les graphiques
    Chart.defaults.color = '#b9bbbe';
    Chart.defaults.borderColor = '#2f2f2f';
    
    // Graphique des actions par type
    const actionsCtx = document.getElementById('actionsChart');
    if (actionsCtx) {
        actionsChart = new Chart(actionsCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#5865f2', '#3ba55d', '#ed4245', '#faa61a', 
                        '#57f287', '#00d4ff', '#9146ff'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
    }
    
    // Graphique de l'activité quotidienne
    const dailyCtx = document.getElementById('dailyChart');
    if (dailyCtx) {
        dailyChart = new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Actions',
                    data: [],
                    borderColor: '#5865f2',
                    backgroundColor: 'rgba(88, 101, 242, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Charger les données initiales si disponibles
    if (window.statsData) {
        updateCharts(window.statsData);
    }
}

function updateCharts(data) {
    // Mettre à jour le graphique des actions par type
    if (actionsChart && data.actions_by_type) {
        const actions = Object.entries(data.actions_by_type);
        actionsChart.data.labels = actions.map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
        actionsChart.data.datasets[0].data = actions.map(([, value]) => value);
        actionsChart.update();
    }
    
    // Mettre à jour le graphique d'activité quotidienne
    if (dailyChart && data.daily_activity) {
        const last7Days = getLast7Days();
        const activityData = last7Days.map(date => data.daily_activity[date] || 0);
        
        dailyChart.data.labels = last7Days.map(date => formatShortDate(date));
        dailyChart.data.datasets[0].data = activityData;
        dailyChart.update();
    }
}

// Fonctions utilitaires
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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

function formatShortDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
}

function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }
    return days;
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

function animateNumber(element) {
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 200);
}

function selectServer(serverId) {
    // Rediriger vers la page de gestion du serveur ou ouvrir un modal
    console.log('Serveur sélectionné:', serverId);
    // Vous pouvez ajouter ici la logique pour afficher plus d'infos sur le serveur
}

// Fonctions de contrôle
function refreshData() {
    const refreshBtn = document.querySelector('.btn-icon');
    refreshBtn.style.transform = 'rotate(360deg)';
    
    initializeDashboard().then(() => {
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 500);
    });
}

function startAutoRefresh() {
    // Actualiser automatiquement toutes les 30 secondes
    refreshInterval = setInterval(() => {
        loadBotStatus();
        loadStats();
    }, 30000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// Nettoyage lors de la fermeture de la page
window.addEventListener('beforeunload', stopAutoRefresh);