import { useState } from "react";
import { motion } from "framer-motion";
import socketLogo from "../assets/socket_logo.png";

export function SetupScreen({ onComplete }) {
    const [name, setName]       = useState("");
    const [error, setError]     = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Please enter a device name.");
            return;
        }
        if (trimmed.length > 32) {
            setError("Name must be 32 characters or fewer.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            if (window.sockit?.setPeerName) {
                await window.sockit.setPeerName(trimmed);
            } else {
                // Fallback for non-Electron: persist in localStorage
                localStorage.setItem("sockit_peer_name", trimmed);
            }
            onComplete(trimmed);
        } catch (err) {
            setError(err?.message || "Failed to save name.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-base px-6">

            {/* Ambient glow blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
                <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-indigo-500/8 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="relative z-10 w-full max-w-sm"
            >
                {/* Logo + brand */}
                <div className="mb-10 flex flex-col items-center gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-xl shadow-black/40">
                        <img src={socketLogo} alt="Sockit" className="h-full w-full object-cover" />
                    </div>
                    <div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">
                            Welcome to Sock<span className="text-accent">it</span>
                        </h1>
                        <p className="mt-1.5 text-sm text-text-secondary/70">
                            Local Network Workspace
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-white/10 bg-surface p-7 shadow-2xl shadow-black/50">
                    <h2 className="text-base font-semibold text-text-primary">
                        What should we call this device?
                    </h2>
                    <p className="mt-1 text-xs text-text-secondary/60 leading-relaxed">
                        This name will be visible to other peers on the same network. You can always change it later.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
                        <div className="relative">
                            {/* Device icon inside input */}
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/40">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                                </svg>
                            </span>
                            <input
                                id="peer-name-input"
                                type="text"
                                autoFocus
                                maxLength={32}
                                placeholder="e.g. Rushikesh's Laptop"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(""); }}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-text-primary placeholder-text-secondary/30 outline-none ring-accent/50 transition-all focus:border-accent/60 focus:ring-2"
                            />
                        </div>

                        {/* Character counter + error */}
                        <div className="flex items-center justify-between px-0.5">
                            {error ? (
                                <p className="text-xs text-red-400">{error}</p>
                            ) : (
                                <span />
                            )}
                            <span className={`text-xs tabular-nums ${name.length > 28 ? "text-amber-400" : "text-text-secondary/30"}`}>
                                {name.length}/32
                            </span>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-base shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {loading ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                                    </svg>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    Continue
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>

                <p className="mt-5 text-center text-[11px] text-text-secondary/30">
                    Your name is stored locally and never sent to any server.
                </p>
            </motion.div>
        </div>
    );
}
