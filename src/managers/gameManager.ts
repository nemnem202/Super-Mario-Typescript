import { AssetManager } from "./assetsManager";
import { Game } from "./game";
import { GameMenus } from "./gameMenu";
import { levels } from "../data/levels";
import { SpriteManager } from "./spriteManager";
import { sprites } from "../data/sprites";
import { uiAssets } from "../data/uiAssets";

export class GameManager {
  private static _instance: GameManager;

  public game: Game | undefined;
  public currentLevel = 0;
  public hardcoreMode: boolean = false;
  public top = 50;
  public blockSize = 16;
  public zoom = 2;

  private constructor() {}

  static getInstance(): GameManager {
    if (!GameManager._instance) {
      GameManager._instance = new GameManager();
    }
    return GameManager._instance;
  }

  async init() {
    document.getElementById("modal")?.remove();
    GameMenus.getInstance().showLoadingScreen();

    try {
      const spritePromise = SpriteManager.getInstance().preloadSprites(sprites);
      const assetPromise = AssetManager.getInstance().preloadAssets(uiAssets);

      await Promise.all([spritePromise, assetPromise]);

      GameMenus.getInstance().buildAndShowMenu();
      GameMenus.getInstance().enableButtons();
    } catch (error) {
      GameMenus.getInstance().showError("Impossible de charger les ressources du jeu.");
    }
  }

  public returnToMainMenu(): void {
    this.cleanupCurrentGame();
    GameMenus.getInstance().showMainMenu();
  }

  async loadGame(level: number, score: number = 0) {
    this.cleanupCurrentGame();
    this.game = new Game(this.copyOf(levels[level]), this.hardcoreMode, score);
    await this.game.init();
    if (this.game) {
      this.game.run();
    }
  }

  public restart(): void {
    this.loadGame(this.currentLevel);
  }

  public loadNextLevel(): void {
    const nextLevelIndex = this.currentLevel + 1;
    if (levels[nextLevelIndex]) {
      this.currentLevel = nextLevelIndex;
      const score = this.game?.score;
      console.log("score", score);
      this.loadGame(this.currentLevel, score);
    } else {
      this.returnToMainMenu();
    }
  }

  public cleanupCurrentGame() {
    if (this.game) {
      this.game.removeControls();
      this.game.cleanupDOM();
      this.game.stop();
      this.game = undefined;
    }
  }

  private copyOf(array: any) {
    return JSON.parse(JSON.stringify(array));
  }
}
