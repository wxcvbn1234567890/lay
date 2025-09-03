#!/usr/bin/env python3
import subprocess
import threading
import time
import os

def run_discord_bot():
    """Lance le bot Discord"""
    try:
        subprocess.run(['python', 'main.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Erreur lors du lancement du bot Discord: {e}")
    except KeyboardInterrupt:
        print("Bot Discord arrêté par l'utilisateur")

def run_web_server():
    """Lance le serveur web"""
    try:
        subprocess.run(['python', 'web_server.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Erreur lors du lancement du serveur web: {e}")
    except KeyboardInterrupt:
        print("Serveur web arrêté par l'utilisateur")

if __name__ == "__main__":
    print("Démarrage du bot Discord et du serveur web...")
    
    # Lancer le serveur web dans un thread séparé
    web_thread = threading.Thread(target=run_web_server, daemon=True)
    web_thread.start()
    
    # Attendre un peu pour laisser le serveur web démarrer
    time.sleep(2)
    
    print("Serveur web démarré sur http://0.0.0.0:5000")
    print("Démarrage du bot Discord...")
    
    # Lancer le bot Discord dans le thread principal
    try:
        run_discord_bot()
    except KeyboardInterrupt:
        print("\nArrêt des services...")