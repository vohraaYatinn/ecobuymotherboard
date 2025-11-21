# EcoBuy E-commerce Platform - Code Index

## Project Overview
EcoBuy is a Next.js 16 e-commerce platform for selling television PCB boards and motherboards. The platform includes:
- Customer-facing website
- Customer dashboard
- Admin dashboard for managing the platform

## Technology Stack
- **Framework**: Next.js 16.0.3 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 4.1.9
- **UI Components**: Radix UI + shadcn/ui
- **Form Handling**: React Hook Form + Zod
- **State Management**: React hooks
- **Fonts**: Inter, JetBrains Mono
- **Analytics**: Vercel Analytics

---

## Directory Structure

```
ecommerce/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   ├── about/               # About page
│   ├── login/               # Login page
│   ├── cart/                # Shopping cart
│   ├── wishlist/            # Wishlist
│   ├── products/            # Product listing & detail
│   ├── dashboard/           # Customer dashboard
│   ├── admin/               # Admin dashboard (protected)
│   ├── contact/             # Contact page
│   ├── terms/               # Terms & conditions
│   ├── store-location/      # Store location
│   └── become-seller/       # Vendor registration
├── components/              # React components
│   ├── admin/              # Admin-specific components
│   ├── ui/                 # shadcn/ui components
│   └── [shared components] # Shared customer components
├── lib/                     # Utilities
├── hooks/                   # Custom React hooks
├── public/                  # Static assets
└── styles/                  # Additional styles
```

---

## Routes & Pages

### Customer-Facing Pages

#### `/` - Home Page
- **File**: `app/page.tsx`
- **Components**: Header, Footer, ProductsSidebar, ProductsGrid
- **Description**: Main landing page with product showcase

#### `/about` - About Us
- **File**: `app/about/page.tsx`
- **Components**: Header, Footer
- **Description**: Company information and values

#### `/login` - Login/Authentication
- **File**: `app/login/page.tsx`
- **Components**: Header, Footer, LoginForm
- **Description**: User authentication page

#### `/products` - Product Listing
- **File**: `app/products/page.tsx`
- **Components**: Header, Footer, ProductsSidebar, ProductsGrid
- **Description**: All products listing with filters

#### `/products/[id]` - Product Detail
- **File**: `app/products/[id]/page.tsx`
- **Components**: Header, Footer, ProductDetail
- **Description**: Individual product details page

#### `/cart` - Shopping Cart
- **File**: `app/cart/page.tsx`
- **Components**: Header, Footer, CartContent
- **Description**: Shopping cart management

#### `/wishlist` - Wishlist
- **File**: `app/wishlist/page.tsx`
- **Components**: Header, Footer, WishlistContent
- **Description**: User's saved products

#### `/contact` - Contact Us
- **File**: `app/contact/page.tsx`
- **Components**: Header, Footer, ContactForm
- **Description**: Contact information and form

#### `/terms` - Terms & Conditions
- **File**: `app/terms/page.tsx`
- **Components**: Header, Footer
- **Description**: Legal terms and conditions

#### `/store-location` - Store Location
- **File**: `app/store-location/page.tsx`
- **Components**: Header, Footer
- **Description**: Physical store information

#### `/become-seller` - Vendor Registration
- **File**: `app/become-seller/page.tsx`
- **Components**: Header, Footer, VendorRegistrationForm
- **Description**: Vendor/seller registration page

---

### Customer Dashboard Routes

#### `/dashboard` - Customer Dashboard
- **File**: `app/dashboard/page.tsx`
- **Components**: Header, Footer, DashboardContent
- **Description**: Customer account overview

#### `/dashboard/orders` - Orders List
- **File**: `app/dashboard/orders/page.tsx`
- **Components**: Header, Footer, OrdersContent
- **Description**: Customer's order history

#### `/dashboard/orders/[id]` - Order Detail
- **File**: `app/dashboard/orders/[id]/page.tsx`
- **Components**: Header, Footer, OrderDetailContent
- **Description**: Individual order details

#### `/dashboard/support` - Customer Support
- **File**: `app/dashboard/support/page.tsx`
- **Components**: Header, Footer, SupportContent
- **Description**: Customer support page

---

### Admin Dashboard Routes

**Base Layout**: `app/admin/layout.tsx` (includes AdminSidebar)

#### `/admin` - Admin Dashboard
- **File**: `app/admin/page.tsx`
- **Component**: AdminDashboard
- **Description**: Admin overview with statistics

#### `/admin/orders` - Admin Orders List
- **File**: `app/admin/orders/page.tsx`
- **Component**: AdminOrdersList
- **Description**: Manage all customer orders

#### `/admin/orders/[id]` - Admin Order Detail
- **File**: `app/admin/orders/[id]/page.tsx`
- **Component**: AdminOrderDetail
- **Description**: View/edit individual order

