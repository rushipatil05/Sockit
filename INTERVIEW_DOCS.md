# SOCKIT — COMPLETE INTERVIEW PREPARATION DOCUMENT
### Based on CURRENT Project Version (UDP Discovery + HTTP Transfer + Socket.IO)
### No TCP, No Rooms, No PIN — Pure LAN File Sharing

---

# 1. PROJECT OVERVIEW

## What is Sockit?
Sockit is a **LAN (Local Area Network) desktop file-sharing application** built with Electron, React, and Node.js.

In simple words: Open the app. All computers on the same Wi-Fi that are also running Sockit appear automatically. Share any file. Other people see it and download it — all without internet, accounts, or any setup.

Think of it as **AirDrop for Windows** — but built from scratch using web technologies.

---

## What Problem Does It Solve?

| Situation | Old Way | Sockit Way |
|---|---|---|
| Share a 500 MB video with a classmate | Upload to Google Drive, share link, they download | Click Share, they click Download — done |
| Office document transfer | Email attachment (size limit!) or USB | Instant over LAN |
| Privacy-sensitive files | Goes to Google/Microsoft servers | Never leaves your network |
| No internet in the lab | WhatsApp won't work | Sockit works on LAN only |
| Sharing with multiple people | Multiple uploads | One share — everyone sees it |

---

## Why Did I Build It?
During a college lab session, I noticed people sending files via Bluetooth (slow), WhatsApp (compresses images), or physically walking with a USB drive. Every tool required internet or cloud. I wanted something that works purely on the local network — instant, private, and zero configuration.

---

## Real-Life Use Cases
- **College lab:** Share assignments between classmates instantly
- **Office:** Share large design files, videos, presentations without email limits
- **Home network:** Transfer files between your phone, laptop, and desktop
- **Hackathon:** Team members share assets, code bundles, dataset files
- **Privacy-sensitive data:** Files never leave your local network

---

## Key Features
1. **Automatic peer discovery** — No IP typing, peers appear within 3 seconds
2. **File Registry** — All shared files visible to every peer
3. **Real-time updates** — Socket.IO pushes changes to all UIs instantly
4. **Server-side download** — Reliable, works in any Electron environment
5. **File streaming** — 256 KB chunks, works for files of any size
6. **Peer offline detection** — Both GOODBYE packets and 15-second timeout
7. **Drag & drop sharing** — Drop a file on the window to share it
8. **File type icons** — Visual differentiation by file type in UI

---

## Tech Stack with Role of Each Technology

| Technology | Version | Role |
|---|---|---|
| **Electron** | Latest | Desktop shell — native file picker, system access, starts server |
| **React 18** | 18.3 | UI framework — components, state, re-rendering |
| **Vite** | 5.x | Build tool — compiles JSX, bundles CSS |
| **Tailwind CSS** | 3.x | Styling — utility classes directly in JSX |
| **Framer Motion** | 11.x | Animations — fade/slide effects on UI elements |
| **Node.js** | 22 | Server runtime — runs Express, UDP socket, file I/O |
| **Express.js** | 4.x | HTTP framework — creates REST API endpoints |
| **Socket.IO** | 4.x | WebSocket library — real-time bidirectional events |
| **UDP dgram** | Built-in | Peer discovery — broadcasts HELLO every 3 seconds |
| **fs/promises** | Built-in | File I/O — stat, open, read, writeFile |
| **Axios** | 1.x | HTTP client (React side) — calls REST endpoints |
| **uuid** | 10.x | ID generation — unique fileId and peerId per session |
| **mime-types** | 2.x | MIME detection — determines Content-Type from extension |
| **dotenv** | 16.x | Config — reads PEER_NAME from .env file |

---

# 2. COMPLETE ARCHITECTURE

## High-Level: Every Machine Is Its Own Server

