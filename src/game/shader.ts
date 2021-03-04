import { getSafe, ShaderData } from './utils';

export class Shader {
  private webGlShaderId: WebGLShader;

  constructor(gl: WebGLRenderingContext, shaderData: ShaderData) {
    // Create the WebGL shader id. This does nothing
    // until you use the ID in other functions
    this.webGlShaderId = getSafe(
      gl.createShader(shaderData.type),
      `Couldn't create the shader`
    );

    // Tells WebGL what shader code is (the GLSL)
    gl.shaderSource(this.webGlShaderId, shaderData.source);

    // This attempts to compiler the shader code
    gl.compileShader(this.webGlShaderId);

    // This queries for any errors in the compilation process.
    if (!gl.getShaderParameter(this.webGlShaderId, gl.COMPILE_STATUS)) {
      throw new Error(
        `Couldn't compile the shader. ${gl.getShaderInfoLog(
          this.webGlShaderId
        )}`
      );
    }
  }

  public getWebGlShaderId(): WebGLShader {
    return this.webGlShaderId;
  }
}
