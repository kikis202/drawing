import { createPortal } from 'preact/compat';
import { useContext } from 'preact/hooks';
import { HeaderActionsContext } from '../../../shell/App';

interface Props {
  /** Phones have no Exercise section on screen, so New object sits in the header there. */
  onNewObject?: () => void;
  onSaved: () => void;
}

/** The mode's buttons, portalled into the app header. New object lives in the Exercise section on desktop. */
export function TopBar({ onNewObject, onSaved }: Props) {
  const target = useContext(HeaderActionsContext);
  if (!target) return null;
  return createPortal(
    <>
      {onNewObject && (
        <button type="button" class="btn btn-primary" onClick={onNewObject}>
          New object
        </button>
      )}
      <button type="button" class="btn btn-quiet" onClick={onSaved}>
        Saved
      </button>
    </>,
    target,
  );
}