```
┌─────────────────────────────────────────────────────┐
│                   MACHINE A (LAPTOP)                │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │             ELECTRON APP                   │     │
│  │  ┌──────────────┐    ┌──────────────────┐  │     │
│  │  │  React UI    │◄──►│  Node.js Server  │  │     │
│  │  │  (port 5173) │    │  HTTP: 4000      │  │     │
│  │  │              │    │  WS:   5000      │  │     │
│  │  │  Socket.IO ──┼────┼──► events        │  │     │
│  │  │  Axios    ───┼────┼──► REST calls    │  │     │
│  │  └──────────────┘    └────────┬─────────┘  │     │
│  └────────────────────────────── │ ───────────┘     │
│                                  │                  │
│                       UDP port 41234                │
│                       broadcasts every 3s           │
└──────────────────────────────────│──────────────────┘
                                   │ UDP 255.255.255.255
                                   ▼
┌─────────────────────────────────────────────────────┐
│                   MACHINE B (PC)                    │
│  [Same structure — its own React UI + Node server]  │
│                                                     │
│  On UDP receive: fetch http://LAPTOP:4000/api/files │
│  On download: socket emit → server fetches file     │
│               via HTTP from LAPTOP:4000             │
└─────────────────────────────────────────────────────┘
```

**Key concept:** There is NO central server. Every machine runs the full stack. Every machine is BOTH client and server simultaneously.

---

## Component-by-Component Explanation

### Electron
Electron is a framework by GitHub that packages a web app (React) inside a desktop window and gives it Node.js superpowers. A normal browser cannot access the file system, open native dialogs, or use UDP sockets. Electron removes all these restrictions.

**In Sockit, Electron does:**
- Provides the desktop window (using Chromium engine)
- Opens native OS file picker (`dialog.showOpenDialog`)
- Starts the Node.js server as a background child process
- Bridges React UI ↔ Node.js via IPC

**Two processes in Electron:**
```
Main Process (Node.js)     Renderer Process (Chrome/React)
───────────────────────    ────────────────────────────────
Full system access         Sandboxed browser environment
Starts server              Shows the UI
Handles IPC handlers       Calls window.sockit.* functions
File dialogs, shell ops    No direct Node.js access
```

### React 18
React is the UI framework. It breaks the interface into components (Shell, MainPage, FileIcon) and re-renders only what changes.

**In Sockit:**
- `App.jsx` — root, calls useRealtimeState hook, passes data down
- `Shell.jsx` — top bar (logo, Network Discovery Active pill, quit button)
- `MainPage.jsx` — two-panel layout: File Registry + Peers Online
- `useRealtimeState.js` — custom hook managing all state + socket connections

**React state in Sockit:**
```javascript
peers     = []   // who is online on the LAN
files     = []   // all visible files (local + remote)
transfers = {}   // { fileId: { status, error } } — per-file download status
```

### Node.js + Express
Node.js is the JavaScript runtime that runs the server. Express is a mini framework that makes it easy to define HTTP routes.

**Express routes in Sockit:**
- `GET /api/health` — server check
- `GET /api/peers` — list online peers
- `GET /api/files` — OWN local files (for other peers to fetch)
- `GET /api/all-files` — all files including remote (for own UI)
- `POST /api/files/share` — register a new shared file
- `GET /api/files/:id/download` — stream a local file

### Socket.IO
Socket.IO creates a persistent, bidirectional connection between the server and the React UI. Unlike REST (where client asks, server responds), Socket.IO lets the SERVER push data to the client anytime.

**Why needed:** When a new peer appears or a file is shared, the UI must update immediately. Without Socket.IO, the UI would have to poll (`setInterval → fetch`) every second. Socket.IO is more efficient — the server only sends data when something actually changes.

**Events in Sockit:**
```
Server → UI: peer:state, files:updated, transfer:progress, transfer:done, transfer:error
UI → Server: transfer:request
```

### UDP dgram (Discovery)
UDP is a network protocol. The Node.js `dgram` module lets you create UDP sockets.

**Why UDP and not TCP for discovery?**
- UDP supports BROADCAST — send ONE packet to `255.255.255.255` and EVERY device on the LAN receives it
- TCP requires you to KNOW the destination IP before connecting — impossible when discovering unknown peers
- UDP is connectionless — no handshake, no overhead, perfect for lightweight heartbeats

