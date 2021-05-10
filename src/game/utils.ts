import { mat2, mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';

export interface ShaderData {
  source: string;
  // type can be either
  // gl.VERTEX_SHADER
  // gl.FRAGMENT_SHADER
  type: number;
}

export function getSafe<T>(item: T | null | undefined, error: string): T {
  if (item === null || item === undefined) {
    throw new Error(error);
  }

  return item;
}

export function isArrayBuffer(val: any): val is ArrayBuffer {
  return (<ArrayBuffer>val).byteLength !== undefined;
}

export function isMat2(val: any): val is mat2 {
  return val.length === 4;
}

export function isMat3(val: any): val is mat3 {
  return val.length === 9;
}

export function isMat4(val: any): val is mat4 {
  return val.length === 16;
}

export function isVec2(val: any): val is vec2 {
  return val.length === 2;
}

export function isVec3(val: any): val is vec3 {
  return val.length === 3;
}

export function isVec4(val: any): val is vec4 {
  return val.length === 4;
}

export function neverWrap(val: never): void {}

export class UnreachableCaseError extends Error {
  constructor(_val: never, error: string) {
    super(error);
  }
}

export function isNumber(val: any): val is number {
  return typeof val === 'number' && !isNaN(val);
}

export function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

export const VECTOR_3_SIZE = 3;
export const VECTOR_2_SIZE = 2;
export const NUM_BYTES_IN_FLOAT = 4;
export const NUM_BYTES_IN_UNSIGNED_SHORT = 2;
export const NUM_BYTES_IN_UNSIGNED_INT = 4;
