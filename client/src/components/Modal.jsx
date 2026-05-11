import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export function Modal({ open, onClose, title, subtitle, children }) {

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl 
                       bg-surface 
                       border border-white/10"
          >

            <div className="h-px bg-white/10" />

            <div className="flex items-start justify-between px-6 pt-6 pb-2">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-text-primary">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg 
                           text-text-secondary hover:text-text-primary 
                           hover:bg-white/10 transition"
              >
                X
              </button>
            </div>

            <div className="px-6 py-5">
              {children}
            </div>

            <div className="h-px bg-white/10" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}


