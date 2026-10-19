interface Props {
  keptCount: number;
  onSettings: () => void;
  onSave: () => void;
}

/** The phone's bottom bar: Settings opens the sheet, Save sits beside it. */
export function PhoneBar({ keptCount, onSettings, onSave }: Props) {
  return (
    <div class="phone-bar">
      <button type="button" class="btn" onClick={onSettings}>
        Settings
      </button>
      <button type="button" class="btn btn-primary" disabled={keptCount === 0} onClick={onSave}>
        {keptCount === 1 ? 'Save 1 shot' : `Save ${keptCount} shots`}
      </button>
    </div>
  );
}
