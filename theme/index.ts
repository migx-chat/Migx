export interface ThemeType {
  mode: "light" | "dark";
  background: string;
  text: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export const LightTheme: ThemeType = {
  mode: "light",
  background: "#FFFFFF",
  text: "#111111",
  primary: "#3B82F6",
  secondary: "#64748B",
  card: "#F8F9FB",
  border: "#E5E7EB",
  gradientStart: "#082919",
  gradientEnd: "#082919",
};

export const DarkTheme: ThemeType = {
  mode: "dark",
  background: "#0F0F0F",
  text: "#FFFFFF",
  primary: "#60A5FA",
  secondary: "#94A3B8",
  card: "#1A1A1A",
  border: "#2C2C2C",
  gradientStart: "#082919",
  gradientEnd: "#082919",
};

export type ThemeMode = "light" | "dark" | "system";
