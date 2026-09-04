import type { FC, SVGAttributes } from 'react';
import {
  ArrowRight24Regular,
  Box24Regular,
  Cart24Regular,
  ChevronDown24Regular,
  ClipboardTaskListLtr24Regular,
  Delete24Regular,
  Dismiss24Regular,
  Edit24Regular,
  Filter24Regular,
  Key24Regular,
  Navigation24Regular,
  Options24Regular,
  PanelLeftContract24Regular,
  PanelLeftExpand24Regular,
  Search24Regular,
  Settings24Regular,
  SignOut24Regular,
  StoreMicrosoft24Regular,
} from '@fluentui/react-icons';

import { cn } from '@/libs/utils';

type FluentIconProps = SVGAttributes<SVGElement> & {
  className?: string;
};

type FluentIconComponent = FC<FluentIconProps>;

function createIcon(
  Icon: FluentIconComponent,
  defaultClass = 'size-4',
): FluentIconComponent {
  return function WrappedIcon({ className, ...props }: FluentIconProps) {
    return (
      <Icon
        className={cn(defaultClass, className)}
        {...props}
      />
    );
  };
}

export const Search = createIcon(Search24Regular);
export const SearchIcon = Search;
export const Filter = createIcon(Filter24Regular);
export const FilterIcon = Filter;
export const Edit = createIcon(Edit24Regular);
export const Delete = createIcon(Delete24Regular);
export const Pencil = Edit;
export const Trash2 = Delete;
export const SlidersHorizontal = createIcon(Options24Regular);
export const ChevronDown = createIcon(ChevronDown24Regular);
export const Menu = createIcon(Navigation24Regular);
export const ShoppingCart = createIcon(Cart24Regular);
export const KeyRound = createIcon(Key24Regular);
export const LogOut = createIcon(SignOut24Regular);
export const PanelLeftClose = createIcon(PanelLeftContract24Regular);
export const PanelLeftOpen = createIcon(PanelLeftExpand24Regular);
export const X = createIcon(Dismiss24Regular);
export const ArrowRight = createIcon(ArrowRight24Regular);
export const Package = createIcon(Box24Regular);
export const ClipboardList = createIcon(ClipboardTaskListLtr24Regular);
export const Settings = createIcon(Settings24Regular);
export const Warehouse = createIcon(StoreMicrosoft24Regular);
