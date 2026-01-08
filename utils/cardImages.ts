export const cardImages: { [key: string]: any } = {
  'lc_2h': require('@/assets/card/lc_2h.png'),
  'lc_2d': require('@/assets/card/lc_2d.png'),
  'lc_2c': require('@/assets/card/lc_2c.png'),
  'lc_2s': require('@/assets/card/lc_2s.png'),
  'lc_3h': require('@/assets/card/lc_3h.png'),
  'lc_3d': require('@/assets/card/lc_3d.png'),
  'lc_3c': require('@/assets/card/lc_3c.png'),
  'lc_3s': require('@/assets/card/lc_3s.png'),
  'lc_4h': require('@/assets/card/lc_4h.png'),
  'lc_4d': require('@/assets/card/lc_4d.png'),
  'lc_4c': require('@/assets/card/lc_4c.png'),
  'lc_4s': require('@/assets/card/lc_4s.png'),
  'lc_5h': require('@/assets/card/lc_5h.png'),
  'lc_5d': require('@/assets/card/lc_5d.png'),
  'lc_5c': require('@/assets/card/lc_5c.png'),
  'lc_5s': require('@/assets/card/lc_5s.png'),
  'lc_6h': require('@/assets/card/lc_6h.png'),
  'lc_6d': require('@/assets/card/lc_6d.png'),
  'lc_6c': require('@/assets/card/lc_6c.png'),
  'lc_6s': require('@/assets/card/lc_6s.png'),
  'lc_7h': require('@/assets/card/lc_7h.png'),
  'lc_7d': require('@/assets/card/lc_7d.png'),
  'lc_7c': require('@/assets/card/lc_7c.png'),
  'lc_7s': require('@/assets/card/lc_7s.png'),
  'lc_8h': require('@/assets/card/lc_8h.png'),
  'lc_8d': require('@/assets/card/lc_8d.png'),
  'lc_8c': require('@/assets/card/lc_8c.png'),
  'lc_8s': require('@/assets/card/lc_8s.png'),
  'lc_9h': require('@/assets/card/lc_9h.png'),
  'lc_9d': require('@/assets/card/lc_9d.png'),
  'lc_9c': require('@/assets/card/lc_9c.png'),
  'lc_9s': require('@/assets/card/lc_9s.png'),
  'lc_10h': require('@/assets/card/lc_10h.png'),
  'lc_10d': require('@/assets/card/lc_10d.png'),
  'lc_10c': require('@/assets/card/lc_10c.png'),
  'lc_10s': require('@/assets/card/lc_10s.png'),
  'lc_jh': require('@/assets/card/lc_jh.png'),
  'lc_jd': require('@/assets/card/lc_jd.png'),
  'lc_jc': require('@/assets/card/lc_jc.png'),
  'lc_js': require('@/assets/card/lc_js.png'),
  'lc_qh': require('@/assets/card/lc_qh.png'),
  'lc_qd': require('@/assets/card/lc_qd.png'),
  'lc_qc': require('@/assets/card/lc_qc.png'),
  'lc_qs': require('@/assets/card/lc_qs.png'),
  'lc_kh': require('@/assets/card/lc_kh.png'),
  'lc_kd': require('@/assets/card/lc_kd.png'),
  'lc_kc': require('@/assets/card/lc_kc.png'),
  'lc_ks': require('@/assets/card/lc_ks.png'),
  'lc_ah': require('@/assets/card/lc_ah.png'),
  'lc_ad': require('@/assets/card/lc_ad.png'),
  'lc_ac': require('@/assets/card/lc_ac.png'),
  'lc_as': require('@/assets/card/lc_as.png'),
};

export const getCardImage = (code: string): any | null => {
  return cardImages[code.toLowerCase()] || null;
};

export interface CardPart {
  type: 'text' | 'card';
  content: string;
  key: string;
}

export const parseCardTags = (message: string): CardPart[] => {
  const parts: CardPart[] = [];
  const cardRegex = /\[CARD:(lc_[a-z0-9]+)\]/gi;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = cardRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index), key: `text-${keyIndex++}` });
    }
    parts.push({ type: 'card', content: match[1].toLowerCase(), key: `card-${keyIndex++}` });
    lastIndex = cardRegex.lastIndex;
  }

  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex), key: `text-${keyIndex++}` });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: message, key: 'text-0' }];
};

export const hasCardTags = (message: string): boolean => {
  return message.includes('[CARD:');
};
