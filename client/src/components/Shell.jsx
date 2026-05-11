import { motion } from "framer-motion";
import socketLogo from "../assets/socket_logo.png";

export function Shell({ children, room }) {
    return (
        <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 md:px-10">
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
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-surface">
                            <img src={socketLogo} alt="Sockit" className="h-full w-full object-cover" />
                        </div>
                        <div>
                            <h1 className="font-heading text-xl font-bold tracking-tight text-text-primary">
                                Sock<span className="text-accent">it</span>
                            </h1>
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-secondary">
                                Local Network Workspace
                            </p>
                        </div>
                    </div>

                    {/* Status pill */}
                    <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-surface px-4 py-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${room?.active ? "bg-success" : "bg-yellow-500/70"}`} />
                        {room?.active ? (
                            <p className="font-mono text-xs text-text-secondary">
                                <span className="text-accent font-medium">{room.roomId}</span>
                                <span className="mx-1.5 text-text-secondary">|</span>
                                <span className="text-text-secondary">{room.isHost ? "Host" : "Member"}</span>
                            </p>
                        ) : (
                            <p className="font-mono text-xs text-text-secondary">No active room</p>
                        )}
                    </div>
                </div>

                {/* Separator line */}
                <div className="mt-6 h-px bg-white/10" />
            </motion.header>

            {/* Content */}
            <main className="relative z-10 flex-1">{children}</main>

        </div>
    );
}



