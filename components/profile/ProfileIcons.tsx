
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export const AccountIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill="#4A90E2" />
    <Path 
      d="M4 20c0-4 3.5-6 8-6s8 2 8 6" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      fill="none" 
    />
  </Svg>
);

export const CommentIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" 
      fill="#4A90E2"
    />
  </Svg>
);

export const GiftIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="4" fill="#4A90E2" />
    <Path 
      d="M12 8V21M3 12h18M5 12v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      fill="none"
    />
    <Path 
      d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      fill="none"
    />
  </Svg>
);

export const PeopleIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" fill="#4A90E2" />
    <Path 
      d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      fill="none"
    />
    <Circle cx="19" cy="7" r="3" fill="#4A90E2" />
    <Path 
      d="M22 21v-1.5a3.5 3.5 0 0 0-3-3.45" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      fill="none"
    />
  </Svg>
);

export const LeaderboardIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M9 20H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h4M15 20h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      fill="none"
    />
    <Rect x="9" y="4" width="6" height="16" fill="#4A90E2" />
  </Svg>
);

export const DashboardIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" fill="#4A90E2" />
    <Rect x="14" y="3" width="7" height="7" fill="#4A90E2" />
    <Rect x="3" y="14" width="7" height="7" fill="#4A90E2" />
    <Rect x="14" y="14" width="7" height="7" fill="#4A90E2" />
  </Svg>
);

export const SettingsIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke="#4A90E2" strokeWidth="2" fill="none" />
    <Path 
      d="M12 1v6m0 6v10M1 12h6m6 0h10" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <Path 
      d="M5.636 5.636l4.243 4.243m4.242 4.242l4.243 4.243M5.636 18.364l4.243-4.243m4.242-4.242l4.243-4.243" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </Svg>
);

export const AdminPanelIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" 
      fill="#E74C3C"
    />
    <Path 
      d="M10 12l2 2 4-4" 
      stroke="#FFFFFF" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);
