declare type CastType =
  | Function
  | 'amount'
  | 'array'
  | 'boolean'
  | 'datetime'
  | 'float'
  | 'float[]'
  | 'integer'
  | 'integer[]'
  | 'object'
  | 'regexp'
  | 'string'
  | 'string[]'
  | 'url'
  | 'url[]';

declare type CastObjectType = {type: CastType; defaultValue?: any; path?: string};

declare type CastReturnType = {[field: string]: CastObjectType | CastType};
