import _ from 'lodash';
import {ModelType} from 'entities/index';
import DateTime from 'shared/lib/date-time';
import {isEmpty, normalizeUrl, toInt, toNumber} from 'shared/lib/helpers';
import type {ItemModel, Page} from 'shared/lib/pages-buffer';

export default abstract class AbstractModel {
  protected abstract $modelType: ModelType;
  protected abstract get castRules(): CastReturnType;

  protected attributes: SomeObjectType = {};
  protected originalAttributes: SomeObjectType = {};

  private extended: boolean = false;

  public get modelType(): ModelType {
    return this.$modelType;
  }

  constructor(params: {} | [], extended: boolean = false) {
    this.extend(params, extended);
  }

  public extend(attributesOrModel: any, extended: boolean = true): this {
    let attributes: any;

    if (this.extended !== extended) {
      this.extended = extended;
    }

    attributes = attributesOrModel instanceof AbstractModel ? attributesOrModel.toOriginalObject() : attributesOrModel;

    if (Array.isArray(attributes)) {
      attributes = {items: attributes};
    }

    if (extended) {
      attributes = Object.assign({}, this.originalAttributes, attributes);
    }

    this.originalAttributes = _.clone(attributes);
    this.parse(attributes);

    return this;
  }

  public toOriginalObject(): SomeObjectType {
    return this.originalAttributes;
  }

  protected beforeParse(attributes: SomeObjectType): SomeObjectType {
    return attributes;
  }

  protected afterParse(attributes: SomeObjectType): void {}

  protected parse(attributes: SomeObjectType): void {
    attributes = this.beforeParse(attributes);

    const fields: string[] = Object.keys(attributes);

    fields.forEach((field: string) => this.setAttribute(field, attributes[field]));

    Object.keys(this.castRules).forEach((field: string) => {
      if (!fields.includes(field)) {
        this.setAttribute(field, undefined);
      }
    });

    this.afterParse(attributes);
  }

  private castValue(field: string, value: any): any {
    if (undefined !== this.castRules[field]) {
      if ('object' === typeof this.castRules[field]) {
        const {type, defaultValue, path}: CastObjectType = this.castRules[field] as CastObjectType;

        if ('function' === typeof type && undefined !== path) {
          return this.castClass(_.toString(path).split('.'), type, value);
        }

        if (isEmpty(value)) {
          return defaultValue;
        }

        return this.valueToType(value, type);
      } else {
        return this.valueToType(value, this.castRules[field] as CastType);
      }
    }

    return value;
  }

  private castClass(path: string[], type: Function, value: SomeObjectType | []): SomeObjectType | [] | undefined {
    if (0 === path.length) {
      return 'function' === typeof type ? this.valueToType(value, type) : value;
    }

    const pathSegment = path.shift();

    switch (pathSegment) {
      case '[]':
        return Array.isArray(value) ? value.map((item: any) => this.castClass(path.slice(), type, item)) : [];
      case '{}':
        const result: SomeObjectType = {};

        if (value instanceof Object && !(value instanceof Array)) {
          Object.keys(value).forEach(
            (field: string) => (result[field] = this.castClass(path.slice(), type, value[field]))
          );
        }

        return result;
      default:
        return;
    }
  }

  public hasAttribute(field: string): boolean {
    return this.hasOwnProperty(_.camelCase(field));
  }

  public attributeIsEmpty(field: string): boolean {
    return this.hasAttribute(field) ? isEmpty(this.getAttribute(field)) : false;
  }

  public getAttribute(field: string): any {
    const property: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(this, _.camelCase(field));
    return property?.get();
  }

