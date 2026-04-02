import { motion } from "framer-motion";

export function Shell({ children, room }) {
    return (
        <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 md:px-10">
            {/* Ambient glow orbs */}
            <div className="mesh-dot" style={{ width: 400, height: 400, top: -100, left: -100 }} />
            <div className="mesh-dot" style={{ width: 300, height: 300, bottom: 100, right: -80 }} />

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 mb-10"
            >
                <div className="flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex h-10 w-10 items-center justify-center">
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-blue-700 opacity-80" />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-blue-700 blur-lg opacity-40" />
                            <span className="relative z-10 font-mono text-sm font-bold text-white">SS</span>
                        </div>
                        <div>
                            <h1 className="font-heading text-xl font-bold tracking-tight text-white">
                                Socket<span className="text-accent">Share</span>
                            </h1>
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
                                Local Network Workspace
                            </p>
                        </div>
                    </div>

                    {/* Status pill */}
                    <div className="flex items-center gap-2.5 rounded-full bg-white/[0.03] px-4 py-2 backdrop-blur-sm">
                        <div className={`h-1.5 w-1.5 rounded-full ${room?.active ? "bg-success animate-pulse-slow" : "bg-yellow-500/70"}`} />
                        {room?.active ? (
                            <p className="font-mono text-xs text-white/50">
                                <span className="text-accent font-medium">{room.roomId}</span>
                                <span className="mx-1.5 text-white/20">•</span>
                                <span className="text-white/40">{room.isHost ? "Host" : "Member"}</span>
                            </p>
                        ) : (
                            <p className="font-mono text-xs text-white/35">No active room</p>
                        )}
                    </div>
                </div>

                {/* Separator line */}
                <div className="mt-6 h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
            </motion.header>

            {/* Content */}
            <main className="relative z-10 flex-1">{children}</main>

        </div>
    );
}
