
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const MoonIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
      fill="#4A90E2" 
      stroke="#4A90E2" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

export function ModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MoonIcon size={24} />
        </View>
        <Text style={styles.title}>Dark Mode</Text>
        <Switch
          value={isDarkMode}
          onValueChange={setIsDarkMode}
          trackColor={{ false: '#D0D0D0', true: '#4A90E2' }}
          thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
        />
      </View>
      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 68,
  },
});
