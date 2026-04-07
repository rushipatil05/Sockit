# sockit

sockit is an offline-first desktop LAN file sharing app built with MERN + Electron.

## Stack

- Frontend: React + Tailwind CSS + Framer Motion
- Backend: Node.js + Express + Socket.IO
- Database: MongoDB (file metadata index)
- Desktop: Electron
- LAN Discovery: UDP broadcast
- Transfer: chunk-based pull over Socket.IO (TCP)

## Project Structure

```text
sockit/
  client/                 React UI
  server/                 Express API + Socket server + UDP discovery
  electron/               Desktop shell (main + preload)
  shared/                 Shared protocol constants
  .env.example
  package.json
  README.md
```

## Features Implemented

1. Peer discovery over LAN (UDP hello/goodbye broadcast)
2. Live peer registry with online/offline status
3. Decentralized file index (local metadata in MongoDB, remote metadata sync)
4. File sharing by selecting local file path in Electron
5. Direct peer-to-peer chunked download with resume support
6. Real-time updates for peers/files/transfers via Socket.IO
7. Electron desktop app with native file dialogs and notifications
8. Dark premium UI with Dashboard, Upload, and Transfers pages

## Setup

### Prerequisites

- Node.js 20+
- MongoDB running locally or on LAN

### 1. Configure environment

Copy `.env.example` to `.env` and update if needed.

Default values:

- `MONGO_URI=mongodb://127.0.0.1:27017/socket-share`
- `SERVER_PORT=4000`
- `SOCKET_PORT=5000`
- `UDP_PORT=41234`

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development

```bash
npm run dev
```

This starts:

- Express API server (`4000`)
- Socket server (`5000`)
- React app (`5173`)
- Electron shell

### 4. LAN testing across devices

Run sockit on at least two devices in the same LAN.

Use unique values per device for:

- `SERVER_PORT`
- `SOCKET_PORT`
- optional `PEER_NAME`

Use the same `UDP_PORT` for discovery.

## How Transfers Work

- Receiver requests chunks (`256KB`) using `transfer:pull-request`.
- Sender reads file bytes from local disk and returns base64 chunk + next offset.
- Receiver appends to existing file and updates progress.
- If download is interrupted, receiver resumes from current file size.

## Security Notes

- Peer identity is tracked by generated `peerId`.
- App is intended for trusted LAN environments.
- Recommended next step: add optional AES encryption and peer allowlist.

## Production Notes

- Electron packaging is not yet configured.
- Add `electron-builder` or `electron-forge` for distributable builds.
- Optional enhancements suggested below can be layered into existing services.

## Suggested Next Enhancements
1. AES-GCM encrypted chunks with key exchange
2. Private sharing with peer allowlist
3. Multi-file transfer queue with concurrency controls
4. QR code based manual peer handshake
5. Network speed adaptive chunk size
6. WebRTC data channel optimization for large LANs
