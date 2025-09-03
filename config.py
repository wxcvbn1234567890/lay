import os
from pathlib import Path

def load_config():
    """Charge la configuration depuis différentes sources"""
    config = {}
    
    # 1. Essayer de charger depuis un fichier .env
    env_file = Path('.env')
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    config[key] = value.strip('"\'')
    
    # 2. Essayer les variables d'environnement (priorité sur .env)
    for key in ['TOKEN', 'DISCORD_TOKEN', 'BOT_TOKEN']:
        if os.getenv(key):
            config['TOKEN'] = os.getenv(key)
            break
    
    # 3. Fichier de config local
    config_file = Path('bot_config.txt')
    if config_file.exists():
        with open(config_file, 'r') as f:
            content = f.read().strip()
            if content and not config.get('TOKEN'):
                config['TOKEN'] = content
    
    return config

def get_discord_token():
    """Récupère le token Discord depuis différentes sources"""
    config = load_config()
    
    # Priorité : variable d'environnement > fichier .env > fichier config
    token = config.get('TOKEN')
    
    if not token:
        # Créer un fichier d'exemple si aucun token n'est trouvé
        example_file = Path('bot_config.example.txt')
        if not example_file.exists():
            with open(example_file, 'w') as f:
                f.write('# Remplacez cette ligne par votre token Discord\n')
                f.write('# Vous pouvez aussi créer un fichier .env avec TOKEN=votre_token\n')
                f.write('# Ou définir une variable d\'environnement TOKEN\n')
        
        print("⚠️ AUCUN TOKEN DISCORD TROUVÉ!")
        print("📝 Méthodes pour configurer votre token:")
        print("   1. Variable d'environnement: export TOKEN=votre_token")
        print("   2. Fichier .env: TOKEN=votre_token")  
        print("   3. Fichier bot_config.txt: votre_token")
        return None
    
    return token