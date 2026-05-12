export class PeerRegistry {
    constructor() {
        this.peers = new Map();
    }

    upsert(peer) {
        this.peers.set(peer.peerId, {
            ...this.peers.get(peer.peerId),
            ...peer,
            status: "online",
            lastSeen: Date.now()
        });
        return this.peers.get(peer.peerId);
    }

    remove(peerId) {
        this.peers.delete(peerId);
    }

    markOffline(peerId) {
        if (!this.peers.has(peerId)) {
            return;
        }
        this.peers.set(peerId, { ...this.peers.get(peerId), status: "offline", lastSeen: Date.now() });
    }

    list() {
        const now = Date.now();
        // Automatically remove peers that haven't sent a heartbeat in 15 seconds
        for (const [id, peer] of this.peers.entries()) {
            if (now - peer.lastSeen > 15000) {
                this.peers.delete(id);
            }
        }
        return Array.from(this.peers.values())
            .filter(p => p.status === "online")
            .sort((a, b) => b.lastSeen - a.lastSeen);
    }

    get(peerId) {
        return this.peers.get(peerId);
    }
}
