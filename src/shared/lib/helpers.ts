import _ from 'lodash';
import UrlParse from 'url-parse';

export function isEmpty(value: any): boolean {
  return (
    Object.is(value, NaN) ||
    '' === value ||
    null === value ||
    undefined === value ||
    (Array.isArray(value) && 0 === value.length) ||
    ('object' === typeof value &&
      !Array.isArray(value) &&
      0 === Object.keys(value).length &&
      Object.getPrototypeOf(value) === Object.getPrototypeOf({}))
  );
}

export function isClass(fn: any): boolean {
  return /(\.default\)\(this,)/i.test(fn.toString());
}

export function isArray(value: any): boolean {
  return Array.isArray(value);
}

export function isObject(value: any): boolean {
  return 'object' === typeof value;
}

export function isNumeric(value: number | string): boolean {
  return /^-?\d+$/.test(_.toString(value)) || _.isFinite(value);
}

export function toInt(value: any, defaultValue: number = 0): number {
  value = _.toInteger(value);

  if (0 === value || isNaN(value)) {
    return defaultValue;
  }

  return value;
}

export function toNumber(value: any, defaultValue: number = 0): number {
  value = _.toNumber(value);

  if (0 === value || isNaN(value)) {
    return defaultValue;
  }

  return value;
}

export function getRoute(route: string, params?: SomeObjectType): string {
  if (route && params) {
    Object.keys(params).forEach((key: string) => {
      route = route.replace(new RegExp(':([^/]+)'.replace('%key%', key), 'gi'), params[key]);
    });
  }

  return route;
}

export function convertToCamelCase(obj: SomeObjectType = {}): SomeObjectType {
  if (Array.isArray(obj)) {
    return obj.map((v: any) => convertToCamelCase(v));
  } else if (obj != null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result: {}, key: string) => ({
        ...result,
        [_.camelCase(key)]: convertToCamelCase(obj[key]),
      }),
      {}
    );
  }

  return obj;
}

export enum InterpolationPattern {
  BRACES = '\\{\\{%key%\\}\\}',
  SQUARE_BRACKETS = '\\[\\[%key%\\]\\]',
  PARENTHESES = '\\(\\(%key%\\)\\)',
}

export function interpolate(
  text: string,
  values?: SomeObjectType,
  pattern: InterpolationPattern = InterpolationPattern.BRACES
): string {
  if (text && values) {
    Object.keys(values).forEach((key: string) => {
      text = text.replace(new RegExp(pattern.replace('%key%', key), 'gi'), values[key]);
    });
  }

  return text;
}

export function parseUrl(url: string): UrlParse<string> {
  return new UrlParse(url);
}

export function replaceProtocol(url: string, protocol: 'http:' | 'https:'): string | undefined {
  let prepareUrl: string | undefined = undefined;

  if (url.startsWith('https://')) {
    prepareUrl = '//' + _.trimStart(url.substring(8), '/');
  }

  if (url.startsWith('http://')) {
    prepareUrl = '//' + _.trimStart(url.substring(7), '/');
  }

  if (url.startsWith('file://')) {
    prepareUrl = '//' + _.trimStart(url.substring(7), '/');
  }

  if (url.includes('://')) {
    prepareUrl = '//' + _.trimStart(url.substring(url.indexOf('://') + 3), '/');
  }

  if (url.startsWith('//')) {
    prepareUrl = '//' + _.trimStart(url, '/');
  }

  if (!prepareUrl) {
    return;
  }

  return parseUrl(`${protocol}${prepareUrl}`).toString();
}

export function normalizeUrl(url: string): string {
  if (!url) {
    return '';
  }

  const webviewProtocol: string | undefined = _.get(window.location, 'protocol', undefined);
  const secureMode: boolean = undefined !== webviewProtocol ? webviewProtocol.includes('https') : false;

  if (!isEmpty(url)) {
    return replaceProtocol(url, secureMode ? 'https:' : 'http:') ?? '';
  }

  return '';
}
