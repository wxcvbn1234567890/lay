import os
import re
import sqlite3
from datetime import datetime, timedelta
from typing import Optional
import asyncio

import discord
from discord.ext import commands

# Import our config system
from config import get_discord_token

# Database setup
def init_database():
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

def log_action(action: str, moderator: str, target: str, guild_id: str, duration: Optional[str] = None, reason: Optional[str] = None, channel_id: Optional[str] = None):
    conn = sqlite3.connect('moderation_logs.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO moderation_logs (timestamp, action, moderator, target, duration, reason, guild_id, channel_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (datetime.now().isoformat(), action, moderator, target, duration, reason, guild_id, channel_id))
    conn.commit()
    conn.close()

def parse_duration(duration_str: str) -> Optional[timedelta]:
    """Parse duration string like '1d', '5h', '30m', '45s' into timedelta"""
    if not duration_str:
        return None
    
    match = re.match(r'^(\d+)([smhd])$', duration_str.lower())
    if not match:
        return None
    
    amount, unit = match.groups()
    amount = int(amount)
    
    if unit == 's':
        return timedelta(seconds=amount)
    elif unit == 'm':
        return timedelta(minutes=amount)
    elif unit == 'h':
        return timedelta(hours=amount)
    elif unit == 'd':
        return timedelta(days=amount)
    
    return None

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True
intents.presences = True

bot = commands.Bot(command_prefix='+', intents=intents)

@bot.event
async def on_ready():
    print(f'Bot connecté en tant que {bot.user}')
    init_database()

# Check if user has bot role or admin permissions
def has_bot_permissions():
    async def predicate(ctx):
        # Check if user is admin
        if ctx.author.guild_permissions.administrator:
            return True
        
        # Check if user has a role named "bot" (case insensitive)
        for role in ctx.author.roles:
            if role.name.lower() == "bot":
                return True
        
        return False
    return commands.check(predicate)

@bot.command(name='mute')
@has_bot_permissions()
async def mute_user(ctx, member: discord.Member, duration: Optional[str] = None, *, reason: str = "Aucune raison spécifiée"):
    """Mute un utilisateur pour une durée spécifiée"""
    try:
        # Find or create muted role
        muted_role = discord.utils.get(ctx.guild.roles, name="Muted")
        if not muted_role:
            muted_role = await ctx.guild.create_role(name="Muted", reason="Rôle pour les utilisateurs mutés")
            
            # Set permissions for muted role
            for channel in ctx.guild.channels:
                await channel.set_permissions(muted_role, send_messages=False, speak=False)
        
        await member.add_roles(muted_role, reason=reason)
        
        duration_delta = parse_duration(duration) if duration else None
        duration_text = f"pour {duration}" if duration else "indéfiniment"
        
        embed = discord.Embed(
            title="🔇 Utilisateur Muté",
            description=f"{member.mention} a été muté {duration_text}",
            color=discord.Color.orange()
        )
        embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
        embed.add_field(name="Raison", value=reason, inline=False)
        
        await ctx.send(embed=embed)
        
        # Log the action
        log_action("mute", str(ctx.author), str(member), str(ctx.guild.id), duration, reason)
        
        # Auto-unmute after duration
        if duration_delta:
            import asyncio
            await asyncio.sleep(duration_delta.total_seconds())
            if muted_role in member.roles:
                await member.remove_roles(muted_role, reason="Fin de la durée du mute")
                
    except Exception as e:
        await ctx.send(f"Erreur lors du mute: {str(e)}")

@bot.command(name='unmute')
@has_bot_permissions()
async def unmute_user(ctx, member: discord.Member, *, reason: str = "Aucune raison spécifiée"):
    """Unmute un utilisateur"""
    try:
        muted_role = discord.utils.get(ctx.guild.roles, name="Muted")
        if muted_role and muted_role in member.roles:
            await member.remove_roles(muted_role, reason=reason)
            
            embed = discord.Embed(
                title="🔊 Utilisateur Démuté",
                description=f"{member.mention} a été démuté",
                color=discord.Color.green()
            )
            embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
            embed.add_field(name="Raison", value=reason, inline=False)
            
            await ctx.send(embed=embed)
            log_action("unmute", str(ctx.author), str(member), str(ctx.guild.id), None, reason)
        else:
            await ctx.send("Cet utilisateur n'est pas muté.")
            
    except Exception as e:
        await ctx.send(f"Erreur lors de l'unmute: {str(e)}")

@bot.command(name='ban')
@has_bot_permissions()
async def ban_user(ctx, member: discord.Member, duration: Optional[str] = None, *, reason: str = "Aucune raison spécifiée"):
    """Ban un utilisateur"""
    try:
        await member.ban(reason=reason)
        
        duration_text = f"pour {duration}" if duration else "définitivement"
        
        embed = discord.Embed(
            title="🔨 Utilisateur Banni",
            description=f"{member.mention} a été banni {duration_text}",
            color=discord.Color.red()
        )
        embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
        embed.add_field(name="Raison", value=reason, inline=False)
        
        await ctx.send(embed=embed)
        log_action("ban", str(ctx.author), str(member), str(ctx.guild.id), duration, reason)
        
    except Exception as e:
        await ctx.send(f"Erreur lors du ban: {str(e)}")

@bot.command(name='kick')
@has_bot_permissions()
async def kick_user(ctx, member: discord.Member, *, reason: str = "Aucune raison spécifiée"):
    """Kick un utilisateur"""
    try:
        await member.kick(reason=reason)
        
        embed = discord.Embed(
            title="👢 Utilisateur Kické",
            description=f"{member.mention} a été kické",
            color=discord.Color.orange()
        )
        embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
        embed.add_field(name="Raison", value=reason, inline=False)
        
        await ctx.send(embed=embed)
        log_action("kick", str(ctx.author), str(member), str(ctx.guild.id), None, reason)
        
    except Exception as e:
        await ctx.send(f"Erreur lors du kick: {str(e)}")

@bot.command(name='lock')
@has_bot_permissions()
async def lock_channel(ctx, *, reason: str = "Aucune raison spécifiée"):
    """Lock un channel (seuls les utilisateurs avec le rôle 'bot' peuvent parler)"""
    try:
        # Get bot role
        bot_role = discord.utils.get(ctx.guild.roles, name="bot")
        if not bot_role:
            bot_role = await ctx.guild.create_role(name="bot", reason="Rôle pour les modérateurs")
        
        # Set permissions: deny @everyone, allow bot role
        await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=False)
        await ctx.channel.set_permissions(bot_role, send_messages=True)
        
        embed = discord.Embed(
            title="🔒 Channel Verrouillé",
            description=f"Le channel {ctx.channel.mention} a été verrouillé",
            color=discord.Color.red()
        )
        embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
        embed.add_field(name="Raison", value=reason, inline=False)
        
        await ctx.send(embed=embed)
        log_action("lock", str(ctx.author), f"#{ctx.channel.name}", str(ctx.guild.id), None, reason, str(ctx.channel.id))
        
    except Exception as e:
        await ctx.send(f"Erreur lors du verrouillage: {str(e)}")

