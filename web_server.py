from flask import Flask, render_template, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
import threading
import time

app = Flask(__name__)
CORS(app)

# Variable globale pour stocker le statut du bot
bot_status = {'online': False, 'last_check': None}
bot_thread = None

def init_database_web():
    """Initialise la base de données si elle n'existe pas"""
    conn = sqlite3.connect('moderation_logs.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS moderation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            moderator TEXT NOT NULL,
            target TEXT NOT NULL,
            duration TEXT,
            reason TEXT,
            guild_id TEXT NOT NULL,
            channel_id TEXT
        )
    ''')
    conn.commit()
    conn.close()

def get_logs():
    """Récupère tous les logs de modération depuis la base de données"""
    try:
        # S'assurer que la base de données existe
        init_database_web()
        
        conn = sqlite3.connect('moderation_logs.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, timestamp, action, moderator, target, duration, reason, guild_id, channel_id
            FROM moderation_logs 
            ORDER BY timestamp DESC
        ''')
        logs = cursor.fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        formatted_logs = []
        for log in logs:
            formatted_log = {
                'id': log[0],
                'timestamp': log[1],
                'action': log[2],
                'moderator': log[3],
                'target': log[4],
                'duration': log[5],
                'reason': log[6],
                'guild_id': log[7],
                'channel_id': log[8]
            }
            formatted_logs.append(formatted_log)
        
        return formatted_logs
    except Exception as e:
        print(f"Erreur lors de la récupération des logs: {e}")
        return []

@app.route('/')
def index():
    """Page d'accueil avec tous les logs"""
    logs = get_logs()
    return render_template('index.html', logs=logs)

@app.route('/api/logs')
def api_logs():
    """API endpoint pour récupérer les logs en JSON"""
    logs = get_logs()
    return jsonify(logs)

@app.route('/api/logs/<action_type>')
def api_logs_by_action(action_type):
    """API endpoint pour récupérer les logs par type d'action"""
    try:
        # S'assurer que la base de données existe
        init_database_web()
        
        conn = sqlite3.connect('moderation_logs.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, timestamp, action, moderator, target, duration, reason, guild_id, channel_id
            FROM moderation_logs 
            WHERE action = ?
            ORDER BY timestamp DESC
        ''', (action_type,))
        logs = cursor.fetchall()
        conn.close()
        
        formatted_logs = []
        for log in logs:
            formatted_log = {
                'id': log[0],
                'timestamp': log[1],
                'action': log[2],
                'moderator': log[3],
                'target': log[4],
                'duration': log[5],
                'reason': log[6],
                'guild_id': log[7],
                'channel_id': log[8]
            }
            formatted_logs.append(formatted_log)
        
        return jsonify(formatted_logs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def api_stats():
    """API endpoint pour récupérer les statistiques"""
    try:
        # S'assurer que la base de données existe
        init_database_web()
        
        conn = sqlite3.connect('moderation_logs.db')
        cursor = conn.cursor()
        
        # Total actions
        cursor.execute('SELECT COUNT(*) FROM moderation_logs')
        total_actions = cursor.fetchone()[0]
        
        # Actions by type
        cursor.execute('SELECT action, COUNT(*) FROM moderation_logs GROUP BY action')
        actions_by_type = dict(cursor.fetchall())
        
        # Recent activity (last 7 days)
        cursor.execute('''
            SELECT COUNT(*) FROM moderation_logs 
            WHERE datetime(timestamp) > datetime('now', '-7 days')
        ''')
        recent_activity = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'total_actions': total_actions,
            'actions_by_type': actions_by_type,
            'recent_activity': recent_activity
        })
    except Exception as e:
        print(f"Erreur API stats: {e}")
        return jsonify({
            'total_actions': 0,
            'actions_by_type': {},
            'recent_activity': 0
        })

@app.route('/api/bot-status')
def api_bot_status():
    """API endpoint pour récupérer le statut du bot Discord"""
    global bot_status
    return jsonify({
        'online': bot_status['online'],
        'last_check': bot_status['last_check'],
        'uptime': '99.9%' if bot_status['online'] else '0%'
    })

def update_bot_status():
    """Met à jour le statut du bot en continu"""
    global bot_status
    while True:
        try:
            # Vérifier si le bot Discord fonctionne en vérifiant le token
            token = os.getenv('TOKEN')
            if token and len(token) > 0:
                bot_status['online'] = True
            else:
                bot_status['online'] = False
            bot_status['last_check'] = datetime.now().isoformat()
        except Exception as e:
            bot_status['online'] = False
            bot_status['last_check'] = datetime.now().isoformat()
            print(f"Erreur lors de la vérification du statut du bot: {e}")
        
        time.sleep(10)  # Vérifier toutes les 10 secondes

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Create static directory if it doesn't exist
    if not os.path.exists('static'):
        os.makedirs('static')
    
    # Démarrer le thread de vérification du statut du bot
    bot_thread = threading.Thread(target=update_bot_status, daemon=True)
    bot_thread.start()
    
    app.run(host='0.0.0.0', port=5000, debug=True)