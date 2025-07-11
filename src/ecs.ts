import {
  AnimationStateComponent,
  BonusComponent,
  CollidableComponent,
  DisparitionTimeAfterDeath,
  DropafterDeath,
  FlagComponent,
  FlagReached,
  Flying,
  HealthComponent,
  HostileComponent,
  InputStateComponent,
  InvincibleComponent,
  JumpStateComponent,
  MonsterKiller,
  MovementStatsComponent,
  PathComponent,
  PhysicsBodyComponent,
  Platform,
  PlayableComponent,
  PnjComponent,
  PositionComponent,
  RenderableComponent,
  Shooter,
  TheFloorIsLava,
  TheWallsAreLava,
  VelocityComponent,
} from "./data/components";
import { entityBlueprints } from "./data/entitiesPropsFR";
import type { Game } from "./managers/game";
import { GameManager } from "./managers/gameManager";
import { GameMenus } from "./managers/gameMenu";
import { sprites } from "./data/sprites";
import type { level } from "./data/types";
import { SoundManager } from "./managers/soundManager";

export class Entity {
  public id: string;
  private components: Map<Function, any> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  public addComponent(component: any): void {
    this.components.set(component.constructor, component);
  }

  public getComponent<T>(componentClass: { new (...args: any[]): T }): T {
    return this.components.get(componentClass) as T;
  }

  public hasComponent<T>(componentClass: { new (...args: any[]): T }): boolean {
    return this.components.has(componentClass);
  }

  public removeComponent<T>(componentClass: { new (...args: any[]): T }): void {
    this.components.delete(componentClass);
  }
}

export class EntitySystem {
  private entities = new Map<string, Entity>();
  private nextEntityId = 0;

  public createEntity(
    name: keyof typeof entityBlueprints,
    overrides: { position?: { x: number; y: number } } = {}
  ): Entity {
    const id = `${name}_${this.nextEntityId++}`;
    const entity = new Entity(id);

    const blueprint = entityBlueprints[name];
    if (!blueprint) {
      throw new Error(`Blueprint for entity "${name}" not found.`);
    }

    for (const componentFactory of blueprint()) {
      const component = componentFactory();
      entity.addComponent(component);
    }

    if (overrides.position) {
      const posComponent = entity.getComponent(PositionComponent);
      if (posComponent) {
        posComponent.x = overrides.position.x;
        posComponent.y = overrides.position.y;
      }
    }

    this.entities.set(id, entity);
    return entity;
  }

  destroyEntity(entity: Entity): void {
    if (entity.hasComponent(PlayableComponent)) {
      GameManager.getInstance().cleanupCurrentGame();
      GameMenus.getInstance().showRestartScreen();
    }
    entity.getComponent(RenderableComponent).imageElement.remove();
    this.entities.delete(entity.id);
  }

  getEntitiesWithComponents(...componentClasses: Array<new (...args: any[]) => any>): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (componentClasses.every((cls) => entity.hasComponent(cls))) {
        result.push(entity);
      }
    }
    return result;
  }
}

export class InputSystem {
  entitySystem: EntitySystem;
  game: Game;
  prevbullet = false;
  bulletTime = 0;
  constructor(entitySystem: EntitySystem, game: Game) {
    this.entitySystem = entitySystem;
    this.game = game;
  }
  update() {
    this.updatePlayerCommands();
    this.updateMonsterCommands();
    this.updateJumpState();
    this.updateVelocityFromCommandsForAll();
    this.handleDropBullet();
  }

