export const flagImages: { [key: string]: any } = {
  jerman: require('@/assets/flag/Jerman.png'),
  malaysia: require('@/assets/flag/malaysia.png'),
  arab: require('@/assets/flag/arab.png'),
  denmark: require('@/assets/flag/denmark.png'),
  swedia: require('@/assets/flag/swedia.png'),
  rusia: require('@/assets/flag/rusia.png'),
};

export const parseFlagTags = (message: string): { hasFlag: boolean; parts: Array<{ type: 'text' | 'flag'; content?: string; flagKey?: string }> } => {
  const flagRegex = /\[FLAG:(\w+)\]/g;
  const hasFlag = flagRegex.test(message);
  
  if (!hasFlag) {
    return { hasFlag: false, parts: [{ type: 'text', content: message }] };
  }
  
  flagRegex.lastIndex = 0;
  const parts: Array<{ type: 'text' | 'flag'; content?: string; flagKey?: string }> = [];
  let lastIndex = 0;
  let match;
  
  while ((match = flagRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'flag', flagKey: match[1].toLowerCase() });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.substring(lastIndex) });
  }
  
  return { hasFlag: true, parts };
};

export const hasFlagTags = (message: string): boolean => {
  return /\[FLAG:\w+\]/.test(message);
};
