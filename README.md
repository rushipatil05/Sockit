# NodeShare

**NodeShare** is an offline-first, LAN-based peer-to-peer file sharing application. It requires no internet connection, no cloud, and no central server — files are transferred directly between devices on the same local network.

Available as both a **web app** (browser) and a **desktop app** (Electron).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express + Socket.IO |
| Desktop Shell | Electron |
| Discovery | UDP broadcast (LAN) |
| File Transfer | Chunked pull over Socket.IO (TCP) |
| Storage | MongoDB (Mongoose) — persistent file metadata |

---

## Project Structure

```
NodeShare/
├── client/          # React frontend (Vite)
├── server/          # Express API + Socket.IO + UDP discovery
├── electron/        # Electron desktop shell
├── shared/          # Shared protocol constants (Events, Roles)
├── .env.example     # Environment variable template
└── package.json     # Root workspace config + electron-builder config
```

---

## Quick Start — Desktop App (.exe)

**For end users who just want to run the app:**

1. Download the latest `.exe` from the [Releases](../../releases) page
2. Run `NodeShare 1.0.0.exe` — no installation needed
3. Create or join a room and start sharing files

**That's it!** The app includes everything it needs to run.

---

## Prerequisites

### For Development & Building

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm 9+** (comes with Node.js)
- **MongoDB 6+** — [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
  - Must be running locally before starting the app (default: `mongodb://127.0.0.1:27017`)
  - No manual setup needed — NodeShare creates the `nodeshare` database automatically.

### For End Users (Running .exe)

- **Windows 7+** (64-bit)
- **MongoDB 6+** running locally (or configure `MONGO_URI` in environment)
- That's all!

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/rushipatil05/NodeShare.git
cd NodeShare
```

### 2. Install all dependencies

```bash
npm install
```

This installs dependencies for the root, `client`, `server`, and `electron` workspaces in one command.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if needed. Key variables:

| Variable | Default | Description |
|---|---|---|
| `PEER_NAME` | Computer hostname | Display name shown to other peers |
| `SERVER_PORT` | `4000` | HTTP API port |
| `SOCKET_PORT` | `5000` | Socket.IO port |
| `UDP_PORT` | `41234` | LAN discovery broadcast port |
| `DOWNLOAD_DIR` | `downloads` | Where received files are saved |
| `SHARED_FILES_DIR` | `uploads` | Where shared file metadata is indexed |

---

## Running the App

### As a Web App (browser)

Runs the React frontend + Node.js backend without Electron.

```bash
npm run dev
```

This starts:
- **API server** → `http://localhost:4000`
- **Socket server** → `http://localhost:5000`
- **React dev server** → `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

### As a Desktop App (Electron)

Runs the full Electron desktop app with native file dialogs and system notifications.

```bash
npm run dev
```

The Electron window opens automatically once the React dev server is ready on port `5173`.

> **Tip:** The same `npm run dev` command starts all three — server, client, and Electron — concurrently.

---

### Build a Distributable Executable (.exe) — Windows

**For developers:** Build a standalone `.exe` that end users can run without Node.js, npm, or any build tools.

#### Prerequisites for Building

Make sure you have completed the setup steps (Node.js, MongoDB, dependencies installed).

#### Build Steps

```bash
# 1. Ensure MongoDB is running
# 2. Build the .exe
npm run build:exe
```

**That's it!** The build process:
- ✅ Builds the React frontend (`client/dist/`)
- ✅ Bundles the Node.js server
- ✅ Packages everything into Electron
- ✅ Creates a portable `.exe`

#### Output

The `.exe` file is located at:

```
release-desktop/
└── NodeShare Setup 1.0.0.exe  ← This is your desktop app!
    (or NodeShare 1.0.0.exe depending on build config)
```

#### Running the Built .exe

1. Navigate to `release-desktop/`
2. Double-click `NodeShare 1.0.0.exe`
3. The app launches immediately with a native window
4. Create or join a room and start sharing!

#### Build Customization

To change app name, version, or icon, edit `package.json`:

```json
{
  "build": {
    "appId": "com.socketshare.app",
    "productName": "NodeShare",  ← App name shown to users
    "directories": {
      "output": "release-desktop"
    },
    "win": {
      "target": "portable"  ← Builds a portable .exe (no installer)
    }
  }
}
```

To create an installer instead of portable:

```json
"win": {
  "target": ["nsis"]  ← Creates an installer (.msi)
}
```

Then rebuild: `npm run build:exe`

---

## Using the App

### Creating a Room

1. Open the app on one device.
2. Click **"Create Room"** — a Room ID and Key are generated automatically.
3. Share the Room ID and Key with others on the same LAN.

### Joining a Room

1. Open the app on another device on the same network.
2. Click **"Join Room"**, enter the Room ID and Key.
3. Peers in the same room are discovered automatically via UDP broadcast.

### Sharing a File

- Click **"Pick File"** or drag-and-drop a file into the upload zone.
- The file appears in the shared index for all peers in the room.

### Downloading a File

- In the **Files** tab, find a file shared by another peer.
- Click the download button — the file transfers directly peer-to-peer.
- Progress is shown in the **Transfers** tab in real time.
- Downloads resume automatically if interrupted.

---

## Multi-Device LAN Testing

Run NodeShare on **two or more devices on the same Wi-Fi or LAN**.

On each device, set a unique `PEER_NAME` in `.env`:

```env
# Device 1
PEER_NAME=Laptop-Rushi

# Device 2
PEER_NAME=Desktop-Office
```

Keep `UDP_PORT`, `SERVER_PORT`, and `SOCKET_PORT` the same across devices (default values work fine). All devices on the same room will discover each other automatically.

---

## How File Transfer Works

1. **Sharing** — the sender registers a file path in the local index and broadcasts metadata to connected peers.
2. **Requesting** — the receiver sends `transfer:pull-request` events, requesting 256 KB chunks at a time.
3. **Transfer** — the sender reads the file from disk in chunks and returns them as base64 over Socket.IO.
4. **Resume** — if interrupted, the receiver checks the existing partial file size and resumes from that offset.

---

## Troubleshooting

### Build Issues

#### ❌ `npm run build:exe` fails with "Cannot find module..."

**Solution:** Clean install dependencies and rebuild

```bash
rm -r node_modules client/node_modules server/node_modules electron/node_modules
npm install
npm run build:exe
```

#### ❌ "MongoDB connection refused"

**Solution:** Start MongoDB before building

```bash
# Windows (if installed as service)
net start MongoDB

# Or run manually
mongod
```

Then run: `npm run build:exe`

#### ❌ "electron-builder not found"

**Solution:** Install dev dependencies

```bash
npm install --save-dev electron-builder
npm run build:exe
```

#### ❌ Code signing error on Windows

**Solution:** The build includes `cross-env CSC_IDENTITY_AUTO_DISCOVERY=false` which disables code signing for local builds. If you still get errors, try:

```bash
npm run build:exe -- --win portable
```

### Runtime Issues (Running the .exe)

#### ❌ App crashes on startup

1. **Check MongoDB is running** — open `mongosh` or MongoDB Compass to verify
2. **Check ports are free** — NodeShare uses ports 4000, 5000, 41234
3. **Check Windows Firewall** — Allow NodeShare through firewall if prompted

#### ❌ Can't discover peers on the same network

1. Verify all devices are on the **same Wi-Fi/LAN**
2. Check that UDP port `41234` is not blocked by firewall
3. Ensure `UDP_BROADCAST_ADDR` is set correctly (default: `255.255.255.255` works for most LANs)

#### ❌ File transfer is very slow

- **Check network speed** with a tool like `iperf3`
- **Reduce file size** for testing
- **Check for interference** on your Wi-Fi band (use Wi-Fi analyzer)
- **Use Ethernet** for faster, more stable transfers

#### ❌ .exe doesn't start (blank screen)

1. Delete `%APPDATA%/NodeShare` (user data folder)
2. Restart the app
3. If still blank, check logs in `%APPDATA%/NodeShare/logs/` (if they exist)

---

## Security Notes

- Rooms are protected by a shared key (SHA-256 hashed before transmission).
- Intended for use on trusted private LANs — not exposed to the internet.
- Files never leave the local network.
- Desktop app runs locally; no telemetry or tracking.
