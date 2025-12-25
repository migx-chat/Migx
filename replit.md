# Overview

This project is a cross-platform mobile chat application built with React Native and Expo, offering a classic chat experience. It features real-time messaging, chat rooms, private conversations, user profiles, and social networking functionalities like friends lists and online status. The application supports iOS, Android, and Web, incorporating room browsing, favorite management, user leveling, theme customization, and a credit transfer system. The goal is to create an engaging social platform that fosters community and interaction, reminiscent of early chat services. An admin panel is also included for content moderation and user/room management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses Expo SDK 54, React Native 0.81.4, and React 19.1.0, with Expo Router 6.x for navigation. It features a custom component library with themed components and SVG-based icons for a consistent UI. React Native Gesture Handler and Reanimated are used for custom gestures and animations. The application includes a comprehensive theming system supporting light, dark, and system-auto modes, with persistent storage. Navigation is tab-based with a custom swipeable implementation. Key features include a multi-tab chat system, dynamic room management, role-based user profiles with a level system, an in-app credit system with PIN authentication, and secure authentication flows. State management relies on React's built-in hooks and Context API.

A React + Vite admin panel is located in `/admin-panel` (compiled to `/backend/public/admin`) for managing users, rooms, and abuse reports, featuring real-time statistics and JWT-based authentication.

## Backend Architecture

The backend is built with Node.js and Express.js for RESTful APIs, and Socket.IO for real-time communication. PostgreSQL (Neon DB) is used for persistent data storage, while Redis Cloud handles presence, rate limiting, and caching. The backend is structured into services for users, rooms, messages, bans, credits, merchants, and games.

### Database Schema

