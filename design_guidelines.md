# SAFEEXCHANGE - Design Guidelines

## Design Approach

**Selected Approach**: Design System Foundation (Material Design adapted) with trust-focused visual enhancements

**Rationale**: SAFEEXCHANGE is a security-critical Web3 platform requiring clear information hierarchy, robust form patterns, and trust-building visual elements. Material Design provides excellent transaction flow patterns while allowing customization for blockchain context.

**Core Principles**:
- Transparency through clarity
- Security through visual trust signals
- Simplicity in complex workflows

---

## Typography (Tiếng Việt)

**Font Families**:
- Primary: Inter (headers, UI elements, body text)
- Monospace: JetBrains Mono (wallet addresses, transaction hashes, code)

**Type Scale**:
- Hero/H1: text-5xl font-bold (48px)
- H2: text-3xl font-semibold (30px)
- H3: text-2xl font-semibold (24px)
- H4: text-xl font-medium (20px)
- Body: text-base (16px)
- Small/Caption: text-sm (14px)
- Tiny/Metadata: text-xs (12px)

**Vietnamese Optimization**: Ensure proper diacritics rendering with font-feature-settings

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 8, 12, 16, 24**
- Micro spacing: p-2, gap-2
- Component padding: p-4, p-8
- Section spacing: py-12, py-16, py-24
- Container max-width: max-w-7xl

**Grid Patterns**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Two-column layouts: grid-cols-1 lg:grid-cols-2
- Transaction steps: Single column flow with max-w-2xl

---

## Color Palette (Near Black/White Theme)

**Base Colors** (defined via CSS variables, no specific values here):
- Background primary (very light gray)
- Background secondary (white/cards)
- Text primary (near black)
- Text secondary (medium gray)
- Border (light gray)

**Semantic Colors**:
- Success (green for completed trades)
- Warning (amber for pending/armed states)
- Error (red for cancelled/failed)
- Info (blue for informational states)
- Primary accent (vibrant color for CTAs)

**Web3 Specific**:
- Wallet address background (subtle gray)
- Transaction hash background (monospace with subtle highlight)
- Safe guard indicator (distinct color when active)

---

## Component Library

### Navigation & Header
- **Header**: Sticky header with blur backdrop
  - Logo: text-xl font-bold
  - Nav links: text-sm font-medium với gap-8
  - Wallet button: Rounded button hiển thị địa chỉ ngắn gọn khi kết nối
  
### Cards & Containers
- **Trade Card**: Rounded-lg border shadow-sm với p-6
- **Info Panel**: Background subtle với border-l-4 colored border
- **Dashboard Card**: Hover lift effect (hover:shadow-md transition)

### Forms & Inputs
- **Input Fields**: 
  - Border rounded-md với focus ring
  - Label: text-sm font-medium mb-2
  - Helper text: text-xs text-gray-600
- **Safe Address Input**: Monospace font với validation indicator
- **ETH Amount Input**: Number input với ETH symbol suffix

### Buttons
- **Primary CTA**: Rounded-lg px-6 py-3 font-semibold
- **Secondary**: Outlined variant
- **Danger**: Red variant cho cancel actions
- **Wallet Connect**: Distinctive style với MetaMask icon

### Transaction Flow Components
- **Stepper**: 
  - Horizontal stepper cho desktop
  - Vertical cho mobile
  - Active/completed/pending states với icons
- **Status Badge**: Rounded-full px-3 py-1 text-xs font-medium
  - LISTED, JOINED, ARMED, FUNDED, COMPLETED, CANCELLED states

### Data Display
- **Transaction Table**: 
  - Zebra striping cho readability
  - Sticky header
  - Monospace cho addresses/hashes
- **Safe Info Display**:
  - Owner list với checkmarks
  - Guard status với clear indicator
  - Module list

### Trust Elements
- **Security Indicators**:
  - Guard active badge (shield icon)
  - Contract verified checkmark
  - Transaction confirmation modals với detailed breakdown
- **Warning Banners**: 
  - Yellow background cho important notices
  - Red background cho critical warnings

---

## Page-Specific Layouts

### Landing Page
- **Hero Section**: 
  - Large heading "Chuyển nhượng Safe Wallet An toàn"
  - Subheading giải thích ngắn gọn
  - Two prominent CTAs: "Bán Safe" và "Mua Safe"
  - Background: Subtle gradient hoặc geometric pattern
- **How It Works**: 3-column grid với icons
- **Security Features**: Card grid highlighting guard mechanism
- **CTA Footer**: Final conversion section

### Transfer Pages (Sell/Buy)
- **Progress Indicator**: Always visible at top
- **Current Step Card**: Centered max-w-2xl với clear instructions
- **Action Buttons**: Bottom of card, full-width on mobile
- **Side Info Panel**: On desktop, shows trade summary
- **Transaction Preview**: Before on-chain actions, show gas estimate

### Wallet Transparency
- **Search Bar**: Prominent at top với Safe address input
- **Results Display**:
  - Owners section với avatars/addresses
  - Modules & Guards section với status badges
  - Transaction history table (if applicable)

### Evidence Collector
- **Upload/Input Area**: Drag-drop zone hoặc form inputs
- **Hash Display**: Monospace với copy button
- **Signature Section**: ECDSA signing flow với MetaMask
- **Export Options**: Download JSON và PDF buttons
- **Verify Section**: Separate panel để verify evidence

### Transparency Dashboard
- **Stats Cards**: Grid at top với key metrics
- **Trade Table**: Full-width với filtering
- **System Logs**: Chronological list với timestamps
- **Commit Hash Display**: Footer area với monospace

### Learn Page
- **Interactive Stepper**: Visual flow diagram
- **Warning Callouts**: Scam awareness sections
- **Transaction Simulator**: Mock transaction approve flow

---

## Images

**Hero Image**: Use abstract Web3/blockchain illustration showing safe transfer concept (shield + wallet + arrows). Place in landing page hero section as background với overlay.

**Trust Badges**: Small icon images for "Open Source", "Non-Custodial", "Verified Contract" displayed in footer hoặc features section.

**No other imagery needed** - focus on clean UI and data visualization.

---

## Accessibility

- All interactive elements: min-height of 44px
- Focus states: Clear 2px ring offset
- Color contrast: WCAG AA minimum
- ARIA labels: Đầy đủ cho Vietnamese screen readers
- Keyboard navigation: Toàn bộ transaction flows

---

## Animations

**Minimal & Purposeful**:
- Page transitions: Simple fade (150ms)
- Card hover: Slight lift (shadow transition)
- Button clicks: Scale 95% on active
- Stepper progress: Smooth fill animation
- Loading states: Spinner cho on-chain transactions
- **No decorative animations** - only functional feedback