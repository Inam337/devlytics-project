import { lazy } from 'react';

export const iconRegistry = {
  home: lazy(() =>
    import('@/components/icons/Home.icon').then(m => ({ default: m.HomeIcon })),
  ),
  user: lazy(() =>
    import('@/components/icons/User.icon').then(m => ({ default: m.UserIcon })),
  ),
  download: lazy(() =>
    import('@/components/icons/Download.icon').then(m => ({
      default: m.DownloadIcon,
    })),
  ),
  upload: lazy(() =>
    import('@/components/icons/Upload.icon').then(m => ({
      default: m.UploadIcon,
    })),
  ),
  edit: lazy(() =>
    import('@/components/icons/Edit.icon').then(m => ({ default: m.EditIcon })),
  ),
  trash: lazy(() =>
    import('@/components/icons/Trash.icon').then(m => ({ default: m.TrashIcon })),
  ),
  search: lazy(() =>
    import('@/components/icons/Search.icon').then(m => ({
      default: m.SearchIcon,
    })),
  ),
  calendar: lazy(() =>
    import('@/components/icons/Calender.icon').then(m => ({
      default: m.CalenderIcon,
    })),
  ),
  bell: lazy(() =>
    import('@/components/icons/Bell.icon').then(m => ({ default: m.BellIcon })),
  ),
  settings: lazy(() =>
    import('@/components/icons/Cog.icon').then(m => ({ default: m.CogIcon })),
  ),
  arrowChevronLeft: lazy(() =>
    import('@/components/icons/ArrowChevronLeft.icon').then(m => ({
      default: m.ArrowChevronLeftIcon,
    })),
  ),
  arrowChevronRight: lazy(() =>
    import('@/components/icons/ArrowChevronRight.icon').then(m => ({
      default: m.ArrowChevronRightIcon,
    })),
  ),
  arrowDown: lazy(() =>
    import('@/components/icons/ArrowDown.icon').then(m => ({
      default: m.ArrowDownIcon,
    })),
  ),
  attachment: lazy(() => import('@/components/icons/Attachment.icon')),
  avatar: lazy(() =>
    import('@/components/icons/Avatar.icon').then(m => ({
      default: m.AvatarIcon,
    })),
  ),
  barChart: lazy(() =>
    import('@/components/icons/BarChart.icon').then(m => ({
      default: m.BarChartIcon,
    })),
  ),
  categories: lazy(() =>
    import('@/components/icons/Categories.icon').then(m => ({
      default: m.ComplaintCategoriesIcon,
    })),
  ),
  checkbox: lazy(() =>
    import('@/components/icons/Checkbox.icon').then(m => ({
      default: m.CheckboxIcon,
    })),
  ),
  checkMark: lazy(() =>
    import('@/components/icons/CheckMark.icon').then(m => ({
      default: m.CheckMarkIcon,
    })),
  ),
  circlePlus: lazy(() =>
    import('@/components/icons/CirclePlus.icon').then(m => ({
      default: m.CirclePlusIcon,
    })),
  ),
  clock: lazy(() =>
    import('@/components/icons/Clock.icon').then(m => ({ default: m.ClockIcon })),
  ),
  close: lazy(() =>
    import('@/components/icons/Close.icon').then(m => ({ default: m.CloseIcon })),
  ),
  dashboard: lazy(() =>
    import('@/components/icons/Dashboard.icon').then(m => ({
      default: m.DashboardIcon,
    })),
  ),
  data: lazy(() =>
    import('@/components/icons/Data.icon').then(m => ({ default: m.DataIcon })),
  ),
  date: lazy(() =>
    import('@/components/icons/Date.icon').then(m => ({ default: m.DateIcon })),
  ),
  datePicker: lazy(() =>
    import('@/components/icons/DatePicker.icon').then(m => ({
      default: m.DatePickerIcon,
    })),
  ),
  defaultPlaceholderFile: lazy(() =>
    import('@/components/icons/DefaultPlaceholderFile.icon').then(m => ({
      default: m.DefaultPlaceHolderFileIcon,
    })),
  ),
  file: lazy(() =>
    import('@/components/icons/File.icon').then(m => ({ default: m.FileIcon })),
  ),
  filePlus: lazy(() =>
    import('@/components/icons/FilePlus.icon').then(m => ({
      default: m.FilePlusIcon,
    })),
  ),
  fileTick: lazy(() =>
    import('@/components/icons/FileTick.icon').then(m => ({
      default: m.FileTickIcon,
    })),
  ),
  filters: lazy(() =>
    import('@/components/icons/Filters.icon').then(m => ({
      default: m.FiltersIcon,
    })),
  ),
  graph: lazy(() =>
    import('@/components/icons/Graph.icon').then(m => ({ default: m.GraphIcon })),
  ),
  hidePassword: lazy(() =>
    import('@/components/icons/HidePassword.icon').then(m => ({
      default: m.HidePasswordIcon,
    })),
  ),
  key: lazy(() =>
    import('@/components/icons/Key.icon').then(m => ({ default: m.KeyIcon })),
  ),
  eyeHide: lazy(() =>
    import('@/components/icons/ShowPassword.icon').then(m => ({
      default: m.ShowPasswordIcon,
    })),
  ),
  eyeShow: lazy(() =>
    import('@/components/icons/ShowPassword.icon').then(m => ({
      default: m.ShowPasswordIcon,
    })),
  ),
  language: lazy(() =>
    import('@/components/icons/Language.icon').then(m => ({
      default: m.LanguageIcon,
    })),
  ),
  loginUser: lazy(() =>
    import('@/components/icons/LoginUser.icon').then(m => ({
      default: m.LoginUserIcon,
    })),
  ),
  logout: lazy(() =>
    import('@/components/icons/Logout.icon').then(m => ({
      default: m.LogoutIcon,
    })),
  ),
  logs: lazy(() =>
    import('@/components/icons/Logs.icon').then(m => ({ default: m.LogsIcon })),
  ),
  markClosed: lazy(() =>
    import('@/components/icons/MarkClosed.icon').then(m => ({
      default: m.MarkClosedIcon,
    })),
  ),
  menu: lazy(() =>
    import('@/components/icons/Menu.icon').then(m => ({ default: m.MenuIcon })),
  ),
  multiFile: lazy(() =>
    import('@/components/icons/MultiFile.icon').then(m => ({
      default: m.MultiFileIcon,
    })),
  ),
  notFound: lazy(() =>
    import('@/components/icons/NotFound.icon').then(m => ({
      default: m.NotFoundIcon,
    })),
  ),
  notification: lazy(() =>
    import('@/components/icons/Notification.icon').then(m => ({
      default: m.NotificationIcon,
    })),
  ),
  others: lazy(() =>
    import('@/components/icons/Others.icon').then(m => ({
      default: m.OthersIcon,
    })),
  ),
  pencil: lazy(() =>
    import('@/components/icons/Pencil.icon').then(m => ({
      default: m.PencilIcon,
    })),
  ),
  personalCard: lazy(() =>
    import('@/components/icons/PersonalCard.icon').then(m => ({
      default: m.PersonalCardIcon,
    })),
  ),
  refresh: lazy(() =>
    import('@/components/icons/Refresh.icon').then(m => ({
      default: m.RefreshIcon,
    })),
  ),
  registerUser: lazy(() =>
    import('@/components/icons/RegisterUser.icon').then(m => ({
      default: m.RegisterUserIcon,
    })),
  ),
  reminder: lazy(() =>
    import('@/components/icons/Reminder.icon').then(m => ({
      default: m.ReminderIcon,
    })),
  ),
  report: lazy(() =>
    import('@/components/icons/Report.icon').then(m => ({
      default: m.ReportIcon,
    })),
  ),
  resolution: lazy(() =>
    import('@/components/icons/Resolution.icon').then(m => ({
      default: m.ResolutionIcon,
    })),
  ),
  rules: lazy(() =>
    import('@/components/icons/Rules.icon').then(m => ({
      default: m.RulesIcon,
    })),
  ),
  send: lazy(() =>
    import('@/components/icons/Send.icon').then(m => ({ default: m.SendIcon })),
  ),
  showPassword: lazy(() =>
    import('@/components/icons/ShowPassword.icon').then(m => ({
      default: m.ShowPasswordIcon,
    })),
  ),
  singleFile: lazy(() =>
    import('@/components/icons/SingleFile.icon').then(m => ({
      default: m.SingleFileIcon,
    })),
  ),
  star: lazy(() =>
    import('@/components/icons/Star.icon').then(m => ({ default: m.StarIcon })),
  ),
  suspend: lazy(() =>
    import('@/components/icons/Suspend.icon').then(m => ({
      default: m.SuspendIcon,
    })),
  ),
  tableNotification: lazy(() =>
    import('@/components/icons/TableNotification.icon').then(m => ({
      default: m.TableNotificationIcon,
    })),
  ),
  tick: lazy(() =>
    import('@/components/icons/Tick.icon').then(m => ({ default: m.TickIcon })),
  ),
  userActive: lazy(() =>
    import('@/components/icons/UserActive.icon').then(m => ({
      default: m.UserActiveIcon,
    })),
  ),
  userBlock: lazy(() =>
    import('@/components/icons/UserBlock.icon').then(m => ({
      default: m.UserBlockIcon,
    })),
  ),
  users: lazy(() =>
    import('@/components/icons/Users.icon').then(m => ({ default: m.UsersIcon })),
  ),
  view: lazy(() =>
    import('@/components/icons/View.icon').then(m => ({ default: m.ViewIcon })),
  ),
  warning: lazy(() =>
    import('@/components/icons/Warning.icon').then(m => ({
      default: m.WarningIcon,
    })),
  ),
  wordDocument: lazy(() =>
    import('@/components/icons/WordDocument.icon').then(m => ({
      default: m.WordDocumentIcon,
    })),
  ),
  world: lazy(() =>
    import('@/components/icons/World.icon').then(m => ({ default: m.WorldIcon })),
  ),
  calenderMenu: lazy(() =>
    import('@/components/icons/CalenderMenu.icon').then(m => ({
      default: m.CalenderMenu,
    })),
  ),
  dollar: lazy(() =>
    import('@/components/icons/Dollar.icon').then(m => ({
      default: m.DollarIcon,
    })),
  ),
  info: lazy(() =>
    import('@/components/icons/Info.icon').then(m => ({ default: m.InfoIcon })),
  ),
  documentVerified: lazy(() =>
    import('@/components/icons/DocumentVerified.icon').then(m => ({
      default: m.DocumentVerifiedIcon,
    })),
  ),
  checkTick: lazy(() =>
    import('@/components/icons/CheckTick.icon').then(m => ({
      default: m.CheckTickIcon,
    })),
  ),
  dollarText: lazy(() =>
    import('@/components/icons/DollarText.icon').then(m => ({
      default: m.DollarTextIcon,
    })),
  ),
  global: lazy(() =>
    import('@/components/icons/Global.icon').then(m => ({
      default: m.GlobalIcon,
    })),
  ),
  building: lazy(() =>
    import('@/components/icons/Building.icon').then(m => ({
      default: m.BuildingIcon,
    })),
  ),
  moneyLocation: lazy(() =>
    import('@/components/icons/MoneyLocation.icon').then(m => ({
      default: m.MoneyLocationIcon,
    })),
  ),
  checkList: lazy(() =>
    import('@/components/icons/CheckList.icon').then(m => ({
      default: m.CheckListIcon,
    })),
  ),
  fileBlue: lazy(() =>
    import('@/components/icons/FileBlue.icon').then(m => ({
      default: m.FileBlueIcon,
    })),
  ),
  sidebar: lazy(() =>
    import('@/components/icons/Sidebar.icon').then(m => ({
      default: m.SideBarIcon,
    })),
  ),
  barCode: lazy(() =>
    import('@/components/icons/BarCode.icon').then(m => ({
      default: m.BarCodeIcon,
    })),
  ),
  circularCheckMark: lazy(() =>
    import('@/components/icons/CircularCheckMark.icon').then(m => ({
      default: m.CircularCheckMarkIcon,
    })),
  ),
  leftHand: lazy(() =>
    import('@/components/icons/LeftHand.icon').then(m => ({
      default: m.LeftHandIcon,
    })),
  ),
  openBox: lazy(() =>
    import('@/components/icons/OpenBox.icon').then(m => ({
      default: m.OpenBoxIcon,
    })),
  ),
  printer: lazy(() =>
    import('@/components/icons/Printer.icon').then(m => ({
      default: m.PrinterIcon,
    })),
  ),
  rightHand: lazy(() =>
    import('@/components/icons/RightHand.icon').then(m => ({
      default: m.RightHandIcon,
    })),
  ),
  simpleUser: lazy(() =>
    import('@/components/icons/SimpleUser.icon').then(m => ({
      default: m.SimpleUserIcon,
    })),
  ),
  squareBox: lazy(() =>
    import('@/components/icons/SquareBox.icon').then(m => ({
      default: m.SquareBoxIcon,
    })),
  ),
  trashCan: lazy(() =>
    import('@/components/icons/TrashCan.icon').then(m => ({
      default: m.TrashCanIcon,
    })),
  ),
  valueAdded: lazy(() =>
    import('@/components/icons/ValueAdded.icon').then(m => ({
      default: m.ValueAddedIcon,
    })),
  ),
  progressArrow: lazy(() =>
    import('@/components/icons/ProgressArrow.icon').then(m => ({
      default: m.ProgressArrowIcon,
    })),
  ),
  documentChecked: lazy(() =>
    import('@/components/icons/DocumentChecked.icon').then(m => ({
      default: m.DocumentCheckedIcon,
    })),
  ),
  bookmark: lazy(() =>
    import('@/components/icons/BookMark.icon').then(m => ({
      default: m.BookMarkIcon,
    })),
  ),
  fingerPrint: lazy(() =>
    import('@/components/icons/FingerPrint.icon').then(m => ({
      default: m.FingerPrintIcon,
    })),
  ),
  handDollar: lazy(() =>
    import('@/components/icons/HandDollar.icon').then(m => ({
      default: m.HandDollarIcon,
    })),
  ),
  bulletMenu: lazy(() =>
    import('@/components/icons/BulletMenu.icon').then(m => ({
      default: m.BulletMenuIcon,
    })),
  ),
  plus: lazy(() =>
    import('@/components/icons/Plus.icon').then(m => ({
      default: m.PlusIcon,
    })),
  ),
  closedApplication: lazy(() =>
    import('@/components/icons/ClosedApplications.icon').then(m => ({
      default: m.CloseApplicationsIcon,
    })),
  ),
  applicationInProgress: lazy(() =>
    import('@/components/icons/InProgressApplication.icon').then(m => ({
      default: m.InProgressApplicationIcon,
    })),
  ),
  controlsPanel: lazy(() =>
    import('@/components/icons/ControlsPanel.icon').then(m => ({
      default: m.ControlsPanelIcon,
    })),
  ),
  documentVerifications: lazy(() =>
    import('@/components/icons/DocumentVerifications.icon').then(m => ({
      default: m.DocumentVerificationsIcon,
    })),
  ),
  inProgressApplication: lazy(() =>
    import('@/components/icons/InProgressApplication.icon').then(m => ({
      default: m.InProgressApplicationIcon,
    })),
  ),
  applicationsRegistered: lazy(() =>
    import('@/components/icons/ApplicationsRegistered.icon').then(m => ({
      default: m.ApplicationsRegisteredIcon,
    })),
  ),
  refunds: lazy(() =>
    import('@/components/icons/Refunds.icon').then(m => ({
      default: m.RefundsIcon,
    })),
  ),
} as const;

export type IconKey = keyof typeof iconRegistry;
