import type {ApiRequestParams, IApiMiddleware} from './core';

export default class JsonContent implements IApiMiddleware {
  public name: string = 'json-content';

  public handleRequest(params: ApiRequestParams): Promise<ApiRequestParams> {
    return Promise.resolve({...params, headers: {...params?.headers, 'Content-Type': 'application/json'}});
  }
}
