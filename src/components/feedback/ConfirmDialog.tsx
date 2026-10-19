import { useEffect, useRef } from "react";

import { Button } from "../forms/Button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  busy = false,
  danger = false,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="confirm-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose} disabled={busy}>取消</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>{busy ? "处理中…" : confirmLabel}</Button>
      </div>
    </dialog>
  );
}