**In Sockit:** DiscoveryService opens a UDP socket on port 41234, enables broadcast mode, and sends a HELLO packet every 3 seconds to 255.255.255.255.

### File System (fs/promises)
Node.js built-in module for all disk operations. We use the promise-based version (`fs/promises`) to use async/await instead of callbacks.

**Used in Sockit for:**
- `fs.stat(path)` — get file size before sharing
- `fs.open(path, 'r')` + `handle.read()` — stream file chunks for download
- `fs.writeFile(path, buffer)` — save downloaded file to disk
- `fs.mkdir(dir, { recursive: true })` — create downloads folder

### IPC Communication (Electron)
IPC = Inter-Process Communication. Since Electron's renderer (React) is sandboxed, it cannot call Node.js directly. IPC is the secure bridge.

**Flow:**
```
React UI                preload.js              main.js
────────                ──────────              ───────
window.sockit           contextBridge           ipcMain.handle
  .pickFile()     ──►   ipcRenderer      ──►    dialog.showOpen
                        .invoke()               Dialog()
                                        ◄──    returns path
                 ◄──   returns to React
```

**Exposed functions:** pickFile, pickFolder, pickSavePath, writeFile, notify, openPath, quitApp

---

# 3. COMPLETE PROJECT FLOW

## Step 1: App Startup
```
User double-clicks Sockit.exe
  → Electron main.js starts
  → Checks SKIP_SERVER environment variable
  → If false: spawns Node.js server as child process
    (node server/src/index.js with env vars: PEER_NAME, UDP_PORT, SERVER_PORT, SOCKET_PORT)
  → Creates BrowserWindow (1366x860)
  → Loads http://localhost:5173 (dev) or dist/index.html (prod)
  → React app loads, useRealtimeState hook runs
  → Bootstrap: fetch('/api/peers') + fetch('/api/all-files') for initial data
  → Connect to Socket.IO at localhost:5000
  → Server pushes peer:state + files:updated to UI
```

## Step 2: Server Initialization
```
Node.js server/src/index.js runs:
  1. Get LAN IP via os.networkInterfaces()
     → Finds first non-internal IPv4 address (e.g., 192.168.0.102)
  2. Generate peerId = uuidv4() (or from PEER_ID env var)
  3. selfPeer = { peerId, peerName:"LAPTOP", host:"192.168.0.102", serverPort:4000 }
  4. Create in-memory sharedFiles = new Map()
  5. Create Express app, attach CORS middleware
  6. Create Socket.IO server on port 5000
  7. Create DiscoveryService and start it
  8. Create PeerRegistry
  9. Listen HTTP on port 4000, WebSocket on port 5000
  10. Start UDP discovery (broadcastHello every 3s)
```

## Step 3: Peer Discovery
```
Every 3 seconds on MACHINE A:
  UDP broadcast sent to 255.255.255.255:41234
  Payload: { type:"peer:hello", peerId:"uuid-a", peerName:"LAPTOP",
             host:"192.168.0.102", serverPort:4000, socketPort:5000, ts:Date.now() }

MACHINE B receives this:
  1. Parse JSON from UDP buffer
  2. Check payload.peerId !== selfPeer.peerId (ignore own broadcasts)
  3. Extract real IP from rinfo.address (OS-provided, cannot be faked)
  4. Call onPeerSeen({ ...payload, host: rinfo.address })
  5. peerRegistry.upsert(peer) — add/update in Map
  6. syncPeerFiles(peer) — GET http://192.168.0.102:4000/api/files
  7. Store returned files as remote entries in sharedFiles Map
  8. io.emit('peer:state', { peers }) — update B's UI
  9. io.emit('files:updated', { files }) — update B's UI

MACHINE B's React UI:
  socket.on('peer:state') → setPeers() → Peers Online panel shows "LAPTOP"
  socket.on('files:updated') → setFiles() → File Registry updates
```

