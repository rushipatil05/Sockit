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
        return Array.from(this.peers.values()).sort((a, b) => b.lastSeen - a.lastSeen);
    }

    get(peerId) {
        return this.peers.get(peerId);
    }
}
