import {
  CollisionSystem,
  EntitySystem,
  InputSystem,
  PositionSystem,
  RenderSystem,
  SpawnSystem,
  StateSystem,
  type Entity,
} from "../ecs";
import { GameManager } from "./gameManager";
import type { commands, level, playerState } from "../data/types";
import {
  HealthComponent,
  PlayableComponent,
  RenderableComponent,
  Shooter,
} from "../data/components";
import { SoundManager } from "./soundManager";

export class Game {
  private animationFrameId: number | null = null;
  public isRunning: boolean = false;
  level: level;
  map: GameMap;
  entitySystem: EntitySystem;
  player: Entity;
  inputSystem: InputSystem;
  spawnSystem: SpawnSystem;
  collisionSystem: CollisionSystem;
  positionSystem: PositionSystem;
  stateSystem: StateSystem;
  renderSystem: RenderSystem;

  time = 0;
  timer: number;
  startTime: number | undefined;
  private lastDisplayedSecond: number = -1;
  private pauseStartTime: number | null = null;

  score: number;

  hard: boolean;

  commands: commands = {
    jump: false,
    down: false,
    left: false,
    right: false,
    firstJump: true,
    bullet: false,
    canBullet: false,
  };

  handleKeyDown = (e: KeyboardEvent): void => {};
  handleKeyUp = (e: KeyboardEvent): void => {};
  leftButton: HTMLButtonElement | null = null;
  rightButton: HTMLButtonElement | null = null;
  jumpButton: HTMLButtonElement | null = null;

  constructor(level: level, hard: boolean, score: number, playerState: playerState | null) {
    this.hard = hard;
    this.level = level;
    this.timer = hard ? Math.ceil(level.timer / 2) + 1 : level.timer + 1;
    this.score = score;
    this.entitySystem = new EntitySystem();
    this.player = this.entitySystem.createEntity("mario", {
      position: { x: this.level.spawn.x, y: this.level.spawn.y },
    });
    if (playerState) {
      const health = this.player.getComponent(HealthComponent);
      if (health) {
        health.current = playerState.lifes;
        // Assurez-vous que la vie max est au moins égale à la vie actuelle
        health.max = Math.max(health.max, playerState.lifes);
      }
      if (playerState.hasShooterMode) {
        this.player.addComponent(new Shooter());
      }
    }
    this.map = new GameMap(this.level, this.leftButton, this.rightButton, this.jumpButton, this);
    this.inputSystem = new InputSystem(this.entitySystem, this);
    this.spawnSystem = new SpawnSystem(this.entitySystem, this.level, hard);
    this.collisionSystem = new CollisionSystem(this.entitySystem, this.level);
    this.positionSystem = new PositionSystem(this.entitySystem, this.level);
    this.stateSystem = new StateSystem(this.entitySystem);
    this.renderSystem = new RenderSystem(this.entitySystem);
  }

  public async init(): Promise<void> {
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
    this.setupControls();
    this.isRunning = true;
    this.startTime = Date.now();
    SoundManager.getInstance().resetMusic(this.hard ? "/sounds/castle.mp3" : "/sounds/music.mp3");
    SoundManager.getInstance().levelUp.play();
  }

  public run() {
    if (this.isRunning) {
      this.updateTime();
      this.map.centerCamera();
      this.inputSystem.update();
      this.spawnSystem.update();
      this.collisionSystem.update();
      this.positionSystem.update();
      this.stateSystem.update();
      this.renderSystem.update();
    }

    this.animationFrameId = requestAnimationFrame(() => this.run());
  }

  public stop() {
    this.isRunning = false;
    this.pauseStartTime = Date.now();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    SoundManager.getInstance().pauseMusic();
    SoundManager.getInstance().pause.play();
  }

  public resume() {
    if (this.isRunning || this.pauseStartTime === null) return; // Sécurité pour ne pas reprendre plusieurs fois

    // Corriger le startTime pour ignorer le temps de pause
    if (this.startTime) {
      const pauseDuration = Date.now() - this.pauseStartTime;
      this.startTime += pauseDuration;
    }
    this.pauseStartTime = null;

    this.isRunning = true;
    this.map.removePause();
    SoundManager.getInstance().playMusic(this.hard ? "/sounds/castle.mp3" : "/sounds/music.mp3");
  }

