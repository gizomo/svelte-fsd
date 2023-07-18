import _ from 'lodash';
import {isNumeric, toInt} from './helpers';

export enum DateFormatType {
  WEEKDAY_DAY_MONTH = 'wdm',
  DAY_MONTH = 'dm',
}

export default class DateTime extends Date {
  public originalValue: Date | DateTime | number | string;

  constructor(value: Date | DateTime | number | string) {
    super(
      value instanceof Date
        ? value
        : isNumeric(value)
        ? _.toString(value).length === 10
          ? toInt(value) * 1000
          : value
        : value
    );
    this.originalValue = value;
  }

  public static getDelta(firstDate: DateTime, secondDate: DateTime = DateTime.nowDateTime()): number {
    return secondDate.getTime() - firstDate.getTime();
  }

  public static nowDateTime(delta?: number): DateTime {
    const now: DateTime = new DateTime(new Date());

    if (delta) {
      now.setMilliseconds(now.getMilliseconds() + delta);
    }

    return now;
  }

  public static nowDateTimeWithoutTime(): DateTime {
    const date: DateTime = DateTime.nowDateTime();
    date.setHours(0, 0, 0, 0);

    return date;
  }

  public static nowSeconds(): number {
    return Math.ceil(Date.now() / 1000);
  }

  public isToday(): boolean {
    const today: DateTime = DateTime.nowDateTime();
    return (
      this.getDate() === today.getDate() &&
      this.getMonth() === today.getMonth() &&
      this.getFullYear() === today.getFullYear()
    );
  }

  public isFutureDay(): boolean {
    const today: DateTime = DateTime.nowDateTimeWithoutTime();
    return this.getTime() >= today.setDate(today.getDate() + 1);
  }

  public clone(): DateTime {
    return new DateTime(this.getTime());
  }

  public getValue(): Date | DateTime | number | string {
    return this.originalValue;
  }

  private get localeLang(): string {
    return window.navigator.language || 'en';
  }

  private getLocaleCycle(is24hFormat: boolean = true): 'h23' | 'h12' {
    return is24hFormat ? 'h23' : 'h12';
  }

  public getTimeSeconds(): number {
    return Math.ceil(this.getTime() / 1000);
  }

  public getCurrentDate(): DateTime {
    const clone: DateTime = this.clone();
    clone.setHours(0, 0, 0, 0);

    return clone;
  }

  public getDateDMY(): string {
    const day: string = this.getDate().toString().padStart(2, '0');
    const month: string = (this.getMonth() + 1).toString().padStart(2, '0');
    const year: number = this.getFullYear();

    return `${day}.${month}.${year}`;
  }

  public getDateDMYFormatted(): string {
    return new Intl.DateTimeFormat(this.localeLang, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this);
  }

  public getHM(): string {
    return new Intl.DateTimeFormat(this.localeLang, {
      hourCycle: this.getLocaleCycle(),
      hour: 'numeric',
      minute: '2-digit',
    }).format(this);
  }

  public getHMS(): string {
    return new Intl.DateTimeFormat(this.localeLang, {
      hourCycle: this.getLocaleCycle(),
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(this);
  }

  public getDateDMW(): string {
    return new Intl.DateTimeFormat(this.localeLang, {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(this);
  }

  public getDateDM(): string {
    return new Intl.DateTimeFormat(this.localeLang, {
      month: 'short',
      day: 'numeric',
    }).format(this);
  }

  public getDateW(): string {
    return new Intl.DateTimeFormat(this.localeLang, {
      weekday: 'short',
    }).format(this);
  }

  public getFormatted(): string {
    return new Intl.DateTimeFormat(this.localeLang).format(this);
  }
}
