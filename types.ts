
export enum GameState {
  MENU,
  MAP,
  MINIGAME_TETRIS,
  MINIGAME_DODGE,
  MINIGAME_SHOOTER,
  GAMEOVER,
  WIN
}

export interface Position {
  x: number;
  y: number;
}

export interface GameStats {
  startTime: number;
  endTime: number;
  bugsKilled: number;
  commentsDodged: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  speed: number;
}

// Sound Helper Type
export type SoundFn = (sfx: string) => void;

export const COLORS = {
  background: '#050505',     // Very dark grey/black
  grid: '#1A1A1A',           // Dark grey for grid
  player: '#00FFFF',         // Cyan Neon
  rope: '#FF00FF',           // Magenta Neon
  enemy: '#FF3333',          // Red Neon
  item1: '#39FF14',          // Terminal Green (Computer)
  item2: '#FFFF00',          // Yellow Neon (Check)
  item3: '#BD00FF',          // Purple Neon (Cloud)
  text: '#39FF14',           // Terminal Green
  white: '#FFFFFF',
  overlay: 'rgba(0, 20, 0, 0.85)' // Dark green tint overlay
};

export const ICONS = {
  player: '👨‍💻',
  enemy: '👾',
  computer: '💾',
  check: '✅',
  cloud: '☁️',
  comment: '💬',
  bug: '🐛',
  block: '🟦',
  road: '🛣️'
};
