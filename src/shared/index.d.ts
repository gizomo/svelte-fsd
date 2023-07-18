declare interface Class<T, A extends any[] = any[]> extends Function {
  new (...args: A): T;
}
declare type SomeObjectType = Record<string | number | symbol, any>;
declare type PromiseResolve = (value: T | PromiseLike<T>) => void;
declare type PromiseReject = (reason?: any) => void;