## Step 4: Sharing a File
```
User clicks "Share File" button in React UI
  → window.sockit.pickFile() [calls IPC]
  → ipcMain: dialog.showOpenDialog({ properties: ['openFile'] })
  → User selects: C:\Users\Rushikesh\Desktop\report.pdf
  → Returns path to React
  → React calls: POST /api/files/share { path: "C:\Users\..." }

Server receives POST:
  1. fs.stat(filePath) → size: 2048000 bytes
  2. mime.lookup("report.pdf") → "application/pdf"
  3. path.basename(filePath) → "report.pdf"
  4. fileId = uuidv4() → "a1b2c3..."
  5. Store in sharedFiles Map:
     { fileId, name, size, mimeType, path, ownerPeerId,
       ownerName:"LAPTOP", ownerHost:"192.168.0.102",
       ownerServerPort:4000, isLocal:true, sharedAt:Date.now() }
  6. pushFilesToUi() → io.emit('files:updated', { files })
  7. Return 201: { file: { ...withoutPath } }

React receives response:
  setShareMsg("✓ Shared: report.pdf")
  [simultaneously, files:updated Socket event updates the file list]
```

## Step 5: Other Peers Automatically See the File
```
Within next 3 seconds:
  Machine B receives HELLO from Machine A
  → syncPeerFiles(peerA) runs
  → GET http://192.168.0.102:4000/api/files
  → Machine A returns: [{ fileId, name:"report.pdf", size, ownerName:"LAPTOP"... }]
  → Machine B stores with isLocal:false
  → Machine B pushes files:updated to its UI
  → Machine B's File Registry shows "report.pdf • 2MB • LAPTOP [Download button]"
```

## Step 6: Downloading a File
```
Machine B user clicks Download on "report.pdf"
  → requestDownload(file) called in React
  → socket.emit("transfer:request", { fileId: "a1b2c3" })

Machine B's server receives transfer:request:
  1. Look up file in sharedFiles → { ownerHost:"192.168.0.102", ownerServerPort:4000 }
  2. Check !file.isLocal (it's a remote file — ok to download)
  3. socket.emit("transfer:progress", { fileId, status:"downloading" })
     → UI: download button shows spinner
  4. url = "http://192.168.0.102:4000/api/files/a1b2c3/download"
  5. const res = await fetch(url, { signal: AbortSignal.timeout(60000) })

Machine A's server receives GET /api/files/a1b2c3/download:
  1. sharedFiles.get("a1b2c3") → found, isLocal:true, path exists
  2. fs.stat(path) → size = 2048000
  3. Set headers: Content-Disposition, Content-Type, Content-Length
  4. fs.open(file.path, 'r') → fileHandle
  5. Loop: read 256KB → res.write() → repeat until EOF
  6. res.end()

Machine B's server continues:
  6. const arrayBuffer = await res.arrayBuffer() → receives all data
  7. const savePath = path.join(downloadDir, "report.pdf")
  8. await fs.writeFile(savePath, Buffer.from(arrayBuffer))
  9. socket.emit("transfer:done", { fileId, fileName:"report.pdf", savePath })

Machine B's UI:
  socket.on("transfer:done") → setTransfers({ "a1b2c3": { status:"done" }})
  → Button shows "✓ Saved" for 4 seconds → reverts to Download
```

## Step 7: Peer Goes Offline
```
Graceful shutdown (user closes app):
  → SIGINT/SIGTERM received by Node.js
  → discovery.stop() called
  → broadcastGoodbye() sends UDP GOODBYE packet
  → Other peers receive: { type:"peer:goodbye", peerId:"uuid-a" }
  → onPeerLeft("uuid-a") called immediately
  → Remove peer from PeerRegistry
  → Remove all files with ownerPeerId === "uuid-a"
  → Emit peer:state + files:updated to all UIs

Crash / force close (no GOODBYE sent):
  → setInterval runs every 5 seconds
  → Checks: now - peer.lastSeen > 15000ms
  → Removes stale peer and their files
  → Emits updates to all UIs
  → Maximum detection time: 20 seconds (5s interval + 15s threshold)
```

---

# 4. PEER DISCOVERY DEEP DIVE

