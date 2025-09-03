#!/usr/bin/env python3
"""
Script de lancement moderne - Version unifiée
Compatible Replit et environnements locaux
"""
import subprocess
import threading
import time
import os
import sys
import signal
import platform
import webbrowser
from pathlib import Path

def install_requirements():
    """Installe les dépendances requises"""
    print("📦 Vérification des dépendances...")
    
    requirements = [
        "discord.py>=2.3.2",
        "flask>=3.0.0", 
        "flask-cors>=4.0.0"
    ]
    
    try:
        import discord
        import flask
        import flask_cors
        print("✅ Toutes les dépendances sont déjà installées")
    except ImportError as e:
        print(f"⚠️  Dépendances manquantes détectées: {e}")
        print("📥 Installation des dépendances...")
        
        for req in requirements:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", req])
            except subprocess.CalledProcessError:
                print(f"❌ Erreur lors de l'installation de {req}")
                print("💡 Essayez: pip install discord.py flask flask-cors")
                return False
        print("✅ Dépendances installées avec succès")
    
    return True

def check_token():
    """Vérifie si le token Discord est configuré"""
    token = os.getenv('TOKEN')
    if not token:
        print("⚠️  TOKEN DISCORD MANQUANT!")
        print("=" * 50)
        print("Pour que le bot fonctionne, vous devez:")
        print("1. Créer une variable d'environnement TOKEN")
        print("2. Ou modifier le fichier main.py ligne ~328")
        print("3. Remplacer os.getenv('TOKEN') par votre token")
        print("")
        print("Exemple:")
        print("  Windows: set TOKEN=votre_token_ici")
        print("  Linux/Mac: export TOKEN=votre_token_ici")
        print("=" * 50)
        return False
    
    print("✅ Token Discord configuré")
    return True

def run_discord_bot():
    """Lance le bot Discord"""
    try:
        print("🤖 Démarrage du bot Discord...")
        subprocess.run([sys.executable, 'main.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur bot Discord: {e}")
        print("💡 Vérifiez que le token est valide et que les intentions sont activées")
    except KeyboardInterrupt:
        print("🛑 Bot Discord arrêté")

def run_web_server():
    """Lance le serveur web moderne"""
    try:
        print("🌐 Démarrage du serveur web moderne...")
        subprocess.run([sys.executable, 'web_server_new.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur serveur web: {e}")
    except KeyboardInterrupt:
        print("🛑 Serveur web arrêté")

def signal_handler(sig, frame):
    """Gestionnaire pour arrêter proprement les services"""
    print("\n🛑 Arrêt des services...")
    sys.exit(0)

def open_browser():
    """Ouvre automatiquement le navigateur"""
    time.sleep(3)  # Attendre que le serveur démarre
    try:
        webbrowser.open('http://localhost:5000')
        print("🌐 Navigateur ouvert sur http://localhost:5000")
    except Exception as e:
        print(f"⚠️  Impossible d'ouvrir le navigateur: {e}")

def main():
    """Fonction principale"""
    print("🚀 LANCEMENT DU BOT DISCORD + DASHBOARD MODERNE")
    print("=" * 55)
    print(f"🖥️  Système: {platform.system()} {platform.release()}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    print(f"📁 Répertoire: {Path.cwd()}")
    print("=" * 55)
    
    # Vérifier et installer les dépendances
    if not install_requirements():
        print("❌ Installation des dépendances échouée")
        input("Appuyez sur Entrée pour quitter...")
        return
    
    # Vérifier le token (optionnel pour le serveur web)
    has_token = check_token()
    
    # Configurer le gestionnaire de signal
    signal.signal(signal.SIGINT, signal_handler)
    
    print("\n🎯 SERVICES DÉMARRÉS:")
    print("-" * 35)
    
    # Démarrer le serveur web dans un thread
    web_thread = threading.Thread(target=run_web_server, daemon=True)
    web_thread.start()
    
    # Ouvrir le navigateur dans un thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    time.sleep(2)
    print("✅ Serveur web: http://localhost:5000")
    print("📊 Interface moderne disponible dans votre navigateur")
    print("🎨 Design entièrement recodé avec fonctionnalités complètes")
    print("-" * 35)
    
    if has_token:
        print("🤖 Démarrage du bot Discord...")
        print("📝 Les logs apparaîtront sur l'interface web")
        print("🎮 Vous pouvez maintenant contrôler le bot depuis le site!")
        print("\n💡 Nouvelles fonctionnalités:")
        print("  - Interface web moderne et responsive")
        print("  - Contrôle du bot directement depuis le site")
        print("  - Graphiques et statistiques en temps réel")
        print("  - Gestion des utilisateurs et des serveurs")
        print("  - Historique des commandes")
        print("\n🛑 Appuyez sur Ctrl+C pour arrêter\n")
        
        try:
            run_discord_bot()
        except KeyboardInterrupt:
            print("\n🛑 Arrêt des services...")
    else:
        print("⏸️  Bot Discord non démarré (token manquant)")
        print("📊 Le dashboard reste accessible sur http://localhost:5000")
        print("\n🛑 Appuyez sur Ctrl+C pour arrêter le serveur web\n")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Arrêt du serveur web...")

if __name__ == "__main__":
    main()