# Overview

This is a comprehensive Discord moderation bot built with Python that provides automated moderation capabilities and a modern web dashboard for viewing moderation logs. The bot uses discord.py for Discord integration, SQLite for data persistence, and Flask for the web interface. It features comprehensive logging of moderation actions like mutes, bans, kicks, warnings, channel locks, and more, with a beautiful, responsive web dashboard to track and filter moderation activities in real-time.

## Recent Changes

**September 2025**
- Implemented full Discord moderation bot with commands: mute, unmute, ban, kick, warn, lock, unlock
- Added time parsing functionality for temporary actions (s/m/h/d format)
- Created role-based permission system (admin + "bot" role access)
- Built modern Flask web interface with responsive design
- Integrated SQLite database for persistent moderation logging
- Configured dual-service architecture with web server on port 5000

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Components

**Discord Bot Architecture**
- Built using discord.py library with command-based architecture
- Implements moderation commands for user management (mute, ban, kick, warn)
- Uses SQLite database for persistent storage of moderation logs
- Supports duration parsing for temporary actions (e.g., "1d", "5h", "30m")

**Web Dashboard**
- Flask-based web server providing REST API endpoints
- Responsive HTML interface with filtering and search capabilities
- Real-time statistics display for moderation activities
- CORS-enabled for cross-origin requests

**Dual-Service Runner**
- Custom runner script that launches both Discord bot and web server concurrently
- Uses threading to run services simultaneously
- Graceful shutdown handling with keyboard interrupt support

**Database Design**
- Single SQLite database (`moderation_logs.db`) for simplicity
- Moderation logs table storing: timestamp, action type, moderator, target user, duration, reason, guild/channel IDs
- Auto-incrementing primary key for unique log identification

## Data Storage Strategy

**SQLite Database**
- Lightweight, serverless database solution
- Single file storage for easy deployment
- Supports concurrent read operations between bot and web server
- Automatic table creation with proper schema initialization

## Authentication & Authorization

**Discord Token-Based Authentication**
- Bot authentication via Discord token stored as environment variable
- No user authentication for web dashboard (assumes internal use)
- Server-side validation of Discord permissions

## Frontend Architecture

**Static Web Interface**
- Vanilla JavaScript for client-side functionality
- CSS Grid and Flexbox for responsive layout design
- Font Awesome icons for visual enhancement
- Real-time filtering and search without page refresh

# External Dependencies

## Core Libraries
- **discord.py** - Discord API wrapper for bot functionality
- **Flask** - Web framework for dashboard interface
- **flask-cors** - Cross-origin resource sharing support

## Database
- **SQLite3** - Built-in Python database engine for data persistence

## Frontend Assets
- **Font Awesome** - Icon library via CDN
- **Google Fonts (Inter)** - Typography enhancement via CDN

## Runtime Requirements
- **Python 3.x** - Core runtime environment
- **Environment Variables** - Discord bot token via `TOKEN` secret

## Optional Services
- **Replit Secrets** - Recommended for secure token storage
- **Web Hosting** - Flask server runs on port 5000 for dashboard access