  public getPlayerState(): playerState {
    const health = this.player.getComponent(HealthComponent);
    const hasShooter = this.player.hasComponent(Shooter);
    return {
      lifes: health ? health.current : 1, // Valeur par défaut si le composant n'existe pas
      hasShooterMode: hasShooter,
    };
  }

  private updateTime() {
    if (!this.startTime) return;

    if (this.timer === 3) {
      SoundManager.getInstance().timeOut.play();
      SoundManager.getInstance().pauseMusic();
    }

    if (this.timer <= 0) {
      for (const player of this.entitySystem.getEntitiesWithComponents(
        PlayableComponent,
        HealthComponent
      )) {
        player.getComponent(HealthComponent).current = 0;
      }
      return;
    }

    this.time = Date.now() - this.startTime;
    const totalSeconds = Math.floor(this.time / 1000);

    if (totalSeconds !== this.lastDisplayedSecond) {
      this.lastDisplayedSecond = totalSeconds;

      this.timer--;
      this.map.updateTimer(this.timer);
    }
  }

  public updateScore(value: number) {
    this.score += value;
    this.map.updateScore(value);
  }

  private setupControls() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "s" || key.toLowerCase() === "arrowdown") this.commands.down = true;
      if (key === "q" || key.toLowerCase() === "arrowleft") {
        this.commands.left = true;
        if (this.leftButton) this.leftButton.style.opacity = "0.6";
      }
      if (key === "d" || key.toLowerCase() === "arrowright") {
        this.commands.right = true;
        if (this.rightButton) this.rightButton.style.opacity = "0.6";
      }
      if (e.key === " " || key.toLowerCase() === "arrowup" || key.toLowerCase() === "z") {
        this.commands.jump = true;
        if (this.jumpButton) this.jumpButton.style.opacity = "0.6";
      }
      if (e.key.toLowerCase() === "enter") {
        this.commands.bullet = true;
      }
      if (e.key != "F12") e.preventDefault();
      if (e.key.toLowerCase() === "p") {
        if (this.isRunning) {
          this.stop();
          this.map.createPause();
        } else {
          this.resume();
        }
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "s" || key.toLowerCase() === "arrowdown") this.commands.down = false;
      if (key === "q" || key.toLowerCase() === "arrowleft") {
        this.commands.left = false;
        if (this.leftButton) this.leftButton.style.opacity = "1";
      }
      if (key === "d" || key.toLowerCase() === "arrowright") {
        this.commands.right = false;
        if (this.rightButton) this.rightButton.style.opacity = "1";
      }
      if (e.key === " " || key.toLowerCase() === "arrowup" || key.toLowerCase() === "z") {
        this.commands.jump = false;
        this.commands.firstJump = true;
        if (this.jumpButton) this.jumpButton.style.opacity = "1";
      }
      if (e.key.toLowerCase() === "enter") {
        this.commands.bullet = false;
      }
    };

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public removeControls() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public cleanupDOM() {
    // Supprime la map et la grille si elles existent
    document.getElementById("map")?.remove();
    document.getElementById("grid")?.remove();
    document.getElementById("scoreAndTime")?.remove();
    document.querySelectorAll(".brick").forEach((e) => {
      e.remove();
    });

    document.getElementById("soundButton")?.remove();
    // Supprime tous les éléments d'entités (sprites)
    this.entitySystem.getEntitiesWithComponents(RenderableComponent).forEach((entity) => {
      entity.getComponent(RenderableComponent).imageElement.remove();
    });

    // Supprime les boutons de contrôle
    document.querySelector(".buttonsContainer")?.remove();
  }
}

export class GameMap {
  game: Game;
  level: level;
  blockSize: number;
  zoom: number;
  leftButton: HTMLButtonElement | null;
  rightButton: HTMLButtonElement | null;
  jumpButton: HTMLButtonElement | null;

  constructor(
    level: level,
    leftButton: HTMLButtonElement | null,
    rightButton: HTMLButtonElement | null,
    jumpButton: HTMLButtonElement | null,
    game: Game
  ) {
    this.level = level;
    this.leftButton = leftButton;
    this.rightButton = rightButton;
    this.jumpButton = jumpButton;
    this.game = game;

    this.blockSize = GameManager.getInstance().blockSize;
    this.zoom = GameManager.getInstance().zoom;
    this.showMap();
    this.displayDirectionnalButtons();
    this.showScoreAndTime(this.game.score);
    this.displaySoundButton();
    // this.showGrid();
  }

