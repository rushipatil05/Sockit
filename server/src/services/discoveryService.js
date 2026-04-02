import dgram from "node:dgram";
import os from "node:os";
import { Events, PROTOCOL_VERSION } from "../../../shared/peerProtocol.js";

function getLanIp() {
    const interfaces = os.networkInterfaces();
    for (const key of Object.keys(interfaces)) {
        for (const item of interfaces[key] || []) {
            if (item.family === "IPv4" && !item.internal) {
                return item.address;
            }
        }
    }
    return "127.0.0.1";
}

export class DiscoveryService {
    constructor({ config, selfPeer, onPeerSeen, onPeerLeft, getDiscoveryInfo }) {
        this.config = config;
        this.selfPeer = selfPeer;
        this.onPeerSeen = onPeerSeen;
        this.onPeerLeft = onPeerLeft;
        this.getDiscoveryInfo = getDiscoveryInfo;
        this.socket = dgram.createSocket("udp4");
        this.heartbeat = null;
    }

    start() {
        this.socket.on("message", (buffer, rinfo) => {
            try {
                const payload = JSON.parse(buffer.toString("utf8"));
                if (!payload || payload.peerId === this.selfPeer.peerId) {
                    return;
                }

                if (payload.type === Events.HELLO) {
                    this.onPeerSeen({ ...payload, host: rinfo.address, lastSeen: Date.now() });
                }

                if (payload.type === Events.GOODBYE) {
                    this.onPeerLeft(payload.peerId);
                }
            } catch {
                // Ignore malformed datagrams.
            }
        });

        this.socket.bind(this.config.udpPort, () => {
            this.socket.setBroadcast(true);
            this.broadcastHello();
            this.heartbeat = setInterval(() => this.broadcastHello(), 3000);
        });
    }

    stop() {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
        }
        this.broadcastGoodbye();
        this.socket.close();
    }

    broadcastHello() {
        const discoveryInfo = this.getDiscoveryInfo?.() || {};
        const payload = {
            type: Events.HELLO,
            protocol: PROTOCOL_VERSION,
            peerId: this.selfPeer.peerId,
            peerName: this.selfPeer.peerName,
            host: getLanIp(),
            socketPort: this.selfPeer.socketPort,
            serverPort: this.selfPeer.serverPort,
            roomId: discoveryInfo.roomId || null,
            ts: Date.now()
        };

        const message = Buffer.from(JSON.stringify(payload));
        this.socket.send(message, 0, message.length, this.config.udpPort, this.config.udpBroadcastAddr);
    }

    broadcastGoodbye() {
        const payload = {
            type: Events.GOODBYE,
            protocol: PROTOCOL_VERSION,
            peerId: this.selfPeer.peerId,
            ts: Date.now()
        };

        const message = Buffer.from(JSON.stringify(payload));
        this.socket.send(message, 0, message.length, this.config.udpPort, this.config.udpBroadcastAddr);
    }
}