#### `/admin/customers` - Customers List
- **File**: `app/admin/customers/page.tsx`
- **Component**: AdminCustomersList
- **Description**: Manage all customers

#### `/admin/customers/[id]` - Customer Detail
- **File**: `app/admin/customers/[id]/page.tsx`
- **Component**: AdminCustomerDetail
- **Description**: View customer details

#### `/admin/products` - Products List
- **File**: `app/admin/products/page.tsx`
- **Component**: AdminProductsList
- **Description**: Manage all products

#### `/admin/products/add` - Add Product
- **File**: `app/admin/products/add/page.tsx`
- **Component**: AdminAddProduct
- **Description**: Create new product

#### `/admin/products/[id]` - Product View
- **File**: `app/admin/products/[id]/page.tsx`
- **Component**: AdminProductView
- **Description**: View product details

#### `/admin/products/[id]/edit` - Edit Product
- **File**: `app/admin/products/[id]/edit/page.tsx`
- **Component**: AdminProductEdit
- **Description**: Edit existing product

#### `/admin/vendors` - Vendors List
- **File**: `app/admin/vendors/page.tsx`
- **Component**: AdminVendorsList
- **Description**: Manage all vendors/sellers

#### `/admin/vendors/add` - Add Vendor
- **File**: `app/admin/vendors/add/page.tsx`
- **Component**: AdminAddVendor
- **Description**: Add new vendor

#### `/admin/vendors/[id]` - Vendor Detail
- **File**: `app/admin/vendors/[id]/page.tsx`
- **Component**: AdminVendorDetail
- **Description**: View vendor details

#### `/admin/settings` - Admin Settings
- **File**: `app/admin/settings/page.tsx`
- **Component**: AdminSettings
- **Description**: Platform configuration

---

## Components

### Shared Components

#### Layout Components
- **`header.tsx`**: Main navigation header with search, cart, wishlist
- **`footer.tsx`**: Site footer with links and contact info
- **`theme-provider.tsx`**: Theme management (light/dark mode)

#### Product Components
- **`products-grid.tsx`**: Grid display of products
- **`products-sidebar.tsx`**: Product filters and categories
- **`product-detail.tsx`**: Product detail view
- **`category-showcase.tsx`**: Category display

#### Commerce Components
- **`cart-content.tsx`**: Shopping cart functionality
- **`wishlist-content.tsx`**: Wishlist management
- **`products.tsx`**: Product listing component

#### Dashboard Components
- **`dashboard-content.tsx`**: Customer dashboard overview
- **`orders-content.tsx`**: Customer orders list
- **`order-detail-content.tsx`**: Order detail view
- **`support-content.tsx`**: Customer support interface

#### Form Components
- **`login-form.tsx`**: Login/authentication form
- **`contact-form.tsx`**: Contact form
- **`vendor-registration-form.tsx`**: Vendor signup form

#### UI Components
- **`hero.tsx`**: Hero banner section
- **`features.tsx`**: Features showcase
- **`stats.tsx`**: Statistics display

---

### Admin Components (`components/admin/`)

- **`admin-sidebar.tsx`**: Admin navigation sidebar
- **`admin-dashboard.tsx`**: Admin dashboard with stats
- **`admin-orders-list.tsx`**: Orders management table
- **`admin-order-detail.tsx`**: Order detail view/edit
- **`admin-customers-list.tsx`**: Customers management table
- **`admin-customer-detail.tsx`**: Customer detail view
- **`admin-products-list.tsx`**: Products management table
- **`admin-product-view.tsx`**: Product view (admin)
- **`admin-add-product.tsx`**: Add product form
- **`admin-product-edit.tsx`**: Edit product form
- **`admin-vendors-list.tsx`**: Vendors management table
- **`admin-vendor-detail.tsx`**: Vendor detail view
- **`admin-add-vendor.tsx`**: Add vendor form
- **`admin-settings.tsx`**: Platform settings

---

### UI Components (`components/ui/`)

