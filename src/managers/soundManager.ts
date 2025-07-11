export class SoundManager {
  private static _instance: SoundManager;
  private music: HTMLAudioElement | null = null;

  public coin: HTMLAudioElement;
  public death: HTMLAudioElement;
  public fireball: HTMLAudioElement;
  public jumpOnMonster: HTMLAudioElement;
  public jump: HTMLAudioElement;
  public levelUp: HTMLAudioElement;
  public timeOut: HTMLAudioElement;
  public pause: HTMLAudioElement;
  public powerDown: HTMLAudioElement;
  public powerUpAppear: HTMLAudioElement;
  public powerUp: HTMLAudioElement;
  public win: HTMLAudioElement;

  private _volume: number = 0.5; // valeur par défaut (100%)

  private constructor() {
    this.coin = new Audio("../public/sounds/coin.wav");
    this.death = new Audio("../public/sounds/death.wav");
    this.fireball = new Audio("../public/sounds/fireball.wav");
    this.jumpOnMonster = new Audio("../public/sounds/jump-on-monster.wav");
    this.jump = new Audio("../public/sounds/jump.wav");
    this.levelUp = new Audio("../public/sounds/level-up.wav");
    this.timeOut = new Audio("../public/sounds/time-out.wav");
    this.pause = new Audio("../public/sounds/pause.wav");
    this.powerDown = new Audio("../public/sounds/power-down.wav");
    this.powerUpAppear = new Audio("../public/sounds/powerup_appears.wav");
    this.powerUp = new Audio("../public/sounds/powerup.wav");
    this.win = new Audio("../public/sounds/win.wav");

    this.applyVolumeToAll(); // Appliquer le volume initial
  }

  public static getInstance(): SoundManager {
    if (!SoundManager._instance) {
      SoundManager._instance = new SoundManager();
    }
    return SoundManager._instance;
  }

  public playMusic(src: string) {
    if (!this.music) {
      this.music = new Audio(src);
      this.music.loop = true;
      this.music.volume = this._volume;
      this.music.play();
    } else if (this.music.paused) {
      this.music.play();
    }
  }

  public pauseMusic() {
    if (this.music && !this.music.paused) {
      this.music.pause();
    }
  }

  public resetMusic(src: string) {
    if (this.music) {
      this.music.currentTime = 0;
      this.music.play();
    } else {
      this.playMusic(src);
    }
  }

  public setVolume(volume: number) {
    this._volume = volume;
    this.applyVolumeToAll();
  }

  private applyVolumeToAll() {
    if (this.music) this.music.volume = this._volume;

    // Applique le volume à tous les sons
    const allSounds = [
      this.coin,
      this.death,
      this.fireball,
      this.jumpOnMonster,
      this.jump,
      this.levelUp,
      this.timeOut,
      this.pause,
      this.powerDown,
      this.powerUpAppear,
      this.powerUp,
      this.win,
    ];

    allSounds.forEach((sound) => (sound.volume = this._volume));
  }

  public getVolume(): number {
    return this._volume;
  }
}
