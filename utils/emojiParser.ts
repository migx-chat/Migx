
import { emojiMap } from "./emojiMapping";

export interface ParsedItem {
  type: "emoji" | "text" | "bigEmoji";
  src?: any;
  content?: string;
  key: number;
}

export function parseEmojiMessage(text: string): ParsedItem[] {
  const bigEmojiRegex = /\[BIG_EMOJI\](.*?)\[\/BIG_EMOJI\]/g;
  const hasBigEmoji = bigEmojiRegex.test(text);
  
  if (hasBigEmoji) {
    bigEmojiRegex.lastIndex = 0;
    const result: ParsedItem[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;
    
    while ((match = bigEmojiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        const parsed = parseTextSegment(beforeText, keyCounter);
        result.push(...parsed);
        keyCounter += parsed.length;
      }
      
      result.push({
        type: "bigEmoji" as const,
        content: match[1],
        key: keyCounter++,
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      const afterText = text.substring(lastIndex);
      const parsed = parseTextSegment(afterText, keyCounter);
      result.push(...parsed);
    }
    
    return result;
  }
  
  return parseTextSegment(text, 0);
}

function parseTextSegment(text: string, startKey: number): ParsedItem[] {
  const regex = /(:\w+:)/g;
  const parts = text.split(regex);
  const result: ParsedItem[] = [];

  parts.forEach((part, index) => {
    if (emojiMap[part]) {
      result.push({
        type: "emoji",
        src: emojiMap[part],
        key: startKey + index,
      });
    } else if (part.trim()) {
      result.push({
        type: "text",
        content: part,
        key: startKey + index,
      });
    }
  });

  return result;
}
