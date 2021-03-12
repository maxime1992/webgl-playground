import { getSafe, isPowerOf2, ShaderData } from './utils';

export class Buffer {
  private bufferId: WebGLTexture;

  constructor(private gl: WebGLRenderingContext, vboData: Float32Array, private bufferType =  gl.ARRAY_BUFFER) {
    // create buffer on the GPU
    this.bufferId = getSafe(gl.createBuffer(), `Couldn't create the buffer`);

    this.scopeBind(() => gl.bufferData(bufferType, vboData, gl.STATIC_DRAW));
  }

  public getBufferId(): WebGLTexture {
    return this.bufferId;
  }

  public bind(): void {
    this.gl.bindBuffer(this.bufferType, this.bufferId);
  }

  public unbind(): void {
    this.gl.bindBuffer(this.bufferType, null);
  }

  public scopeBind(cb: () => void): void {
    this.bind();
    cb();
    this.unbind();
  }
}