  public setAttribute(field: string, value: any): void {
    this.attributes[field] = this.castValue(field, value);

    if (this.hasOwnProperty(field) && Object.getOwnPropertyDescriptor(this, field)?.get) {
      return;
    }

    let get = (): any => this.attributes[field];
    const set = (newValue: any): void => {
      if (undefined !== newValue) {
        throw Error(`Error set "${field}" field. Please use .setAttribute(field, value)`);
      }
    };

    switch (this.castRules[field] as CastType) {
      case 'url':
        get = (): string => normalizeUrl(this.attributes[field]);
        break;

      case 'url[]':
        get = (): string[] => {
          if (this.attributes[field]) {
            if (Array.isArray(this.attributes[field])) {
              return this.attributes[field].map((url: string) => normalizeUrl(url));
            }

            if ('string' === typeof this.attributes[field]) {
              return [normalizeUrl(this.attributes[field])];
            }
          }

          return [];
        };
        break;

      case 'datetime':
        Object.defineProperty(this, `${field}Formatted`, {
          get: () =>
            isEmpty(this.attributes[field]) ? undefined : (this.attributes[field] as DateTime).getFormatted(),
          set,
        });
        break;

      case 'amount':
        Object.defineProperty(this, `${field}Formatted`, {
          get: () => {
            const lang: string = window.navigator.language || 'en';
            const currency: string =
              this.hasAttribute('currency') && !this.attributeIsEmpty('currency')
                ? this.getAttribute('currency')
                : 'USD';

            return new Intl.NumberFormat(lang, {style: 'currency', currency}).format(this.attributes[field]);
          },
          set,
        });
        break;

      case 'string':
        Object.defineProperty(this, `${field}Formatted`, {
          get: () => this.attributes[field] || undefined,
          set,
        });
        break;

      case 'string[]':
        Object.defineProperty(this, `${field}Formatted`, {
          get: () => (isEmpty(this.attributes[field]) ? undefined : this.attributes[field].join(', ')),
          set,
        });
        break;
    }

    Object.defineProperty(this, field, {
      get,
      set,
    });
  }

  private valueToType(value: any, type: CastType): any {
    if ('function' === typeof type) {
      if (isEmpty(value)) {
        return undefined;
      }

      // @ts-expect-error
      return new type(value);
    }

    switch (type) {
      case 'integer':
        return toInt(value, 0);

      case 'integer[]':
        return Array.isArray(value)
          ? value.map((chunk: any) => toInt(chunk, 0))
          : String(value)
              .split(',')
              .filter((n: string) => !isEmpty(n.trim()))
              .map((chunk: string) => toInt(chunk.trim(), 0));

      case 'float':
        return toNumber(value);

      case 'float[]':
        return Array.isArray(value)
          ? value.map((chunk: any) => toNumber(chunk))
          : String(value)
              .split(',')
              .filter((n: string) => !isEmpty(n.trim()))
              .map((chunk: string) => toNumber(chunk.trim()));

      case 'amount':
        return undefined === value || null === value ? undefined : toNumber(value);

      case 'boolean':
        if (isEmpty(value)) {
          return false;
        }

        if (['false', '0'].includes(_.toString(value).toLowerCase())) {
          return false;
        }

        return Boolean(value);

      case 'string':
        return _.toString(value);

      case 'string[]':
        if ('string' === typeof value) {
          return value
            .split(',')
            .filter((n: string) => !isEmpty(n.trim()))
            .map((chunk: string) => chunk.trim());
        }

        if (Array.isArray(value)) {
          return value.map((chunk: any) => _.toString(chunk));
        }

        return [];

      case 'regexp':
        if (!value) {
          return;
        }

        if (value instanceof RegExp) {
          return value;
        }

        const found: [any, RegExp | string, string] | null = value.match(/\/(.*)\/([gsmixu]{0,})/ms);

        if (found) {
          const [, regexp, flags]: [any, RegExp | string, string] = found;
          return new RegExp(regexp, flags);
        }

        return;

      case 'array':
        return isEmpty(value) ? [] : value;

      case 'object':
        return isEmpty(value) ? {} : value;

      case 'datetime':
        if (value instanceof DateTime) {
          return value;
        }

        if (null === value) {
          return undefined;
        }

        return new DateTime(value);

      default:
        return value;
    }
  }
}

export abstract class AbstractModelPage<Model extends ItemModel> extends AbstractModel implements Page<Model> {
  public currentPage!: number;
  public perPage!: number;
  public from!: number;
  public to!: number;
  public total!: number;
  public data!: Model[];

  protected abstract castDataRules(): CastObjectType;

  protected get castRules(): CastReturnType {
    return {
      currentPage: 'integer',
      perPage: 'integer',
      from: 'integer',
      to: 'integer',
      total: 'integer',
      data: this.castDataRules(),
    };
  }

  public get isEmpty(): boolean {
    return !Boolean(this.data && this.data.length);
  }

  public toArray(): Model[] {
    return this.data;
  }

  public get first(): Model {
    return this.data[0];
  }

  public get last(): Model {
    return this.data[this.data.length - 1];
  }

  public includes(item: Model): boolean {
    return this.data.includes(item);
  }

  public find(callback: (item: Model, index: number, array: Model[]) => any): Model | undefined {
    return this.data.find(callback);
  }

  public map(callback: (item: Model, index: number, array: Model[]) => any): any[] {
    return this.data.map(callback);
  }

  public forEach(callback: (item: Model, index: number, array: Model[]) => any): void {
    this.data.forEach(callback);
  }
}
