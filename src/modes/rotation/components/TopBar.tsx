import { createPortal } from 'preact/compat';
import { useContext } from 'preact/hooks';
import { HeaderActionsContext } from '../../../shell/App';

/** The mode's buttons, portalled into the app header. New object lives in the Exercise section on desktop. */
export function TopBar() {
  const target = useContext(HeaderActionsContext);
  if (!target) return null;
  return createPortal(
    <>
      {/* Saved sets arrive with saving. */}
      <button type="button" class="btn btn-quiet" disabled>
        Saved
      </button>
    </>,
    target,
  );
}
