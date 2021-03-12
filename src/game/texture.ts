import { getSafe, isPowerOf2, ShaderData } from './utils';


export class Texture {
  private textureId: WebGLTexture;

  constructor(private gl: WebGLRenderingContext, 
    width: number,
    height: number,
    data: ArrayBufferView | null = null,
    private textureType = gl.TEXTURE_2D
    ) {
    // Create the WebGL shader id. This does nothing
    // until you use the ID in other functions
    this.textureId = getSafe(
      gl.createTexture(),
      `Couldn't create a texture`
    );

    gl.bindTexture(textureType, this.textureId);
    gl.texImage2D(
      textureType,
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
    gl.texParameteri(textureType, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(textureType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(textureType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  public getTextureId(): WebGLTexture {
    return this.textureId;
  }

  public bind(): void {
    this.gl.bindTexture(this.textureType, this.textureId);
  }

  public unbind(): void {
    this.gl.bindTexture(this.textureType, null);
  }

  public scopeBind(cb:() => void): void {
    this.bind();
    cb();
    this.unbind();
  }

  public updateTexture(
    image: HTMLImageElement
  ): void {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL

    this.gl.bindTexture(this.textureType, this.getTextureId());
    this.gl.texImage2D(this.textureType, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      this.gl.generateMipmap(this.textureType);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      this.gl.texParameteri(this.textureType, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.textureType, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(
        this.textureType,
        this.gl.TEXTURE_MIN_FILTER,
        // other option `gl.NEAREST`
        this.gl.LINEAR
      );
    }

    this.gl.bindTexture(this.textureType, null);
  }

}