## Why UDP?
UDP (User Datagram Protocol) is a "fire and forget" protocol. You send a packet without establishing a connection first. This is critical for discovery because:

- To use TCP, you must ALREADY know the other device's IP (you'd need to connect to it first)
- In peer discovery, you DON'T know other devices' IPs — that's what you're trying to find
- UDP BROADCAST solves this: send to 255.255.255.255 and EVERY device on the subnet gets it

## Why Broadcast? Why 255.255.255.255?
`255.255.255.255` is the **limited broadcast address**. When you send a UDP packet to this address, your router delivers it to every device on your local subnet. It's like shouting in a room — everyone hears you.

Alternatives:
- **Multicast (224.x.x.x):** More efficient (only subscribed devices receive it), but requires router support and is more complex to set up.
- **mDNS / Bonjour:** Apple's protocol for the same purpose — but has OS-level dependencies.
- **255.255.255.255** was chosen for simplicity and maximum compatibility.

## Why HELLO Packets Every 3 Seconds?
Three reasons:
1. **New device detection:** When a new machine joins, they appear within 3 seconds.
2. **Liveness check:** If a HELLO hasn't been seen in 15 seconds → peer is offline.
3. **File sync:** Every HELLO triggers a re-fetch of the peer's file list — new shared files appear within 3 seconds.

**Trade-off:** Too frequent (0.5s) wastes network bandwidth. Too infrequent (30s) makes the UX feel slow. 3 seconds is the sweet spot.

## Why GOODBYE Packets?
When a machine closes the app cleanly, the `SIGINT`/`SIGTERM` signal triggers `discovery.stop()` which calls `broadcastGoodbye()`. This sends an immediate removal signal.

Without GOODBYE: every peer must wait 15 seconds before removing the offline peer.
With GOODBYE: instant removal.

## How Stale Peers Are Removed
```javascript
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of peerRegistry.peers) {
        if (now - peer.lastSeen > 15000) {   // 15 seconds of silence
            discovery.onPeerLeft(id);         // remove peer + their files
            changed = true;
        }
    }
    if (changed) emitUpdatesToUI();
}, 5000);  // check every 5 seconds
```
**Worst case:** Peer crashes at T=0. Interval runs at T=5 → lastSeen check says 5s (not 15 yet). Interval at T=10 → 10s. Interval at T=15 → 15s ≥ threshold → removed. So maximum 15-20 seconds.

## Why `os.networkInterfaces()`?
```javascript
function getLanIp() {
    for (const iface of Object.values(os.networkInterfaces()).flat()) {
        if (iface?.family === 'IPv4' && !iface.internal)
            return iface.address;
    }
    return '127.0.0.1';
}
```
- `internal: false` filters out the loopback interface (127.0.0.1)
- `family: 'IPv4'` ignores IPv6 addresses
- Returns the first non-loopback IPv4 address — this is the LAN IP other machines use to reach you

**Why not use 'localhost'?** If we store `ownerHost: "localhost"` in file metadata, when Peer B tries to download from Peer A, it would request from `http://localhost:4000/...` — pointing to its OWN server, not Peer A's!

## UDP Packet Structure in Sockit
```
HELLO Packet:
{
  type:       "peer:hello",
  protocol:   "1.0",
  peerId:     "550e8400-e29b-41d4-a716-446655440000",
  peerName:   "LAPTOP",
  host:       "192.168.0.102",         ← LAN IP
  serverPort: 4000,                    ← HTTP API port
  socketPort: 5000,                    ← Socket.IO port
  ts:         1719683400000            ← timestamp
}

GOODBYE Packet:
{
  type:     "peer:goodbye",
  protocol: "1.0",
  peerId:   "550e8400-...",
  ts:       1719683410000
}
```

## What Happens When a New Device Joins?
```
T=0: Machine C turns on, opens Sockit
  → Server starts, begins broadcasting HELLO to 255.255.255.255:41234

T=0.x: Machine A and Machine B both receive C's HELLO
  → Both call syncPeerFiles(C) — fetch C's (empty) file list
  → Both update their UIs: Peers Online now shows C

T=3s: Machine C receives HELLO from A and B (next broadcast cycle)
  → C adds both A and B as peers
  → C fetches file lists from A and B
  → C's UI shows both peers and their shared files
```

