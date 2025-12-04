import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  bgColor?: string;
}

const IconWrapper = ({ size = 40, bgColor = '#fff', children }: { size?: number; bgColor?: string; children: React.ReactNode }) => (
  <View style={[styles.iconWrapper, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
    {children}
  </View>
);

export const CmdIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M8 9h.01M16 9h.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  </IconWrapper>
);

export const SendGiftIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="8" width="18" height="13" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M12 8V21" stroke={color} strokeWidth="2" />
      <Path d="M3 12h18" stroke={color} strokeWidth="2" />
      <Path d="M12 8c-2-3-6-3-6 0s4 0 6 0c2 0 6 3 6 0s-4-3-6 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  </IconWrapper>
);

export const KickIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M12 8v4M10 10h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  </IconWrapper>
);

export const ParticipantsIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="13" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="3" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="2" />
      <Rect x="13" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="2" />
      <Circle cx="7" cy="7" r="1.5" fill={color} />
      <Circle cx="17" cy="7" r="1.5" fill={color} />
      <Circle cx="7" cy="17" r="1.5" fill={color} />
      <Circle cx="17" cy="17" r="1.5" fill={color} />
    </Svg>
  </IconWrapper>
);

export const RoomInfoIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M12 16v-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  </IconWrapper>
);

export const FavoriteIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <Path d="M12 8v6M9 11h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  </IconWrapper>
);

export const GroupsIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth="2" />
      <Circle cx="15" cy="7" r="3" stroke={color} strokeWidth="2" />
      <Path d="M3 21v-2a4 4 0 0 1 4-4h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M15 15h2a4 4 0 0 1 4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="17" r="3" stroke={color} strokeWidth="2" />
    </Svg>
  </IconWrapper>
);

export const ReportIcon = ({ size = 40, color = '#555', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <Path d="M12 9v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  </IconWrapper>
);

export const LeaveRoomIcon = ({ size = 40, color = '#EF4444', bgColor = '#fff' }: IconProps) => (
  <IconWrapper size={size} bgColor={bgColor}>
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </IconWrapper>
);

export const InfoIcon = RoomInfoIcon;
export const StarIcon = FavoriteIcon;
export const WalletIcon = SendGiftIcon;
export const BlockUserIcon = ReportIcon;
export const KickUserIcon = KickIcon;

const styles = StyleSheet.create({
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
