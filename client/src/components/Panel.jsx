export function Panel({ title, subtitle, action, children }) {
    return (
        <section className="rounded-2xl border border-white/10 bg-panelSoft/75 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="font-heading text-lg font-medium text-white">{title}</h2>
                    {subtitle ? <p className="text-sm text-white/50">{subtitle}</p> : null}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}
