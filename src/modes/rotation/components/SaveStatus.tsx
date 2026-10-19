interface Props {
  text: string;
  /** Offered when a save failed but the images are in hand. */
  onDownload?: () => void;
  phone?: boolean;
}

/** The line under the Save button: the outcome of the last save, with a way out when it failed. */
export function SaveStatus({ text, onDownload, phone = false }: Props) {
  return (
    <p class={`save-status${phone ? ' save-status-phone' : ''}`} role="status">
      <span>{text}</span>
      {onDownload && (
        <button type="button" class="btn btn-small" onClick={onDownload}>
          Download shots
        </button>
      )}
    </p>
  );
}
