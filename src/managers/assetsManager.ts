export class AssetManager {
  private static _instance: AssetManager;
  private assetCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private isReady = false;

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager._instance) {
      AssetManager._instance = new AssetManager();
    }
    return AssetManager._instance;
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    if (this.assetCache.has(src)) {
      return this.assetCache.get(src)!;
    }
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        console.warn(`[AssetManager] ⚠️ Timeout: "${src}" prend trop de temps.`);
      }, 10000);

      img.onload = () => {
        clearTimeout(timeoutId);
        this.assetCache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        console.error(`[AssetManager] ❌ Erreur de chargement: "${src}"`);
        this.loadingPromises.delete(src);
        reject(new Error(`Erreur de chargement de l'asset: ${src}`));
      };
      img.src = src;
    });

    this.loadingPromises.set(src, loadPromise);
    return loadPromise;
  }

  /**
   * Précharge une liste d'assets à partir de leurs URLs.
   * @param urls - Un tableau de chaînes contenant les chemins vers les assets.
   */
  public async preloadAssets(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) {
      this.isReady = true;
      return;
    }

    const promises = urls.map((url) => this.loadImage(url));

    try {
      await Promise.all(promises);
      this.isReady = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère un asset préchargé depuis le cache.
   * @param public - Le chemin de l'asset à récupérer.
   * @returns L'élément HTMLImageElement ou null s'il n'est pas trouvé.
   */
  public getAsset(src: string): HTMLImageElement | null {
    const result = this.assetCache.get(src) || null;
    if (!result) {
      console.warn(`[AssetManager] ❌ Asset "${src}" non trouvé dans le cache.`);
    }
    return result;
  }

  public areAssetsReady(): boolean {
    return this.isReady;
  }
}
