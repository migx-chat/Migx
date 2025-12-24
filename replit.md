# Overview

This project is a cross-platform mobile chat application built with React Native and Expo, designed to offer a classic chat experience. It features real-time messaging, chat rooms, private conversations, user profiles, and social networking functionalities like friends lists and online status. The application supports iOS, Android, and Web, incorporating room browsing, favorite management, user leveling, theme customization, and a credit transfer system. The goal is to create an engaging social platform that fosters community and interaction, reminiscent of early chat services.

## Latest Changes (December 23, 2025)

- **Follow User Feature**: Implemented both UI-based follow (from participants menu) and command-based follow via `/f [username]` command
  - Follow via participants menu: Shows system message in chat + sends follow notification with Accept/Reject buttons
  - Follow via `/f [username]` command: Private response message visible only to sender + follow notification with Accept/Reject buttons
  - Both methods use same backend follow system and notification workflow

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses **Expo SDK 54**, **React Native 0.81.4**, and **React 19.1.0**, with **Expo Router 6.x** for navigation. It features a **custom component library** with themed components and **SVG-based icons** for a consistent UI. **React Native Gesture Handler** and **Reanimated** are used for custom gestures and animations. The application includes a comprehensive **theming system** supporting light, dark, and system-auto modes, with persistent storage. Navigation is tab-based with a custom swipeable implementation. Key features include a multi-tab chat system, dynamic room management, role-based user profiles with a level system, an in-app credit system with PIN authentication, and secure authentication flows. State management relies on React's built-in hooks and Context API.

## Backend Architecture

The backend is built with **Node.js** and **Express.js** for RESTful APIs, and **Socket.IO** for real-time communication. **PostgreSQL (Neon DB)** is used for persistent data storage, while **Redis Cloud** handles presence, rate limiting, and caching. The backend is structured into services for users, rooms, messages, bans, credits, merchants, and games.

### Database Schema

The PostgreSQL database includes tables for `users`, `rooms` (with 'general', 'official', 'game' categories), `messages`, `private_messages`, `credit_logs`, `merchants`, `merchant_spend_logs`, `user_levels`, `room_bans`, and `game_history`.

### Redis Usage & Presence Management

Redis is crucial for managing online user presence with a **TTL-based system** (6-hour TTL, refreshed by client heartbeats), ensuring accurate participant counts and graceful cleanup of disconnected users. It also handles banned user lists, flood control, global rate limiting, and caching.

### Real-time Communication (Socket.IO)

The `/chat` namespace facilitates real-time events such as joining/leaving rooms, sending/receiving chat and private messages, credit transfers, and game interactions.

### REST API Endpoints

Key REST API endpoints include authentication (`/api/auth/login`), user data (`/api/users/:id`), room management (`/api/rooms`, `/api/rooms/official`, `/api/rooms/game`, `/api/rooms/recent/:username`, `/api/rooms/favorites/:username`), chatroom lifecycle (`/api/chatroom/:roomId/join`, `/api/chatroom/:roomId/leave`), messages (`/api/messages/:roomId`), credit transfers (`/api/credits/transfer`), merchant creation (`/api/merchants/create`), and profile endpoints for follows (`/api/profile/follow`, `/api/profile/follow/accept`, `/api/profile/follow/reject`).

### Commands

Chat commands available to users:
- `/f [username]` - Follow a user (private response, sends notification with Accept/Reject)
- `/me <action>` - Perform an action
- `/roll` - Roll a random number (1-100)
- `/gift <name> <username>` - Send a gift
- `/c <code>` - Claim free credits using voucher code
- `/unban <username>` - Admin only: Unban a user from all rooms
- `/suspend <username>` - Admin only: Suspend a user's account
- `/unsuspend <username>` - Admin only: Unsuspend a user's account

Commands starting with `/f` are special - they send private responses visible only to the sender.

### Game and Economy Systems

The application includes an **XP & Level System** where users earn experience for various actions. A **Merchant Commission System** allows mentors to create merchants who earn commissions. An **Auto Voucher system** broadcasts free credit codes to active rooms, allowing users to claim credits with a cooldown.

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