import { IconColors } from '@/components/icons/types/RbIcon.types';
import type { IconKey } from '@/components/icons/config/icons.registry';
import { AppConstants } from '@/common/AppConstants';
import { Roles } from '@/common/Roles';

export interface MenuSubItem {
  title: string;
  url: string;
  roles?: string[];
}

export interface MenuItem {
  title: string;
  url: string;
  icon: IconKey;
  iconWidth?: number;
  iconHeight?: number;
  iconFill?: string;
  roles?: string[];
  items?: MenuSubItem[];
}

export interface MenuData {
  navMain: MenuItem[];
}

const iconWidth = 16;
const iconHeight = 16;
const iconFill = IconColors.WHITE_COLOR_ICON;

export const menuData: MenuData = {
  navMain: [
    {
      title: 'menu.dashboard',
      url: AppConstants.Routes.Private.Dashboard,
      icon: 'home',
      iconWidth,
      iconHeight,
      iconFill,
    },
    {
      title: 'menu.catalog',
      url: AppConstants.Routes.Private.Products,
      icon: 'categories',
      iconWidth,
      iconHeight,
      iconFill,
      items: [
        {
          title: 'menu.products',
          url: AppConstants.Routes.Private.Products,
        },
        {
          title: 'menu.categories',
          url: AppConstants.Routes.Private.Categories,
        },
        {
          title: 'menu.cart',
          url: AppConstants.Routes.Private.Cart,
        },
      ],
    },
    {
      title: 'menu.orders',
      url: AppConstants.Routes.Private.Orders,
      icon: 'barChart',
      iconWidth,
      iconHeight,
      iconFill,
      items: [
        {
          title: 'menu.ordersList',
          url: AppConstants.Routes.Private.Orders,
        },
        {
          title: 'menu.checkout',
          url: AppConstants.Routes.Private.Checkout,
        },
      ],
    },
    {
      title: 'menu.admin',
      url: AppConstants.Routes.Private.Admin.Categories,
      icon: 'settings',
      iconWidth,
      iconHeight,
      iconFill,
      roles: [Roles.ADMIN],
      items: [
        {
          title: 'menu.adminCategories',
          url: AppConstants.Routes.Private.Admin.Categories,
        },
        {
          title: 'menu.adminProducts',
          url: AppConstants.Routes.Private.Admin.Products,
        },
        {
          title: 'menu.adminStock',
          url: AppConstants.Routes.Private.Admin.Stock,
        },
        {
          title: 'menu.adminSuppliers',
          url: AppConstants.Routes.Private.Admin.Suppliers,
        },
        {
          title: 'menu.adminPurchases',
          url: AppConstants.Routes.Private.Admin.Purchases,
        },
        {
          title: 'menu.adminSales',
          url: AppConstants.Routes.Private.Admin.Sales,
        },
        {
          title: 'menu.adminCustomers',
          url: AppConstants.Routes.Private.Admin.Customers,
        },
        {
          title: 'menu.adminUsers',
          url: AppConstants.Routes.Private.Admin.Users,
        },
      ],
    },
    {
      title: 'menu.account',
      url: AppConstants.Routes.Private.Profile,
      icon: 'user',
      iconWidth,
      iconHeight,
      iconFill,
      items: [
        {
          title: 'menu.profile',
          url: AppConstants.Routes.Private.Profile,
        },
      ],
    },
  ],
};