---

# 5. FILE TRANSFER DEEP DIVE

## Pull Model vs Push Model

| Aspect | Pull Model (Sockit) | Push Model |
|---|---|---|
| Who initiates | DOWNLOADER requests file | SHARER sends without being asked |
| Control | Receiver controls when/what to download | Sender decides when to send |
| Reliability | Easier to retry (just re-request) | Need coordination if receiver is busy |
| Multiple receivers | Each pulls independently | Sender must track all receivers |

**Sockit uses the Pull Model:** Machine B (downloader) tells its own server to fetch from Machine A (sharer). Machine A's server just serves the file via HTTP when asked.

## Why Pull Model?
1. **Simpler:** Each downloader is responsible for its own download.
2. **Independent:** If B fails mid-download, A doesn't care — B can retry.
3. **Standard:** HTTP is natively a pull model. GET requests are "pull."
4. **No coordination needed:** A doesn't need to track who is downloading.

## File Streaming — Why Not Load Entire File at Once?
Bad approach:
```javascript
const data = await fs.readFile(file.path);  // loads ENTIRE file into RAM!
res.send(data);
```
Problem: A 1 GB file consumes 1 GB of RAM. With 5 simultaneous downloads = 5 GB RAM. Server crashes.

Sockit's streaming approach:
```javascript
const handle = await fs.open(file.path, 'r');
const CHUNK = 256 * 1024;    // 256 KB
let offset = 0;

while (offset < stat.size) {
    const buf = Buffer.alloc(CHUNK);
    const { bytesRead } = await handle.read(buf, 0, CHUNK, offset);
    if (bytesRead === 0) break;          // EOF
    res.write(buf.subarray(0, bytesRead));
    offset += bytesRead;
}
res.end();
```

**Memory usage:** Always only 256 KB regardless of file size. A 10 GB file uses the same RAM as a 1 KB file.

## Why 256 KB Chunk Size?
- **Too small (1 KB):** Too many system calls → overhead, slow
- **Too large (10 MB):** High memory usage, slow to start
- **256 KB:** Well-established sweet spot. LAN bandwidth (100 Mbps+) transfers 256 KB in ~20ms. Low memory, low overhead, good speed.

## Why fs.open() and handle.read() Instead of fs.createReadStream()?
Both work, but manual `open + read` gives explicit control over:
- Offset (start position)
- Chunk size
- Error handling per chunk

`fs.createReadStream()` is a higher-level abstraction that could be used — in fact, it would make the code simpler. The manual approach is easier to understand and explain in an interview.

## Download Flow — Server Side (Machine B's Server)
```
socket.on("transfer:request", async ({ fileId }) => {
    const file = sharedFiles.get(fileId);
    // Guards: file exists? not local?
    
    socket.emit("transfer:progress", { status:"downloading" });
    
    const url = `http://${file.ownerHost}:${file.ownerServerPort}/api/files/${fileId}/download`;
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    
    const arrayBuffer = await res.arrayBuffer();         // receive ALL bytes
    const savePath = path.join(downloadDir, file.name);
    await fs.writeFile(savePath, Buffer.from(arrayBuffer));
    
    socket.emit("transfer:done", { fileName: file.name, savePath });
});
```

**Note:** This buffers the entire file in memory before writing. This is simple and works for demo-sized files. For production with large files (>1 GB), you'd stream directly to disk using `pipeline()`.

## AbortSignal.timeout(60000) — Why?
If Machine A goes offline mid-transfer, the fetch() would hang forever. `AbortSignal.timeout(60000)` automatically cancels the request after 60 seconds and throws an error, which is caught and sent as `transfer:error` to the UI.

## Transfer Status in UI
```javascript
transfers = {
  "fileId-abc": { status: "downloading", fileName: "report.pdf" },
  "fileId-xyz": { status: "done",        fileName: "photo.png"  },
  "fileId-123": { status: "error",       error: "Peer timeout"  }
}
```
- Each file has its own independent status
- `transfer:done` entries auto-clear after 4 seconds
- `transfer:error` entries auto-clear after 5 seconds

---

# 6. API DOCUMENTATION

## Base URL: `http://localhost:4000/api`