  private updatePlayerCommands() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(PlayableComponent)) {
      if (entity.hasComponent(FlagReached)) continue;
      const commands = entity.getComponent(InputStateComponent);
      commands.down = this.game.commands.down;
      commands.firstJump = this.game.commands.firstJump;
      commands.jump = this.game.commands.jump;
      commands.left = this.game.commands.left;
      commands.right = this.game.commands.right;
      commands.bullet = this.game.commands.bullet;
    }
  }

  private updateMonsterCommands() {}

  private handleDropBullet() {
    this.bulletTime++;
    for (const player of this.entitySystem.getEntitiesWithComponents(Shooter)) {
      const commands = player.getComponent(InputStateComponent);

      if (commands.bullet && this.prevbullet) {
        continue;
      }
      if (!commands.bullet && this.prevbullet) {
        this.prevbullet = false;
        this.bulletTime = 0;
      }
      if (commands.bullet && !this.prevbullet && this.bulletTime > 20) {
        this.shootBullet(player);
        this.prevbullet = true;
      }
    }
  }

  private updateVelocityFromCommandsForAll() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      InputStateComponent,
      HealthComponent,
      VelocityComponent
    )) {
      if (entity.hasComponent(Flying)) continue;
      const inputs = entity.getComponent(InputStateComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const movementStats = entity.getComponent(MovementStatsComponent);
      const inAir = entity.getComponent(AnimationStateComponent).inAir;
      // if (!entity.getComponent(HealthComponent).isAlive()) continue;

      if (inputs.left && velocity.horizontal < movementStats.maxHorizontalVelocity) {
        if (inAir) {
          velocity.horizontal += movementStats.sidesSpeed / 1.5;
        } else {
          velocity.horizontal += movementStats.sidesSpeed;
        }
      }
      if (inputs.right && velocity.horizontal > -movementStats.maxHorizontalVelocity) {
        if (inAir) {
          velocity.horizontal -= movementStats.sidesSpeed / 1.5;
        } else {
          velocity.horizontal -= movementStats.sidesSpeed;
        }
      }
      if (!inputs.right && !inputs.left) {
        velocity.horizontal /= 1.1;
      }
    }
  }

  private updateJumpState() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(JumpStateComponent)) {
      const movementStats = entity.getComponent(MovementStatsComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const commands = entity.getComponent(InputStateComponent);
      const jumpState = entity.getComponent(JumpStateComponent);
      const animationState = entity.getComponent(AnimationStateComponent);
      if (
        ((jumpState.isJumping && jumpState.canJump) ||
          (!jumpState.isJumping && !animationState.inAir)) &&
        commands.jump &&
        jumpState.jumpTime < movementStats.maxJumpTime
      ) {
        if (jumpState.jumpTime === 0) {
          SoundManager.getInstance().playSound(SoundManager.getInstance().jump);
        }
        jumpState.isJumping = true;
        jumpState.jumpTime++;
        velocity.vertical = movementStats.upSpeed;
      } else {
        jumpState.isJumping = false;
        velocity.vertical -= movementStats.downSpeed;
      }
    }
  }

  private shootBullet(entity: Entity) {
    SoundManager.getInstance().fireball.play();
    const position = entity.getComponent(PositionComponent);
    const direction = entity.getComponent(AnimationStateComponent).direction;
    const commands = this.entitySystem
      .createEntity("bullet", { position: { x: position.x, y: position.y } })
      .getComponent(InputStateComponent);
    commands.left = direction;
    commands.right = !direction;
  }
}

export class SpawnSystem {
  entitySystem: EntitySystem;
  level: level;
  hardcore: boolean;
  constructor(entitySystem: EntitySystem, level: level, hardcore: boolean) {
    this.entitySystem = entitySystem;
    this.level = level;
    this.hardcore = hardcore;
  }
  update() {
    this.spawnMonsters();
    this.spawnFlag();
    if (this.hardcore) {
      this.spawnHardcoreMosnter();
    }
  }

  spawnMonsters() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(PlayableComponent)) {
      const position = entity.getComponent(PositionComponent);

      this.level.entities.forEach((e) => {
        if (e.spawnFromPosition <= position.x) {
          this.level.entities = this.level.entities.filter((ent) => ent !== e);
          const monster = this.entitySystem.createEntity(e.type, {
            position: { x: e.position.x, y: e.position.y },
          });
          if (monster.hasComponent(PathComponent) && e.path) {
            const p = monster.getComponent(PathComponent);

            const position = monster.getComponent(PositionComponent);
            p.startPosition = e.path.startPosition;
            p.endPosition = e.path.endPosition;
            position.x = e.path.startPosition.x;
            position.y = e.path.startPosition.y;
          }
        }
      });
    }
  }

  spawnFlag() {
    if (this.level.flag && !this.level.flag.spawned && this.level.flag.visible) {
      this.entitySystem.createEntity("flag", {
        position: { x: this.level.flag.x - 0.5, y: this.level.flag.y },
      });
      this.level.flag.spawned = true;
    }
  }

  spawnHardcoreMosnter() {
    if ((Date.now() / 5) % 2 === 0) {
      for (const player of this.entitySystem.getEntitiesWithComponents(
        PlayableComponent,
        CollidableComponent,
        PositionComponent
      )) {
        const position = player.getComponent(PositionComponent);

        const spawnTurtle = Math.random() < 0.08;
        const spawnHardcoreMonster = Math.random() < 0.3;
        if (spawnTurtle) {
          this.entitySystem.createEntity("hardcoreTurtle", {
            position: { x: position.x - (-30 + Math.random() * 60), y: -1 },
          });
        } else if (spawnHardcoreMonster) {
          this.entitySystem.createEntity("hardcoreMonster", {
            position: { x: position.x - (-30 + Math.random() * 60), y: -1 },
          });
        } else {
          this.entitySystem.createEntity("meteorite", {
            position: { x: position.x - (-30 + Math.random() * 60), y: -1 },
          });
        }
      }
    }
  }
}

export class CollisionSystem {
  entitySystem: EntitySystem;
  level: level;
  constructor(entitySystem: EntitySystem, level: level) {
    this.entitySystem = entitySystem;
    this.level = level;
  }

  update() {
    this.playerToPlatformCollision();
    this.playerCollision();
    this.pnjCollisions();
    this.monsterToMonsterCollision();
    this.playerToMonsterCollision();
    this.playerToBonusCollision();
    this.monsterKillerToMonsterCollision();
  }

