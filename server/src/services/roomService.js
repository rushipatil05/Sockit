import crypto from "node:crypto";

function hashKey(roomKey) {
    return crypto.createHash("sha256").update(roomKey).digest("hex");
}

function generateRoomId() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function generateRoomKey() {
    return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export class RoomService {
    constructor({ selfPeerId }) {
        this.selfPeerId = selfPeerId;
        this.room = null;
    }

    createRoom({ roomId, roomKey }) {
        const finalRoomId = (roomId || generateRoomId()).trim().toUpperCase();
        const finalRoomKey = (roomKey || generateRoomKey()).trim();

        if (!finalRoomId || !finalRoomKey) {
            throw new Error("roomId and roomKey are required");
        }

        this.room = {
            roomId: finalRoomId,
            roomKeyHash: hashKey(finalRoomKey),
            isHost: true,
            members: new Set([this.selfPeerId]),
            createdAt: Date.now()
        };

        return {
            roomId: this.room.roomId,
            roomKey: finalRoomKey,
            isHost: true,
            active: true
        };
    }

    joinRoom({ roomId, roomKey }) {
        const finalRoomId = (roomId || "").trim().toUpperCase();
        const finalRoomKey = (roomKey || "").trim();

        if (!finalRoomId || !finalRoomKey) {
            throw new Error("roomId and roomKey are required");
        }

        this.room = {
            roomId: finalRoomId,
            roomKeyHash: hashKey(finalRoomKey),
            isHost: false,
            members: new Set([this.selfPeerId]),
            createdAt: Date.now()
        };

        return {
            roomId: this.room.roomId,
            isHost: false,
            active: true
        };
    }

    clearRoom() {
        this.room = null;
    }

    getRoomSummary() {
        if (!this.room) {
            return { active: false };
        }

        return {
            active: true,
            roomId: this.room.roomId,
            isHost: this.room.isHost,
            members: Array.from(this.room.members)
        };
    }

    getPeerAuth() {
        if (!this.room) {
            return {
                roomId: null,
                roomKeyHash: null
            };
        }

        return {
            roomId: this.room.roomId,
            roomKeyHash: this.room.roomKeyHash
        };
    }

    getDiscoveryInfo() {
        return {
            roomId: this.room?.roomId || null
        };
    }

    isActive() {
        return Boolean(this.room);
    }

    canConnectToPeer(peer) {
        if (!this.room) {
            return false;
        }
        return peer?.roomId && peer.roomId === this.room.roomId;
    }

    authorizePeerHandshake({ peerId, roomId, roomKeyHash }) {
        if (!this.room) {
            return { ok: false, reason: "This node is not in a room." };
        }

        if (!roomId || roomId !== this.room.roomId) {
            return { ok: false, reason: "Room ID mismatch." };
        }

        if (!roomKeyHash || roomKeyHash !== this.room.roomKeyHash) {
            return { ok: false, reason: "Room key mismatch." };
        }

        this.room.members.add(peerId);
        return { ok: true };
    }
}
