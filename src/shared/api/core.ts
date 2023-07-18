import {bind} from 'helpful-decorators';
import ApiResponse from './response';

export type ApiRequestParams = {
  method: RequestMethod;
  path: string;
  headers?: HeadersInit;
  body?: SomeObjectType;
  credentials?: RequestCredentials;
};

export interface IApiMiddleware {
  name: string;
  handleRequest?(params: ApiRequestParams): Promise<ApiRequestParams>;
  handleResponse?(path: string, response: ApiResponse): Promise<ApiResponse>;
  handleErrors?(response: ApiResponse): Promise<ApiResponse>;
}

type ApiConfigType = {apiUrl: string};
type RequestCallback = (path: string, body?: SomeObjectType) => Promise<ApiResponse>;

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  // PATCH = 'PATCH',
  // DELETE = 'DELETE',
}

export default class ApiCore {
  private static instance: ApiCore;
  private readonly config: ApiConfigType;
  private middlewares: IApiMiddleware[] = [];

  private constructor(config: ApiConfigType, ...middlewares: IApiMiddleware[]) {
    this.config = config;

    if (middlewares && middlewares.length) {
      middlewares.forEach(middleware => this.appendMiddleware(middleware));
    }
  }

  public static create(apiUrl: string, ...middlewares: IApiMiddleware[]): ApiCore {
    if (undefined === ApiCore.instance) {
      ApiCore.instance = new ApiCore({apiUrl}, ...middlewares);
    }

    return ApiCore.instance;
  }

  public get get(): RequestCallback {
    return this.request(RequestMethod.GET);
  }

  public get post(): RequestCallback {
    return this.request(RequestMethod.POST);
  }

  // public get update(): RequestCallback {
  //   return this.request(RequestMethod.PATCH);
  // }

  // public get delete(): RequestCallback {
  //   return this.request(RequestMethod.DELETE);
  // }

  public appendMiddleware(middleware: IApiMiddleware): void {
    if (this.hasMiddleware(middleware)) {
      throw new Error(`There is dublicated middleware "${middleware.name}"`);
    }

    this.middlewares.push(middleware);
  }

  public removeMiddleware(name: string): void {
    if (this.middlewares.length) {
      this.middlewares = this.middlewares.filter((value: IApiMiddleware) => value.name !== name);
    }
  }

  private hasMiddleware(middleware?: IApiMiddleware): boolean {
    if (this.middlewares.length) {
      if (middleware) {
        return this.middlewares.some((value: IApiMiddleware) => value.name === middleware.name);
      }

      return true;
    }

    return false;
  }

  private beforeRequest(params: ApiRequestParams, initIndex: number = 0): Promise<ApiRequestParams> {
    if (this.hasMiddleware()) {
      const middleware: IApiMiddleware = this.middlewares[initIndex];

      if (middleware) {
        if (middleware.handleRequest) {
          return middleware
            .handleRequest(params)
            .then((newParams: ApiRequestParams) => this.beforeRequest(newParams, ++initIndex));
        }

        return this.beforeRequest(params, ++initIndex);
      }
    }

    return Promise.resolve(params);
  }

  private handleResponse(path: string, response: ApiResponse, initIndex: number = 0): Promise<ApiResponse> {
    if (this.hasMiddleware()) {
      const middleware: IApiMiddleware = this.middlewares[initIndex];

      if (middleware) {
        if (middleware.handleResponse) {
          return middleware
            .handleResponse(path, response)
            .then((newResponse: ApiResponse) => this.handleResponse(path, newResponse, ++initIndex));
        }

        return this.handleResponse(path, response, ++initIndex);
      }
    }

    return Promise.resolve(response);
  }

  private handleErrors(response: ApiResponse, initIndex: number = 0): Promise<ApiResponse> {
    if (this.hasMiddleware()) {
      const middleware: IApiMiddleware = this.middlewares[initIndex];

      if (middleware) {
        if (middleware.handleErrors) {
          return middleware
            .handleErrors(response)
            .then((newResponse: ApiResponse) => this.handleErrors(newResponse, ++initIndex));
        }

        return this.handleErrors(response, ++initIndex);
      }
    }

    console.warn('Middleware error handlers skiped this error', response);

    return Promise.reject(response);
  }

  private request(method: RequestMethod): RequestCallback {
    return (path: string, body?: SomeObjectType): Promise<ApiResponse> =>
      this.beforeRequest({body, method, path}).then((params: ApiRequestParams) => {
        let url = this.getUrl(path);

        if (params?.body) {
          switch (method) {
            case RequestMethod.POST:
              // case RequestMethod.PATCH:
              // case RequestMethod.DELETE:
              Object.assign(params, {
                method,
                body: JSON.stringify(this.convertRequestParams(params?.body, true)),
              });
              break;
            case RequestMethod.GET:
              url = url + '?' + new URLSearchParams(this.convertRequestParams(params?.body)).toString();
              Object.assign(params, {method, body: undefined});
              break;
          }
        }

        return fetch(url, params as unknown as RequestInit)
          .then(this.formatResponse)
          .then((response: ApiResponse) => this.handleResponse(path, response))
          .catch(this.catchErrors);
      });
  }

  @bind
  private formatResponse(response: Response): Promise<ApiResponse> {
    return ApiResponse.create(response).then(apiResponse => {
      if (apiResponse.isSuccess) {
        return Promise.resolve(apiResponse);
      }

      return Promise.reject(apiResponse);
    });
  }

  @bind
  private catchErrors(error: any): Promise<any> {
    if (error instanceof ApiResponse) {
      console.log('catch');

      return this.handleErrors(error);
    }

    console.error('Unhandled error', error);
    return Promise.reject();
  }

  private getUrl(path?: string): string {
    let url: string = `${this.config.apiUrl}`;

    if (undefined !== path) {
      url += `/${path}`;
    }

    return url;
  }

  private convertRequestParams(params: SomeObjectType = {}, preserveArrays: boolean = false): SomeObjectType {
    const result: SomeObjectType = {};

    Object.keys(params).forEach((key: string) => {
      if (params[key] instanceof Date) {
        result[key] = params[key].toISOString();
      } else if (Array.isArray(params[key]) && !preserveArrays) {
        params[key].forEach((item: any, index: number) => (result[`${key}[${index}]`] = item));
      } else {
        result[key] = params[key];
      }
    });

    return result;
  }
}
