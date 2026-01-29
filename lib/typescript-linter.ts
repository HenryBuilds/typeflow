import * as ts from "typescript";
import { Diagnostic } from "@codemirror/lint";

/**
 * Create a TypeScript linter for code with type definitions
 */
export function createTypeScriptLinter(typeDefinitions?: string) {
  return (view: any): Diagnostic[] => {
    const code = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    try {
      // Extract import statements from user code
      const importRegex = /^import\s+.+\s+from\s+['"].+['"];?\s*$/gm;
      const imports = code.match(importRegex) || [];
      const codeWithoutImports = code.replace(importRegex, '').trim();

      // Add global declarations for workflow context and built-in types
      const requireDeclaration = `
// ========================================
// Primitive Types and Type Aliases
// ========================================

type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type NonNullable<T> = T extends null | undefined ? never : T;
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type InstanceType<T extends new (...args: any) => any> = T extends new (...args: any) => infer R ? R : any;
type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

type PropertyKey = string | number | symbol;

// ========================================
// Built-in JavaScript types
// ========================================
interface Date {
  toString(): string;
  toDateString(): string;
  toTimeString(): string;
  toLocaleString(): string;
  toLocaleDateString(locales?: string, options?: any): string;
  toLocaleTimeString(locales?: string, options?: any): string;
  valueOf(): number;
  getTime(): number;
  getFullYear(): number;
  getUTCFullYear(): number;
  getMonth(): number;
  getUTCMonth(): number;
  getDate(): number;
  getUTCDate(): number;
  getDay(): number;
  getUTCDay(): number;
  getHours(): number;
  getUTCHours(): number;
  getMinutes(): number;
  getUTCMinutes(): number;
  getSeconds(): number;
  getUTCSeconds(): number;
  getMilliseconds(): number;
  getUTCMilliseconds(): number;
  getTimezoneOffset(): number;
  setTime(time: number): number;
  setFullYear(year: number, month?: number, date?: number): number;
  setUTCFullYear(year: number, month?: number, date?: number): number;
  setMonth(month: number, date?: number): number;
  setUTCMonth(month: number, date?: number): number;
  setDate(date: number): number;
  setUTCDate(date: number): number;
  setHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setUTCHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setMinutes(min: number, sec?: number, ms?: number): number;
  setUTCMinutes(min: number, sec?: number, ms?: number): number;
  setSeconds(sec: number, ms?: number): number;
  setUTCSeconds(sec: number, ms?: number): number;
  setMilliseconds(ms: number): number;
  setUTCMilliseconds(ms: number): number;
  toISOString(): string;
  toJSON(key?: any): string;
  toUTCString(): string;
  toGMTString(): string;
}

interface DateConstructor {
  new(): Date;
  new(value: number | string | Date): Date;
  new(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  (): string;
  (value: number | string | Date): string;
  readonly prototype: Date;
  parse(s: string): number;
  UTC(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
  now(): number;
}

declare const Date: DateConstructor;

interface String {
  toString(): string;
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  concat(...strings: string[]): string;
  indexOf(searchString: string, position?: number): number;
  lastIndexOf(searchString: string, position?: number): number;
  localeCompare(that: string): number;
  match(regexp: string | RegExp): RegExpMatchArray | null;
  replace(searchValue: string | RegExp, replaceValue: string): string;
  search(regexp: string | RegExp): number;
  slice(start?: number, end?: number): string;
  split(separator: string | RegExp, limit?: number): string[];
  substring(start: number, end?: number): string;
  toLowerCase(): string;
  toLocaleLowerCase(): string;
  toUpperCase(): string;
  toLocaleUpperCase(): string;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  trimLeft(): string;
  trimRight(): string;
  padStart(targetLength: number, padString?: string): string;
  padEnd(targetLength: number, padString?: string): string;
  repeat(count: number): string;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, endPosition?: number): boolean;
  includes(searchString: string, position?: number): boolean;
  replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  at(index: number): string | undefined;
  length: number;
  substr(from: number, length?: number): string;
  valueOf(): string;
  [index: number]: string;
  [Symbol.iterator](): IterableIterator<string>;
}

interface Number {
  toString(radix?: number): string;
  toFixed(fractionDigits?: number): string;
  toExponential(fractionDigits?: number): string;
  toPrecision(precision?: number): string;
  valueOf(): number;
}

interface Math {
  E: number;
  LN10: number;
  LN2: number;
  LOG2E: number;
  LOG10E: number;
  PI: number;
  SQRT1_2: number;
  SQRT2: number;
  abs(x: number): number;
  acos(x: number): number;
  asin(x: number): number;
  atan(x: number): number;
  atan2(y: number, x: number): number;
  ceil(x: number): number;
  cos(x: number): number;
  exp(x: number): number;
  floor(x: number): number;
  log(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(x: number, y: number): number;
  random(): number;
  round(x: number): number;
  sin(x: number): number;
  sqrt(x: number): number;
  tan(x: number): number;
}

declare const Math: Math;

interface Array<T> {
  length: number;
  toString(): string;
  toLocaleString(): string;
  pop(): T | undefined;
  push(...items: T[]): number;
  concat(...items: (T | T[])[]): T[];
  join(separator?: string): string;
  reverse(): T[];
  shift(): T | undefined;
  slice(start?: number, end?: number): T[];
  sort(compareFn?: (a: T, b: T) => number): this;
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  unshift(...items: T[]): number;
  indexOf(searchElement: T, fromIndex?: number): number;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  every(callbackfn: (value: T, index: number, array: T[]) => unknown): boolean;
  some(callbackfn: (value: T, index: number, array: T[]) => unknown): boolean;
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  filter(callbackfn: (value: T, index: number, array: T[]) => unknown): T[];
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  find(predicate: (value: T, index: number, obj: T[]) => unknown): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown): number;
  findLast(predicate: (value: T, index: number, obj: T[]) => unknown): T | undefined;
  findLastIndex(predicate: (value: T, index: number, obj: T[]) => unknown): number;
  includes(searchElement: T, fromIndex?: number): boolean;
  flat<D extends number = 1>(depth?: D): any[];
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[]): U[];
  at(index: number): T | undefined;
  fill(value: T, start?: number, end?: number): this;
  copyWithin(target: number, start: number, end?: number): this;
  entries(): IterableIterator<[number, T]>;
  keys(): IterableIterator<number>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
}

interface ArrayConstructor {
  new <T>(arrayLength?: number): T[];
  new <T>(...items: T[]): T[];
  <T>(arrayLength?: number): T[];
  <T>(...items: T[]): T[];
  isArray(arg: any): arg is any[];
  readonly prototype: any[];
  from<T>(iterable: Iterable<T> | ArrayLike<T>): T[];
  from<T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
  of<T>(...items: T[]): T[];
}

declare const Array: ArrayConstructor;

interface Set<T> {
  add(value: T): this;
  clear(): void;
  delete(value: T): boolean;
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void;
  has(value: T): boolean;
  readonly size: number;
  entries(): IterableIterator<[T, T]>;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
}

interface SetConstructor {
  new <T = any>(values?: readonly T[] | null): Set<T>;
  readonly prototype: Set<any>;
}

declare const Set: SetConstructor;

interface Object {
  toString(): string;
  toLocaleString(): string;
  valueOf(): Object;
  hasOwnProperty(v: PropertyKey): boolean;
  isPrototypeOf(v: Object): boolean;
  propertyIsEnumerable(v: PropertyKey): boolean;
}

interface ObjectConstructor {
  new(value?: any): Object;
  (): any;
  (value: any): any;
  readonly prototype: Object;
  getPrototypeOf(o: any): any;
  getOwnPropertyDescriptor(o: any, p: PropertyKey): PropertyDescriptor | undefined;
  getOwnPropertyNames(o: any): string[];
  getOwnPropertySymbols(o: any): symbol[];
  create(o: object | null, properties?: PropertyDescriptorMap): any;
  defineProperty<T>(o: T, p: PropertyKey, attributes: PropertyDescriptor): T;
  defineProperties<T>(o: T, properties: PropertyDescriptorMap): T;
  seal<T>(o: T): T;
  freeze<T>(o: T): Readonly<T>;
  preventExtensions<T>(o: T): T;
  isSealed(o: any): boolean;
  isFrozen(o: any): boolean;
  isExtensible(o: any): boolean;
  keys(o: object): string[];
  values<T>(o: { [s: string]: T } | ArrayLike<T>): T[];
  entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
  fromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T };
  assign<T, U>(target: T, source: U): T & U;
  assign<T, U, V>(target: T, source1: U, source2: V): T & U & V;
  assign<T, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
  assign(target: object, ...sources: any[]): any;
  is(value1: any, value2: any): boolean;
  setPrototypeOf(o: any, proto: object | null): any;
  hasOwn(o: object, v: PropertyKey): boolean;
}

interface PropertyDescriptor {
  configurable?: boolean;
  enumerable?: boolean;
  value?: any;
  writable?: boolean;
  get?(): any;
  set?(v: any): void;
}

interface PropertyDescriptorMap {
  [s: string]: PropertyDescriptor;
}

declare const Object: ObjectConstructor;

interface RegExpMatchArray extends Array<string> {
  index?: number;
  input?: string;
  groups?: { [key: string]: string };
}

interface RegExpExecArray extends Array<string> {
  index: number;
  input: string;
  groups?: { [key: string]: string };
}

interface RegExp {
  exec(string: string): RegExpExecArray | null;
  test(string: string): boolean;
  readonly source: string;
  readonly global: boolean;
  readonly ignoreCase: boolean;
  readonly multiline: boolean;
  readonly flags: string;
  lastIndex: number;
  compile(pattern: string, flags?: string): this;
}

interface RegExpConstructor {
  new(pattern: string | RegExp, flags?: string): RegExp;
  (pattern: string | RegExp, flags?: string): RegExp;
  readonly prototype: RegExp;
  readonly $1: string;
  readonly $2: string;
  readonly $3: string;
  readonly $4: string;
  readonly $5: string;
  readonly $6: string;
  readonly $7: string;
  readonly $8: string;
  readonly $9: string;
  readonly lastMatch: string;
}

declare const RegExp: RegExpConstructor;

interface JSON {
  parse(text: string, reviver?: (key: any, value: any) => any): any;
  stringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
  stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string;
}

declare const JSON: JSON;

interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | null): Promise<T>;
}

interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  all<T>(values: readonly (T | PromiseLike<T>)[]): Promise<T[]>;
  race<T>(values: readonly (T | PromiseLike<T>)[]): Promise<T>;
  allSettled<T>(values: readonly (T | PromiseLike<T>)[]): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>>;
  any<T>(values: readonly (T | PromiseLike<T>)[]): Promise<T>;
  resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  resolve(): Promise<void>;
  reject<T = never>(reason?: any): Promise<T>;
}

declare const Promise: PromiseConstructor;

interface URL {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  toString(): string;
  readonly origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  username: string;
}

interface URLConstructor {
  new(url: string, base?: string | URL): URL;
  prototype: URL;
}

declare const URL: URLConstructor;

// ========================================
// Map and Set
// ========================================

interface Map<K, V> {
  clear(): void;
  delete(key: K): boolean;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
  readonly size: number;
  entries(): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  [Symbol.iterator](): IterableIterator<[K, V]>;
}

interface MapConstructor {
  new <K = any, V = any>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
  readonly prototype: Map<any, any>;
}

declare const Map: MapConstructor;

interface WeakMap<K extends object, V> {
  delete(key: K): boolean;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
}

interface WeakMapConstructor {
  new <K extends object = object, V = any>(entries?: readonly [K, V][] | null): WeakMap<K, V>;
  readonly prototype: WeakMap<object, any>;
}

declare const WeakMap: WeakMapConstructor;

interface WeakSet<T extends object> {
  add(value: T): this;
  delete(value: T): boolean;
  has(value: T): boolean;
}

interface WeakSetConstructor {
  new <T extends object = object>(values?: readonly T[] | null): WeakSet<T>;
  readonly prototype: WeakSet<object>;
}

declare const WeakSet: WeakSetConstructor;

// ========================================
// Error Types
// ========================================

interface Error {
  name: string;
  message: string;
  stack?: string;
}

interface ErrorConstructor {
  new(message?: string): Error;
  (message?: string): Error;
  readonly prototype: Error;
}

declare const Error: ErrorConstructor;

interface EvalError extends Error {}
interface EvalErrorConstructor {
  new(message?: string): EvalError;
  (message?: string): EvalError;
  readonly prototype: EvalError;
}
declare const EvalError: EvalErrorConstructor;

interface RangeError extends Error {}
interface RangeErrorConstructor {
  new(message?: string): RangeError;
  (message?: string): RangeError;
  readonly prototype: RangeError;
}
declare const RangeError: RangeErrorConstructor;

interface ReferenceError extends Error {}
interface ReferenceErrorConstructor {
  new(message?: string): ReferenceError;
  (message?: string): ReferenceError;
  readonly prototype: ReferenceError;
}
declare const ReferenceError: ReferenceErrorConstructor;

interface SyntaxError extends Error {}
interface SyntaxErrorConstructor {
  new(message?: string): SyntaxError;
  (message?: string): SyntaxError;
  readonly prototype: SyntaxError;
}
declare const SyntaxError: SyntaxErrorConstructor;

interface TypeError extends Error {}
interface TypeErrorConstructor {
  new(message?: string): TypeError;
  (message?: string): TypeError;
  readonly prototype: TypeError;
}
declare const TypeError: TypeErrorConstructor;

interface URIError extends Error {}
interface URIErrorConstructor {
  new(message?: string): URIError;
  (message?: string): URIError;
  readonly prototype: URIError;
}
declare const URIError: URIErrorConstructor;

// ========================================
// Typed Arrays
// ========================================

interface ArrayBuffer {
  readonly byteLength: number;
  slice(begin: number, end?: number): ArrayBuffer;
}

interface ArrayBufferConstructor {
  readonly prototype: ArrayBuffer;
  new(byteLength: number): ArrayBuffer;
  isView(arg: any): boolean;
}

declare const ArrayBuffer: ArrayBufferConstructor;

interface ArrayBufferView {
  buffer: ArrayBuffer;
  byteLength: number;
  byteOffset: number;
}

interface Int8Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Int8ArrayConstructor {
  new(length: number): Int8Array;
  new(array: ArrayLike<number>): Int8Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Int8Array;
}
declare const Int8Array: Int8ArrayConstructor;

interface Uint8Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Uint8ArrayConstructor {
  new(length: number): Uint8Array;
  new(array: ArrayLike<number>): Uint8Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Uint8Array;
}
declare const Uint8Array: Uint8ArrayConstructor;

interface Uint8ClampedArray extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Uint8ClampedArrayConstructor {
  new(length: number): Uint8ClampedArray;
  new(array: ArrayLike<number>): Uint8ClampedArray;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Uint8ClampedArray;
}
declare const Uint8ClampedArray: Uint8ClampedArrayConstructor;

interface Int16Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Int16ArrayConstructor {
  new(length: number): Int16Array;
  new(array: ArrayLike<number>): Int16Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Int16Array;
}
declare const Int16Array: Int16ArrayConstructor;

interface Uint16Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Uint16ArrayConstructor {
  new(length: number): Uint16Array;
  new(array: ArrayLike<number>): Uint16Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Uint16Array;
}
declare const Uint16Array: Uint16ArrayConstructor;

interface Int32Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Int32ArrayConstructor {
  new(length: number): Int32Array;
  new(array: ArrayLike<number>): Int32Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Int32Array;
}
declare const Int32Array: Int32ArrayConstructor;

interface Uint32Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Uint32ArrayConstructor {
  new(length: number): Uint32Array;
  new(array: ArrayLike<number>): Uint32Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Uint32Array;
}
declare const Uint32Array: Uint32ArrayConstructor;

interface Float32Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Float32ArrayConstructor {
  new(length: number): Float32Array;
  new(array: ArrayLike<number>): Float32Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Float32Array;
}
declare const Float32Array: Float32ArrayConstructor;

interface Float64Array extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
}
interface Float64ArrayConstructor {
  new(length: number): Float64Array;
  new(array: ArrayLike<number>): Float64Array;
  new(buffer: ArrayBuffer, byteOffset?: number, length?: number): Float64Array;
}
declare const Float64Array: Float64ArrayConstructor;

// ========================================
// Global Functions
// ========================================

declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(string: string): number;
declare function isNaN(number: number): boolean;
declare function isFinite(number: number): boolean;
declare function decodeURI(encodedURI: string): string;
declare function decodeURIComponent(encodedURIComponent: string): string;
declare function encodeURI(uri: string): string;
declare function encodeURIComponent(uriComponent: string | number | boolean): string;
declare function escape(string: string): string;
declare function unescape(string: string): string;
declare function eval(x: string): any;

// ========================================
// Timers (Node.js & Browser)
// ========================================

interface Timer {}

declare function setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): Timer;
declare function clearTimeout(timeoutId: Timer | undefined): void;
declare function setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): Timer;
declare function clearInterval(intervalId: Timer | undefined): void;
declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): Timer;
declare function clearImmediate(immediateId: Timer | undefined): void;

// ========================================
// Iterator and Generator
// ========================================

interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}

interface IteratorResult<T, TReturn = any> {
  done: boolean;
  value: T | TReturn;
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}

interface IterableIterator<T> extends Iterator<T> {
  [Symbol.iterator](): IterableIterator<T>;
}

interface Generator<T = unknown, TReturn = any, TNext = unknown> extends Iterator<T, TReturn, TNext> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return(value: TReturn): IteratorResult<T, TReturn>;
  throw(e: any): IteratorResult<T, TReturn>;
  [Symbol.iterator](): Generator<T, TReturn, TNext>;
}

interface AsyncIterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
  return?(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>>;
  throw?(e?: any): Promise<IteratorResult<T, TReturn>>;
}

interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

// ========================================
// Symbol
// ========================================

interface Symbol {
  readonly description: string | undefined;
  toString(): string;
  valueOf(): symbol;
}

interface SymbolConstructor {
  readonly prototype: Symbol;
  (description?: string | number): symbol;
  for(key: string): symbol;
  keyFor(sym: symbol): string | undefined;
  readonly iterator: symbol;
  readonly asyncIterator: symbol;
  readonly hasInstance: symbol;
  readonly isConcatSpreadable: symbol;
  readonly match: symbol;
  readonly replace: symbol;
  readonly search: symbol;
  readonly species: symbol;
  readonly split: symbol;
  readonly toPrimitive: symbol;
  readonly toStringTag: symbol;
  readonly unscopables: symbol;
}

declare const Symbol: SymbolConstructor;

// ========================================
// Function
// ========================================

interface Function {
  apply(this: Function, thisArg: any, argArray?: any): any;
  call(this: Function, thisArg: any, ...argArray: any[]): any;
  bind(this: Function, thisArg: any, ...argArray: any[]): any;
  toString(): string;
  prototype: any;
  readonly length: number;
  arguments: any;
  caller: Function;
}

interface FunctionConstructor {
  new(...args: string[]): Function;
  (...args: string[]): Function;
  readonly prototype: Function;
}

declare const Function: FunctionConstructor;

// ========================================
// Boolean
// ========================================

interface Boolean {
  valueOf(): boolean;
}

interface BooleanConstructor {
  new(value?: any): Boolean;
  (value?: any): boolean;
  readonly prototype: Boolean;
}

declare const Boolean: BooleanConstructor;

// ========================================
// BigInt
// ========================================

interface BigInt {
  toString(radix?: number): string;
  toLocaleString(): string;
  valueOf(): bigint;
}

interface BigIntConstructor {
  (value?: any): bigint;
  readonly prototype: BigInt;
  asIntN(bits: number, int: bigint): bigint;
  asUintN(bits: number, int: bigint): bigint;
}

declare const BigInt: BigIntConstructor;

// ========================================
// URLSearchParams
// ========================================

interface URLSearchParams {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void): void;
}

interface URLSearchParamsConstructor {
  new(init?: string | URLSearchParams | Record<string, string>): URLSearchParams;
  prototype: URLSearchParams;
}

declare const URLSearchParams: URLSearchParamsConstructor;

// ========================================
// Buffer (Node.js)
// ========================================

interface Buffer extends Uint8Array {
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  toString(encoding?: string, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(target: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
  copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(start?: number, end?: number): Buffer;
  subarray(start?: number, end?: number): Buffer;
  writeUInt8(value: number, offset?: number): number;
  writeUInt16LE(value: number, offset?: number): number;
  writeUInt16BE(value: number, offset?: number): number;
  writeUInt32LE(value: number, offset?: number): number;
  writeUInt32BE(value: number, offset?: number): number;
  readUInt8(offset?: number): number;
  readUInt16LE(offset?: number): number;
  readUInt16BE(offset?: number): number;
  readUInt32LE(offset?: number): number;
  readUInt32BE(offset?: number): number;
  fill(value: any, offset?: number, end?: number, encoding?: string): this;
}

interface BufferConstructor {
  from(data: any, encodingOrOffset?: string | number, length?: number): Buffer;
  from(data: Iterable<number>): Buffer;
  from(data: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer;
  of(...items: number[]): Buffer;
  alloc(size: number, fill?: string | Buffer | number, encoding?: string): Buffer;
  allocUnsafe(size: number): Buffer;
  allocUnsafeSlow(size: number): Buffer;
  isBuffer(obj: any): obj is Buffer;
  concat(list: Uint8Array[], totalLength?: number): Buffer;
  byteLength(string: string | Buffer | ArrayBufferView | ArrayBuffer | SharedArrayBuffer, encoding?: string): number;
  compare(buf1: Uint8Array, buf2: Uint8Array): number;
  isEncoding(encoding: string): boolean;
}

declare const Buffer: BufferConstructor;

// ========================================
// TextEncoder / TextDecoder
// ========================================

interface TextEncoder {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
  encodeInto(source: string, destination: Uint8Array): { read: number; written: number };
}

interface TextEncoderConstructor {
  new(): TextEncoder;
}

declare const TextEncoder: TextEncoderConstructor;

interface TextDecoder {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
}

interface TextDecoderConstructor {
  new(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }): TextDecoder;
}

declare const TextDecoder: TextDecoderConstructor;

// ========================================
// Console (extended)
// ========================================

interface Console {
  assert(condition?: boolean, ...data: any[]): void;
  clear(): void;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(...data: any[]): void;
  dir(item?: any, options?: any): void;
  dirxml(...data: any[]): void;
  error(...data: any[]): void;
  group(...data: any[]): void;
  groupCollapsed(...data: any[]): void;
  groupEnd(): void;
  info(...data: any[]): void;
  log(...data: any[]): void;
  table(tabularData?: any, properties?: string[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: any[]): void;
  trace(...data: any[]): void;
  warn(...data: any[]): void;
}

// ========================================
// ArrayLike and PromiseLike
// ========================================

interface ArrayLike<T> {
  readonly length: number;
  readonly [n: number]: T;
}

interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>;
}

// ========================================
// Intl (Internationalization)
// ========================================

declare namespace Intl {
  interface DateTimeFormatOptions {
    localeMatcher?: string;
    weekday?: string;
    era?: string;
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
    minute?: string;
    second?: string;
    timeZoneName?: string;
    formatMatcher?: string;
    hour12?: boolean;
    timeZone?: string;
  }

  interface DateTimeFormat {
    format(date?: Date | number): string;
    formatToParts(date?: Date | number): any[];
    resolvedOptions(): any;
  }

  const DateTimeFormat: {
    new(locales?: string | string[], options?: DateTimeFormatOptions): DateTimeFormat;
    (locales?: string | string[], options?: DateTimeFormatOptions): DateTimeFormat;
    supportedLocalesOf(locales: string | string[], options?: any): string[];
  };

  interface NumberFormatOptions {
    localeMatcher?: string;
    style?: string;
    currency?: string;
    currencyDisplay?: string;
    useGrouping?: boolean;
    minimumIntegerDigits?: number;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    minimumSignificantDigits?: number;
    maximumSignificantDigits?: number;
  }

  interface NumberFormat {
    format(value: number | bigint): string;
    formatToParts(value: number | bigint): any[];
    resolvedOptions(): any;
  }

  const NumberFormat: {
    new(locales?: string | string[], options?: NumberFormatOptions): NumberFormat;
    (locales?: string | string[], options?: NumberFormatOptions): NumberFormat;
    supportedLocalesOf(locales: string | string[], options?: any): string[];
  };
}

// ========================================
// Crypto (Node.js & Browser)
// ========================================

interface Crypto {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID(): string;
}

declare const crypto: Crypto;

// ========================================
// Performance
// ========================================

interface Performance {
  now(): number;
  timeOrigin: number;
}

declare const performance: Performance;

// ========================================
// AbortController & AbortSignal
// ========================================

interface AbortSignal {
  readonly aborted: boolean;
  onabort: ((this: AbortSignal, ev: Event) => any) | null;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(event: Event): boolean;
}

interface AbortController {
  readonly signal: AbortSignal;
  abort(reason?: any): void;
}

interface AbortControllerConstructor {
  new(): AbortController;
}

declare const AbortController: AbortControllerConstructor;

// ========================================
// Blob & File (Browser/Node.js)
// ========================================

interface Blob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): ReadableStream;
  text(): Promise<string>;
}

interface BlobConstructor {
  new(blobParts?: any[], options?: { type?: string; endings?: string }): Blob;
}

declare const Blob: BlobConstructor;

interface File extends Blob {
  readonly lastModified: number;
  readonly name: string;
}

interface FileConstructor {
  new(fileBits: any[], fileName: string, options?: { type?: string; lastModified?: number }): File;
}

declare const File: FileConstructor;

// ========================================
// FormData
// ========================================

interface FormData {
  append(name: string, value: string | Blob, fileName?: string): void;
  delete(name: string): void;
  get(name: string): string | File | null;
  getAll(name: string): (string | File)[];
  has(name: string): boolean;
  set(name: string, value: string | Blob, fileName?: string): void;
  forEach(callbackfn: (value: string | File, key: string, parent: FormData) => void): void;
}

interface FormDataConstructor {
  new(): FormData;
}

declare const FormData: FormDataConstructor;

// ========================================
// Headers (Fetch API)
// ========================================

interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void): void;
}

interface HeadersConstructor {
  new(init?: Record<string, string> | string[][] | Headers): Headers;
}

declare const Headers: HeadersConstructor;

// ========================================
// Request & Response (Fetch API)
// ========================================

interface Request {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: ReadableStream | null;
  readonly bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
  clone(): Request;
}

interface RequestConstructor {
  new(input: string | Request, init?: any): Request;
}

declare const Request: RequestConstructor;

interface Response {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly body: ReadableStream | null;
  readonly bodyUsed: boolean;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
  clone(): Response;
}

interface ResponseConstructor {
  new(body?: any, init?: { status?: number; statusText?: string; headers?: any }): Response;
  error(): Response;
  redirect(url: string, status?: number): Response;
  json(data: any, init?: { status?: number; statusText?: string; headers?: any }): Response;
}

declare const Response: ResponseConstructor;

// ========================================
// Fetch API
// ========================================

declare function fetch(input: string | URL | Request, init?: {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string | FormData | URLSearchParams | Blob | ArrayBuffer;
  mode?: string;
  credentials?: string;
  cache?: string;
  redirect?: string;
  referrer?: string;
  integrity?: string;
  signal?: AbortSignal;
}): Promise<Response>;

// ========================================
// ReadableStream
// ========================================

interface ReadableStream<R = any> {
  readonly locked: boolean;
  cancel(reason?: any): Promise<void>;
  getReader(): any;
}

// ========================================
// Event & EventListener
// ========================================

interface Event {
  readonly type: string;
  readonly target: any;
  readonly currentTarget: any;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

interface EventListener {
  (evt: Event): void;
}

// ========================================
// process (Node.js)
// ========================================

interface Process {
  readonly env: Record<string, string | undefined>;
  readonly argv: string[];
  readonly platform: string;
  readonly version: string;
  readonly versions: Record<string, string>;
  readonly pid: number;
  readonly ppid: number;
  cwd(): string;
  exit(code?: number): never;
  nextTick(callback: Function, ...args: any[]): void;
}

declare const process: Process;

// ========================================
// CommonJS Module System
// ========================================

interface NodeModule {
  exports: any;
  require: NodeRequire;
  id: string;
  filename: string;
  loaded: boolean;
  parent: NodeModule | null;
  children: NodeModule[];
  paths: string[];
}

interface NodeRequire {
  (id: string): any;
  resolve(id: string): string;
  cache: any;
  extensions: any;
  main: NodeModule | undefined;
}

declare const module: NodeModule;
declare const exports: any;
declare const __filename: string;
declare const __dirname: string;

// ========================================
// Workflow context
// ========================================
declare function require(moduleName: string): any;
declare const console: Console;
declare const $input: any[];
declare const $json: any;
declare const $inputItem: any;
declare const $inputAll: any[];
declare const $credentials: Record<string, any>;
`;
      
      // Combine imports, type definitions and code for full type checking
      // Keep imports at top level to avoid "import must be at top level" errors
      const fullCode = typeDefinitions 
        ? `${requireDeclaration}\n${imports.join('\n')}\n${typeDefinitions}\n\n${codeWithoutImports}`
        : `${requireDeclaration}\n${imports.join('\n')}\n\n${codeWithoutImports}`;

      // Create TypeScript program
      const sourceFile = ts.createSourceFile(
        "temp.ts",
        fullCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Get syntactic diagnostics (syntax errors)
      const syntacticDiagnostics = (sourceFile as any).parseDiagnostics || [];

      // Get semantic diagnostics (type errors)
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022, // ES2022 supports top-level await
        module: ts.ModuleKind.ES2022, // ES2022 module system
        strict: false, // Be less strict to avoid too many errors
        noImplicitAny: false,
        strictNullChecks: false,
        skipLibCheck: true,
        noLib: true, // Don't include default lib - we provide our own declarations
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        noResolve: true, // Don't try to resolve imports
      };

      // Create a simple type checker
      const compilerHost: ts.CompilerHost = {
        getSourceFile: (fileName) => {
          if (fileName === "temp.ts") {
            return sourceFile;
          }
          return undefined;
        },
        writeFile: () => {},
        getCurrentDirectory: () => "/",
        getDirectories: () => [],
        fileExists: (fileName) => fileName === "temp.ts",
        readFile: (fileName) => (fileName === "temp.ts" ? fullCode : undefined),
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
        getDefaultLibFileName: () => "lib.d.ts",
      };

      const program = ts.createProgram(["temp.ts"], compilerOptions, compilerHost);
      const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile);

      // Combine all diagnostics
      const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];

      // Convert TypeScript diagnostics to CodeMirror diagnostics
      // Calculate offsets for imports and type definitions
      const requireDeclLength = requireDeclaration.length;
      const importsText = imports.join('\n');
      const importsLength = importsText.length + (importsText ? 1 : 0); // +1 for newline
      const typeDefLength = typeDefinitions ? typeDefinitions.length + 2 : 0; // +2 for "\n\n"
      const totalOffset = requireDeclLength + importsLength + typeDefLength;

      allDiagnostics.forEach((diag) => {
        if (diag.file && diag.start !== undefined) {
          let start = diag.start;
          let end = diag.start + (diag.length || 1);

          // Check if the error is in the header section (require decl, imports, or type definitions)
          if (start < totalOffset) {
            // Check if error is in the imports section (we should map it back)
            if (start >= requireDeclLength && start < requireDeclLength + importsLength && imports.length > 0) {
              // Error is in imports - need to map back to original code position
              const importsStartInOriginal = code.indexOf(imports[0]);
              if (importsStartInOriginal >= 0) {
                const offsetInImports = start - requireDeclLength;
                start = importsStartInOriginal + offsetInImports;
                end = start + (diag.length || 1);
                
                // Make sure positions are within bounds
                if (start < 0 || start >= code.length) {
                  return;
                }
                end = Math.min(Math.max(end, start + 1), code.length);
              } else {
                return; // Skip if we can't find the import in original code
              }
            } else {
              return; // Skip errors in require declaration or type definitions
            }
          } else {
            // Subtract the total offset to get position in original code (without imports)
            start = start - totalOffset;
            end = end - totalOffset;
            
            // Now we need to add back the import lines in the original code
            // Count how many import lines there are to adjust the position
            const importLinesInOriginal = imports.length > 0 ? code.substring(0, code.indexOf(codeWithoutImports)).split('\n').length - 1 : 0;
            const importCharsInOriginal = imports.length > 0 ? code.indexOf(codeWithoutImports) : 0;
            
            start = start + importCharsInOriginal;
            end = end + importCharsInOriginal;
            
            // Make sure positions are within bounds
            if (start < 0 || start >= code.length) {
              return;
            }
            
            // Clamp end to code length
            end = Math.min(Math.max(end, start + 1), code.length);
          }

          if (start >= end || start < 0) {
            return;
          }

          const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
          
          // Skip module-related errors and runtime wrapper errors - these are expected
          const skipErrorPatterns = [
            "Cannot find module",
            "Cannot find name 'require'",
            "has no exported member",
            "is not a module",
            "Cannot redeclare",
            "Duplicate identifier",
            "Module",
            "import",
            "Top-level 'await'", // Code is wrapped in async function at runtime
            "'await' expressions are only allowed", // Top-level await is allowed in wrapped code
            "'return' statement can only be used", // Return is allowed - code is in a function at runtime
            "A 'return' statement can only be used", // Same as above
            "does not exist on type '{}'", // False positive when TypeScript can't infer literal types
            "does not exist on type 'never'", // False positive with empty arrays
            "Property 'length' does not exist", // Common false positive with arrays

          ];
          
          if (skipErrorPatterns.some(pattern => message.includes(pattern))) {
            return;
          }
          
          // Determine severity
          let severity: "error" | "warning" | "info" = "error";
          if (diag.category === ts.DiagnosticCategory.Warning) {
            severity = "warning";
          } else if (diag.category === ts.DiagnosticCategory.Message) {
            severity = "info";
          }

          diagnostics.push({
            from: start,
            to: end,
            severity,
            message,
          });
        }
      });
    } catch (error) {
      console.error("TypeScript linting error:", error);
    }

    return diagnostics;
  };
}

