import { Program } from './program';
import { Buffer } from './buffer';

export interface VAOElement {
    name: string;
    size: number;
    type: GLenum;
    offset: number;
  }

interface VertexArrayElement {
    location: number;
    size: number;
    type: GLenum;
    offset: number;
  }
  

export class VertexArray {
  private vaoElements : VertexArrayElement[]

  constructor(private gl: WebGLRenderingContext, program: Program, private buffer: Buffer, vaoElements:  VAOElement[]) {
   this.vaoElements = vaoElements.map(vaoElement => {
      const { name, ...commonVaoElement } = vaoElement;

      // -1 if couldn't find attribute
      const attributeLocation = gl.getAttribLocation(
        program.getProgramId(),
        name
      );

      if (attributeLocation < 0) {
        throw new Error(`Failed to find attribute location for: ${name}`);
      }
      
      return {
        ...commonVaoElement,
        location: attributeLocation
      }
    })
  }

  public prepareForRender():void {
    this.vaoElements.forEach((vaoElement) => {
      this.gl.enableVertexAttribArray(vaoElement.location);
    
      this.gl.vertexAttribPointer(
        vaoElement.location,
        vaoElement.size,
        vaoElement.type,
        false, // no idea what that is :D
        0, // TODO: pass in total stride in constructor
        vaoElement.offset
      );
    })
  }

  public render(primitiveType: GLenum, start: number, vertexCount: number) {
    this.buffer.scopeBind(() => {
      this.prepareForRender();
      this.gl.drawArrays(primitiveType, start, vertexCount);
    })
  }
}
