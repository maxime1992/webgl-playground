import { getSafe, isPowerOf2, ShaderData } from './utils';


export class Texture {
  private textureId: WebGLTexture;

  constructor(private gl: WebGLRenderingContext, 
    width: number,
    height: number,
    data: ArrayBufferView | null = null) {
    // Create the WebGL shader id. This does nothing
    // until you use the ID in other functions
    this.textureId = getSafe(
      gl.createTexture(),
      `Couldn't create a texture`
    );

    gl.bindTexture(gl.TEXTURE_2D, this.textureId);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );
    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  public getTextureId(): WebGLTexture {
    return this.textureId;
  }

  public bind(): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureId);
  }

  public unbind(): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  public updateTexture(
    image: HTMLImageElement
  ): void {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.getTextureId());
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        // other option `gl.NEAREST`
        this.gl.LINEAR
      );
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

}
