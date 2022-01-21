import { mat2, mat3, mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { Shader } from './shader';
import { Texture } from './texture';
import {
  getSafe,
  isArrayBuffer,
  isMat2,
  isMat3,
  isMat4,
  isNumber,
  isVec2,
  isVec3,
  isVec4,
  UnreachableCaseError,
} from './utils';

export class Program {
  private glProgramId: WebGLProgram;

  constructor(private gl: WebGLRenderingContext, vertexShader: Shader, fragmentShader: Shader) {
    this.glProgramId = getSafe(gl.createProgram(), `Couldn't create program`);

    gl.attachShader(this.glProgramId, vertexShader.getWebGlShaderId());
    gl.attachShader(this.glProgramId, fragmentShader.getWebGlShaderId());

    // linking of the attached shaders
    gl.linkProgram(this.glProgramId);

    if (!gl.getProgramParameter(this.glProgramId, gl.LINK_STATUS)) {
      throw new Error(`Couldn't link the attached shaders. ${gl.getProgramInfoLog(this.glProgramId)}`);
    }

    gl.detachShader(this.glProgramId, vertexShader.getWebGlShaderId());
    gl.detachShader(this.glProgramId, fragmentShader.getWebGlShaderId());
  }

  public getProgramId(): WebGLProgram {
    return this.glProgramId;
  }

  public use(usageFunction: () => void): void {
    // const previousProgram = this.gl.getProgram();
    this.gl.useProgram(this.glProgramId);
    usageFunction();
    // this.gl.useProgram(previousProgram);
  }

  public setIntUniform(val: number | Int32Array, name: string): boolean {
    const gl: WebGLRenderingContext = this.gl;
    const loc: WebGLUniformLocation | null = gl.getUniformLocation(this.glProgramId, name);

    if (!loc) {
      console.error('Uniform location not found for: ' + name);
      return false;
    }

    if (!isArrayBuffer(val)) {
      gl.uniform1i(loc, val);
    } else {
      switch (val.length) {
        case 1:
          gl.uniform1iv(loc, val);
          break;
        case 2:
          gl.uniform2iv(loc, val);
          break;
        case 3:
          gl.uniform3iv(loc, val);
          break;
        case 4:
          gl.uniform4iv(loc, val);
          break;
        default:
          throw new Error('GLSL ivec' + val.length + ' does not exist');
      }
    }
    return true;
  }

  public setFloatUniform(val: number | vec2 | vec3 | vec4, name: string): boolean {
    const gl: WebGLRenderingContext = this.gl;
    const loc: WebGLUniformLocation | null = gl.getUniformLocation(this.glProgramId, name);

    if (!loc) {
      console.error('Uniform location not found for: ' + name);
      return false;
    }

    if (isNumber(val)) {
      gl.uniform1f(loc, val);
    } else {
      const valLength = val.length;

      if (isVec2(val)) {
        gl.uniform2fv(loc, val);
      } else if (isVec3(val)) {
        gl.uniform3fv(loc, val);
      } else if (isVec4(val)) {
        gl.uniform4fv(loc, val);
      } else {
        throw new UnreachableCaseError(val, 'GLSL vec' + valLength + ' does not exist');
      }
    }
    return true;
  }

  public setMatrixUniform(val: mat2 | mat3 | mat4, name: string): boolean {
    const gl: WebGLRenderingContext = this.gl;
    const loc: WebGLUniformLocation | null = gl.getUniformLocation(this.glProgramId, name);

    if (!loc) {
      console.error('Uniform location not found for: ' + name);
      return false;
    }

    if (isMat2(val)) {
      gl.uniformMatrix2fv(loc, false, val);
    } else if (isMat3(val)) {
      gl.uniformMatrix3fv(loc, false, val);
    } else if (isMat4(val)) {
      gl.uniformMatrix4fv(loc, false, val);
    } else {
      throw new UnreachableCaseError(val, 'GLSL matrix data must contain 4, 9, or 16 elements');
    }

    return true;
  }

  public setTextureUniform(texture: Texture, name: string, activeTex: number = 0): boolean {
    const gl: WebGLRenderingContext = this.gl;
    const loc: WebGLUniformLocation | null = gl.getUniformLocation(this.glProgramId, name);

    if (!loc) {
      console.error('Uniform location not found for: ' + name);
      return false;
    }

    gl.activeTexture(gl.TEXTURE0 + activeTex);
    gl.uniform1i(loc, activeTex);
    texture.bind();
    return true;
  }
}
