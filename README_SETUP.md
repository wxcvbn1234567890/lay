# 🤖 Discord Bot de Modération + Dashboard Web

Bot Discord complet avec interface web moderne pour la modération de serveurs.

## 📋 Fonctionnalités

**Bot Discord:**
- ✅ Commandes de modération : `+mute`, `+unmute`, `+ban`, `+kick`, `+warn`, `+lock`, `+unlock`
- ✅ Gestion temporaire : `30s`, `5m`, `2h`, `1d`
- ✅ Système de permissions (admins + rôle "bot")
- ✅ Logs automatiques en base SQLite

**Dashboard Web:**
- ✅ Interface moderne noire/blanche
- ✅ Statut du bot en temps réel
- ✅ Statistiques et graphiques
- ✅ Filtrage et recherche des logs
- ✅ Design responsive

## 🚀 Installation Rapide

### Méthode 1 : Script automatique (recommandé)
```bash
python launch.py
```

### Méthode 2 : Installation manuelle
```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Configurer le token Discord
export TOKEN="votre_token_discord"

# 3. Lancer le serveur web seulement
python web_server.py

# 4. Lancer le bot Discord seulement  
python main.py

# 5. Lancer les deux ensemble
python run_both.py
```

## ⚙️ Configuration Discord Bot

1. **Créer l'application:**
   - Aller sur https://discord.com/developers/applications/
   - Créer une nouvelle application
   - Copier le token dans l'onglet "Bot"

2. **Activer les Privileged Intents:**
   - Dans l'onglet "Bot", activer :
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ PRESENCE INTENT

3. **Générer le lien d'invitation:**
   - Onglet "OAuth2" → "URL Generator"  
   - Scopes : `bot` + `applications.commands`
   - Permissions : Administrator

4. **Configurer le token:**
   - Variable d'environnement : `TOKEN=votre_token`
   - Ou modifier directement `main.py` ligne 328

## 🌐 Accès au Dashboard

Une fois lancé, le dashboard sera accessible sur :
- **Local:** http://localhost:5000
- **Replit:** Voir l'URL dans la console de lancement

## 📁 Structure du Projet

```
├── main.py              # Bot Discord principal
├── web_server.py        # Serveur web Flask  
├── launch.py            # Script de lancement automatique
├── run_both.py          # Lance bot + serveur ensemble
├── requirements.txt     # Dépendances Python
├── templates/
│   └── index.html       # Interface web
├── static/
│   ├── style.css        # Styles CSS
│   └── script.js        # JavaScript
└── moderation_logs.db   # Base de données SQLite (créée automatiquement)
```

## 🎯 Commandes du Bot

| Commande | Description | Exemple |
|----------|-------------|---------|
| `+mute @user [temps] [raison]` | Mute un utilisateur | `+mute @user 1h spam` |
| `+unmute @user [raison]` | Démute un utilisateur | `+unmute @user pardon` |
| `+ban @user [temps] [raison]` | Ban un utilisateur | `+ban @user 7d toxique` |  
| `+kick @user [raison]` | Kick un utilisateur | `+kick @user règlement` |
| `+warn @user [raison]` | Avertir un utilisateur | `+warn @user attention` |
| `+lock [raison]` | Verrouiller le channel | `+lock maintenance` |
| `+unlock [raison]` | Déverrouiller le channel | `+unlock fini` |
| `+bothelp` | Afficher l'aide | `+bothelp` |

**Formats de temps supportés:** `30s`, `5m`, `2h`, `1d`

## 🛠️ Dépannage

**Le bot ne se connecte pas :**
- Vérifiez que le token est correct
- Activez les intentions privilégiées
- Vérifiez votre connexion internet

**Dashboard inaccessible :**
- Vérifiez que le port 5000 n'est pas utilisé
- Essayez http://127.0.0.1:5000 à la place

**Erreurs de permissions :**
- Le bot a besoin des permissions d'administrateur
- Vérifiez que le rôle du bot est au-dessus des autres

## 📝 Notes Importantes

- Les logs sont stockés dans `moderation_logs.db`
- Le dashboard fonctionne même si le bot est hors ligne
- Compatible Python 3.8+
- Fonctionne sur Windows, Linux, macOS

## 🔧 Développement

Pour modifier le design ou ajouter des fonctionnalités :
- **Interface :** Modifiez `templates/index.html` et `static/style.css`
- **API :** Ajoutez des endpoints dans `web_server.py`
- **Bot :** Ajoutez des commandes dans `main.py`

---
*Créé pour un système de modération Discord complet et moderne*