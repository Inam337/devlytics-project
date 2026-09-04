import Select, {
  components,
} from 'react-select';
import type {
  MultiValue,
  CSSObjectWithLabel,
  MultiValueProps,
  GroupBase,
  StylesConfig,
  ClearIndicatorProps,
  MenuListProps,
} from 'react-select';

import { IconColors } from '@/components/icons/types/RbIcon.types';
import { RbIcon } from '@/components/icons/common/RbIcon';

export interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: SelectOption[];
  selectedValues: SelectOption[];
  onSelectionChange: (selected: SelectOption[]) => void;
  placeholder?: string;
  className?: string;
  width?: string;
  hasError?: boolean;
  disabled?: boolean;
  /** When true, shows a "Select all" option as the first item in the dropdown */
  showSelectAll?: boolean;
  /** Label for the "Select all" option (default: "Select all") */
  selectAllLabel?: string;
}

export default function MultiSelectDropdown({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Select options',
  className = '',
  width = 'w-64',
  hasError = false,
  disabled = false,
  showSelectAll = false,
  selectAllLabel = 'Select all',
}: MultiSelectDropdownProps) {
  const customStyles: StylesConfig<SelectOption, true, GroupBase<SelectOption>> = {
    control: (provided: CSSObjectWithLabel, state: { isFocused: boolean }) => ({
      ...provided,
      'minHeight': '36px',
      'height': '36px',
      'width': width === 'w-64' ? '300px' : width,
      'border': hasError
        ? '1px solid #ef4444'
        : state.isFocused
          ? '1px solid #00529C'
          : '1px solid #d1d5db',
      'borderRadius': '6px',
      'boxShadow': hasError
        ? '0 0 0 1px #ef4444'
        : state.isFocused
          ? '0 0 0 1px #00529C'
          : 'none',
      '&:hover': {
        border: hasError ? '1px solid #ef4444' : '1px solid #00529C',
      },
    }),
    valueContainer: (provided: CSSObjectWithLabel) => ({
      ...provided,
      height: 'auto',
      minHeight: '36px',
      padding: '0px 8px',
      flexWrap: 'wrap',
      gap: '4px',
    }),
    input: (provided: CSSObjectWithLabel) => ({
      ...provided,
      margin: '0px',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    indicatorsContainer: (provided: CSSObjectWithLabel) => ({
      ...provided,
      height: '36px',
    }),
    clearIndicator: (provided: CSSObjectWithLabel) => ({
      ...provided,
      'cursor': 'pointer',
      'color': '#9ca3af',
      'padding': 6,
      ':hover': { color: '#111827' },
    }),
    menu: (provided: CSSObjectWithLabel) => ({
      ...provided,
      maxHeight: '400px', // 6 items * 32px each
      overflow: 'hidden',
    }),
    menuList: (provided: CSSObjectWithLabel) => ({
      ...provided,
      maxHeight: '200px',
      overflow: 'auto',
    }),
    option: (provided: CSSObjectWithLabel, state: { isSelected: boolean; isFocused: boolean }) => ({
      ...provided,
      'backgroundColor': state.isFocused ? '#f3f4f6' : 'transparent',
      'color': '#374151',
      'cursor': 'pointer',
      'padding': '10px 12px',
      'fontSize': '12px',
      '&:hover': {
        backgroundColor: '#f3f4f6',
      },
    }),
    multiValue: (provided: CSSObjectWithLabel) => ({
      ...provided,
      backgroundColor: '#00529C',
      color: 'white',
    }),
    multiValueLabel: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'white',
      fontSize: '12px',
    }),
    multiValueRemove: (provided: CSSObjectWithLabel) => ({
      ...provided,
      'color': 'white',
      '&:hover': {
        backgroundColor: '#00529C',
        color: 'white',
      },
    }),
    placeholder: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: '14px',
    }),
  };
  const ICON_CLOSE_SIZE = 8;
  const ICON_TICK_SIZE = 12;
  const CustomMultiValue = (props: MultiValueProps<SelectOption,
    true, GroupBase<SelectOption>>) => {
    const { data, index, getValue } = props;
    const selectedValues = getValue();
    const totalSelected = selectedValues.length;

    // Show only first item as tag, then "+X more" if there are more items
    if (index >= 1) {
      // If this is the first item after index 0 and there are more items, show "+X more"
      if (index === 1 && totalSelected > 1) {
        const remainingCount = totalSelected - 1;

        return (
          <div className="bg-primary text-white text-xs px-2 py-1 rounded-sm flex items-center gap-1">
            <span>
              +
              {remainingCount}
              {' '}
              more
            </span>
          </div>
        );
      }

      // Hide all items after the first one
      return null;
    }

    // Return the default multi-value component for the first item only
    return (
      <div className="bg-primary text-white text-xs px-2 py-1 rounded-sm flex items-center gap-1">
        <span>{data.label}</span>
        <div
          onClick={(e) => {
            e.stopPropagation();
            props.removeProps.onClick(e);
          }}
          className="ml-1 hover:bg-blue-900 rounded-full w-4 h-4 flex
          items-center justify-center cursor-pointer"
          style={{ cursor: 'pointer' }}
        >
          <RbIcon
            name="close"
            size={ICON_CLOSE_SIZE}
            color={IconColors.WHITE_COLOR_ICON}
          />
        </div>
      </div>
    );
  };

  const formatOptionLabel = (option: SelectOption, { context }: { context: string }) => {
    if (context === 'value') {
      return option.label;
    }

    return (
      <div className="flex items-center justify-between w-full">
        <span>{option.label}</span>
        {selectedValues.some(selected => selected.value === option.value) && (
          <RbIcon
            name="tick"
            size={ICON_TICK_SIZE}
            color={IconColors.PRIMARY_COLOR_ICON}
          />
        )}
      </div>
    );
  };

  const handleChange = (selected: MultiValue<SelectOption>) => {
    // Ensure we always pass an array, even if selected is null or undefined
    const selectedArray = selected || [];

    onSelectionChange([...selectedArray]);
  };

  const CustomClearIndicator = (
    props: ClearIndicatorProps<SelectOption, true, GroupBase<SelectOption>>,
  ) => {
    return (
      <components.ClearIndicator
        {...props}
      >
        <div
          className="flex items-center justify-center cursor-pointer"
          style={{ cursor: 'pointer' }}
        >
          <RbIcon
            name="close"
            size={12}
            color={IconColors.GRAY_COLOR_ICON}
          />
        </div>
      </components.ClearIndicator>
    );
  };

  const CustomMenuList = (props: MenuListProps<SelectOption, true, GroupBase<SelectOption>>) => (
    <>
      {showSelectAll && options.length > 0 && (
        <div
          role="option"
          aria-selected={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectionChange([...options]);
          }}
          className="px-3 py-2.5 text-xs font-medium text-primary cursor-pointer
            hover:bg-gray-100 border-b border-gray-100"
        >
          {selectAllLabel}
        </div>
      )}
      <components.MenuList {...props} />
    </>
  );

  return (
    <div className={className}>
      <Select
        isMulti
        options={options}
        value={selectedValues}
        onChange={handleChange}
        placeholder={placeholder}
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        isClearable={true}
        isSearchable={true}
        menuPlacement="auto"
        classNamePrefix="react-select"
        isDisabled={disabled}
        components={{
          MultiValue: CustomMultiValue,
          ClearIndicator: CustomClearIndicator,
          ...(showSelectAll ? { MenuList: CustomMenuList } : {}),
        }}
      />
    </div>
  );
}
