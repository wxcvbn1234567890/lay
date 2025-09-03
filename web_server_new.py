from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
import threading
import time
import asyncio
import json
from pathlib import Path

# Import bot functions
import main

app = Flask(__name__)
CORS(app)

# Cache headers to prevent caching in Replit iframe
@app.after_request
def after_request(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Variable globale pour stocker le statut du bot
bot_status = {'online': False, 'last_check': None, 'guilds': [], 'users_count': 0}

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

def get_logs(guild_id=None, action_type=None, limit=50):
    """Récupère les logs de modération avec filtres optionnels"""
    try:
        init_database_web()
        
        conn = sqlite3.connect('moderation_logs.db')
        cursor = conn.cursor()
        
        query = '''
            SELECT id, timestamp, action, moderator, target, duration, reason, guild_id, channel_id
            FROM moderation_logs
        '''
        params = []
        
        conditions = []
        if guild_id:
            conditions.append('guild_id = ?')
            params.append(guild_id)
        if action_type:
            conditions.append('action = ?')
            params.append(action_type)
            
        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)
            
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
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
        
        return formatted_logs
    except Exception as e:
        print(f"Erreur lors de la récupération des logs: {e}")
        return []

def get_bot_info():
    """Récupère les informations du bot Discord"""
    try:
        bot = main.get_bot()
        if bot and bot.is_ready():
            guilds_info = []
            total_users = 0
            
            for guild in bot.guilds:
                guild_info = {
                    'id': str(guild.id),
                    'name': guild.name,
                    'member_count': guild.member_count,
                    'channels': len(guild.channels),
                    'roles': len(guild.roles)
                }
                guilds_info.append(guild_info)
                total_users += guild.member_count
            
            return {
                'online': True,
                'user': {
                    'name': bot.user.name,
                    'id': str(bot.user.id),
                    'avatar': str(bot.user.avatar.url) if bot.user.avatar else None
                },
                'guilds': guilds_info,
                'total_users': total_users,
                'latency': round(bot.latency * 1000, 2)
            }
    except Exception as e:
        print(f"Erreur récupération info bot: {e}")
    
    return {
        'online': False,
        'user': None,
        'guilds': [],
        'total_users': 0,
        'latency': 0
    }

# Routes principales
@app.route('/')
def dashboard():
    """Dashboard principal"""
    return render_template('dashboard.html')

@app.route('/users')
def users():
    """Page de gestion des utilisateurs"""
    return render_template('users.html')

@app.route('/commands')
def commands():
    """Page d'exécution des commandes"""
    return render_template('commands.html')

@app.route('/logs')
def logs():
    """Page des logs détaillés"""
    return render_template('logs.html')

@app.route('/settings')
def settings():
    """Page des paramètres"""
    return render_template('settings.html')

# API Routes
@app.route('/api/status')
def api_status():
    """Statut du bot et informations générales"""
    bot_info = get_bot_info()
    return jsonify(bot_info)

@app.route('/api/logs')
def api_logs():
    """API pour récupérer les logs"""
    guild_id = request.args.get('guild_id')
    action_type = request.args.get('action')
    limit = int(request.args.get('limit', 50))
    
    logs = get_logs(guild_id, action_type, limit)
    return jsonify(logs)

@app.route('/api/stats')
def api_stats():
    """Statistiques générales"""
    try:
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
        
        # Activity by day (last 7 days)
        cursor.execute('''
            SELECT date(timestamp) as day, COUNT(*) as count
            FROM moderation_logs 
            WHERE datetime(timestamp) > datetime('now', '-7 days')
            GROUP BY date(timestamp)
            ORDER BY day DESC
        ''')
        daily_activity = dict(cursor.fetchall())
        
        conn.close()
        
        return jsonify({
            'total_actions': total_actions,
            'actions_by_type': actions_by_type,
            'recent_activity': recent_activity,
            'daily_activity': daily_activity
        })
    except Exception as e:
        print(f"Erreur API stats: {e}")
        return jsonify({
            'total_actions': 0,
            'actions_by_type': {},
            'recent_activity': 0,
            'daily_activity': {}
        })

@app.route('/api/command/execute', methods=['POST'])
def api_execute_command():
    """Exécute une commande Discord depuis l'interface"""
    try:
        data = request.json
        command = data.get('command')
        guild_id = data.get('guild_id')
        user_id = data.get('user_id')
        channel_id = data.get('channel_id')
        reason = data.get('reason', 'Exécuté depuis le dashboard web')
        duration = data.get('duration')
        
        if not command or not guild_id:
            return jsonify({'success': False, 'message': 'Paramètres manquants'}), 400
        
        # Exécuter la commande de façon asynchrone
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success, message = loop.run_until_complete(
                main.execute_bot_command(guild_id, command, user_id, reason, duration, channel_id)
            )
            loop.close()
        except Exception as e:
            return jsonify({'success': False, 'message': f'Erreur d\'exécution: {str(e)}'}), 500
        
        return jsonify({'success': success, 'message': message})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erreur: {str(e)}'}), 500

@app.route('/api/guilds')
def api_guilds():
    """Liste des serveurs Discord"""
    bot_info = get_bot_info()
    return jsonify(bot_info.get('guilds', []))

@app.route('/api/guild/<guild_id>/members')
def api_guild_members(guild_id):
    """Membres d'un serveur spécifique"""
    try:
        bot = main.get_bot()
        if not bot or not bot.is_ready():
            return jsonify([])
        
        guild = bot.get_guild(int(guild_id))
        if not guild:
            return jsonify([])
        
        members = []
        for member in guild.members[:100]:  # Limiter à 100 membres
            if not member.bot:  # Exclure les bots
                member_info = {
                    'id': str(member.id),
                    'name': member.name,
                    'display_name': member.display_name,
                    'avatar': str(member.avatar.url) if member.avatar else None,
                    'status': str(member.status),
                    'roles': [role.name for role in member.roles[1:]]  # Exclure @everyone
                }
                members.append(member_info)
        
        return jsonify(members)
        
    except Exception as e:
        print(f"Erreur récupération membres: {e}")
        return jsonify([])

@app.route('/api/guild/<guild_id>/channels')
def api_guild_channels(guild_id):
    """Canaux d'un serveur spécifique"""
    try:
        bot = main.get_bot()
        if not bot or not bot.is_ready():
            return jsonify([])
        
        guild = bot.get_guild(int(guild_id))
        if not guild:
            return jsonify([])
        
        channels = []
        for channel in guild.channels:
            if hasattr(channel, 'send'):  # Canaux texte seulement
                channel_info = {
                    'id': str(channel.id),
                    'name': channel.name,
                    'type': str(channel.type),
                    'category': channel.category.name if channel.category else None
                }
                channels.append(channel_info)
        
        return jsonify(channels)
        
    except Exception as e:
        print(f"Erreur récupération canaux: {e}")
        return jsonify([])

if __name__ == '__main__':
    # Créer les dossiers nécessaires
    for folder in ['templates', 'static']:
        if not os.path.exists(folder):
            os.makedirs(folder)
    
    app.run(host='0.0.0.0', port=5000, debug=True)