  private testCreateBlockAt(x: number, y: number) {
    const div = document.createElement("div");
    div.className = "testCre";
    document.body.appendChild(div);
    div.style.zIndex = "5000";
    div.style.width = `${32}px`;
    div.style.height = `${32}px`;
    div.style.position = "absolute";
    div.style.border = "1px solid black";
    div.style.boxSizing = "border-box";
    div.style.left = `${
      x * GameManager.getInstance().blockSize * GameManager.getInstance().zoom
    }px`;
    div.style.top = `${
      y * GameManager.getInstance().blockSize * GameManager.getInstance().zoom +
      GameManager.getInstance().top
    }px`;
    div.style.opacity = "0.4";
    div.style.backgroundColor = this.isBlockAt(x, y) ? "red" : "green";
  }

  private removeTestBlocks() {
    const dives = document.querySelectorAll(".testCre");
    dives.forEach((d) => d.remove());
  }

  private drawLine(x: number, y: number) {
    const div = document.createElement("div");
    div.className = "testLine";
    document.body.appendChild(div);
    div.style.zIndex = "5000";
    div.style.width = `${1}px`;
    div.style.height = `${32}px`;
    div.style.position = "absolute";
    div.style.border = "1px solid black";
    div.style.boxSizing = "border-box";
    div.style.left = `${
      (x + 0.5) * GameManager.getInstance().blockSize * GameManager.getInstance().zoom
    }px`;
    div.style.top = `${
      y * GameManager.getInstance().blockSize * GameManager.getInstance().zoom +
      GameManager.getInstance().top
    }px`;
    div.style.opacity = "0.7";
    div.style.color = "blue";
  }
  private drawHorizontalLine(x: number, y: number, color?: string) {
    const div = document.createElement("div");
    div.className = "testLine";
    document.body.appendChild(div);
    div.style.zIndex = "5000";
    div.style.width = `${32}px`;
    div.style.height = `${1}px`;
    div.style.position = "absolute";
    div.style.boxSizing = "border-box";
    div.style.left = `${
      (x + 0.5) * GameManager.getInstance().blockSize * GameManager.getInstance().zoom
    }px`;
    div.style.top = `${
      y * GameManager.getInstance().blockSize * GameManager.getInstance().zoom +
      GameManager.getInstance().top
    }px`;
    div.style.opacity = "0.7";
    div.style.backgroundColor = color ? color : "blue";
  }
  private removeLines() {
    const dives = document.querySelectorAll(".testLine");
    dives.forEach((d) => d.remove());
  }

