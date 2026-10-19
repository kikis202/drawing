import { useEffect, useRef, useState } from 'preact/hooks';
import { downloadBlob, zipFilename } from '../../../storage/download';
import { checkSet, deleteSet, listSets, zipSet } from '../../../storage/saved-sets';
import type { SavedSet } from '../../../storage/saved-sets';

interface Props {
  open: boolean;
  onClose: () => void;
  /** False when the record can't be opened. */
  onOpenSet: (set: SavedSet) => boolean;
}

type Listing = 'loading' | 'blocked' | SavedSet[];

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** A modal listing the sets saved on this device. A native dialog gives focus trapping, Escape and focus return. */
export function SavedPanel({ open, onClose, onOpenSet }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [listing, setListing] = useState<Listing>('loading');
  const [error, setError] = useState<string | null>(null);
  // Bumped to reload the list after a delete.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let current = true;
    void listSets().then((result) => {
      if (current) setListing('error' in result ? 'blocked' : result);
    });
    return () => {
      current = false;
    };
  }, [open, reload]);

  // The first image of each set, as object URLs that go when the list changes.
  const [covers, setCovers] = useState<string[]>([]);
  useEffect(() => {
    if (typeof listing === 'string') {
      setCovers([]);
      return;
    }
    const urls = listing.map((set) => (set.shots?.[0]?.image instanceof Blob ? URL.createObjectURL(set.shots[0].image) : ''));
    setCovers(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [listing]);

  const download = async (set: SavedSet) => {
    setError(null);
    try {
      downloadBlob(await zipSet(set), zipFilename(new Date(set.createdAt)));
    } catch {
      setError("Couldn't make the download. Try again.");
    }
  };

  const remove = async (set: SavedSet) => {
    setError(null);
    try {
      await deleteSet(set.id);
    } catch {
      setError("Couldn't delete that set. Try again.");
    }
    setReload((n) => n + 1);
  };

  return (
    <dialog
      ref={ref}
      class="saved-dialog"
      aria-label="Saved"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="sheet-dialog-head">
        <h2 class="panel-title">Saved</h2>
        <button type="button" class="btn btn-quiet btn-small" onClick={onClose}>
          Done
        </button>
      </div>
      <div class="saved-body">
        {error && (
          <p class="saved-empty" role="alert">
            {error}
          </p>
        )}
        {listing === 'loading' && <p class="saved-empty">Loading…</p>}
        {listing === 'blocked' && (
          <p class="saved-empty">This browser is blocking storage, so saved sets can't be shown.</p>
        )}
        {Array.isArray(listing) && listing.length === 0 && (
          <p class="saved-empty">No saved sets yet. Tick shots and press Save to keep them here.</p>
        )}
        {Array.isArray(listing) && listing.length > 0 && (
          <ul class="saved-list">
            {listing.map((set, i) => (
              <li key={set.id} class="saved-item">
                {covers[i] ? <img src={covers[i]} alt="" /> : <span class="saved-cover-blank" />}
                <div class="saved-info">
                  <span class="saved-date">
                    {typeof set.createdAt === 'number' ? dateFormat.format(set.createdAt) : 'Unknown date'}
                  </span>
                  <span class="saved-count">
                    {checkSet(set) === null
                      ? "Can't be read"
                      : set.shots.length === 1
                        ? '1 shot'
                        : `${set.shots.length} shots`}
                  </span>
                </div>
                <div class="saved-actions">
                  <button
                    type="button"
                    class="btn btn-small"
                    onClick={() => {
                      setError(null);
                      let opened = false;
                      try {
                        opened = onOpenSet(set);
                      } catch {
                        // reported below
                      }
                      if (opened) onClose();
                      else setError("Couldn't open that set.");
                    }}
                  >
                    Open
                  </button>
                  <button type="button" class="btn btn-small" onClick={() => void download(set)}>
                    Download
                  </button>
                  <button type="button" class="btn btn-quiet btn-small" onClick={() => void remove(set)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
