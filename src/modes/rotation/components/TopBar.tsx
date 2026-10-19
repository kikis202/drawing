import { createPortal } from 'preact/compat';
import { useContext } from 'preact/hooks';
import { HeaderActionsContext } from '../../../shell/App';

interface Props {
  onNewObject: () => void;
}

/** The mode's buttons, portalled into the app header. */
export function TopBar({ onNewObject }: Props) {
  const target = useContext(HeaderActionsContext);
  if (!target) return null;
  return createPortal(
    <>
      {/* Saved sets arrive with saving. */}
      <button type="button" class="btn btn-quiet" disabled>
        Saved
      </button>
      <button type="button" class="btn" onClick={onNewObject}>
        New object
      </button>
    </>,
    target,
  );
}
