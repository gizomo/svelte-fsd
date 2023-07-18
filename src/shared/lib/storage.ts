import {isEmpty} from './helpers';

type DateReplacerType = (field: string, value: any) => string | any;
type DateReviverType = (field: string, value: any) => Date | any;

export default class Storage {
  public static set(field: string, value: any): void {
    Storage.fieldCheck(field);

    if (isEmpty(value)) {
      throw new Error('The value cannot be empty. To remove field use Storage.remove(field)');
    }

    if ('function' === typeof value) {
      throw new Error('Functions cannot be saved to storage.');
    }

    value = JSON.stringify(value, Storage.dateReplacer);

    localStorage.setItem(field, value);
  }

  public static get(field: string): any {
    Storage.fieldCheck(field);

    const value: string | null = localStorage.getItem(field);

    if (null !== value) {
      try {
        return JSON.parse(value, Storage.dateReviver);
      } catch {
        return Storage.dateReviver('string', value);
      }
    }

    return;
  }

  public static remove(field: string): void {
    this.fieldCheck(field);
    localStorage.removeItem(field);
  }

  private static fieldCheck(field: string): void {
    if (isEmpty(field)) {
      throw new Error('The field name is empty.');
    }
  }

  private static dateReplacer: DateReplacerType = (_field: string, value: any) => {
    if (value instanceof Date) {
      return `Date${value.getTime()}`;
    }

    return value;
  };

  private static dateReviver: DateReviverType = (_field: string, value: any) => {
    if ('string' === typeof value) {
      const timestamp = /\/Date\((-?\d*)\)\//.exec(value);

      if (timestamp) {
        return new Date(timestamp[1]);
      }
    }

    return value;
  };
}
