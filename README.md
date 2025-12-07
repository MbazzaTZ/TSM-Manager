# TSM Territory Manager

<p align="center">
  <img src="public/logo-full.png" alt="TSM Territory Manager Logo" width="300"/>
</p>

<p align="center">
  <strong>DStv Tanzania Stock & Sales Management System</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## 📋 Overview

TSM Territory Manager is a comprehensive stock control and sales management system designed for DStv Tanzania operations. It provides real-time tracking of inventory, sales performance, team management, and payment status across multiple regions.

## ✨ Features

### 📦 Stock Management
- **Inventory Tracking** - Track smartcards, serial numbers, and batch numbers
- **Stock Types** - Full Set (Decoder + Dish + LNB) and Decoder Only
- **Status Management** - In Store, In Hand, Sold
- **Bulk Operations** - CSV import, bulk assign to TL/DSR
- **Clickable Details** - Click any smartcard to view full details

### 💰 Sales Management
- **Add Sales** - Record sales with customer info and package selection
- **Package Types** - Access, Family, Compact, Compact Plus, Premium
- **Payment Tracking** - Track paid/unpaid status
- **Days Unpaid** - Automatic calculation of outstanding payment days

### 👥 Team Management
- **Regions** - Organize by geographic regions
- **Teams** - Create and manage teams per region
- **Team Leaders (TL)** - Assign stock to Team Leaders
- **DSRs** - Direct Sales Representatives under TLs
- **Team Details** - View team members, add/remove DSRs

### 📊 Analytics & Dashboard
- **Real-time Metrics** - Total stock, sales, unpaid counts
- **Charts** - Sales trends (Area), Weekly comparison (Bar), Stock distribution (Pie)
- **Regional Performance** - Sales and payment rates per region
- **Leaderboard** - Top performing Team Leaders this month
- **Unpaid Days Tracking** - Critical, Warning, Pending status

### 🔍 Search
- **Smart Search** - Search by smartcard or serial number
- **Instant Results** - Real-time search across all inventory
- **Quick Actions** - View details, mark as sold from search

### 🌐 Multilingual
- **Swahili** - Kiswahili support
- **English** - English language support
- **Language Switcher** - Easy toggle between languages

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **UI Components** | Radix UI / Shadcn |
| **Charts** | Recharts |
| **Backend** | Supabase (PostgreSQL) |
| **State Management** | TanStack React Query v5 |
| **Routing** | React Router DOM |
| **Icons** | Lucide React |
| **Date Utils** | date-fns |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn UI components
│   ├── Header.tsx      # Main header with nav
│   ├── Footer.tsx      # App footer
│   ├── Logo.tsx        # TSM logo component
│   ├── MetricCard.tsx  # Dashboard metric cards
│   ├── LeaderboardCard.tsx
│   ├── SearchResultCard.tsx
│   └── StockDetailsModal.tsx
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   └── LanguageContext.tsx
├── hooks/              # Custom React hooks
│   ├── useInventory.ts
│   ├── useSales.ts
│   ├── useTeams.ts
│   └── useUsers.ts
├── integrations/       # External integrations
│   └── supabase/
├── lib/               # Utility functions
├── pages/             # Page components
│   ├── Dashboard.tsx  # Public dashboard
│   ├── Index.tsx      # Home/Search page
│   ├── Login.tsx
│   └── admin/         # Admin pages
│       ├── AdminDashboard.tsx
│       ├── AdminOverview.tsx
│       ├── AdminInventory.tsx
│       ├── AdminTeams.tsx
│       ├── AdminTeamDetails.tsx
│       ├── AdminUsers.tsx
│       └── AdminUnpaid.tsx
└── public/            # Static assets
    ├── logo-icon.png
    ├── logo-full.png
    └── robots.txt
```

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- npm or bun

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/tsm-manager.git

# Navigate to project directory
cd tsm-manager

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## 📖 Usage

### Admin Panel
Navigate to `/admin` to access the admin dashboard with:
- **Overview** - Real-time metrics and charts
- **Stock** - Inventory management
- **Sales** - Sales records
- **Teams** - Team and region management
- **Users** - User management
- **Unpaid** - Outstanding payments

### Adding Stock
1. Go to Admin → Stock
2. Click "Add Stock" or "Bulk Import"
3. Enter smartcard, serial number, batch, stock type
4. Assign to region

### Recording a Sale
1. Find the stock item (search or browse)
2. Click "Sell" button
3. Enter customer phone, select package
4. Choose payment status (Paid/Unpaid)

### Managing Teams
1. Go to Admin → Teams
2. Create a new team with region
3. Click team to view details
4. Add Team Leaders and DSRs

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

The project includes `vercel.json` for proper SPA routing.

### Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## 📱 Mobile Support

TSM Territory Manager is fully responsive with:
- Mobile-friendly navigation
- Touch-optimized buttons
- Responsive tables and cards
- Bottom navigation on mobile

## 🔐 Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📄 License

Copyright © 2025 TSM Territory Manager. All rights reserved.

---

<p align="center">
  Made with ❤️ for DStv Tanzania
</p>
