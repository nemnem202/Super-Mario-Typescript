import { GameManager } from "./gameManager";
import { levels } from "../data/levels";

export class GameMenus {
  private static _instance: GameMenus;
  private menuContainer: HTMLDivElement | null = null;
  private levelButtons: HTMLButtonElement[] = [];
  private constructor() {}

  static getInstance(): GameMenus {
    if (!GameMenus._instance) {
      GameMenus._instance = new GameMenus();
    }
    return GameMenus._instance;
  }

  buildAndShowMenu() {
    if (!this.menuContainer) {
      // Au cas où, on s'assure que le conteneur existe
      this.showLoadingScreen();
    }
    const menu = this.menuContainer!;

    // On retire le message de chargement si il est encore là
    document.getElementById("loading-message")?.remove();

    this.loadHardButton(menu);
    // this.loadImg(menu); // Maintenant, cette méthode trouvera l'asset !
    this.loadTuto(menu);
    this.loadButtons(menu);
  }

  showLoadingScreen() {
    // Si un menu existe déjà, on le supprime
    document.getElementById("menu")?.remove();

    const menu = document.createElement("div");
    menu.id = "menu";
    const loadingMessage = document.createElement("p");
    loadingMessage.id = "loading-message";
    loadingMessage.innerText = "Chargement des ressources...";
    menu.appendChild(loadingMessage);
    document.body.appendChild(menu);
    this.menuContainer = menu;
  }
  private loadButtons(menu: HTMLDivElement) {
    levels.forEach((l) => {
      const button = document.createElement("button");
      button.innerText = `level ${l.level + 1}`;
      button.disabled = true; // <-- DÉSACTIVÉ PAR DÉFAUT
      this.levelButtons.push(button); // On les garde en référence

      menu.appendChild(button);
      button.addEventListener("click", () => {
        GameManager.getInstance().currentLevel = l.level;
        GameManager.getInstance().loadGame(GameManager.getInstance().currentLevel);
        menu.remove();
      });
    });
  }

