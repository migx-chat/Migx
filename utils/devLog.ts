const isDev = process.env.NODE_ENV !== 'production' && __DEV__;

export const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

export const devError = (...args: any[]) => {
  console.error(...args);
};