Complete shadcn/ui component library with 57+ components:
- Form components: `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `form.tsx`, `field.tsx`, `label.tsx`
- Layout components: `card.tsx`, `separator.tsx`, `sheet.tsx`, `drawer.tsx`, `dialog.tsx`, `sidebar.tsx`, `tabs.tsx`, `accordion.tsx`, `collapsible.tsx`
- Navigation: `navigation-menu.tsx`, `menubar.tsx`, `breadcrumb.tsx`, `pagination.tsx`
- Overlay: `alert-dialog.tsx`, `popover.tsx`, `tooltip.tsx`, `hover-card.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`
- Display: `table.tsx`, `badge.tsx`, `avatar.tsx`, `skeleton.tsx`, `empty.tsx`, `carousel.tsx`, `chart.tsx`, `progress.tsx`
- Feedback: `alert.tsx`, `toast.tsx`, `toaster.tsx`, `sonner.tsx`, `spinner.tsx`
- Input: `input-otp.tsx`, `slider.tsx`, `calendar.tsx`, `toggle.tsx`, `toggle-group.tsx`
- Utility: `command.tsx`, `scroll-area.tsx`, `resizable.tsx`, `aspect-ratio.tsx`, `kbd.tsx`

---

## Utilities & Hooks

### Utilities (`lib/utils.ts`)
- **`cn()`**: Class name merger utility (clsx + tailwind-merge)

### Hooks (`hooks/`)
- **`use-toast.ts`**: Toast notification hook
- **`use-mobile.ts`**: Mobile device detection hook

---

## Configuration Files

### `package.json`
- Next.js 16.0.3
- React 19.2.0
- Tailwind CSS 4.1.9
- Radix UI components
- React Hook Form + Zod
- Lucide React icons
- Vercel Analytics

### `tsconfig.json`
- TypeScript 5.x
- Strict mode enabled
- Path aliases: `@/*` → `./*`

### `next.config.mjs`
- TypeScript errors ignored for build
- Images unoptimized

### `components.json`
- shadcn/ui configuration
- Style: "new-york"
- Tailwind CSS variables
- Icon library: lucide

### `postcss.config.mjs`
- Tailwind CSS PostCSS configuration

---

## Styling

### `app/globals.css`
- Tailwind CSS base styles
- CSS variables for theme (light/dark)
- Color system (OKLCH color space)
- Custom properties for:
  - Background, foreground, card
  - Primary, secondary, accent colors
  - Destructive, muted colors
  - Border, input, ring colors
  - Chart colors (1-5)
  - Sidebar colors

### Theme System
- Light and dark mode support
- CSS variables-based theming
- OKLCH color space for better color consistency

---

## Public Assets (`public/`)

### Images
- `4k-hdr-tv-main-board-pcb.jpg`
- `lcd-television-main-board-pcb-circuit-board.jpg`
- `led-tv-power-supply-board-pcb.jpg`
- `modern-television-circuit-board-pcb-motherboard-cl.jpg`
- `oled-panel-driver-board-electronics.jpg`
- `smart-tv-motherboard-circuit-board.jpg`
- `t-con-board-television-control-board.jpg`

### Icons & Logos
- `apple-icon.png`
- `icon-dark-32x32.png`
- `icon-light-32x32.png`
- `icon.svg`
- `placeholder-logo.png`
- `placeholder-logo.svg`
- `placeholder-user.jpg`
- `placeholder.jpg`
- `placeholder.svg`

---

## Key Features

### Customer Features
- Product browsing and search
- Shopping cart
- Wishlist
- Order management
- Customer dashboard
- Support system
- Account management

### Admin Features
- Dashboard with statistics
- Order management
- Customer management
- Product CRUD operations
- Vendor/seller management
- Platform settings
- Analytics and reporting

### Platform Features
- Responsive design (mobile-first)
- Dark/light theme support
- Form validation (Zod)
- Toast notifications
- Loading states
- Error handling
- SEO optimization (metadata)

---

## Contact Information

**EcoBuy**
- Phone: +91 7396 777 800 / 600 / 300
- Email: customercare@ecobuy.com
- Address: 123 Electronics Plaza, Tech District, Mumbai 400001, Maharashtra, India
- Business Hours: Monday - Saturday: 9:00 AM - 6:00 PM

---

## Development Notes

### Getting Started
```bash
cd ecommerce
pnpm install
pnpm dev
```

### Build
```bash
pnpm build
pnpm start
```

### Tech Stack Details
- **Routing**: Next.js App Router (file-based routing)
- **Styling**: Tailwind CSS with CSS variables
- **UI**: shadcn/ui components (Radix UI primitives)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Package Manager**: pnpm

---

## File Count Summary

- **Pages**: ~25 page files
- **Components**: ~90 component files
  - Admin components: 13
  - UI components: 57
  - Shared components: ~20
- **Hooks**: 2 custom hooks
- **Utilities**: 1 utility file
- **Public assets**: ~15 images/icons

---

## Architecture Notes

1. **App Router Structure**: Uses Next.js 13+ App Router with file-based routing
2. **Component Organization**: Separated by feature (admin, ui, shared)
3. **Styling Approach**: Tailwind CSS with design tokens (CSS variables)
4. **Type Safety**: Full TypeScript implementation
5. **Form Handling**: React Hook Form with Zod schemas
6. **State Management**: React hooks (useState, useReducer for toasts)
7. **Authentication**: Login form present, but backend integration needed
8. **Data Fetching**: Components ready, but API integration needed

---

*Last Updated: Based on current codebase structure*
*Generated: Code Index Documentation*