---

### GET /api/health
**Purpose:** Check if server is running
**Request:** None
**Response:** `{ "ok": true }`
**Internal:** Returns immediately. Used by UI on startup to verify server is ready.

---

### GET /api/peers
**Purpose:** Get list of discovered peers (for UI initial load)
**Request:** None
**Response:**
```json
{
  "peers": [{
    "peerId": "uuid",
    "peerName": "PC",
    "host": "192.168.0.106",
    "serverPort": 4000,
    "socketPort": 5000,
    "status": "online",
    "lastSeen": 1719683400000
  }]
}
```
**Internal:** Calls `peerRegistry.list()` which filters out stale peers and returns online ones.

---

### GET /api/files
**Purpose:** Return THIS machine's own shared files — called by OTHER peers
**Request:** None
**Response:**
```json
{ "files": [{ "fileId":"uuid", "name":"report.pdf", "size":2048000,
               "mimeType":"application/pdf", "ownerName":"LAPTOP",
               "ownerHost":"192.168.0.102", "isLocal":true, "sharedAt":1719683400000 }] }
```
**Important:** Returns ONLY local files (isLocal:true). Path field is STRIPPED for security.
**Why only local?** To prevent circular data — if we returned remote files too, peers would echo each other's files back and corrupt the isLocal flags.

---

### GET /api/all-files
**Purpose:** All files (local + remote) — for THIS machine's own UI
**Request:** None
**Response:** Same structure, but includes files with `isLocal:false` from other peers.
**Internal flow:** Returns all entries in sharedFiles Map, with path field stripped.

---

### POST /api/files/share
**Purpose:** Register a local file for sharing
**Request Body:** `{ "path": "C:\\Users\\Rushikesh\\Desktop\\report.pdf" }`
**Response (201):**
```json
{ "file": { "fileId":"uuid", "name":"report.pdf", "size":2048000, "isLocal":true, ... }}
```
**Error (400):** `{ "error": "path required" }`
**Error (500):** `{ "error": "ENOENT: no such file or directory" }`
**Internal flow:**
1. Validate path
2. fs.stat(path) — get file size
3. mime.lookup(name) — get MIME type
4. uuidv4() — generate fileId
5. Store in sharedFiles Map with isLocal:true
6. pushFilesToUi() — emit files:updated via Socket.IO
7. Return file metadata (without path)

---

### GET /api/files/:fileId/download
**Purpose:** Stream a local file — called by remote peers' servers
**URL Param:** fileId — the UUID
**Response Headers:**
```
Content-Disposition: attachment; filename="report.pdf"
Content-Type: application/pdf
Content-Length: 2048000
Access-Control-Allow-Origin: *
```
**Response Body:** Binary file data streamed in 256 KB chunks
**Error (404):** `{ "error": "File not found" }` — if fileId not in Map, or not local, or no path
**Internal flow:**
1. sharedFiles.get(fileId) — lookup
2. Verify file.isLocal && file.path exist
3. fs.stat(file.path) — get current size
4. Set response headers
5. fs.open(file.path, 'r') — open file handle
6. Loop: allocate 256KB buffer, read, write to response, advance offset
7. Close handle, end response

---

# 7. SOCKET EVENTS DOCUMENTATION

## Server → Client Events

### `peer:state`
**Who emits:** Server (Node.js)
**Who receives:** React UI
**When:** Any peer joins, leaves, or goes stale
**Payload:** `{ selfPeer: {...}, peers: [...] }`
**Effect:** Updates "Peers Online" panel

### `files:updated`
**Who emits:** Server (Node.js)
**Who receives:** React UI
**When:** File shared, peer synced, peer offline (removes their files)
**Payload:** `{ files: [{fileId, name, size, ownerName, isLocal, ...}] }`
**Effect:** Updates "File Registry" panel

