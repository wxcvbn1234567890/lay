document.addEventListener('DOMContentLoaded', function() {
    const actionFilter = document.getElementById('action-filter');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const logsGrid = document.getElementById('logs-grid');

    // Load statistics and bot status on page load
    loadStats();
    loadBotStatus();
    
    // Refresh bot status every 5 seconds
    setInterval(loadBotStatus, 5000);

    // Filter functionality
    function filterLogs() {
        const selectedAction = actionFilter.value.toLowerCase();
        const searchTerm = searchInput.value.toLowerCase();
        const logCards = document.querySelectorAll('.log-card');

        logCards.forEach(card => {
            const action = card.dataset.action.toLowerCase();
            const content = card.dataset.content.toLowerCase();
            
            const actionMatch = !selectedAction || action === selectedAction;
            const searchMatch = !searchTerm || content.includes(searchTerm);
            
            if (actionMatch && searchMatch) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Event listeners
    actionFilter.addEventListener('change', filterLogs);
    searchInput.addEventListener('input', filterLogs);
    refreshBtn.addEventListener('click', function() {
        location.reload();
    });

    // Load statistics
    async function loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            document.getElementById('total-actions').textContent = stats.total_actions || 0;
            document.getElementById('recent-activity').textContent = stats.recent_activity || 0;
            
            // Find most common action
            const actionTypes = stats.actions_by_type || {};
            const mostCommon = Object.keys(actionTypes).reduce((a, b) => 
                actionTypes[a] > actionTypes[b] ? a : b, 'N/A'
            );
            
            document.getElementById('most-common').textContent = mostCommon !== 'N/A' ? 
                mostCommon.charAt(0).toUpperCase() + mostCommon.slice(1) : 'N/A';
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    }

    // Load bot status
    async function loadBotStatus() {
        try {
            const response = await fetch('/api/bot-status');
            const status = await response.json();
            
            const statusElement = document.getElementById('bot-status');
            const statusCard = document.getElementById('bot-status-card');
            const statusText = document.getElementById('status-text');
            
            if (status.online) {
                statusElement.className = 'status-indicator status-online';
                statusCard.className = 'stat-card online';
                statusText.textContent = 'Online';
            } else {
                statusElement.className = 'status-indicator status-offline';
                statusCard.className = 'stat-card offline';
                statusText.textContent = 'Offline';
            }
        } catch (error) {
            console.error('Erreur lors du chargement du statut du bot:', error);
            const statusElement = document.getElementById('bot-status');
            const statusCard = document.getElementById('bot-status-card');
            const statusText = document.getElementById('status-text');
            
            statusElement.className = 'status-indicator status-offline';
            statusCard.className = 'stat-card offline';
            statusText.textContent = 'Unknown';
        }
    }

    // Add smooth animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    });

    // Observe all log cards for animation
    document.querySelectorAll('.log-card').forEach(card => {
        observer.observe(card);
    });
});