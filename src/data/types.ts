import type { entityBlueprints } from "./entitiesPropsFR";

export type commands = {
  jump: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  firstJump: boolean;
  bullet: boolean;
  canBullet: boolean;
};

export type jumpState = {
  jumping: boolean;
  time: number;
  canJump: boolean;
  firstJump: boolean;
};

export type entityInLevel = {
  type: keyof typeof entityBlueprints;
  position: { x: number; y: number };
  spawnFromPosition: number;
};

export type level = {
  level: number;
  map: string;
  destination: number;
  spawn: {
    x: number;
    y: number;
  };
  timer: number;
  flag?: {
    x: number;
    y: number;
    yEnd: number;
    visible: boolean;
    spawned: boolean;
  };
  blocks: number[][];
  mysteryBlocks: number[][];
  ascencor: number[][];
  entities: entityInLevel[];
};

export type spriteObject = {
  name: string;
  default: string;
  dead: string;
  jump?: string;
  turningBack?: string;
  walkingFrames?: string[];
};
