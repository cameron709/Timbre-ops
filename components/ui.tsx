"use client";

import { useEffect, useId, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

type Tone = "neutral" | "good" | "warn" | "danger" | "quiet";

export function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`section ${className}`}><div className="section-head"><h2>{title}</h2>{action}</div>{children}</section>;
}

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="empty-state"><Icon size={20} aria-hidden="true"/><strong>{title}</strong><span>{body}</span></div>;
}

// Retain the existing API while using the quieter dot-and-label status language.
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`status-label ${tone}`}><span className="status-dot" aria-hidden="true"/>{children}</span>;
}

export function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <dialog ref={ref} className="sheet" aria-labelledby={headingId} onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="sheet-heading"><h2 id={headingId}>{title}</h2><button type="button" className="utility-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>{children}
  </dialog>;
}
