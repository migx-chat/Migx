import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const floatDice = useRef(new Animated.Value(0)).current;
  const floatGift = useRef(new Animated.Value(0)).current;

  const blurDice = useRef(new Animated.Value(0.2)).current;
  const blurGift = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const floatAnim = (target: Animated.Value, blur: Animated.Value) => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(target, {
              toValue: -6,
              duration: 900,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(blur, {
              toValue: 0.08,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(target, {
              toValue: 6,
              duration: 900,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(blur, {
              toValue: 0.2,
              duration: 900,
              useNativeDriver: true,
            }),
          ])
        ])
      ).start();
    };

    floatAnim(floatDice, blurDice);
    floatAnim(floatGift, blurGift);
  }, []);

  return (
    <LinearGradient
      colors={['#082919', '#082919']}
      style={styles.container}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Image
          source={require('../assets/logo/logo_migx.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
        MigX — The World Chat Community
      </Animated.Text>

      <View style={styles.iconRow}>
        <Animated.View
          style={{
            transform: [{ translateY: floatDice }],
            opacity: blurDice,
          }}
        >
          <Ionicons name="dice" size={38} color="#ffffff" />
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ translateY: floatGift }],
            opacity: blurGift,
          }}
        >
          <Ionicons name="gift" size={38} color="#ffffff" />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  tagline: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 30,
  },
});
