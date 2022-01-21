import { Texture } from './texture';
import { getSafe, isPowerOf2, ShaderData } from './utils';

export class Framebuffer {
  private framebufferId: WebGLTexture;

  constructor(private gl: WebGLRenderingContext, width: number, height: number, framebufferTexture: Texture) {
    this.framebufferId = getSafe(gl.createFramebuffer(), `Couldn't create a framebuffer`);

    // simply to define the depth attachment that we don't really use
    // and pass it to the frame buffer which requires it but we're only
    // interested in the color attachment (webgl texture) of the framebuffer
    const renderBufferId = getSafe(gl.createRenderbuffer(), `Couldn't create a render buffer`);

    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBufferId);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    this.scopeBind(() => {
      framebufferTexture.scopeBind(() => {
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBufferId);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          framebufferTexture.getTextureId(),
          0,
        );

        const framebufferStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        switch (framebufferStatus) {
          case gl.FRAMEBUFFER_COMPLETE:
            break;
          case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            throw new Error(`Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT`);
          case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            throw new Error(`Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT`);
          case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            throw new Error(`Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS`);
          case gl.FRAMEBUFFER_UNSUPPORTED:
            throw new Error(`Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED`);
          default:
            throw new Error(`Incomplete framebuffer: Unknown status`);
        }
      });
    });

    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  }

  public getFramebufferId(): WebGLTexture {
    return this.framebufferId;
  }

  public bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebufferId);
  }

  public unbind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  public scopeBind(cb: () => void): void {
    this.bind();
    cb();
    this.unbind();
  }
}
