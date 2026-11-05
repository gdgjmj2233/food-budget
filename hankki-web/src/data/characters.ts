import type { StaticImageData } from 'next/image';

import dragonSad from '@/assets/mascots/dragon-sad.webp';
import dragon from '@/assets/mascots/dragon.webp';
import duckSad from '@/assets/mascots/duck-sad.webp';
import duck from '@/assets/mascots/duck.webp';

export type CharacterId = 'dragon' | 'duck';

export interface Character {
  id: CharacterId;
  name: string;
  img: StaticImageData;
  /** 예산이 임박·초과일 때 보여줄 지친 모습 */
  sadImg: StaticImageData;
}

/** 개인정보에서 고를 수 있는 캐릭터 */
export const CHARACTERS: Character[] = [
  { id: 'dragon', name: '용', img: dragon, sadImg: dragonSad },
  { id: 'duck', name: '오리', img: duck, sadImg: duckSad },
];

export const characterOf = (id: CharacterId): Character => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