  // Nouvelle méthode pour activer les boutons
  public enableButtons() {
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }
    this.levelButtons.forEach((button) => (button.disabled = false));
  }

  // Nouvelle méthode pour afficher une erreur
  public showError(message: string) {
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
      loadingMessage.innerText = message;
      loadingMessage.style.color = "red";
    }
  }

  // private loadImg(menu: HTMLDivElement) {
  //   const cachedImg = AssetManager.getInstance().getAsset("title.png");

  //   if (!cachedImg) {
  //     console.error("L'image du titre 'title.png' n'a pas été trouvée dans le cache !");
  //     // On pourrait créer un placeholder ou ne rien afficher
  //     return;
  //   }

  //   const menuImg = cachedImg.cloneNode() as HTMLImageElement;
  //   menuImg.alt = "Super Mario Title";
  //   menuImg.style.display = "block";
  //   menuImg.style.margin = "10px auto";
  //   menuImg.style.width = "80dvw";
  //   menuImg.style.maxWidth = "600px";
  //   menuImg.style.objectFit = "contain";
  //   menuImg.style.imageRendering = "auto";
  //   menuImg.decoding = "async";
  //   menuImg.loading = "eager";
  //   menu.appendChild(menuImg);
  // }

  private loadTuto(menu: HTMLDivElement) {
    const tuto = document.createElement("div");
    tuto.id = "tuto";
    const leftInputsTuto = [this.inputTuto("Q"), this.inputTuto("↑", -90)];
    const rightInputsTuto = [this.inputTuto("D"), this.inputTuto("↑", 90)];
    const jumpInputsTuto = [this.inputTuto("Z"), this.inputTuto("↑"), this.inputTuto("SPACE")];
    const downInputsTuto = [this.inputTuto("S"), this.inputTuto("↓")];
    const shootInputsTuto = [this.inputTuto("ENTER")];
    const pauseInputsTuto = [this.inputTuto("P")];
    const leftLine = this.inputTutoLine(leftInputsTuto, "LEFT", 1, 1);
    const rightLine = this.inputTutoLine(rightInputsTuto, "RIGHT", 2, 1);
    const jumpLine = this.inputTutoLine(jumpInputsTuto, "JUMP", 1, 2);
    const downLine = this.inputTutoLine(downInputsTuto, "DOWN", 3, 1);
    const shootLine = this.inputTutoLine(shootInputsTuto, "SHOOT", 2, 2);
    const pauseLine = this.inputTutoLine(pauseInputsTuto, "PAUSE", 3, 2);
    tuto.appendChild(leftLine);
    tuto.appendChild(rightLine);
    tuto.appendChild(jumpLine);
    tuto.appendChild(downLine);
    tuto.appendChild(shootLine);
    tuto.appendChild(pauseLine);
    menu.appendChild(tuto);
  }

  private inputTuto = (string: string, rotation: number = 0): HTMLDivElement => {
    const inputTuto = document.createElement("div");
    inputTuto.innerText = string;
    inputTuto.className = "inputTuto";
    inputTuto.style.transform = `rotate(${rotation}deg)`;
    return inputTuto;
  };

  private inputTutoLine = (
    array: HTMLDivElement[],
    string: string,
    gridRow: number,
    gridColumn: number
  ): HTMLDivElement => {
    const inputTutoLine = document.createElement("div");
    inputTutoLine.className = "inputTutoLine";
    inputTutoLine.style.gridRow = String(gridRow);
    inputTutoLine.style.gridColumn = String(gridColumn);
    if (gridColumn === 2) {
      inputTutoLine.style.justifyContent = "end";
    }
    array.forEach((i, index) => {
      inputTutoLine.appendChild(i);
      if (index < array.length - 1) {
        const slash = document.createElement("span");
        slash.textContent = "/";
        inputTutoLine.appendChild(slash);
      }
    });
    const name = document.createElement("span");
    name.textContent = " : " + string;
    name.className = "inputsName";
    inputTutoLine.appendChild(name);
    return inputTutoLine;
  };

  private loadHardButton(menu: HTMLDivElement) {
    const hardcoreModeContainer = document.createElement("div");
    const hardcoreModeSpan = document.createElement("span");
    hardcoreModeContainer.className = "hardContainer";
    hardcoreModeSpan.innerText = "hardcore mode";
    const hardcoreModeButton = document.createElement("button");
    hardcoreModeButton.className = GameManager.getInstance().hardcoreMode
      ? "hardcore enabled"
      : "hardcore disabled";
    const switchInButton = document.createElement("div");
    switchInButton.className = "switchInButton";
    hardcoreModeButton.appendChild(switchInButton);
    hardcoreModeButton.addEventListener("click", () => {
      GameManager.getInstance().hardcoreMode = !GameManager.getInstance().hardcoreMode;
      if (GameManager.getInstance().hardcoreMode) {
        hardcoreModeButton.className = "hardcore enabled";
      } else {
        hardcoreModeButton.className = "hardcore disabled";
      }
    });
    hardcoreModeContainer.appendChild(hardcoreModeSpan);
    hardcoreModeContainer.appendChild(hardcoreModeButton);
    menu.appendChild(hardcoreModeContainer);
  }

  public showRestartScreen(): void {
    // Le nettoyage est géré par le GameManager, on se contente d'afficher le menu.
    const endGameModal = document.createElement("div");
    endGameModal.classList.add("endGameModal"); // Assurez-vous d'avoir ce style dans votre CSS

    const title = document.createElement("h1");
    title.innerText = "GAME OVER";

    const restartButton = document.createElement("button");
    restartButton.innerText = "Recommencer";
    restartButton.addEventListener("click", () => {
      endGameModal.remove();
      GameManager.getInstance().restart(); // Appel à la méthode du GameManager
    });

    const menuButton = document.createElement("button");
    menuButton.className = "backToMenuButton";
    menuButton.innerText = "Menu Principal";
    menuButton.addEventListener("click", () => {
      endGameModal.remove();
      GameManager.getInstance().returnToMainMenu(); // Appel à une nouvelle méthode que nous allons créer
    });

    endGameModal.appendChild(title);
    endGameModal.appendChild(restartButton);
    endGameModal.appendChild(menuButton);
    document.body.appendChild(endGameModal);
  }

  public showMainMenu(): void {
    this.showLoadingScreen(); // Crée le conteneur et le message
    this.buildAndShowMenu(); // Construit les éléments du menu
    this.enableButtons(); // Active les boutons
  }
}
