export const diceImages: { [key: string]: any } = {
  '1': require('@/assets/dice/dice_1.jpg'),
  '2': require('@/assets/dice/dice_2.jpg'),
  '3': require('@/assets/dice/dice_3.jpg'),
  '4': require('@/assets/dice/dice_4.jpg'),
  '5': require('@/assets/dice/dice_5.jpg'),
  '6': require('@/assets/dice/dice_6.jpg'),
};

export const getDiceImage = (value: string | number): any | null => {
  return diceImages[String(value)] || null;
};

export interface DicePart {
  type: 'text' | 'dice';
  content: string;
  key: string;
}

export const parseDiceTags = (message: string): DicePart[] => {
  const parts: DicePart[] = [];
  const diceRegex = /\[DICE:(\d)\]/gi;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = diceRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index), key: `text-${keyIndex++}` });
    }
    parts.push({ type: 'dice', content: match[1], key: `dice-${keyIndex++}` });
    lastIndex = diceRegex.lastIndex;
  }

  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex), key: `text-${keyIndex++}` });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: message, key: 'text-0' }];
};

export const hasDiceTags = (message: string): boolean => {
  return message.includes('[DICE:');
};
