# SAFEEXCHANGE

## Overview
SAFEEXCHANGE là nền tảng Web3 để chuyển nhượng quyền sở hữu ví Gnosis Safe an toàn với cơ chế Guard smart contract và escrow tự động. Toàn bộ giao diện sử dụng tiếng Việt.

## Recent Changes
- 11/12/2025: Phase 2 Complete - All next-phase features implemented:
  - Safe Core SDK integration with txServiceUrl fix for setGuard/swapOwner operations
  - Real-time WebSocket event system for trade status changes
  - Notification system with indicator in header
  - PDF export for Evidence and Trade records (jsPDF with ASCII for font compatibility)
  - Advanced Dashboard with search, status filter, date sorting
  - Hardhat test suite with 19 passing tests and gas reports
- 11/12/2025: Initial build - Frontend Phase 1 complete with all pages and components
- Database schema with Trade, Evidence, SystemLog models
- Smart contract SafeExchangeEscrowSoftGuard.sol created
- Wagmi/Viem integration for Web3 connectivity

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn/ui
- **Web3**: Wagmi v2 + Viem + ethers.js
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Smart Contracts**: Solidity 0.8.19 + Hardhat

## Project Architecture

### Frontend (`client/src/`)
- `pages/` - All page components (home, transfer/sell, transfer/buy, wallet-transparency, evidence, dashboard, learn, legal)
- `components/` - Reusable UI components (header, footer, layout, theme-provider, connect-wallet, stepper, trade-status-badge)
- `lib/` - Utilities (wagmi config, contracts ABI)

### Backend (`server/`)
- `routes.ts` - API endpoints for trades, evidence, logs
- `storage.ts` - In-memory storage interface
- `db.ts` - PostgreSQL connection (ready for production)

### Shared (`shared/`)
- `schema.ts` - Drizzle ORM models and Zod schemas

### Contracts (`contracts/`)
- `SafeExchangeEscrowSoftGuard.sol` - Main escrow + guard contract

## User Preferences
- Language: Vietnamese only (toàn bộ tiếng Việt)
- Design: Material Design adapted with trust-focused visual enhancements
- Fonts: Inter for UI, JetBrains Mono for addresses/hashes
- Theme: Near black/white with dark mode support

## API Endpoints
- `GET /api/trades` - List all trades
- `GET /api/trades/:id` - Get trade by ID
- `GET /api/trades/search?q=` - Search by trade ID or Safe address
- `POST /api/trades` - Create new trade listing
- `POST /api/trades/:id/join` - Buyer joins trade
- `POST /api/trades/:id/arm` - Seller arms trade
- `POST /api/trades/:id/deposit` - Buyer deposits ETH
- `POST /api/trades/:id/complete` - Complete trade
- `POST /api/trades/:id/cancel` - Cancel trade
- `GET /api/safe-info?address=` - Get Safe wallet info
- `GET /api/evidence` - List all evidence
- `POST /api/evidence` - Create evidence with signature
- `POST /api/evidence/verify` - Verify ECDSA signature
- `GET /api/logs` - Get system logs

## Running the Project
```bash
npm run dev
```
Frontend: http://localhost:5000
