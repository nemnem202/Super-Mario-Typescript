import type { spriteObject } from "../data/types";

export class SpriteManager {
  private static _instance: SpriteManager;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private isReady = false;

  private constructor() {}

  static getInstance(): SpriteManager {
    if (!SpriteManager._instance) {
      SpriteManager._instance = new SpriteManager();
    }
    return SpriteManager._instance;
  }

  // Précharge une image et la met en cache
  private async loadImage(src: string): Promise<HTMLImageElement> {
    // Si déjà en cache, retourner directement
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)!;
    }

    // Si déjà en cours de chargement, retourner la promesse existante
    if (this.loadingPromises.has(src)) {
      return await this.loadingPromises.get(src)!;
    }

    // Créer une nouvelle promesse de chargement
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      // Ajouter un timeout pour détecter les chargements qui traînent
      const timeoutId = setTimeout(() => {
        console.warn(`⚠️ Timeout: "${src}" prend plus de 10 secondes à charger`);
      }, 10000);

      img.onload = () => {
        clearTimeout(timeoutId);

        this.imageCache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };

      img.onerror = (event) => {
        if (typeof event === "string") return clearTimeout(timeoutId);
        clearTimeout(timeoutId);
        console.error(`❌ Erreur de chargement: "${src}"`);

        this.loadingPromises.delete(src);
        const error = new Error(`Erreur de chargement de l'image: ${src}`);
        reject(error);
      };

      img.src = src;
    });

    this.loadingPromises.set(src, loadPromise);
    return await loadPromise;
  }

  // Précharge tous les sprites d'un spriteObject
  async preloadSprites(spriteObjects: spriteObject[]): Promise<void> {
    if (!spriteObjects || spriteObjects.length === 0) {
      console.warn("⚠️ Aucun objet sprite fourni !");
      return;
    }

    const allSpriteUrls = new Set<string>();

    // Collecter toutes les URLs de sprites
    spriteObjects.forEach((spriteObj) => {
      Object.entries(spriteObj).forEach(([key, value]) => {
        if (typeof value === "string" && key != "name") {
          allSpriteUrls.add(value);
        }
      });
    });

    if (allSpriteUrls.size === 0) {
      console.error("❌ Aucune URL de sprite trouvée !");
      throw new Error("Aucune URL de sprite à précharger");
    }

    const promises = Array.from(allSpriteUrls).map((url) => this.loadImage(url));

    try {
      await Promise.all(promises);
      this.isReady = true;
    } catch (error) {
      throw error;
    }
  }

  getImage(src: string): HTMLImageElement | null {
    const result = this.imageCache.get(src) || null;
    if (!result) {
      console.warn(`❌ Image "${src}" non trouvée dans le cache`);
    }
    return result;
  }

  isImageReady(src: string): boolean {
    return this.imageCache.has(src);
  }

  areSpritesReady(): boolean {
    return this.isReady;
  }

  createImageElement(src: string, blockSize: number = 16): HTMLImageElement {
    const cachedImg = this.getImage(src);
    if (!cachedImg) {
      console.error(`💥 Image "${src}" non trouvée dans le cache !`);
      throw new Error(`Image non trouvée dans le cache: ${src}`);
    }

    const img = cachedImg.cloneNode() as HTMLImageElement;
    const heightFactor = cachedImg.naturalHeight / (blockSize * 2);
    img.height = blockSize * 4 * heightFactor;
    return img;
  }
}