  private playerCollision() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      CollidableComponent
    )) {
      const position = entity.getComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const dimensions = entity.getComponent(PhysicsBodyComponent);
      const animation = entity.getComponent(AnimationStateComponent);
      const jumpState = entity.getComponent(JumpStateComponent);

      let nextPosition = {
        x: position.x - velocity.horizontal / 100,
        y: position.y - velocity.vertical / 100,
      };

      if (velocity.vertical < 0) {
        if (this.isBlockAt(position.x, nextPosition.y + 1, -0.499, dimensions.width)) {
          velocity.vertical = 0;
          animation.inAir = false;
          jumpState.canJump = true;
          jumpState.isJumping = false;
          jumpState.jumpTime = 0;
        } else {
          animation.inAir = true;
        }
      } else if (velocity.vertical > 0) {
        animation.inAir = true;
        if (
          this.isBlockAt(
            position.x,
            nextPosition.y + 1.1 - dimensions.height,
            -0.499,
            dimensions.width
          )
        ) {
          velocity.vertical = 0;
          position.y = Math.ceil(nextPosition.y);
          const block = this.getBlockAt(
            position.x,
            nextPosition.y + 1.1 - dimensions.height,
            0.1,
            dimensions.width,
            this.level.mysteryBlocks
          );
          if (block) {
            GameManager.getInstance().game?.updateScore(50);
            GameManager.getInstance().game?.map?.mysteryBlockHitAnimation(block[0], block[1]);
            this.level.mysteryBlocks = this.level.mysteryBlocks.filter((b) => b !== block);
            if (block[2] === 1) {
              SoundManager.getInstance().powerUpAppear.play();
              this.entitySystem.createEntity("mushroom", {
                position: { x: block[0], y: block[1] - 1 },
              });
            } else if (block[2] === 2) {
              SoundManager.getInstance().powerUpAppear.play();
              this.entitySystem.createEntity("flower", {
                position: { x: block[0], y: block[1] - 1 },
              });
            } else {
              GameManager.getInstance().game?.map.spawnCoin(block[0], block[1] - 1);
              SoundManager.getInstance().coin.play();
            }
          }
        }
      }

      if (velocity.horizontal > 0) {
        if (
          this.isBlockAt(
            nextPosition.x - 0.5,
            position.y + 0.5 * dimensions.height,
            0,
            dimensions.width
          ) ||
          this.isBlockAt(nextPosition.x - 0.5, position.y, 0, dimensions.width)
        ) {
          velocity.horizontal = 0;
        }
      } else if (velocity.horizontal < 0) {
        if (
          this.isBlockAt(
            nextPosition.x + 0.5,
            position.y + 0.5 * dimensions.height,
            0,
            dimensions.width
          ) ||
          this.isBlockAt(nextPosition.x + 0.5, position.y, 0, dimensions.width)
        ) {
          velocity.horizontal = 0;
        }
      }
    }
  }

  private playerToPlatformCollision() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      CollidableComponent
    )) {
      const position = entity.getComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const dimensions = entity.getComponent(PhysicsBodyComponent);
      const animation = entity.getComponent(AnimationStateComponent);
      const jumpState = entity.getComponent(JumpStateComponent);
      const commands = entity.getComponent(InputStateComponent);

      let nextPosition = {
        x: position.x - velocity.horizontal / 100,
        y: position.y - velocity.vertical / 100,
      };

      if (velocity.vertical <= 0) {
        const platY =
          this.isPlatformAt(nextPosition.x, nextPosition.y + 1.2) ||
          this.isPlatformAt(nextPosition.x, position.y + 1.2);
        if (platY && !commands.jump) {
          position.y = platY - 1;
          velocity.vertical = 0;
          animation.inAir = false;
          jumpState.canJump = true;
          jumpState.isJumping = false;
          jumpState.jumpTime = 0;
        }
      }
    }
  }

  private pnjCollisions() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      PnjComponent,
      VelocityComponent,
      CollidableComponent
    )) {
      const position = entity.getComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const dimensions = entity.getComponent(PhysicsBodyComponent);
      const animation = entity.getComponent(AnimationStateComponent);
      const commands = entity.getComponent(InputStateComponent);
      const jumpState = entity.getComponent(JumpStateComponent);

      let nextPosition = {
        x: position.x - velocity.horizontal / 100,
        y: position.y - velocity.vertical / 100,
      };

      if (velocity.vertical < 0) {
        if (this.isBlockAt(position.x, nextPosition.y + 1, -0.499, dimensions.width)) {
          velocity.vertical = 0;
          animation.inAir = false;
          jumpState.canJump = true;
          jumpState.isJumping = false;
          jumpState.jumpTime = 0;
          if (entity.hasComponent(TheFloorIsLava)) {
            entity.getComponent(HealthComponent).current = 0;
          }
        } else {
          animation.inAir = true;
        }
      } else if (velocity.vertical > 0) {
        animation.inAir = true;
        if (
          this.isBlockAt(
            position.x,
            nextPosition.y + 1.1 - dimensions.height,
            -0.499,
            dimensions.width
          )
        ) {
          velocity.vertical = 0;
          position.y = Math.ceil(nextPosition.y);
          const block = this.getBlockAt(
            position.x,
            nextPosition.y + 1.1 - dimensions.height,
            0.5,
            dimensions.width,
            this.level.mysteryBlocks
          );
          if (block) {
            this.level.mysteryBlocks = this.level.mysteryBlocks.filter((b) => b !== block);
            if (block[2] === 0) {
              this.entitySystem.createEntity("mushroom", {
                position: { x: block[0], y: block[1] - 1 },
              });
            }
          }
        }
      }

      if (velocity.horizontal > 0) {
        if (
          this.isBlockAt(
            nextPosition.x - 0.5,
            position.y + 0.5 * dimensions.height,
            0,
            dimensions.width
          ) ||
          this.isBlockAt(nextPosition.x - 0.5, position.y, 0, dimensions.width)
        ) {
          if (entity.hasComponent(TheWallsAreLava)) {
            entity.getComponent(HealthComponent).current = 0;
          } else {
            velocity.horizontal *= -1;
            commands.left = !commands.left;
            commands.right = !commands.right;
          }
        }
      } else if (velocity.horizontal < 0) {
        if (
          this.isBlockAt(
            nextPosition.x + 0.5,
            position.y + 0.5 * dimensions.height,
            0,
            dimensions.width
          ) ||
          this.isBlockAt(nextPosition.x + 0.5, position.y, 0, dimensions.width)
        ) {
          if (entity.hasComponent(TheWallsAreLava)) {
            entity.getComponent(HealthComponent).current = 0;
          } else {
            velocity.horizontal *= -1;
            commands.left = !commands.left;
            commands.right = !commands.right;
          }
        }
      }
    }
  }

  private monsterToMonsterCollision() {
    for (const monster of this.entitySystem.getEntitiesWithComponents(HostileComponent)) {
      if (monster.hasComponent(MonsterKiller)) continue;
      const velocity = monster.getComponent(VelocityComponent);
      const position = monster.getComponent(PositionComponent);
      const dimensions = monster.getComponent(PhysicsBodyComponent);
      const commands = monster.getComponent(InputStateComponent);

      if (
        velocity.horizontal > 0 &&
        this.isEntityAt(
          monster.id,
          position.x - dimensions.width / 2,
          position.y,
          dimensions.width,
          1,
          HostileComponent,
          MonsterKiller
        )
      ) {
        commands.left = false;
        commands.right = true;
        velocity.horizontal *= -1;
      } else if (
        velocity.horizontal < 0 &&
        this.isEntityAt(
          monster.id,
          position.x + dimensions.width / 2,
          position.y,
          dimensions.width,
          1,
          HostileComponent,
          MonsterKiller
        )
      ) {
        commands.left = true;
        commands.right = false;
        velocity.horizontal *= -1;
      }
    }
  }

  private monsterKillerToMonsterCollision() {
    for (const killer of this.entitySystem.getEntitiesWithComponents(MonsterKiller)) {
      const position = killer.getComponent(PositionComponent);
      const dimensions = killer.getComponent(PhysicsBodyComponent);
      if (
        this.isEntityAt(killer.id, position.x, position.y, dimensions.width, 1, HostileComponent)
      ) {
        const monster = this.getEntityAt(
          killer.id,
          position.x,
          position.y,
          dimensions.width,
          1,
          HostileComponent
        );
        if (!monster) continue;
        const health = monster.getComponent(HealthComponent);
        health.current--;
        GameManager.getInstance().game?.updateScore(200);
        if (killer.id.split("_")[0].toLowerCase() === "bullet") {
          killer.getComponent(HealthComponent).current = 0;
        }
      }
    }
  }

  private playerToMonsterCollision() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      CollidableComponent
    )) {
      const position = entity.getComponent(PositionComponent);
      const dimensions = entity.getComponent(PhysicsBodyComponent);
      const health = entity.getComponent(HealthComponent);
      const jumpState = entity.getComponent(JumpStateComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const movementStats = entity.getComponent(MovementStatsComponent);
      const invincibleState = entity.getComponent(InvincibleComponent);

      if (invincibleState.isInvicible) continue;
      if (
        this.isEntityAt(entity.id, position.x, position.y, dimensions.width, 1, HostileComponent) ||
        this.isEntityAt(
          entity.id,
          position.x,
          position.y - 0.5,
          dimensions.width,
          1,
          HostileComponent
        )
      ) {
        health.current--;
        invincibleState.isInvicible = true;
        if (health.current > 0) {
          SoundManager.getInstance().powerDown.play();
        }
      } else if (
        this.isEntityAt(
          entity.id,
          position.x,
          position.y + 0.51,
          dimensions.width,
          1,
          HostileComponent
        ) &&
        velocity.vertical <= 0
      ) {
        jumpState.isJumping = true;
        jumpState.jumpTime++;
        velocity.vertical = 10;
        SoundManager.getInstance().jumpOnMonster.play();
        const monster = this.getEntityAt(
          entity.id,
          position.x,
          position.y + 1,
          dimensions.width,
          1,
          HostileComponent
        );
        if (!monster) continue;
        monster.getComponent(HealthComponent).current -= 1;
        GameManager.getInstance().game?.updateScore(400);
        if (monster.id.split("_")[0] === "carapace") {
          monster.getComponent(InputStateComponent).right = true;
          monster.getComponent(VelocityComponent).horizontal = 20;
        }
      }
    }
  }

  private playerToBonusCollision() {
    for (const player of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      CollidableComponent
    )) {
      const position = player.getComponent(PositionComponent);
      const dimensions = player.getComponent(PhysicsBodyComponent);
      const health = player.getComponent(HealthComponent);

      if (this.isEntityAt(player.id, position.x, position.y, dimensions.width, 1, BonusComponent)) {
        const bonus = this.getEntityAt(
          player.id,
          position.x,
          position.y,
          dimensions.width,
          1,
          BonusComponent
        );
        if (!bonus) continue;
        bonus.getComponent(HealthComponent).current -= 1;
        health.current = 2;

        GameManager.getInstance().game?.updateScore(300);
        if (bonus.id.split("_")[0].toLowerCase() === "flower") {
          player.addComponent(new Shooter());
        }
        SoundManager.getInstance().powerUp.play();
        health.max = 2;
      }
    }
  }

  public isBlockAt(
    x: number,
    y: number,
    margin: number = 0,
    width: number = 1,
    blocks: number[][] = this.level.blocks,
    marginY: number = 0
  ): boolean {
    return blocks.some(
      ([bx, by]) =>
        bx < x + 0.5 - margin &&
        bx + width > x + 0.5 + margin &&
        by < y - marginY &&
        by + 1 > y + marginY
    );
  }

  public isPlatformAt(x: number, y: number) {
    for (const plat of this.entitySystem.getEntitiesWithComponents(Platform)) {
      const platPostition = plat.getComponent(PositionComponent);
      const body = plat.getComponent(PhysicsBodyComponent);
      const platXStart = platPostition.x;
      const platXEnd = platPostition.x + body.width;
      const platYstart = platPostition.y;
      const platYend = platPostition.y + 0.3;
      if (x > platXStart && x < platXEnd && y >= platYstart && y <= platYend) {
        return platYstart;
      }
    }
  }

  public getBlockAt(
    x: number,
    y: number,
    padding: number = 0,
    width: number = 1,
    blocks: number[][] = this.level.blocks
  ): number[] | undefined {
    const xStart = Math.floor(x + padding);
    const xEnd = Math.floor(x + width - padding);
    const yStart = Math.floor(y - 1);
    const yEnd = Math.floor(y);

    return blocks.find(([bx, by]) => bx >= xStart && bx <= xEnd && by > yStart && by <= yEnd);
  }

  public isEntityAt(
    id: string,
    x: number,
    y: number,
    width: number = 1,
    height: number = 1,
    component: new (...args: any[]) => any,
    exception?: new (...args: any[]) => any
  ): boolean {
    for (const monster of this.entitySystem.getEntitiesWithComponents(component)) {
      if (
        monster.id === id ||
        (monster.hasComponent(HealthComponent) &&
          monster.getComponent(HealthComponent).current <= 0) ||
        (exception && monster.hasComponent(exception))
      )
        continue;

      const monsterPos = monster.getComponent(PositionComponent);
      const monsterBody = monster.getComponent(PhysicsBodyComponent);

      const monsterLeft = x;
      const monsterRight = x + width;

      const monster2Left = monsterPos.x;
      const monster2Right = monsterPos.x + monsterBody.width;
      const monster2Top = monsterPos.y;
      const monster2Bottom = monsterPos.y + height;

      if (
        monsterRight < monster2Left ||
        monsterLeft > monster2Right ||
        y + 0.5 < monster2Top ||
        y + 0.5 > monster2Bottom
      ) {
        continue;
      } else {
        return true;
      }
    }

    return false;
  }

  public getEntityAt(
    id: string,
    x: number,
    y: number,
    width: number = 1,
    height: number = 1,
    component: new (...args: any[]) => any
  ): Entity | null {
    for (const monster of this.entitySystem.getEntitiesWithComponents(component)) {
      if (monster.id === id) continue;
      const monsterPos = monster.getComponent(PositionComponent);
      const monsterBody = monster.getComponent(PhysicsBodyComponent);

      const monsterLeft = x;
      const monsterRight = x + width;

      const monster2Left = monsterPos.x;
      const monster2Right = monsterPos.x + monsterBody.width;
      const monster2Top = monsterPos.y;
      const monster2Bottom = monsterPos.y + height;

      if (
        monsterRight < monster2Left ||
        monsterLeft > monster2Right ||
        y + 0.5 < monster2Top ||
        y + 0.5 > monster2Bottom
      ) {
        continue;
      } else {
        return monster;
      }
    }
    return null;
  }
}

