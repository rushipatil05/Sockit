export class RoomService {
    constructor() {
        this.roomCode = null;
        this.isHost = false;
    }

    createRoom() {
        this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        this.isHost = true;
        return this.roomCode;
    }

    joinRoom(code) {
        if (!code) throw new Error("Room code is required");
        this.roomCode = code.toString().trim();
        this.isHost = false;
        return this.roomCode;
    }

    leaveRoom() {
        this.roomCode = null;
        this.isHost = false;
    }

    getRoom() {
        return this.roomCode ? { code: this.roomCode, isHost: this.isHost } : null;
    }

    getRoomCode() {
        return this.roomCode;
    }

    isInRoom() {
        return this.roomCode !== null;
    }
}
