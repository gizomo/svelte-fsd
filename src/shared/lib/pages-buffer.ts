export interface ItemModel {
  getKey(): string;
}

export interface Page<Model extends ItemModel> {
  currentPage: number;
  perPage: number;
  from: number;
  to: number;
  total: number;
  data: Model[];
  readonly isEmpty: boolean;
  toArray(): Model[];
}

type ItemsBunchType<Model> = {
  from?: number;
  items: Model[];
};

class BuffersCache<Model extends ItemModel> {
  private items: Map<string, Model> = new Map();
  private buffers: Map<symbol, Model[]> = new Map();

  public getItem(key: string): Model | undefined {
    return this.items.get(key);
  }

  public getBufferItems(bufferKey: symbol): Model[] {
    if (this.buffers.has(bufferKey)) {
      const items: Model[] | undefined = this.buffers.get(bufferKey);

      return items && items.length ? items : [];
    }

    return [];
  }

  public clearBuffer(bufferKey: symbol): void {
    this.buffers.delete(bufferKey);
  }

  public addItems(bunch: ItemsBunchType<Model>, bufferKey: symbol): void {
    bunch.items.forEach((item: Model) => {
      const key: string = item.getKey();

      if (!this.items.has(key)) {
        this.items.set(key, item);
      }
    });

    if (this.buffers.has(bufferKey)) {
      const buffer: Model[] = this.buffers.get(bufferKey) as Model[];

      if (undefined !== bunch.from) {
        let index: number = bunch.from;

        for (const item of bunch.items) {
          if (undefined === buffer[index]) {
            buffer[index] = item;
          }

          index++;
        }
      } else {
        buffer.push(...bunch.items);
      }
    } else {
      this.buffers.set(bufferKey, bunch.items);
    }
  }
}

type PagesBufferParamsType<Model extends ItemModel> = {
  loader: PagesLoader<Model>;
  pageSize?: number;
  additionalParams?: Record<string, any>;
  bufferCache?: BuffersCache<Model>;
  bufferKey?: symbol;
};

export type PagingQueryParamsType = {
  page: number;
  pageSize: number;
  additionalParams?: Record<string, any>;
};

type PagesLoader<Model extends ItemModel> = (params: PagingQueryParamsType) => Promise<Page<Model>>;

enum PagesBufferStatus {
  NO_INIT,
  INITED,
  EMPTY,
  CONSISTENT,
  UNCONSISTENT,
}

export class PagesBuffer<Model extends ItemModel> {
  private cache: BuffersCache<Model>;
  private bufferKey: symbol = Symbol();

  private loader: PagesLoader<Model>;
  private additionalParams!: Record<string, any>;

  private status: PagesBufferStatus = PagesBufferStatus.NO_INIT;
  private currentPage: number = 0;
  private pageSize: number = 0;
  private total: number = 0;

  constructor({loader, pageSize, additionalParams, bufferCache, bufferKey}: PagesBufferParamsType<Model>) {
    this.loader = loader;

    if (bufferKey) {
      this.bufferKey = bufferKey;
    }

    if (bufferCache) {
      this.cache = bufferCache;
    } else {
      this.cache = new BuffersCache();
    }

    if (undefined !== pageSize) {
      this.pageSize = pageSize;
    }

    if (additionalParams) {
      this.additionalParams = {...this.additionalParams, ...additionalParams};
    }
  }

  public fork(params?: Partial<PagingQueryParamsType>, bufferKey?: symbol): PagesBuffer<Model> {
    return new PagesBuffer({
      loader: this.loader,
      additionalParams: this.additionalParams,
      bufferCache: this.cache,
      bufferKey,
      ...params,
    });
  }

  public get isEmpty(): boolean {
    return PagesBufferStatus.EMPTY === this.status;
  }

  public get isInitialized(): boolean {
    return PagesBufferStatus.NO_INIT !== this.status;
  }

  public get isConsistent(): boolean {
    return PagesBufferStatus.CONSISTENT === this.status;
  }

  public get items(): Model[] {
    return this.cache.getBufferItems(this.bufferKey);
  }

  public getTotal(): number {
    return this.total;
  }

  public loadPage(pageIndex: number, pageSize: number = this.pageSize): Promise<void> {
    if (this.isConsistent) {
      const delta = this.items.length - pageIndex * pageSize;

      if (delta >= 0 || this.items.length === this.total) {
        return Promise.resolve();
      }

      return this.loader({page: pageIndex, pageSize}).then((page: Page<Model>) => {
        this.total = page.total;

        const items: Model[] = [];
        const sum: number = delta + this.pageSize;
        let from: number | undefined = undefined;

        if (sum > 0) {
          items.push(...page.toArray().slice(sum));
        } else if (0 === sum) {
          items.push(...page.toArray());
        } else {
          this.status = PagesBufferStatus.UNCONSISTENT;
          from = page.from;
          items.push(...page.toArray());
        }

        this.cache.addItems({items, from}, this.bufferKey);

        return Promise.resolve();
      });
    }

    return this.loader({page: pageIndex, pageSize}).then((page: Page<Model>) => {
      if (!this.isInitialized) {
        this.status = PagesBufferStatus.INITED;
      }

      if (page.isEmpty) {
        if (PagesBufferStatus.INITED === this.status) {
          this.status = PagesBufferStatus.EMPTY;
          this.currentPage = 0;
          this.total = 0;
        }
      } else if (this.isConsistent || PagesBufferStatus.INITED === this.status) {
        this.status = 1 === pageIndex ? PagesBufferStatus.CONSISTENT : PagesBufferStatus.UNCONSISTENT;
        // this.currentPage = pageIndex;
        this.total = page.total;
        this.cache.addItems({items: page.toArray()}, this.bufferKey);
      } else {
        // this.currentPage = pageIndex;
        this.total = page.total;
        this.cache.addItems({items: page.toArray(), from: page.from}, this.bufferKey);
        this.status =
          this.items.length !== this.items.filter(() => true).length
            ? PagesBufferStatus.UNCONSISTENT
            : PagesBufferStatus.CONSISTENT;
      }
    });
  }

  public loadNextPage(): Promise<void> {
    if (this.isEmpty) {
      return Promise.resolve();
    }

    return this.loadPage(this.currentPage + 1, this.pageSize);
  }

  public loadPrevPage(): Promise<void> {
    if (this.isEmpty || this.currentPage <= 1) {
      return Promise.resolve();
    }

    return this.loadPage(this.currentPage - 1, this.pageSize);
  }
}
