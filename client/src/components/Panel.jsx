import { motion } from "framer-motion";

export function Section({ title, subtitle, action, children, delay = 0 }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: "easeOut" }}
        >
            {(title || action) && (
                <div className="mb-4 flex items-end justify-between">
                    <div>
                        {title && (
                            <h2 className="font-heading text-lg font-semibold text-white/90">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="mt-0.5 text-sm text-white/35">{subtitle}</p>
                        )}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </motion.section>
    );
}