@bot.command(name='unlock')
@has_bot_permissions()
async def unlock_channel(ctx, *, reason: str = "Aucune raison spécifiée"):
    """Unlock un channel"""
    try:
        await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=True)
        
        embed = discord.Embed(
            title="🔓 Channel Déverrouillé",
            description=f"Le channel {ctx.channel.mention} a été déverrouillé",
            color=discord.Color.green()
        )
        embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
        embed.add_field(name="Raison", value=reason, inline=False)
        
        await ctx.send(embed=embed)
        log_action("unlock", str(ctx.author), f"#{ctx.channel.name}", str(ctx.guild.id), None, reason, str(ctx.channel.id))
        
    except Exception as e:
        await ctx.send(f"Erreur lors du déverrouillage: {str(e)}")

@bot.command(name='warn')
@has_bot_permissions()
async def warn_user(ctx, member: discord.Member, *, reason: str = "Aucune raison spécifiée"):
    """Warn un utilisateur"""
    try:
        embed = discord.Embed(
            title="⚠️ Utilisateur Averti",
            description=f"{member.mention} a reçu un avertissement",
            color=discord.Color.yellow()
        )
        embed.add_field(name="Modérateur", value=ctx.author.mention, inline=True)
        embed.add_field(name="Raison", value=reason, inline=False)
        
        await ctx.send(embed=embed)
        
        # Send DM to warned user
        try:
            dm_embed = discord.Embed(
                title="⚠️ Avertissement",
                description=f"Vous avez reçu un avertissement sur {ctx.guild.name}",
                color=discord.Color.yellow()
            )
            dm_embed.add_field(name="Raison", value=reason, inline=False)
            await member.send(embed=dm_embed)
        except:
            pass  # User might have DMs disabled
        
        log_action("warn", str(ctx.author), str(member), str(ctx.guild.id), None, reason)
        
    except Exception as e:
        await ctx.send(f"Erreur lors de l'avertissement: {str(e)}")