The PostgreSQL database includes tables for `users`, `rooms` (with 'general', 'official', 'game' categories), `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, `game_history`, and `user_blocks`.

### Redis Usage & Presence Management

Redis is crucial for managing online user presence with a TTL-based system, ensuring accurate participant counts and graceful cleanup. It also handles banned user lists, flood control, global rate limiting, and caching (e.g., for blocked lists).

### Real-time Communication (Socket.IO)

The `/chat` namespace facilitates real-time events such as joining/leaving rooms, sending/receiving chat and private messages, credit transfers, and game interactions. Private messages are handled via Socket.IO only, with no database persistence.

### REST API Endpoints

Key REST API endpoints include authentication (`/api/auth/login`), user data (`/api/users/:id`), room management (`/api/rooms`, `/api/rooms/official`, `/api/rooms/game`, `/api/rooms/recent/:username`, `/api/rooms/favorites/:username`), chatroom lifecycle (`/api/chatroom/:roomId/join`, `/api/chatroom/:roomId/leave`), messages (`/api/messages/:roomId`), credit transfers (`/api/credits/transfer`), merchant creation (`/api/merchants/create`), and profile endpoints for follows (`/api/profile/follow`, `/api/profile/follow/accept`, `/api/profile/follow/reject`), and user blocks (`/api/profile/block`, `/api/profile/unblock`, `/api/profile/blocked`). Admin routes are under `/api/admin/*` for stats, reports, user, and room management.

### Commands

Chat commands available to users:
- `/f [username]` - Send follow request (requires acceptance from both sides to establish connection).
- `/uf [username]` - Unfollow a user.
- `/kick [username]` - Kick a user from the room (admin: instant; non-admin: vote-kick).
- `/me <action>` - Perform an action.
- `/roll` - Roll a random number, optionally with a target.
- `/goal` - Cheer for a goal.
- `/go` - Cheer for the team.
- `/gift <name> <username>` - Send a gift.
- `/c <code>` - Claim free credits.
- `/unban <username>` - Admin only: Unban a user.
- `/suspend <username>` - Admin only: Suspend account.
- `/unsuspend <username>` - Admin only: Unsuspend account.
- `/block [username]` - Block a user (prevents private chats and hides messages in rooms).

### Game and Economy Systems

The application includes an XP & Level System. A Merchant Commission System allows mentors to create merchants. An Auto Voucher system broadcasts free credit codes.

# Recent Feature Additions (December 25, 2025)

## Admin Panel Super Admin Role Restriction
- Admin panel login now requires `super_admin` role exclusively
- Backend: `superAdminMiddleware` in `/middleware/auth.js` validates role on all `/api/admin/*` routes
- Frontend: Admin login checks user role and rejects non-super_admin users with clear error message
- Error message: "⛔ Admin access denied. Only super admin users can access this panel."
- Security: Dual-layer validation (frontend + backend) ensures only super_admin can access sensitive admin functions

## Daily Login Streak System
- Database: `login_streak` (INT) and `last_login_date` (DATE) columns on users table
- Service (`streakService.js`): Tracks consecutive daily logins with reward multipliers
- API: `POST /api/streak/check` updates streak, `GET /api/streak/info/:userId` retrieves info
- Rewards: 10 base credits/day, 20 for 3+ day streak, 30 for 7+ day streak
- Integrated into login endpoint - returns streak data in auth response

## Admin Panel Expansion (React + Vite)
- 6 main sections: Dashboard, Reports, Users, Rooms, Announcements, Transactions
- Users page: Role filtering, Add Coins button, Change Role button
- Announcements page: Create and manage system announcements
- Transactions page: View credit transaction history with filtering
- Dark green theme (#082919, #0a5229) with responsive design

## Report Abuse System
- Added to room participant menus with modal form
- API: `POST /api/abuse/report` saves reports to database
- Admin panel management of reports with status tracking (pending/reviewed/actioned)

## Admin Panel Create Room Feature
- New "+ Create Room" button in Rooms management page
- Modal form with fields: Category (dropdown), Room Name, Description
- **Category Dropdown**: Three options (Official, Game, Global) - defaults to Global
- **Room Owner Field**: Only shown for "official" category (game and global don't require owner)
- Validation: Name required (3-50 chars), category required, owner required only for official
- API calls `/api/rooms/create` matching app's room creation endpoint
- Auto-loads users list for owner selection dropdown (when visible)
- Success/error messaging with form validation
- Styling: Responsive modal with dark green theme matching admin panel design

## Admin Panel Room Management - "Managed By" Column
- Rooms table now displays "Managed By" column showing who manages each category
- **Official rooms**: Shows "migx"
- **Game rooms**: Shows "-" (no manager)
- **Global rooms**: Shows "-" (no manager)
- Conditional display based on room category to clarify room ownership structure

## Admin Panel Responsive Design
- **Desktop (1024px+)**: Full layout with side-by-side navigation and content
- **Tablet (768-1024px)**: Adjusted font sizes, optimized grid layouts, compact spacing
- **Mobile (≤768px)**: 
  - Hamburger menu toggle for navigation
  - Single column layouts
  - Full-width buttons and forms
  - Card-based table display (mobile-optimized data presentation)
  - Optimized font sizes and padding for touch
- **Small Mobile (≤480px)**: 
  - Extra-compact spacing
  - Smaller navigation header
  - Simplified grid layouts
  - Touch-friendly button sizes
- CSS media queries: 1024px, 768px, 480px breakpoints
- Flexbox and grid for flexible layouts
- Font size scaling: 16px (desktop) → 14px (tablet) → 13px (mobile)

# External Dependencies

## Core Expo Modules

`expo-router`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-constants`, `expo-system-ui`, `expo-linking`, `expo-web-browser`, `expo-image`, `expo-blur`, `expo-haptics`, `expo-linear-gradient`.

## UI & Animation Libraries

`react-native-reanimated`, `react-native-gesture-handler`, `react-native-pager-view`, `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`.

## Storage

`@react-native-async-storage/async-storage`.

## Backend Specific Dependencies

`Node.js`, `Express.js`, `Socket.IO`, `PostgreSQL (Neon DB)`, `Redis Cloud`.

## API Configuration

**API Base URL**: `https://c1a0709e-b20d-4687-ab11-e0584b9914f2-00-pfaqheie55z6.pike.replit.dev` (also used for Socket.IO).

## Development Workflows

Two concurrent workflows for development:
- **Development Server** (Port 5000): Node.js Express backend with Socket.IO and REST APIs
- **Admin Panel Dev** (Port 5173): Vite dev server for hot-reload admin panel development

Admin panel calls backend API via relative paths (`/api/*`) during development - configured in `.env.local` with `VITE_API_BASE_URL`.