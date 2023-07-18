export enum Events {
  ANY = 'any',
}

/**
 * @mixin
 */
export default class EventListener {
  private listeners: {[event: string]: Function[]} = {};

  /**
   * @mixin
   * @constructor
   * @protected
   */
  protected EventListener(): void {
    this.listeners = {};
  }

  public hasListeners(event?: string): boolean {
    if (event) {
      return Boolean(this.listeners[event]?.length);
    }

    return Boolean(Object.keys(this.listeners).length);
  }

  public on(event: string, callback: Function): void {
    if (undefined === this.listeners[event]) {
      this.listeners[event] = [];
    }

    if (!this.listeners[event].includes(callback)) {
      this.listeners[event].push(callback);
    }
  }

  public off(event: string, callback: Function): void {
    if (undefined === this.listeners[event]) {
      return;
    }

    this.listeners[event] = this.listeners[event].filter((item: Function) => item !== callback);
  }

  public once(event: string, callback: Function): void {
    if (undefined === this.listeners[event]) {
      this.listeners[event] = [];
    }

    const wrapper = (...args: any[]): void => {
      this.off(event, wrapper);
      callback(...args);
    };

    this.on(event, wrapper);
  }

  public removeAllListeners(event?: string): void {
    if (event) {
      this.listeners[event] = [];
    } else {
      this.listeners = {};
    }
  }

  public fireEvent(event: string, ...args: any[]): void {
    if (undefined !== this.listeners[event]) {
      this.listeners[event].forEach((callback: any) => callback(event, ...args));
    }

    if (event !== Events.ANY && undefined !== this.listeners[Events.ANY]) {
      this.listeners[Events.ANY].forEach((callback: any) => callback(event, ...args));
    }
  }
}
