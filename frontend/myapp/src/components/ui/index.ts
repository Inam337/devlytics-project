import { lazy } from 'react';

import { lazyWithSuspense } from '@/components/ui/lazy-with-suspense';

// Lazy load UI components on demand - only load when route renders them
export const Button = lazy(
  () => import('@/components/ui/Button').then(module => ({
    default: module.Button,
  })),
);
export const LoadingButton = lazy(
  () => import('@/components/ui/LoadingButton').then(module => ({
    default: module.LoadingButton,
  })),
);
export const Input = lazy(
  () => import('@/components/ui/Input').then(module => ({
    default: module.Input,
  })),
);
export const Label = lazy(
  () => import('@/components/ui/Label').then(module => ({
    default: module.Label,
  })),
);
export const Card = lazy(() => import('@/components/ui/Card'));
export const Dialog = lazy(
  () => import('./Dialog').then(module => ({
    default: module.Dialog,
  })),
);
export const DialogContent = lazy(
  () => import('./Dialog').then(module => ({
    default: module.DialogContent,
  })),
);
export const DialogHeader = lazy(
  () => import('./Dialog').then(module => ({
    default: module.DialogHeader,
  })),
);
export const DialogTitle = lazy(
  () => import('./Dialog').then(module => ({
    default: module.DialogTitle,
  })),
);
export const DialogTrigger = lazy(
  () => import('./Dialog').then(module => ({
    default: module.DialogTrigger,
  })),
);
export const Select = lazy(
  () => import('./Select').then(module => ({
    default: module.Select,
  })),
);
export const SelectContent = lazy(
  () => import('./Select').then(module => ({
    default: module.SelectContent,
  })),
);
export const SelectItem = lazy(
  () => import('./Select').then(module => ({
    default: module.SelectItem,
  })),
);
export const SelectTrigger = lazy(
  () => import('./Select').then(module => ({
    default: module.SelectTrigger,
  })),
);
export const SelectValue = lazy(
  () => import('./Select').then(module => ({
    default: module.SelectValue,
  })),
);
export const Textarea = lazy(
  () => import('@/components/ui/Textarea').then(module => ({
    default: module.Textarea,
  })),
);
export const Checkbox = lazy(
  () => import('@/components/ui/Checkbox').then(module => ({
    default: module.Checkbox,
  })),
);
export const CheckboxGroup = lazy(
  () => import('@/components/ui/CheckboxGroup').then(module => ({
    default: module.CheckboxGroup,
  })),
);
export const Switch = lazy(
  () => import('@/components/ui/Switch').then(module => ({
    default: module.Switch,
  })),
);
export const Badge = lazy(
  () => import('@/components/ui/Badge').then(module => ({
    default: module.Badge,
  })),
);
export const Avatar = lazy(
  () => import('@/components/ui/Avatar').then(module => ({
    default: module.Avatar,
  })),
);
export const AvatarFallback = lazy(
  () => import('@/components/ui/Avatar').then(module => ({
    default: module.AvatarFallback,
  })),
);
export const AvatarImage = lazy(
  () => import('@/components/ui/Avatar').then(module => ({
    default: module.AvatarImage,
  })),
);
export const Image = lazy(
  () => import('@/components/ui/Image').then(module => ({
    default: module.Image,
  })),
);
export const Skeleton = lazy(
  () => import('@/components/ui/Skeleton').then(module => ({
    default: module.Skeleton,
  })),
);
export const Table = lazy(
  () => import('@/components/ui/Table').then(module => ({
    default: module.Table,
  })),
);
export const TableBody = lazy(
  () => import('@/components/ui/Table').then(module => ({
    default: module.TableBody,
  })),
);
export const TableCell = lazy(
  () => import('@/components/ui/Table').then(module => ({
    default: module.TableCell,
  })),
);
export const TableHead = lazy(
  () => import('@/components/ui/Table').then(module => ({
    default: module.TableHead,
  })),
);
export const TableHeader = lazy(
  () => import('@/components/ui/Table').then(module => ({
    default: module.TableHeader,
  })),
);
export const TableRow = lazy(
  () => import('@/components/ui/Table').then(module => ({
    default: module.TableRow,
  })),
);
export const Tabs = lazy(
  () => import('@/components/ui/Tabs').then(module => ({
    default: module.Tabs,
  })),
);
export const TabsList = lazy(
  () => import('@/components/ui/Tabs').then(module => ({
    default: module.TabsList,
  })),
);
export const TabsTrigger = lazy(
  () => import('@/components/ui/Tabs').then(module => ({
    default: module.TabsTrigger,
  })),
);
export const TabsContent = lazy(
  () => import('@/components/ui/Tabs').then(module => ({
    default: module.TabsContent,
  })),
);
export const Popover = lazy(
  () => import('@/components/ui/Popover').then(module => ({
    default: module.Popover,
  })),
);
export const PopoverContent = lazy(
  () => import('@/components/ui/Popover').then(module => ({
    default: module.PopoverContent,
  })),
);
export const PopoverTrigger = lazy(
  () => import('@/components/ui/Popover').then(module => ({
    default: module.PopoverTrigger,
  })),
);
export const Calendar = lazy(
  () => import('./Calendar').then(module => ({
    default: module.Calendar,
  })),
);
export const DropdownMenu = lazy(
  () => import('@/components/ui/DropdownMenu').then(module => ({
    default: module.DropdownMenu,
  })),
);
export const DropdownMenuContent = lazy(
  () => import('@/components/ui/DropdownMenu').then(module => ({
    default: module.DropdownMenuContent,
  })),
);
export const DropdownMenuItem = lazy(
  () => import('@/components/ui/DropdownMenu').then(module => ({
    default: module.DropdownMenuItem,
  })),
);
export const DropdownMenuTrigger = lazy(
  () => import('@/components/ui/DropdownMenu').then(module => ({
    default: module.DropdownMenuTrigger,
  })),
);
export const Tooltip = lazy(
  () => import('@/components/ui/Tooltip').then(module => ({
    default: module.Tooltip,
  })),
);
export const TooltipContent = lazy(
  () => import('@/components/ui/Tooltip').then(module => ({
    default: module.TooltipContent,
  })),
);
export const TooltipProvider = lazy(
  () => import('@/components/ui/Tooltip').then(module => ({
    default: module.TooltipProvider,
  })),
);
export const TooltipTrigger = lazy(
  () => import('@/components/ui/Tooltip').then(module => ({
    default: module.TooltipTrigger,
  })),
);
export const Separator = lazy(
  () => import('@/components/ui/Separator').then(module => ({
    default: module.Separator,
  })),
);
export const FormInput = lazy(
  () => import('./FormInput').then(module => ({
    default: module.FormInput,
  })),
);
export const PasswordInput = lazy(() => import('@/components/ui/PasswordInput'));
export const FieldError = lazy(() => import('@/components/ui/FieldError'));
export const ConfirmationDialog = lazy(
  () => import('@/components/ui/ConfirmationDialog').then(module => ({
    default: module.ConfirmationDialog,
  })),
);
export const MyDateRangePicker = lazy(
  () => import('@/components/ui/DateRange').then(module => ({
    default: module.MyDateRangePicker,
  })),
);
export const Drawer = lazy(
  () => import('@/components/ui/Drawer').then(module => ({
    default: module.Drawer,
  })),
);
export const DrawerContent = lazy(
  () => import('@/components/ui/Drawer').then(module => ({
    default: module.DrawerContent,
  })),
);
export const DrawerHeader = lazy(
  () => import('@/components/ui/Drawer').then(module => ({
    default: module.DrawerHeader,
  })),
);
export const DrawerTitle = lazy(
  () => import('@/components/ui/Drawer').then(module => ({
    default: module.DrawerTitle,
  })),
);
export const DrawerFooter = lazy(
  () => import('@/components/ui/Drawer').then(module => ({
    default: module.DrawerFooter,
  })),
);
export const DrawerClose = lazy(
  () => import('@/components/ui/Drawer').then(module => ({
    default: module.DrawerClose,
  })),
);
export const ThemeToggle = lazy(
  () => import('@/components/ui/ThemeToggle').then(module => ({
    default: module.ThemeToggle,
  })),
);

const PageShellLazy = lazy(() => import('@/components/ui/PageShell'));
const PageToolbarLazy = lazy(() => import('@/components/ui/PageToolbar'));
const FilterPanelLazy = lazy(() => import('@/components/ui/FilterPanel'));
const ListCardLazy = lazy(() => import('@/components/ui/ListCard'));
const StatusPillLazy = lazy(() => import('@/components/ui/StatusPill'));
const FormDrawerLazy = lazy(() => import('@/components/ui/FormDrawer'));

export const PageShell = lazyWithSuspense(PageShellLazy);
export const PageToolbar = lazyWithSuspense(PageToolbarLazy);
export const FilterPanel = lazyWithSuspense(FilterPanelLazy);
export const ListCard = lazyWithSuspense(ListCardLazy);
export const StatusPill = lazyWithSuspense(StatusPillLazy);
export const FormDrawer = lazyWithSuspense(FormDrawerLazy);