  public createPause() {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.id = "pauseButton";
    button.style.zIndex = "200";
    button.style.position = "sticky";
    button.style.width = "120px";
    button.style.height = "40px";
    button.style.top = "calc(50% - 20px)";
    button.style.left = "calc(50% - 60px)";
    button.innerText = "Resume";
    button.style.backgroundColor = "black";
    button.addEventListener("click", () => {
      this.game.resume();
    });
  }

  public removePause() {
    const button = document.getElementById("pauseButton");
    this.game.isRunning = true;
    this.game.run();
    button?.remove();
  }

  private showScoreAndTime = (scoreNumber: number): void => {
    const menu = document.createElement("div");
    document.body.appendChild(menu);
    menu.className = "scoreAndTime";
    menu.id = "scoreAndTime";
    menu.style.top = `${GameManager.getInstance().top}px`;
    menu.appendChild(this.createScore(scoreNumber));
    menu.appendChild(this.createTimer());
  };

  private createScore = (scoreNumber: number): HTMLHeadingElement => {
    const score = document.createElement("h3");
    score.textContent = `Score: ${scoreNumber}`;
    score.id = "score";
    return score;
  };

  private createTimer = (): HTMLHeadingElement => {
    const timer = document.createElement("h3");
    timer.textContent = `time: ${this.level.timer}`;
    timer.id = "timer";
    return timer;
  };

  private displaySoundButton = () => {
    const sound = document.createElement("button");

    sound.id = "soundButton";
    if (SoundManager.getInstance().getVolume() > 0) {
      sound.innerHTML = `
      <svg 
      width="44" 
      height="40"
       viewBox="0 0 22 20" 
       fill="none"
      xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" 
d="M10 0H8V2H6V4H4V6H2H0V8V12V14H2H4V16H6V18H8V20H10V0ZM6 
16V14H4V12H2V8H4V6H6V4H8V16H6ZM12 8H14V12H12V8ZM20 
2H18V0H12V2H18V4H20V16H18V18H12V20H18V18H20V16H22V4H20V2ZM18 
6H16V4H12V6H16V14H12V16H16V14H18V6Z" 
fill="white"/>
</svg>
`;
    } else {
      sound.innerHTML = `
      <svg 
      width="36" 
      height="40" 
      viewBox="0 0 18 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" 
d="M10 0H8V2H6V4H4V6H2H0V8V12V14H2H4V16H6V18H8V20H10V0ZM6 
16V14H4V12H2V8H4V6H6V4H8V16H6ZM16.0002 
9.22327H14.0005V7.22327H12.0005V9.22327H14.0002V11.2233L12.0005 
11.2233V13.2233H14.0005V11.2233L16.0002 
11.2233V13.2233H18.0002V11.2233L16.0002 11.2233V9.22327ZM16.0002 
9.22327H18.0002V7.22327H16.0002V9.22327Z" 
fill="white"/>
</svg>
`;
    }

    document.body.appendChild(sound);

    sound.addEventListener("click", () => {
      const soundManager = SoundManager.getInstance();
      const currentVolume = soundManager.getVolume();

      if (currentVolume > 0) {
        // Mute
        soundManager.setVolume(0);
        sound.innerHTML = `<svg width="36" height="40" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M10 0H8V2H6V4H4V6H2H0V8V12V14H2H4V16H6V18H8V20H10V0ZM6 16V14H4V12H2V8H4V6H6V4H8V16H6ZM16.0002 9.22327H14.0005V7.22327H12.0005V9.22327H14.0002V11.2233L12.0005 11.2233V13.2233H14.0005V11.2233L16.0002 11.2233V13.2233H18.0002V11.2233L16.0002 11.2233V9.22327ZM16.0002 9.22327H18.0002V7.22327H16.0002V9.22327Z" fill="white"/>
</svg>
`; // Icône muet
      } else {
        // Remet le son
        soundManager.setVolume(0.5);
        sound.innerHTML = `
      <svg 
      width="44" 
      height="40"
       viewBox="0 0 22 20" 
       fill="none"
      xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" 
d="M10 0H8V2H6V4H4V6H2H0V8V12V14H2H4V16H6V18H8V20H10V0ZM6 
16V14H4V12H2V8H4V6H6V4H8V16H6ZM12 8H14V12H12V8ZM20 
2H18V0H12V2H18V4H20V16H18V18H12V20H18V18H20V16H22V4H20V2ZM18 
6H16V4H12V6H16V14H12V16H16V14H18V6Z" 
fill="white"/>
</svg>
`;
      }
    });
  };

