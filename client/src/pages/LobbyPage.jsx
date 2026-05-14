import { useState } from "react";
import { motion } from "framer-motion";
import { Section } from "../components/Panel";

export function LobbyPage({ peers, onCreateRoom, onJoinRoom }) {
    const [joinCode, setJoinCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState("");

    const handleJoin = async (e) => {
        e.preventDefault();
        setJoinError("");
        if (!joinCode || joinCode.length < 4) {
            setJoinError("Enter a valid 4-digit code.");
            return;
        }

        setIsJoining(true);
        try {
            await onJoinRoom(joinCode);
        } catch (error) {
            setJoinError(error?.response?.data?.error || error.message || "Failed to join room");
            setIsJoining(false);
        }
    };

    return (
        <div className="space-y-10 max-w-2xl mx-auto pt-10">
            {/* <Section delay={0.05}>
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-text-primary mb-3">Sockit</h2>
                    <p className="text-text-secondary">Create or join a secure room to start sharing files.</p>
                </div>
            </Section> */}

            <div className="grid sm:grid-cols-2 gap-5">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-accent/20 bg-accent/[0.03] p-6 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-lg font-semibold text-accent mb-2">Create a Room</h3>
                        <p className="text-sm text-text-secondary mb-6">Start a new secure session and invite others to join using your unique room code.</p>
                    </div>
                    <button
                        onClick={onCreateRoom}
                        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-base hover:opacity-90 transition-opacity"
                    >
                        Create Room
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-white/10 bg-surface p-6"
                >
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Join a Room</h3>
                    <p className="text-sm text-text-secondary mb-6">Enter a 4-digit room code to connect and share files with the host.</p>
                    <form onSubmit={handleJoin} className="space-y-3">
                        <input
                            type="text"
                            maxLength={4}
                            placeholder="4-Digit Code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-white/10 bg-base px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-text-primary placeholder-text-secondary/50 outline-none focus:border-accent/50 transition-colors"
                        />
                        {joinError && <p className="text-xs text-danger text-center">{joinError}</p>}
                        <button
                            type="submit"
                            disabled={isJoining || joinCode.length < 4}
                            className="w-full rounded-xl bg-surface-light border border-white/10 px-4 py-3 text-sm font-semibold text-text-primary hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                        >
                            {isJoining ? "Joining..." : "Join Room"}
                        </button>
                    </form>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-10 rounded-2xl border border-white/10 bg-surface overflow-hidden"
            >
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-semibold text-text-primary">Discovered Peers (UDP)</h3>
                </div>
                <div className="px-5 py-4 min-h-[100px]">
                    {peers.length === 0 ? (
                        <p className="text-xs text-text-secondary py-4 text-center">Searching network for devices...</p>
                    ) : (
                        <div className="space-y-3">
                            {peers.map((peer, i) => (
                                <div key={peer.peerId} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                                    <span className="text-sm text-text-primary font-medium">{peer.peerName || "Unknown Peer"}</span>
                                    <span className="text-xs text-text-secondary font-mono">{peer.host}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
