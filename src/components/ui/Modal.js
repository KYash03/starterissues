import { useRef } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

export default function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  useClickOutside(modalRef, onClose, isOpen);
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 backdrop-animate"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(2px)",
          zIndex: 50,
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          ref={modalRef}
          className="relative rounded-lg shadow-xl border p-4 modal-content-animate pointer-events-auto"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
            color: "var(--text-primary)",
          }}
        >
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </>
  );
}
