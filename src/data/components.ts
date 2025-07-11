import type { entityBlueprints } from "./entitiesPropsFR";
import { GameManager } from "../managers/gameManager";
import type { spriteObject } from "./types";

export class PositionComponent {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class VelocityComponent {
  public horizontal: number;
  public vertical: number;

  constructor(horizontal: number, vertical: number) {
    this.horizontal = horizontal;
    this.vertical = vertical;
  }
}

export class PhysicsBodyComponent {
  public width: number;
  public height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export class MovementStatsComponent {
  public sidesSpeed: number;
  public upSpeed: number;
  public downSpeed: number;
  public maxHorizontalVelocity: number;
  public maxUpVelocity: number;
  public maxDownVelocity: number;
  public maxJumpTime: number;

  constructor(
    sidesSpeed: number,
    upSpeed: number,
    downSpeed: number,
    maxHorizontalVelocity: number,
    maxUpVelocity: number,
    maxDownVelocity: number,
    maxJumpTime: number
  ) {
    this.sidesSpeed = sidesSpeed;
    this.upSpeed = upSpeed;
    this.downSpeed = downSpeed;
    this.maxHorizontalVelocity = maxHorizontalVelocity;
    this.maxUpVelocity = maxUpVelocity;
    this.maxDownVelocity = maxDownVelocity;
    this.maxJumpTime = maxJumpTime;
  }
}

export class HealthComponent {
  public current: number;
  public max: number;

  constructor(current: number, max: number) {
    this.current = current;
    this.max = max;
  }

  isAlive(): boolean {
    return this.current > 0;
  }
}

export class RenderableComponent {
  public imageElement: HTMLImageElement;
  public sprite: spriteObject;

  constructor(sprite: spriteObject) {
    this.sprite = sprite;
    this.imageElement = document.createElement("img");
    this.imageElement.src = sprite.default;
    this.imageElement.height = this.imageElement.naturalHeight * GameManager.getInstance().zoom;
    this.imageElement.style.position = "absolute";
    this.imageElement.style.top = "0px";
    this.imageElement.style.left = "0px";
    this.imageElement.style.zIndex = "20";
    this.imageElement.className = sprite.name;
    document.body.appendChild(this.imageElement);
  }
}

export class InputStateComponent {
  public down: boolean;
  public jump: boolean;
  public left: boolean;
  public right: boolean;
  public firstJump: boolean;
  public bullet: boolean;

  constructor(
    down: boolean = false,
    jump: boolean = false,
    left: boolean = false,
    right: boolean = false,
    firstJump: boolean = true,
    bullet: boolean = false
  ) {
    this.down = down;
    this.jump = jump;
    this.left = left;
    this.right = right;
    this.firstJump = firstJump;
    this.bullet = bullet;
  }
}

export class JumpStateComponent {
  public isJumping: boolean;
  public jumpTime: number;
  public canJump: boolean;

  constructor(isJumping: boolean = false, jumpTime: number = 0, canJump: boolean = true) {
    this.isJumping = isJumping;
    this.jumpTime = jumpTime;
    this.canJump = canJump;
  }
}

export class AnimationStateComponent {
  public direction: boolean;
  public inAir: boolean;
  public isWalking: boolean;
  public isTurningBack: boolean;

  constructor(
    direction: boolean = false,
    inAir: boolean = false,
    isWalking: boolean = false,
    isTurningBack: boolean = false
  ) {
    this.direction = direction;
    this.inAir = inAir;
    this.isWalking = isWalking;
    this.isTurningBack = isTurningBack;
  }
}

export class DisparitionTimeAfterDeath {
  public time: number;
  constructor(time: number) {
    this.time = time;
  }
}

export class DropafterDeath {
  entity: keyof typeof entityBlueprints;

  constructor(entity: keyof typeof entityBlueprints) {
    this.entity = entity;
  }
}

export class InvincibleComponent {
  isInvicible: boolean;
  time: number;
  maxTime: number;
  constructor(isInvicible: boolean, time: number, maxTime: number) {
    this.isInvicible = isInvicible;
    this.time = time;
    this.maxTime = maxTime;
  }
}

export class PlayableComponent {}

export class FlagComponent {}

export class BonusComponent {}

export class PnjComponent {}

export class HostileComponent {}

export class MonsterKiller {}

export class CollidableComponent {}

export class FlagReached {}

export class TheFloorIsLava {}

export class TheWallsAreLava {}

export class Shooter {}
