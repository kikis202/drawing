import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

/** A modal sheet rising from the bottom edge. A native dialog gives focus trapping and Escape. */
export function BottomSheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      class="sheet-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="sheet-dialog-head">
        <h2 class="panel-title">{title}</h2>
        <button type="button" class="btn btn-quiet btn-small" onClick={onClose}>
          Done
        </button>
      </div>
      <div class="panel">{children}</div>
    </dialog>
  );
}
