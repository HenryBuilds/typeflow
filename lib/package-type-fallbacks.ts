/**
 * Fallback type definitions for common packages
 * Used when .d.ts files are not found
 */

export const packageTypeFallbacks: Record<string, string> = {
  axios: `
declare module 'axios' {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: any;
    params?: any;
    data?: any;
    timeout?: number;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: AxiosRequestConfig;
  }

  export interface AxiosInstance {
    request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  }

  const axios: AxiosInstance;
  export default axios;
}
  `,
  
  lodash: `
declare module 'lodash' {
  interface LoDashStatic {
    chunk<T>(array: T[], size?: number): T[][];
    compact<T>(array: (T | null | undefined | false | '' | 0)[]): T[];
    concat<T>(...arrays: (T | T[])[]): T[];
    difference<T>(array: T[], ...values: T[][]): T[];
    drop<T>(array: T[], n?: number): T[];
    filter<T>(collection: T[], predicate?: (value: T) => boolean): T[];
    find<T>(collection: T[], predicate?: (value: T) => boolean): T | undefined;
    map<T, U>(collection: T[], iteratee?: (value: T) => U): U[];
    reduce<T, U>(collection: T[], iteratee: (acc: U, value: T) => U, accumulator: U): U;
    uniq<T>(array: T[]): T[];
    groupBy<T>(collection: T[], iteratee?: (value: T) => any): Record<string, T[]>;
    sortBy<T>(collection: T[], iteratees?: ((value: T) => any)[]): T[];
    debounce<T extends (...args: any[]) => any>(func: T, wait?: number): T;
    throttle<T extends (...args: any[]) => any>(func: T, wait?: number): T;
    cloneDeep<T>(value: T): T;
    merge<T, U>(object: T, source: U): T & U;
    pick<T, K extends keyof T>(object: T, ...keys: K[]): Pick<T, K>;
    omit<T, K extends keyof T>(object: T, ...keys: K[]): Omit<T, K>;
  }
  
  const _: LoDashStatic;
  export = _;
}
  `,
  
  moment: `
declare module 'moment' {
  interface Moment {
    format(format?: string): string;
    fromNow(): string;
    toDate(): Date;
    valueOf(): number;
    unix(): number;
    add(amount: number, unit: string): Moment;
    subtract(amount: number, unit: string): Moment;
    startOf(unit: string): Moment;
    endOf(unit: string): Moment;
    isBefore(date: Moment | Date): boolean;
    isAfter(date: Moment | Date): boolean;
    isSame(date: Moment | Date): boolean;
  }

  function moment(date?: string | Date | number): Moment;
  export = moment;
}
  `,
};

export function getPackageTypeFallback(packageName: string): string | null {
  return packageTypeFallbacks[packageName] || null;
}