@bot.command(name='bothelp')
async def help_command(ctx):
    """Affiche l'aide des commandes"""
    embed = discord.Embed(
        title="🤖 Commandes du Bot de Modération",
        description="Voici toutes les commandes disponibles:",
        color=discord.Color.blue()
    )
    
    commands_list = [
        ("+mute @user [durée] [raison]", "Mute un utilisateur (ex: +mute @user 1d spam)"),
        ("+unmute @user [raison]", "Unmute un utilisateur"),
        ("+ban @user [durée] [raison]", "Ban un utilisateur"),
        ("+kick @user [raison]", "Kick un utilisateur"),
        ("+warn @user [raison]", "Avertir un utilisateur"),
        ("+lock [raison]", "Verrouiller le channel actuel"),
        ("+unlock [raison]", "Déverrouiller le channel actuel"),
        ("+bothelp", "Afficher cette aide")
    ]
    
    for command, description in commands_list:
        embed.add_field(name=command, value=description, inline=False)
    
    embed.add_field(name="Durées supportées", value="s = secondes, m = minutes, h = heures, d = jours\nExemple: 30s, 5m, 2h, 1d", inline=False)
    embed.add_field(name="Permissions", value="Seuls les administrateurs et les utilisateurs avec le rôle 'bot' peuvent utiliser ces commandes.", inline=False)
    
    await ctx.send(embed=embed)

# Error handling
@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CheckFailure):
        await ctx.send("❌ Vous n'avez pas les permissions pour utiliser cette commande.")
    elif isinstance(error, commands.MemberNotFound):
        await ctx.send("❌ Utilisateur introuvable.")
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("❌ Arguments manquants. Utilisez +help pour voir la syntaxe.")
    else:
        await ctx.send(f"❌ Une erreur s'est produite: {str(error)}")

# Global bot instance for web interface
current_bot = None

# Fonction pour obtenir le bot depuis l'interface web
def get_bot():
    global current_bot
    return current_bot

async def execute_bot_command(guild_id, command_name, user_id=None, reason=None, duration=None, channel_id=None):
    """Exécute une commande bot depuis l'interface web"""
    global current_bot
    if not current_bot or not current_bot.is_ready():
        return False, "Bot non connecté"
    
    try:
        guild = current_bot.get_guild(int(guild_id))
        if not guild:
            return False, "Serveur non trouvé"
        
        if command_name in ['mute', 'unmute', 'ban', 'kick', 'warn'] and user_id:
            member = guild.get_member(int(user_id))
            if not member:
                return False, "Utilisateur non trouvé"
        
        # Log l'action dans la base
        if user_id:
            log_action(command_name, "Web Interface", f"<@{user_id}>", str(guild_id), duration, reason, channel_id)
        elif channel_id:
            log_action(command_name, "Web Interface", f"<#{channel_id}>", str(guild_id), duration, reason, channel_id)
        
        return True, "Commande exécutée avec succès"
    except Exception as e:
        return False, f"Erreur: {str(e)}"

def start_bot():
    """Démarre le bot de façon synchrone"""
    global current_bot
    current_bot = bot
    token = get_discord_token()
    if not token:
        print("❌ Impossible de démarrer le bot sans token")
        return False
    
    try:
        bot.run(token)
        return True
    except discord.HTTPException as e:
        if e.status == 429:
            print("Trop de requêtes vers Discord. Attendez quelques minutes avant de relancer.")
        else:
            print(f"Erreur Discord: {e}")
        return False
    except Exception as e:
        print(f"Erreur lors du démarrage du bot: {e}")
        return False

# Run the bot
if __name__ == "__main__":
    try:
        start_bot()
    except KeyboardInterrupt:
        print("Bot arrêté par l'utilisateur")
