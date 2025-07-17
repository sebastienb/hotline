# Hotline – PRD

**Type**: Local Web App  
**Frontend**: React + Tailwind CSS + shadcn/ui  
**Backend**: Node.js + Express + SQLite (better-sqlite3)  
**Owner**: Sebastien  
**Project Name**: Hotline  
**Purpose**: Manage Claude Code hooks with sound effects, native notifications, and live event logging

---

## 🎯 Overview

**Hotline** is a local web app that helps developers personalize and monitor Claude Code's hook events. It lets users assign custom sound effects and browser notifications for each hook type, view real-time logs, and auto-generate Claude-compatible hook configs.

---

## 🔑 Features

### ✅ Hook Configuration

- Enable/disable specific hook types:
  - `PreToolUse`
  - `PostToolUse`
  - `Notification`
  - `Stop`
  - `SubagentStop`
  - `PreCompact`
- Assign sound effects to each hook
- Assign native browser notification per hook
- Set optional timeout per hook
- Preview generated JSON config
- Save config directly to:
  - `~/.claude/settings.json` (global)
  - `.claude/settings.json` (project)
- Warn before overwriting config

### 🎵 Sound Manager

- Upload MP3/WAV files
- Rename or delete sound files
- Audio preview player
- Store in:
  - `~/.hotline/sounds/`

### 🔔 Native Notifications

- Enable native browser notifications per hook
- Custom message includes hook type and tool name
- Fallback to UI alert if permission is denied
- Clicking notification focuses app (optional)

### 📊 Event Logger

- Real-time log of hook activity
- Columns:
  - Timestamp
  - Hook Type
  - Tool Name
  - Message
- Filter by:
  - Hook type
  - Session ID
  - Keyword
- Logs persisted in:
  - `~/.hotline/hooks.db`

---

## 🧰 Tech Stack

### Frontend

- React (Vite)
- Tailwind CSS
- shadcn/ui
- Web Notifications API

### Backend

- Node.js + Express
- `better-sqlite3` for persistent logs
- `multer` for file uploads
- `fs` for writing Claude config

---

## ⚙ API Endpoints

- `GET /hooks` – Load existing config
- `POST /hooks` – Save new config
- `GET /logs` – List logs with filters
- `POST /logs` – Insert new log entry
- `POST /sounds` – Upload a sound file
- `GET /sounds` – List all sounds
- `DELETE /sounds/:filename` – Delete sound

---

## 🧪 User Flow

1. Start app: `npm run dev` → opens on `http://localhost:3000`
2. Upload sounds and assign to hooks
3. Enable browser notifications
4. Configure hook types
5. View real-time hook activity in event log
6. Save generated config to Claude folder

---

## 📁 Storage Paths

| Item           | Location                                |
|----------------|-----------------------------------------|
| Audio Files    | `~/.hotline/sounds/`                    |
| Hook Config    | `~/.claude/settings.json`               |
| Logs (SQLite)  | `~/.hotline/hooks.db`                   |

---

## 🔐 Security Considerations

- Validate file type and size on upload
- Escape all strings in JSON config
- Show JSON preview before applying config
- Optional backup of existing config before overwrite

---

## 🔜 Next Steps

- [ ] Bootstrap frontend with Vite + Tailwind + shadcn/ui
- [ ] Build backend server with Express + SQLite
- [ ] Implement sound upload and manager
- [ ] Add hook config builder UI and generator
- [ ] Add real-time event logger
- [ ] Add native notification toggles and permissions flow
