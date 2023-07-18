import {bind} from 'helpful-decorators';

export default class Timeout {
  private timeoutId?: NodeJS.Timeout;
  private fired: boolean = false;
  private delay: number;
  private callback: () => any;
  private startTime?: number;

  constructor(callback: () => any, delay: number) {
    this.delay = delay;
    this.callback = callback;
  }

  public getDelay(): number {
    return this.delay;
  }

  public getCallback(): () => any {
    return this.callback;
  }

  public setCallback(callback: () => any): void {
    this.callback = callback;
  }

  public setDelay(delay: number): void {
    this.delay = delay;
  }

  public get remainingTime(): number | undefined {
    if (undefined !== this.startTime) {
      return this.startTime + this.delay - new Date().getTime();
    }

    return;
  }

  public get progress(): number | undefined {
    const remainingTime = this.remainingTime;

    if (undefined !== remainingTime) {
      return (this.delay - remainingTime) / this.delay;
    }

    return;
  }

  public get isFired(): boolean {
    return this.fired;
  }

  public get isInProgress(): boolean {
    return Boolean(this.timeoutId && !this.fired);
  }

  @bind
  public start(): void {
    if (this.isInProgress) {
      return;
    }

    this.fired = false;
    this.startTime = new Date().getTime();
    this.timeoutId = setTimeout(this.executeCallback, this.delay);
  }

  @bind
  public stop(): void {
    clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
    this.startTime = undefined;
  }

  @bind
  public restart(): void {
    this.stop();
    this.start();
  }

  @bind
  public force(): void {
    this.stop();
    this.executeCallback();
  }

  @bind
  private executeCallback(): void {
    this.fired = true;
    this.startTime = undefined;

    if (this.callback) {
      this.callback();
    }
  }
}
