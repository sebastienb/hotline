# 🔥 Hotline

Local web app for managing Claude Code hooks with sound effects, native notifications, and live event logging.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
hotline/
├── frontend/          # React + Vite + Tailwind CSS frontend
├── backend/           # Node.js + Express + SQLite backend
├── package.json       # Root package with scripts
└── README.md         # This file
```

## 🎯 Features

- **Hook Configuration**: Enable/disable Claude Code hook types with custom settings
- **Sound Manager**: Upload and assign MP3/WAV files to hooks
- **Event Logger**: Real-time logging of hook activity with filtering
- **Native Notifications**: Browser notifications for hook events
- **Config Generator**: Auto-generate Claude-compatible settings.json

## 🔧 Usage

1. **Upload Sounds**: Go to Sound Manager and upload MP3/WAV files
2. **Configure Hooks**: Enable hook types and assign sounds/notifications
3. **Save Config**: Export configuration to `~/.claude/settings.json`
4. **Monitor Events**: Watch real-time hook activity in Event Logger

## 📂 Storage Locations

| Item | Location |
|------|----------|
| Audio Files | `~/.hotline/sounds/` |
| Event Logs | `~/.hotline/hooks.db` |
| Claude Config | `~/.claude/settings.json` |

## 🔐 Security

- File type validation for uploads
- Size limits (10MB per audio file)
- JSON sanitization before config export
- Local-only storage (no external services)

## 🛠 Development

- **Frontend**: `npm run dev:frontend` (port 3000)
- **Backend**: `npm run dev:backend` (port 3001)
- **Both**: `npm run dev` (recommended)

## 📋 API Endpoints

- `GET /api/hooks` - Load hooks configuration
- `POST /api/hooks` - Save hooks configuration
- `GET /api/logs` - Fetch event logs with filters
- `POST /api/logs` - Insert new log entry
- `POST /api/sounds` - Upload sound file
- `GET /api/sounds` - List sound files
- `DELETE /api/sounds/:filename` - Delete sound file

## 🔗 Claude Code Integration

Generated hooks will execute commands that:
1. Play audio files via system audio
2. Send notifications to browser
3. Log events to local database

Example generated hook:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s http://localhost:3001/api/sounds/play/notification.mp3 | aplay -q || afplay /dev/stdin 2>/dev/null",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```