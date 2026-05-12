# 🚀 SocketShare

**SocketShare** is a powerful, offline-first, LAN-based peer-to-peer file sharing application. No internet, no cloud, no central server — just direct, lightning-fast transfers between devices on your local network.

---

## 🛠️ Tech Stack
- **Frontend**: React + Vanilla CSS
- **Backend**: Node.js + Express + Socket.IO
- **Desktop**: Electron
- **Database**: None (Zero-Config In-Memory Storage)

---

## 🚀 How to Run

### 1. Prerequisites
- **Node.js 20+** installed on your machine.

### 2. Setup
Open your terminal in the root folder and run:
```bash
npm install
```

### 3. Start the App
Simply run:
```bash
npm run dev
```
This will start the backend server, the frontend, and open the Electron window automatically.

---

## 📂 Configuration (.env)

Edit the `.env` file in the root folder to customize your setup:

| Variable | Recommendation |
| :--- | :--- |
| **`PEER_NAME`** | Unique name for each PC (e.g., `LAPTOP`, `DESKTOP`). |
| **`UDP_PORT`** | Must be the **same** on all PCs (default `41234`). |
| **`SERVER_PORT`** | Port for the API (default `4000`). |
| **`SOCKET_PORT`** | Port for transfers (default `5000`). |

> **Note**: If you change `SERVER_PORT` or `SOCKET_PORT`, remember to update your `client/.env` file as well so the UI knows where to connect.

---

## 🔧 Troubleshooting

### ❌ "Can't Download Files"
- Ensure your `.env` file is in the **root** folder.
- Check that your Firewall isn't blocking the app.

### ❌ "Peers Not Appearing"
- Verify both devices are on the **same Wi-Fi/LAN**.
- Ensure both PCs are using the same **`UDP_PORT`** in their `.env`.

---

*Made with ❤️ by Rushi*
