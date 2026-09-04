interface CustomSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  dir?: 'rtl' | 'ltr';
}

export function CustomSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  dir = 'ltr',
}: CustomSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      tabIndex={0}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-primary' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        border-2 border-transparent focus:outline-none
         focus:ring-2 focus:ring-blue-800 focus:ring-offset-2
      `}
      style={{ direction: dir }}
    >
      <span
        className={`
          inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform
          ${checked
      ? dir === 'rtl'
        ? '-translate-x-5'
        : 'translate-x-5'
      : 'translate-x-0'
    }
        `}
      />
    </button>
  );
}

/** Switch with Radix-style onCheckedChange (alias for CustomSwitch) */
export interface SwitchProps extends Omit<CustomSwitchProps, 'onChange'> {
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({ onCheckedChange, onChange, ...rest }: SwitchProps) {
  const handleChange = (checked: boolean) => {
    onChange?.(checked);
    onCheckedChange?.(checked);
  };

  return (
    <CustomSwitch
      {...rest}
      onChange={handleChange}
    />
  );
}
