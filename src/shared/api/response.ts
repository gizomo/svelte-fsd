import _ from 'lodash';
import {convertToCamelCase, isEmpty} from 'shared/lib/helpers';

export enum ApiResponseCode {
  EMPTY = 0,
  OK = 1,
  CLIENT_ERROR = 400,
  SERVER_ERROR = 500,
}

export default class ApiResponse {
  private readonly response: Response;
  private status: number = 200;
  private code: number = ApiResponseCode.OK;
  private data: any = {};
  private errors: SomeObjectType = {};

  constructor(response: Response) {
    if (response && response instanceof Response) {
      this.response = response;
    } else {
      this.response = new Response('Invalid response object', {
        status: 406,
        statusText: 'ApiResponse has no valid response object',
      });
    }
  }

  private format(): Promise<ApiResponse> {
    return this.response
      .json()
      .then((rawData: any) => convertToCamelCase(rawData))
      .then((convertedData: any) =>
        this.setStatus(this.response?.status || 200)
          .setCode(convertedData?.code || this.initCode(convertedData.status))
          .setData(convertedData?.data)
          .setErrors(convertedData?.errors)
      )
      .catch(() => this.setStatus(this.response?.status).setCode(ApiResponseCode.CLIENT_ERROR));
  }

  private initCode(status: number): number {
    if (204 === status) {
      return ApiResponseCode.EMPTY;
    }

    if (status >= 200 && status <= 299) {
      return ApiResponseCode.OK;
    }

    if (status >= 400 && status <= 499) {
      return ApiResponseCode.CLIENT_ERROR;
    }

    if (status >= 500 && status <= 599) {
      return ApiResponseCode.SERVER_ERROR;
    }

    return ApiResponseCode.EMPTY;
  }

  public static create(response: Response): Promise<ApiResponse> {
    return new ApiResponse(response).format();
  }

  public get originalResponse(): Response {
    return this.response;
  }

  public get isOk(): boolean {
    return this.status >= 200 && this.status <= 299;
  }

  public get isBad(): boolean {
    return 400 === this.status;
  }

  public get isSuccess(): boolean {
    return this.code >= 0 && this.code < 100;
  }

  public get isEmpty(): boolean {
    return ApiResponseCode.EMPTY === this.code || isEmpty(this.data);
  }

  public getCode(): number {
    return this.code;
  }

  public getData(): any {
    return this.data;
  }

  public getErrors(): SomeObjectType {
    return this.errors;
  }

  public getError(field?: string): string {
    const error: string[] = [];
    field = _.camelCase(field);

    if (field) {
      _.forEach(this.errors && this.errors[field] ? this.errors[field] : [], (item: string) =>
        error.push(_.trim(item, '.'))
      );
    } else {
      _.forEach(this.errors, (item: string) => error.push(_.trim(item, '.')));
    }

    return error.length > 0 ? error.join('. \n') + '.' : '';
  }

  public setStatus(status: number): this {
    this.status = status;
    return this;
  }

  public setCode(code: number): this {
    this.code = code;
    return this;
  }

  public setData(data: any): this {
    this.data = data;
    return this;
  }

  public setErrors(errors: SomeObjectType = {}): this {
    this.errors = errors;
    return this;
  }
}
