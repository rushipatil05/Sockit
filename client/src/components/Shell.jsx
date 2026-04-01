import { NavLink } from "react-router-dom";

const links = [
    { label: "Dashboard", to: "/" },
    { label: "Upload", to: "/upload" },
    { label: "Transfers", to: "/transfers" }
];

export function Shell({ children }) {
    return (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-8">
            <header className="mb-6 rounded-2xl border border-white/10 bg-panel/80 p-4 shadow-neon backdrop-blur-lg">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-heading text-2xl font-semibold tracking-tight text-neon">Socket Share</h1>
                        <p className="text-sm text-white/60">Offline LAN peer-to-peer transfer hub</p>
                    </div>
                    <nav className="flex gap-2">
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `rounded-lg px-4 py-2 text-sm transition ${isActive
                                        ? "bg-neon/20 text-neon shadow-neon"
                                        : "bg-white/5 text-white/70 hover:bg-white/10"
                                    }`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
