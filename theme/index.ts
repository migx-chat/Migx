export const LightTheme = {
  mode: "light" as const,
  background: "#FFFFFF",
  text: "#111111",
  primary: "#3B82F6",
  secondary: "#64748B",
  card: "#F8F9FB",
  border: "#E5E7EB",
};

export const DarkTheme = {
  mode: "dark" as const,
  background: "#0F0F0F",
  text: "#FFFFFF",
  primary: "#60A5FA",
  secondary: "#94A3B8",
  card: "#1A1A1A",
  border: "#2C2C2C",
};

export type ThemeType = typeof LightTheme;
export type ThemeMode = "light" | "dark" | "system";