export class PositionSystem {
  entitySystem: EntitySystem;
  level: level;
  constructor(entitySystem: EntitySystem, level: level) {
    this.entitySystem = entitySystem;
    this.level = level;
  }
  reachTime: number | null = null;

  update() {
    this.makeFlyingPath();
    this.calculatePositionFromVelocity();
    this.lookIfFlagIsReached();
    this.lookIfGameFinished();
  }

  private calculatePositionFromVelocity() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(VelocityComponent)) {
      const velocity = entity.getComponent(VelocityComponent);
      const position = entity.getComponent(PositionComponent);
      if (
        position.x - velocity.horizontal / 100 < -1 ||
        position.y - velocity.vertical / 100 >= 15
      ) {
        const health = entity.getComponent(HealthComponent);
        if (health.current <= 0) {
          this.entitySystem.destroyEntity(entity);
        } else {
          health.current = 0;
        }
      }
      position.x = position.x - velocity.horizontal / 100;
      position.y = position.y - velocity.vertical / 100;
    }
  }

  private lookIfFlagIsReached() {
    if (!this.level.flag) return;
    for (const player of this.entitySystem.getEntitiesWithComponents(PlayableComponent)) {
      const position = player.getComponent(PositionComponent);
      const commands = player.getComponent(InputStateComponent);
      const animationState = player.getComponent(AnimationStateComponent);
      const movementStats = player.getComponent(MovementStatsComponent);
      const velocity = player.getComponent(VelocityComponent);

      if (position.x >= this.level.flag.x) {
        if (!player.hasComponent(FlagReached)) {
          player.addComponent(new FlagReached());
          velocity.horizontal = 0;
          velocity.vertical = 0;
          if (!this.level.flag.visible) continue;
          SoundManager.getInstance().win.play();
          SoundManager.getInstance().pauseMusic();
          this.reachTime = Date.now();
          for (const flag of this.entitySystem.getEntitiesWithComponents(FlagComponent)) {
            flag.addComponent(new CollidableComponent());
            flag.addComponent(new PnjComponent());
            flag.addComponent(new AnimationStateComponent());
            flag.addComponent(new JumpStateComponent());
            flag.addComponent(new InputStateComponent(false, false, false, false, false));
            flag.addComponent(new VelocityComponent(0, 1));
            flag.addComponent(new MovementStatsComponent(0, 0, 0.5, 0, 0, 5, 0));
          }
          GameManager.getInstance().game?.updateScore(800);
        }
        // Wait 3 seconds after reaching the flag before continuing
        if (
          (Math.round(position.x - 0.5) === this.level.flag.x &&
            Math.round(position.y) > this.level.flag.yEnd) ||
          (this.reachTime !== null && Date.now() - this.reachTime < 5000)
        ) {
          commands.down = false;
          commands.firstJump = true;
          commands.jump = false;
          commands.left = false;
          commands.right = false;
          movementStats.maxDownVelocity *= 0.8;
          movementStats.downSpeed *= 0.8;
        } else if (this.level.flag.visible) {
          for (const flag of this.entitySystem.getEntitiesWithComponents(
            FlagComponent,
            PositionComponent,
            VelocityComponent
          )) {
            const velocity = flag.getComponent(VelocityComponent);
            if (velocity.vertical >= 0) {
              commands.down = false;
              commands.firstJump = true;
              commands.jump = false;
              commands.left = false;
              commands.right = true;
              movementStats.maxDownVelocity = 50;
              movementStats.downSpeed = 1.5;
            } else {
              if (Math.floor(Date.now() / 100) % 4 === 0) {
                GameManager.getInstance().game?.updateScore(100);
              }
              commands.down = false;
              commands.firstJump = true;
              commands.jump = false;
              commands.left = false;
              commands.right = false;
            }
          }
        } else {
          commands.down = false;
          commands.firstJump = true;
          commands.jump = false;
          commands.left = false;
          commands.right = true;
          movementStats.maxDownVelocity = 50;
          movementStats.downSpeed = 1.5;
        }
      }
    }
  }

  private lookIfGameFinished() {
    for (const player of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      PositionComponent,
      CollidableComponent
    )) {
      const position = player.getComponent(PositionComponent);
      if (position.x >= this.level.destination) {
        GameManager.getInstance().loadNextLevel();
      }
    }
  }

  private makeFlyingPath() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(Flying, PathComponent)) {
      const path = entity.getComponent(PathComponent);
      const position = entity.getComponent(PositionComponent);
      const velocity = entity.getComponent(VelocityComponent);
      const stats = entity.getComponent(MovementStatsComponent);

      if (path.startPosition.x === path.endPosition.x) {
        velocity.horizontal = 0;
      } else {
        if (position.x < path.endPosition.x) {
          velocity.horizontal = Math.abs(velocity.horizontal);
        } else if (position.x > path.startPosition.x) {
          velocity.horizontal = -Math.abs(velocity.horizontal);
        }
      }
      if (path.startPosition.y === path.endPosition.y) {
        velocity.vertical = 0;
      } else {
        if (position.y > path.endPosition.y) {
          velocity.vertical += stats.upSpeed;
        } else if (position.y <= path.startPosition.y) {
          velocity.vertical -= stats.upSpeed;
        } else if (velocity.vertical > 0 && velocity.vertical < stats.maxUpVelocity) {
          velocity.vertical += stats.upSpeed;
        } else if (velocity.vertical < 0 && velocity.vertical > -stats.maxUpVelocity) {
          velocity.vertical -= stats.upSpeed;
        } else {
          velocity.vertical *= 0.8;
        }
      }
    }
  }
}