  public updateScore = (value: number) => {
    const score = document.getElementById("score");
    if (score) {
      score.textContent = `Score: ${this.game.score - value} +${value}`;
      setTimeout(() => {
        score.textContent = `Score: ${this.game.score}`;
      }, 800);
    }
  };

  public updateTimer = (timerNum: number) => {
    const timer = document.getElementById("timer");
    if (!timer) return;
    if (timerNum < 10) timer.style.color = "red";
    timer.textContent = `time: ${timerNum < 100 ? "0" : ""}${timerNum < 10 ? "0" : ""}${timerNum}`;
  };

  public spawnCoin = (x: number, y: number) => {
    const img = document.createElement("img");
    img.src = "/coin.png";
    img.className = "coin";
    img.className = "brick";
    img.style.position = "absolute";
    img.style.transition = "transform 0.3s ease-out";
    img.style.transform = "translateY(0px)";
    img.style.zIndex = "200";
    img.style.top = `${
      (y - 0.5) * GameManager.getInstance().blockSize * GameManager.getInstance().zoom +
      GameManager.getInstance().top
    }px`;
    img.style.left = `${
      x * GameManager.getInstance().blockSize * GameManager.getInstance().zoom - 0.5
    }px`;
    img.style.width = `${
      GameManager.getInstance().blockSize * GameManager.getInstance().zoom + 1
    }px`;

    document.body.appendChild(img);

    requestAnimationFrame(() => {
      img.style.transform = "translateY(-30px) scaleX(-1)";
    });

    setTimeout(() => {
      img.remove();
    }, 400);
  };

