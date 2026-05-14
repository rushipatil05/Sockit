import { motion } from "framer-motion";
import socketLogo from "../assets/socket_logo.png";

export function Shell({ children }) {
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

                    <div className="flex items-center gap-3">
                        {/* Status pill */}
                        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-surface px-4 py-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                            <p className="font-mono text-xs text-text-secondary">Network Discovery Active</p>
                        </div>

                        {/* Quit Button */}
                        <button
                            onClick={() => window.sockit?.quitApp()}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
                            title="Close Application"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
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
