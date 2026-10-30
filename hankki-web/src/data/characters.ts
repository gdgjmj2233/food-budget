import type { StaticImageData } from 'next/image';

import dragon from '@/assets/mascots/dragon.webp';
import duck from '@/assets/mascots/duck.webp';

export type CharacterId = 'dragon' | 'duck';

export interface Character {
  id: CharacterId;
  name: string;
  img: StaticImageData;
}

/** 개인정보에서 고를 수 있는 캐릭터 */
export const CHARACTERS: Character[] = [
  { id: 'dragon', name: '용', img: dragon },
  { id: 'duck', name: '오리', img: duck },
];

export const characterOf = (id: CharacterId): Character => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