export class StateSystem {
  entitySystem: EntitySystem;
  constructor(entitySystem: EntitySystem) {
    this.entitySystem = entitySystem;
  }
  update() {
    this.handlePlayerDeath();
    this.handlePlayerBig();
    this.handleInvincibleState();
    this.handleMonsterDeath();
  }

  private handlePlayerDeath() {
    for (const player of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      CollidableComponent
    )) {
      const health = player.getComponent(HealthComponent);
      const jumpState = player.getComponent(JumpStateComponent);
      const velocity = player.getComponent(VelocityComponent);
      const movementStats = player.getComponent(MovementStatsComponent);
      if (health.current <= 0) {
        SoundManager.getInstance().death.play();
        SoundManager.getInstance().pauseMusic();
        jumpState.isJumping = true;
        jumpState.jumpTime++;
        velocity.vertical = movementStats.upSpeed * 2;
        velocity.horizontal = 0;
        player.removeComponent(CollidableComponent);
      }
    }
  }

  private handlePlayerBig() {
    for (const player of this.entitySystem.getEntitiesWithComponents(
      PlayableComponent,
      HealthComponent
    )) {
      const health = player.getComponent(HealthComponent);
      const dimensions = player.getComponent(PhysicsBodyComponent);
      const sprite = player.getComponent(RenderableComponent);
      if (health.current >= 2) {
        if (player.hasComponent(Shooter)) {
          sprite.sprite = sprites[10];
        } else {
          sprite.sprite = sprites[6];
        }
        dimensions.height = 2;
        sprite.imageElement.src = sprite.sprite.default;
        sprite.imageElement.height =
          GameManager.getInstance().blockSize * GameManager.getInstance().zoom * 2;
      } else if (health.current <= 1) {
        if (player.hasComponent(Shooter)) {
          sprite.sprite = sprites[9];
        } else {
          sprite.sprite = sprites[0];
        }
        dimensions.height = 1;

        sprite.imageElement.src = sprite.sprite.default;
        sprite.imageElement.height =
          GameManager.getInstance().blockSize * GameManager.getInstance().zoom;
      }
    }
  }

  private handleInvincibleState() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(InvincibleComponent)) {
      const invincibleState = entity.getComponent(InvincibleComponent);
      const render = entity.getComponent(RenderableComponent);
      if (invincibleState.isInvicible && invincibleState.time < invincibleState.maxTime) {
        invincibleState.time += 1;
      } else if (invincibleState.isInvicible) {
        invincibleState.isInvicible = false;
        invincibleState.time = 0;
        render.imageElement.style.visibility = "visible";
      }
    }
  }

  private handleMonsterDeath() {
    for (const monster of this.entitySystem.getEntitiesWithComponents(
      PnjComponent,
      HealthComponent
    )) {
      const health = monster.getComponent(HealthComponent);
      const timeAfterDeath = monster.getComponent(DisparitionTimeAfterDeath);
      const controls = monster.getComponent(InputStateComponent);
      const position = monster.getComponent(PositionComponent);

      if (health.current <= 0) {
        monster.removeComponent(HostileComponent);
        const velocity = monster.getComponent(VelocityComponent);
        if (velocity) {
          velocity.horizontal = 0;
        }
        controls.left = controls.right = false;

        if (monster.hasComponent(DropafterDeath)) {
          const drop = monster.getComponent(DropafterDeath);
          this.entitySystem.createEntity(drop.entity, {
            position: { x: position.x, y: position.y },
          });
        }

        if (monster.hasComponent(Flying)) {
          monster.removeComponent(Flying);
        }
        if (monster.hasComponent(PathComponent)) {
          monster.removeComponent(PathComponent);
        }
        // if (!monster.hasComponent(CollidableComponent)) {
        //   console.log("monster is now collidable");
        //   monster.addComponent(new CollidableComponent());
        // }
        if (!monster.hasComponent(JumpStateComponent)) {
          monster.addComponent(new JumpStateComponent());
        }

        setTimeout(() => {
          this.entitySystem.destroyEntity(monster);
        }, timeAfterDeath.time);
      }
    }
  }
}