/**
 * Create a TypeScript linter specifically for type definitions
 */
export function createTypeDefinitionsLinter() {
  return (view: any): Diagnostic[] => {
    const code = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    try {
      // Create TypeScript source file
      const sourceFile = ts.createSourceFile(
        "types.d.ts",
        code,
        ts.ScriptTarget.Latest,
        true
      );

      // Get syntactic diagnostics
      const syntacticDiagnostics = (sourceFile as any).parseDiagnostics || [];

      // Get semantic diagnostics
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        strict: false,
        noImplicitAny: false,
        skipLibCheck: true,
      };

      const compilerHost: ts.CompilerHost = {
        getSourceFile: (fileName) => {
          if (fileName === "types.d.ts") {
            return sourceFile;
          }
          return undefined;
        },
        writeFile: () => {},
        getCurrentDirectory: () => "/",
        getDirectories: () => [],
        fileExists: (fileName) => fileName === "types.d.ts",
        readFile: (fileName) => (fileName === "types.d.ts" ? code : undefined),
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
        getDefaultLibFileName: () => "lib.d.ts",
      };

      const program = ts.createProgram(["types.d.ts"], compilerOptions, compilerHost);
      const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile);

      // Combine diagnostics
      const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];

      // Convert to CodeMirror format
      allDiagnostics.forEach((diag) => {
        if (diag.file && diag.start !== undefined) {
          const start = diag.start;
          const length = diag.length || 1;
          const end = Math.min(start + length, code.length);

          const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
          
          // Skip module-related errors in type definitions too
          const moduleErrorPatterns = [
            "Cannot find module",
            "has no exported member",
            "is not a module",
            "Module",
            "import",
          ];
          
          if (moduleErrorPatterns.some(pattern => message.includes(pattern))) {
            return;
          }
          
          let severity: "error" | "warning" | "info" = "error";
          if (diag.category === ts.DiagnosticCategory.Warning) {
            severity = "warning";
          } else if (diag.category === ts.DiagnosticCategory.Message) {
            severity = "info";
          }

          diagnostics.push({
            from: start,
            to: end,
            severity,
            message,
          });
        }
      });
    } catch (error) {
      console.error("TypeScript linting error:", error);
    }

    return diagnostics;
  };
}

