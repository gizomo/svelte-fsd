// import UserStore from './user/store';
// import ConfigStore from './config/store';
// import AbstractStore from './abstract-store';

export enum ModelType {
  CONFIG = 'config',
  USER = 'user',
  USERS = 'users',
}

// export const stores = {
//   config: ConfigStore,
//   user: UserStore,
// };

// type extractGeneric<Type> = Type extends AbstractStore<infer X> ? X : never;
// type CreateModels<Stores> = {
//   [Property in keyof Stores]: extractGeneric<Stores[Property]>;
// };
// export type StoresNames = keyof typeof stores;
// export type StoresModels = extractGeneric<(typeof stores)[StoresNames]>;
// export type ModelsType = CreateModels<typeof stores>;

// export function loadStores(names: StoresNames[]): Promise<StoresModels[]> {
//   return Promise.all(names.map(storeName => stores[storeName].load()));
// }

// // @ts-expect-error
// window.$stores = stores;