### `transfer:progress`
**Who emits:** Server (Node.js)
**Who receives:** React UI
**When:** Transfer:request received, download starting
**Payload:** `{ fileId, fileName, status: "downloading" }`
**Effect:** Download button shows spinner, disabled

### `transfer:done`
**Who emits:** Server (Node.js)
**Who receives:** React UI
**When:** File successfully downloaded and saved to disk
**Payload:** `{ fileId, fileName, savePath }`
**Effect:** Button shows "✓ Saved" for 4 seconds, then reverts

### `transfer:error`
**Who emits:** Server (Node.js)
**Who receives:** React UI
**When:** Download fails (timeout, peer offline, etc.)
**Payload:** `{ fileId, fileName, error: "error message" }`
**Effect:** Button shows "✗ Failed" in red for 5 seconds

## Client → Server Events

### `transfer:request`
**Who emits:** React UI
**Who receives:** Server (Node.js)
**When:** User clicks Download button
**Payload:** `{ fileId: "uuid" }`
**Effect:** Server starts downloading from remote peer, emits progress/done/error back

---

# 8. FOLDER STRUCTURE

```
Sockit/
├── .env                    ← PEER_NAME=LAPTOP — only config needed
├── .env.example            ← Template showing all available env vars
├── package.json            ← Root package — runs all three (electron, client, server)
│
├── shared/
│   └── peerProtocol.js     ← Event name constants (Events.PEER_STATE, etc.)
│                             Imported by BOTH server and client to avoid typos
│
├── client/                 ← React frontend
│   ├── package.json
│   ├── vite.config.js      ← Vite build config, proxy settings
│   ├── tailwind.config.js  ← Tailwind theme (colors, fonts, shadows)
│   ├── index.html          ← Entry HTML (loads main.jsx)
│   └── src/
│       ├── main.jsx        ← React DOM render root
│       ├── App.jsx         ← Root component — calls hook, renders Shell + MainPage
│       ├── api.js          ← All axios calls (fetchPeers, fetchFiles, shareFile)
│       ├── index.css       ← Global CSS (Tailwind directives, fonts, scrollbar)
│       ├── assets/
│       │   └── socket_logo.png  ← App logo
│       ├── components/
│       │   └── Shell.jsx   ← Top navbar (logo, Network Discovery Active, quit btn)
│       ├── hooks/
│       │   └── useRealtimeState.js  ← THE most important file:
│       │                              - Creates Socket.IO connection
│       │                              - Manages peers, files, transfers state
│       │                              - Sets up all event listeners
│       │                              - Bootstrap REST calls on mount
│       └── pages/
│           └── MainPage.jsx  ← Main UI: drag drop zone, File Registry, Peers Online
│                               File icons, download buttons, transfer status badges
│
├── server/                 ← Node.js backend
│   ├── package.json        ← Dependencies: express, socket.io, uuid, mime-types, etc.
│   └── src/
│       ├── index.js        ← THE server — everything in one clean file:
│       │                     - getLanIp(), selfPeer creation
│       │                     - sharedFiles Map
│       │                     - Express HTTP setup (all routes)
│       │                     - Socket.IO setup (transfer:request handler)
│       │                     - DiscoveryService start
│       │                     - Peer pruning interval
│       ├── config.js       ← Reads process.env → exports config object
│       │                     (ports, peerName, downloadDir, etc.)
│       └── services/
│           ├── discoveryService.js  ← UDP socket: broadcastHello every 3s,
│           │                          receive HELLO/GOODBYE, call callbacks
│           └── peerRegistry.js     ← Map of known peers, upsert/markOffline/list
│
└── electron/
    ├── main.js             ← Electron main process:
    │                         - Creates BrowserWindow
    │                         - Starts Node server as child process
    │                         - IPC handlers (pickFile, pickFolder, writeFile, etc.)
    └── preload.js          ← Bridge: contextBridge.exposeInMainWorld('sockit', {...})
                              Exposes safe APIs to React renderer
```

---