  private showMap = async (): Promise<void> => {
    const img = document.createElement("img");
    img.id = "map";
    img.src = this.level.map;
    img.alt = "image of level";
    img.style.position = "absolute";
    img.style.top = `${GameManager.getInstance().top}px`;
    img.style.left = "0";

    const loadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        img.height = img.naturalHeight * GameManager.getInstance().zoom;
        resolve();
      };
      img.onerror = () => reject(new Error("Erreur de chargement de l'image"));
    });

    document.body.appendChild(img);

    await loadPromise;
    return;
  };

  private displayDirectionnalButtons = () => {
    this.leftButton = document.createElement("button");
    this.leftButton.classList = "controlButton left";
    this.leftButton.addEventListener("mousedown", () => {
      this.game.commands.left = true;
    });
    this.leftButton.addEventListener("mouseup", () => {
      this.game.commands.left = false;
    });
    this.leftButton.addEventListener("mouseleave", () => {
      this.game.commands.left = false;
    });

    this.leftButton.addEventListener("touchstart", () => {
      this.game.commands.left = true;
    });

    this.leftButton.addEventListener("touchend", () => {
      this.game.commands.left = false;
    });

    this.leftButton.innerHTML = `   <svg
  width="50"
  height="50"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10 20H8V4H10V6H12V9H14V11H16V13H14V15H12V18H10V20Z"
    fill="white"
  />
</svg>`;

    this.rightButton = document.createElement("button");
    this.rightButton.classList = "controlButton right";
    this.rightButton.addEventListener("mousedown", () => {
      this.game.commands.right = true;
    });
    this.rightButton.addEventListener("mouseup", () => {
      this.game.commands.right = false;
    });
    this.rightButton.addEventListener("mouseleave", () => {
      this.game.commands.right = false;
    });

    this.rightButton.addEventListener("touchstart", () => {
      this.game.commands.right = true;
    });

    this.rightButton.addEventListener("touchend", () => {
      this.game.commands.right = false;
    });

    this.rightButton.innerHTML = `    <svg
  width="50"
  height="50"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10 20H8V4H10V6H12V9H14V11H16V13H14V15H12V18H10V20Z"
    fill="white"
  />
</svg>`;

    this.jumpButton = document.createElement("button");
    this.jumpButton.classList = "controlButton jump";
    this.jumpButton.addEventListener("mousedown", () => {
      this.game.commands.jump = true;
    });
    this.jumpButton.addEventListener("mouseup", () => {
      this.game.commands.jump = false;
    });
    this.jumpButton.addEventListener("mouseleave", () => {
      this.game.commands.jump = false;
    });

    this.jumpButton.addEventListener("touchstart", () => {
      this.game.commands.jump = true;
    });

    this.jumpButton.addEventListener("touchend", () => {
      this.game.commands.jump = false;
    });

    this.jumpButton.innerHTML = `
<svg
  width="50"
  height="50"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M17 5H19V7H21V17H19V19H17V21H7V19H5V17H3V7H5V5H7V3H17V5Z"
    fill="white"
  />
</svg>

`;

    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "buttonsContainer";

    buttonsContainer.appendChild(this.leftButton);
    buttonsContainer.appendChild(this.jumpButton);
    buttonsContainer.appendChild(this.rightButton);

    document.body.appendChild(buttonsContainer);
  };

  public mysteryBlockHitAnimation = (x: number, y: number) => {
    const img = document.createElement("img");
    document.body.appendChild(img);
    img.src = "/mystery.png";
    img.className = "brick";
    img.style.position = "absolute";
    img.style.zIndex = "200";
    img.style.top = `${
      y * GameManager.getInstance().blockSize * GameManager.getInstance().zoom +
      GameManager.getInstance().top -
      3.5 * GameManager.getInstance().zoom
    }px`;
    img.style.left = `${
      x * GameManager.getInstance().blockSize * GameManager.getInstance().zoom - 0.5
    }px`;
    img.style.width = `${
      GameManager.getInstance().blockSize * GameManager.getInstance().zoom + 1
    }px`;

    setTimeout(() => {
      img.remove();
      const brick = document.createElement("img");
      document.body.appendChild(brick);
      brick.src = "/brick.png";
      brick.className = "brick";
      brick.style.position = "absolute";
      brick.style.zIndex = "200";
      brick.style.top = `${
        y * GameManager.getInstance().blockSize * GameManager.getInstance().zoom +
        GameManager.getInstance().top
      }px`;
      brick.style.left = `${
        x * GameManager.getInstance().blockSize * GameManager.getInstance().zoom
      }px`;
      brick.style.width = `${
        GameManager.getInstance().blockSize * GameManager.getInstance().zoom
      }px`;
    }, 150);
  };

  private showGrid = (): void => {
    const grid = document.createElement("div");
    grid.id = "grid";
    const width = 224;
    const height = 15;
    const blockSizeXzoom = GameManager.getInstance().blockSize * GameManager.getInstance().zoom;
    grid.dataset.width = String(width * blockSizeXzoom);
    grid.style.width = `${width * blockSizeXzoom}px`;
    grid.style.height = `${height * blockSizeXzoom}px`;
    grid.style.position = "absolute";
    grid.style.top = `${GameManager.getInstance().top}px`;
    grid.style.left = "0";
    grid.style.zIndex = "20";
    grid.style.display = "grid";
    for (let i = 0; i < width; i++) {
      for (let a = 0; a < height; a++) {
        const block = document.createElement("div");
        block.style.border = "1px solid black";
        block.style.boxSizing = "border-box";
        block.style.gridColumn = `${i + 1}`;
        block.style.gridRow = `${a + 1}`;
        block.style.width = `${blockSizeXzoom}px`;
        block.style.height = `${blockSizeXzoom}px`;
        block.innerText = `${i}:${a}`;
        block.style.fontSize = "6px";
        block.dataset.position = `${i}:${a}`;
        grid.appendChild(block);
      }
    }
    document.body.appendChild(grid);
  };

  private showHitboxes = (): void => {
    this.level.blocks.forEach((b) => {
      const block = document.querySelector(`[data-position="${b[0]}:${b[1]}"]`);
      if (block) {
        block.classList.add("red");
      }
    });

    this.level.mysteryBlocks.forEach((b) => {
      const block = document.querySelector(`[data-position="${b[0]}:${b[1]}"]`);
      if (block) {
        block.classList.add("green");
      }
    });

    this.level.ascencor.forEach((a) => {
      const block = document.querySelector(`[data-position="${a[0]}:${a[1]}"]`);
      if (block) {
        block.classList.add("yellow");
      }
    });
  };

  centerCamera = (): void => {
    const mario = document.getElementsByClassName("mario")[0];
    mario?.scrollIntoView({
      behavior: "auto",
      block: "end",
      inline: "center",
    });
  };
}