export class RenderSystem {
  entitySystem: EntitySystem;
  constructor(entitySystem: EntitySystem) {
    this.entitySystem = entitySystem;
  }

  update() {
    this.updatePosition();
    this.setMovementState();
    this.invincibilityFrames();
    this.updateSprite();
  }

  private updatePosition() {
    const entitiesToDisplay = this.entitySystem.getEntitiesWithComponents(RenderableComponent);
    for (const entity of entitiesToDisplay) {
      const position = entity.getComponent(PositionComponent);
      const dimentions = entity.getComponent(PhysicsBodyComponent);
      const img = entity.getComponent(RenderableComponent).imageElement;
      img.style.transform = `translate(
        ${position.x * GameManager.getInstance().blockSize * GameManager.getInstance().zoom}px,
        ${
          (position.y + 1 - dimentions.height) *
            GameManager.getInstance().blockSize *
            GameManager.getInstance().zoom +
          GameManager.getInstance().top
        }px
      )`;
    }
  }

  private setMovementState() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      AnimationStateComponent,
      VelocityComponent
    )) {
      if (entity.hasComponent(Flying)) continue;
      const velocity = entity.getComponent(VelocityComponent);
      const animationState = entity.getComponent(AnimationStateComponent);
      const commands = entity.getComponent(InputStateComponent);

      const direction: boolean = velocity.horizontal > 0;

      let turningBack =
        (velocity.horizontal < 0 && commands.left && !commands.right) ||
        (velocity.horizontal > 0 && !commands.left && commands.right);

      let walking: boolean = false;

      if (Math.abs(velocity.horizontal) > 0.4 && !animationState.inAir && !turningBack) {
        walking = true;
      }

      animationState.isTurningBack = turningBack && !animationState.inAir;
      animationState.direction = direction;
      animationState.isWalking = walking;
    }
  }

  private updateSprite() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      RenderableComponent,
      HealthComponent,
      AnimationStateComponent
    )) {
      const renderable = entity.getComponent(RenderableComponent);
      const img = renderable.imageElement;
      const sprites = renderable.sprite;
      const alive = entity.getComponent(HealthComponent).isAlive();
      const animationState = entity.getComponent(AnimationStateComponent);
      if (animationState.direction) {
        img.style.transform += " scaleX(-1)";
      }
      if (animationState.inAir && sprites.jump) {
        img.src = sprites.jump;
      }
      if (animationState.isTurningBack && sprites.turningBack) {
        img.src = sprites.turningBack;
        img.style.transform += " scaleX(-1)";
      }
      if (animationState.isWalking && sprites.walkingFrames) {
        const now = Date.now();
        const index = Math.floor((now / 100) % sprites.walkingFrames.length);
        img.src = sprites.walkingFrames[index];
      }
      if (!alive) {
        img.src = sprites.dead;
      }

      if (
        alive &&
        !animationState.isWalking &&
        !animationState.inAir &&
        !animationState.isTurningBack
      ) {
        img.src = sprites.default;
      }
    }
  }

  private invincibilityFrames() {
    for (const entity of this.entitySystem.getEntitiesWithComponents(
      InvincibleComponent,
      RenderableComponent
    )) {
      const invincibleState = entity.getComponent(InvincibleComponent);
      const isAlive = entity.getComponent(HealthComponent).isAlive();
      if (!invincibleState.isInvicible || !isAlive) continue;
      const render = entity.getComponent(RenderableComponent);
      const display = render.imageElement.style.visibility;
      if (display === "hidden" && (Date.now() / 50) % 2 >= 1) {
        render.imageElement.style.visibility = "visible";
      } else if ((Date.now() / 50) % 2 >= 1) {
        render.imageElement.style.visibility = "hidden";
      }
    }
  }
}