/**
 * Workflow context variables for autocomplete
 */
export const workflowContextVariables = [
  { label: '$credentials', type: 'variable', info: 'Access to database credentials and connections' },
  { label: '$json', type: 'variable', info: 'JSON data from previous node' },
  { label: '$input', type: 'variable', info: 'Array of all input items' },
  { label: '$inputItem', type: 'variable', info: 'Alias for $json' },
  { label: '$inputAll', type: 'variable', info: 'All input items array' },
  { label: 'console', type: 'variable', info: 'Console for logging' },
];

/**
 * TypeScript keywords and common types for autocomplete
 */
export const typescriptKeywords = [
  // Declaration keywords
  { label: 'interface', type: 'keyword', info: 'Define an interface' },
  { label: 'type', type: 'keyword', info: 'Define a type alias' },
  { label: 'enum', type: 'keyword', info: 'Define an enumeration' },
  { label: 'class', type: 'keyword', info: 'Define a class' },
  { label: 'namespace', type: 'keyword', info: 'Define a namespace' },
  
  // Modifiers
  { label: 'export', type: 'keyword', info: 'Export declaration' },
  { label: 'readonly', type: 'keyword', info: 'Readonly property' },
  { label: 'private', type: 'keyword', info: 'Private member' },
  { label: 'public', type: 'keyword', info: 'Public member' },
  { label: 'protected', type: 'keyword', info: 'Protected member' },
  { label: 'static', type: 'keyword', info: 'Static member' },
  { label: 'abstract', type: 'keyword', info: 'Abstract class/member' },
  
  // Type keywords
  { label: 'extends', type: 'keyword', info: 'Extend interface/type' },
  { label: 'implements', type: 'keyword', info: 'Implement interface' },
  { label: 'keyof', type: 'keyword', info: 'Get keys of type' },
  { label: 'typeof', type: 'keyword', info: 'Get type of value' },
  { label: 'infer', type: 'keyword', info: 'Infer type in conditional' },
  
  // Primitive types
  { label: 'string', type: 'type', info: 'String type' },
  { label: 'number', type: 'type', info: 'Number type' },
  { label: 'boolean', type: 'type', info: 'Boolean type' },
  { label: 'null', type: 'type', info: 'Null type' },
  { label: 'undefined', type: 'type', info: 'Undefined type' },
  { label: 'any', type: 'type', info: 'Any type' },
  { label: 'unknown', type: 'type', info: 'Unknown type (safer than any)' },
  { label: 'void', type: 'type', info: 'Void type' },
  { label: 'never', type: 'type', info: 'Never type' },
  { label: 'object', type: 'type', info: 'Object type' },
  { label: 'symbol', type: 'type', info: 'Symbol type' },
  { label: 'bigint', type: 'type', info: 'BigInt type' },
  
  // Utility types
  { label: 'Partial', type: 'type', info: 'Partial<T> - Make all properties optional' },
  { label: 'Required', type: 'type', info: 'Required<T> - Make all properties required' },
  { label: 'Readonly', type: 'type', info: 'Readonly<T> - Make all properties readonly' },
  { label: 'Record', type: 'type', info: 'Record<K, V> - Object with keys K and values V' },
  { label: 'Pick', type: 'type', info: 'Pick<T, K> - Pick properties K from T' },
  { label: 'Omit', type: 'type', info: 'Omit<T, K> - Omit properties K from T' },
  { label: 'Exclude', type: 'type', info: 'Exclude<T, U> - Exclude U from T' },
  { label: 'Extract', type: 'type', info: 'Extract<T, U> - Extract U from T' },
  { label: 'NonNullable', type: 'type', info: 'NonNullable<T> - Exclude null and undefined' },
  { label: 'ReturnType', type: 'type', info: 'ReturnType<F> - Get return type of function' },
  { label: 'Parameters', type: 'type', info: 'Parameters<F> - Get parameters of function' },
  { label: 'ConstructorParameters', type: 'type', info: 'ConstructorParameters<C> - Get constructor parameters' },
  { label: 'InstanceType', type: 'type', info: 'InstanceType<C> - Get instance type of constructor' },
  
  // Built-in types
  { label: 'Array', type: 'type', info: 'Array<T> - Array type' },
  { label: 'Promise', type: 'type', info: 'Promise<T> - Promise type' },
  { label: 'Map', type: 'type', info: 'Map<K, V> - Map type' },
  { label: 'Set', type: 'type', info: 'Set<T> - Set type' },
  { label: 'Date', type: 'type', info: 'Date type' },
  { label: 'Error', type: 'type', info: 'Error type' },
  { label: 'RegExp', type: 'type', info: 'Regular expression type' },
];

/**
 * Parse type definitions to extract custom type names
 */
export function parseTypeDefinitions(typeDefinitions: string) {
  const types: Array<{ label: string; type: string; info: string }> = [];
  
  // Extract interface names
  const interfaceRegex = /interface\s+([A-Z]\w*)/g;
  let match;
  while ((match = interfaceRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'interface',
      info: `Interface ${match[1]} (custom)`,
    });
  }
  
  // Extract type names
  const typeRegex = /type\s+([A-Z]\w*)\s*=/g;
  while ((match = typeRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'type',
      info: `Type ${match[1]} (custom)`,
    });
  }
  
  // Extract enum names
  const enumRegex = /enum\s+([A-Z]\w*)/g;
  while ((match = enumRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'enum',
      info: `Enum ${match[1]} (custom)`,
    });
  }
  
  // Extract class names
  const classRegex = /class\s+([A-Z]\w*)/g;
  while ((match = classRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'class',
      info: `Class ${match[1]} (custom)`,
    });
  }
  
  return types;
}

