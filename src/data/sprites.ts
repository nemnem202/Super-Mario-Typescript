import type { spriteObject } from "./types";

export const sprites: spriteObject[] = [
  {
    name: "mario",
    default: "/sprites/mario/mario-1.png",
    dead: "/sprites/mario/dead.png",
    jump: "/sprites/mario/jump.png",
    turningBack: "/sprites/mario/turning-back.png",
    walkingFrames: [
      "/sprites/mario/walking-1.png",
      "/sprites/mario/walking-2.png",
      "/sprites/mario/walking-3.png",
    ],
  },
  {
    name: "defaultMonster",
    default: "/sprites/mechant-bouboule/mechant_sprite.png",
    walkingFrames: [
      "/sprites/mechant-bouboule/mechant_sprite.png",
      "/sprites/mechant-bouboule/default2.png",
    ],
    dead: "/sprites/mechant-bouboule/dead.png",
  },
  {
    name: "turtle",
    default: "/sprites/tortue/default.png",
    dead: "/sprites/mechant-bouboule/dead.png",
    walkingFrames: ["/sprites/tortue/default.png", "/sprites/tortue/walking2.png"],
  },
  {
    name: "carapace",
    default: "/sprites/carapace/default.png",
    dead: "/sprites/carapace/default.png",
  },
  {
    name: "defaultFlag",
    default: "/sprites/flag/default.png",
    dead: "/sprites/flag/default.png",
  },
  {
    name: "mushroom",
    default: "/sprites/mushroom/default.png",
    dead: "/sprites/mushroom/default.png",
  },
  {
    name: "mario",
    default: "/sprites/marioBig/default.png",
    dead: "/sprites/marioBig/dead.png",
    jump: "/sprites/marioBig/jump.png",
    turningBack: "/sprites/marioBig/turning-back.png",
    walkingFrames: [
      "/sprites/marioBig/walking-1.png",
      "/sprites/marioBig/walking-2.png",
      "/sprites/marioBig/walking-2.png",
    ],
  },
  {
    name: "meteorite",
    default: "/sprites/killerMonster/default.png",
    dead: "/sprites/killerMonster/dead.png",
    walkingFrames: [
      "/sprites/killerMonster/default.png",
      "/sprites/killerMonster/walking-2.png",
      "/sprites/killerMonster/walking-3.png",
      "/sprites/killerMonster/walking-4.png",
    ],
  },
  {
    name: "flower",
    default: "/sprites/flower/default.png",
    dead: "/sprites/flower/default.png",
  },
  {
    name: "mario",
    default: "/sprites/marioShooter/default.png",
    dead: "/sprites/marioShooter/dead.png",
    walkingFrames: [
      "/sprites/marioShooter/walking-1.png",
      "/sprites/marioShooter/walking-2.png",
      "/sprites/marioShooter/walking-3.png",
    ],
    turningBack: "/sprites/marioShooter/turning-back.png",
    jump: "/sprites/marioShooter/jump.png",
  },
  {
    name: "mario",
    dead: "/sprites/marioBigShooter/dead.png",
    default: "/sprites/marioBigShooter/default.png",
    jump: "/sprites/marioBigShooter/jump.png",
    turningBack: "/sprites/marioBigShooter/turning-back.png",
    walkingFrames: [
      "/sprites/marioBigShooter/walking-1.png",
      "/sprites/marioBigShooter/walking-2.png",
      "/sprites/marioBigShooter/walking-3.png",
    ],
  },
  {
    name: "platform",
    default: "/sprites/platform/default.png",
    dead: "/sprites/platform/default.png",
  },
  {
    name: "flying-turtle",
    default: "/sprites/flyingTurtle/default.png",
    dead: "/sprites/carapace/default.png",
    walkingFrames: ["/sprites/flyingTurtle/default.png", "/sprites/flyingTurtle/walking2.png"],
  },
];
