#!/usr/bin/env python3
"""
Script pour démarrer à la fois le bot Discord et le serveur web
"""
import subprocess
import threading
import time
import os
import signal
import sys

def run_discord_bot():
    """Lance le bot Discord"""
    try:
        print("🤖 Démarrage du bot Discord...")
        subprocess.run(['python', 'main.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors du lancement du bot Discord: {e}")
    except KeyboardInterrupt:
        print("🛑 Bot Discord arrêté par l'utilisateur")

def run_web_server():
    """Lance le serveur web"""
    try:
        print("🌐 Démarrage du serveur web...")
        subprocess.run(['python', 'web_server.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors du lancement du serveur web: {e}")
    except KeyboardInterrupt:
        print("🛑 Serveur web arrêté par l'utilisateur")

def signal_handler(sig, frame):
    """Gestionnaire pour arrêter proprement les deux services"""
    print("\n🛑 Arrêt des services...")
    sys.exit(0)

if __name__ == "__main__":
    # Configurer le gestionnaire de signal pour Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    
    print("🚀 Démarrage du système Discord Bot + Serveur Web")
    print("="*50)
    
    # Vérifier si le token Discord est configuré
    token = os.getenv('TOKEN')
    if not token:
        print("⚠️  ATTENTION: Token Discord non configuré!")
        print("   Ajoutez votre token dans les secrets Replit avec la clé 'TOKEN'")
        print("   Le bot Discord ne pourra pas se connecter sans token.")
        print()
    
    # Lancer le serveur web dans un thread séparé
    web_thread = threading.Thread(target=run_web_server, daemon=True)
    web_thread.start()
    
    # Attendre un peu pour laisser le serveur web démarrer
    time.sleep(3)
    
    print("✅ Serveur web démarré sur http://0.0.0.0:5000")
    print("📊 Dashboard disponible dans l'interface Replit")
    print("🔗 URL directe: https://<votre-repl-id>.repl.co")
    print()
    
    if token:
        print("🤖 Démarrage du bot Discord...")
        print("📝 Les logs d'actions apparaîtront sur le dashboard web")
        print()
        
        # Lancer le bot Discord dans le thread principal
        try:
            run_discord_bot()
        except KeyboardInterrupt:
            print("\n🛑 Arrêt des services...")
    else:
        print("⏸️  Bot Discord non démarré - Token manquant")
        print("   Le serveur web reste actif pour configuration")
        
        # Garder le serveur web actif
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Arrêt du serveur web...")