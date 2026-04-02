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
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl 
                       bg-white/[0.04] backdrop-blur-xl 
                       border border-white/10 
                       shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
          >

            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="flex items-start justify-between px-6 pt-6 pb-2">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-white">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-white/40">
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg 
                           text-white/40 hover:text-white 
                           hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {children}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}