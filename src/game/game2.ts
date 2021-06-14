// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { glMatrix, mat4, mat3, vec2, vec3 } from 'gl-matrix';
import { fromEvent, merge, Observable, pipe, combineLatest as combineLatestTopLevel, from, interval, of } from 'rxjs';
import {
  map,
  mapTo,
  mergeMap,
  startWith,
  takeUntil,
  tap,
  pairwise,
  scan,
  combineLatest,
  timestamp,
  switchMap,
} from 'rxjs/operators';
// import forestPicture from '../assets/forest-low-quality.jpg';
import minecraftSprite from '../assets/minecraft.png';
import { Program } from './program';
import { Shader } from './shader';
import { Pipeline } from './pipeline';
import { Texture } from './texture';
import frag from './debug.frag';
import vert from './debug.vert';
import wavy from './wavy.vert';
import { makeCube } from './primitives/cube';
import { makePlane } from './primitives/plane';
import { Mesh } from './primitives/mesh';
import { Shape } from './shapes.enum';
import { Settings } from './settings';

interface UserDragInput {
  yawAngle: number;
  pitchAngle: number;
}

const COLORING_POSITIONS = 0;
const COLORING_NORMALS = 1;
const COLORING_TEXTURE_COORDINATES = 2;
const COLORING_VERTEX_COLORS = 3;
const COLORING_UNIFORM_COLOR = 4;
const COLORING_TEXTURE = 5;
const COLORING_WHITE = 6;

let coloring = COLORING_NORMALS;

function makeFaceTexCoords(x: number, y: number): [vec2, vec2, vec2, vec2] {
  const spritePixelSize = 16;

  const textureWidth = 385;
  const textureHeight = 705;

  return [
    vec2.fromValues(((x + 0) * spritePixelSize + 1) / textureWidth, ((y + 1) * spritePixelSize + 1) / textureHeight),
    vec2.fromValues(((x + 1) * spritePixelSize + 1) / textureWidth, ((y + 1) * spritePixelSize + 1) / textureHeight),
    vec2.fromValues(((x + 0) * spritePixelSize + 1) / textureWidth, ((y + 0) * spritePixelSize + 1) / textureHeight),
    vec2.fromValues(((x + 1) * spritePixelSize + 1) / textureWidth, ((y + 0) * spritePixelSize + 1) / textureHeight),
  ];
}

export const startGame2 = () => {
  /*
   * Setup WebGL
   */
  const canvas: HTMLCanvasElement | undefined = document.getElementById('renderCanvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error(`No canvas available`);
  }
  const options: WebGLContextAttributes = {
    antialias: true,
  };
  const gl = canvas.getContext('webgl', options);

  if (!gl) {
    throw new Error(`OpenGL not available!`);
  }

  // set default value
  gl.clearColor(0, 0, 0, 1);

  // Render closer items on top of farther items
  gl.enable(gl.DEPTH_TEST);

  // "Cull" (don't render) the back faces of triangles
  gl.enable(gl.CULL_FACE);

  const vertex = new Shader(gl, { type: gl.VERTEX_SHADER, source: vert });
  const fragment = new Shader(gl, { type: gl.FRAGMENT_SHADER, source: frag });

  const program = new Program(gl, vertex, fragment);

  const settings = document.getElementById('settings') as HTMLFormElement | null;

  if (!settings) {
    throw new Error(`Missing form element for the settings`);
  }

  const shape = document.getElementById('shape') as HTMLSelectElement | null;
  const showNormals = document.getElementById('show-normals') as HTMLInputElement | null;

  if (!shape) {
    throw new Error(`Missing shape for the settings`);
  }

  if (!showNormals) {
    throw new Error(`Missing showNormals for the settings`);
  }

  const shape$ = fromEvent(shape, 'change').pipe(
    startWith(null),
    map(() => shape.value as Shape),
  );

  const showNormals$ = fromEvent(showNormals, 'change').pipe(
    startWith(null),
    map(() => showNormals.checked),
  );

  const settings$ = merge(
    shape$.pipe(map((shape) => ({ shape }))),
    showNormals$.pipe(map((showNormals) => ({ showNormals }))),
  ).pipe(
    scan(
      (acc, current) => ({
        ...acc,
        ...current,
      }),
      {
        shape: shape.value as Shape,
        showNormals: showNormals.checked,
      },
    ),
  );

  // const settings$: Observable<Settings> = fromEvent(settings, 'change').pipe(
  //   startWith(null),
  //   map((x) => {

  //     // settings.elements.reduce((acc, e) => {
  //     //   acc[]

  //     //   return acc
  //     // }, {})

  //     for ( let i = 0; i < settings.elements.length; i++ ) {
  //       let e = settings.elements[i];
  //       if (e.nodeName === "INPUT") {
  //         console.log(e.nodeValue);

  //       }

  //       if (e.nodeName === "SELECT") {

  //         console.log((e as any).value);

  //       }
  //       console.log(e.nodeName)
  //    }
  //     return {
  //       shape: Shape.CUBE,
  //       showNormals:false
  //       // shape:   (settings..options[settings.selectedIndex].value as unknown) as Shape,
  //       // showNormals:boolean;
  //     } as any
  //   }),
  // );

  const texture = new Texture(gl, 1, 1);

  const image$ = new Observable((observer) => {
    const image = new Image();

    image.onload = () => {
      texture.updateTexture(image, gl.NEAREST);

      observer.next();
      observer.complete();
    };

    image.src = minecraftSprite;
  });

  let pipeline = new Pipeline(program, texture, null, []);

  const updateShape$ = settings$.pipe(
    tap((settings) => {
      pipeline.clearGeometry();

      let mesh: Mesh | null = null;

      switch (settings.shape) {
        case Shape.CUBE: {
          mesh = makeCube();
          pipeline.addGeometry(gl, mesh);

          coloring = COLORING_NORMALS;
          break;
        }
        case Shape.MINECRAFT: {
          mesh = makeCube();

          mesh.textureCoordinates = [
            makeFaceTexCoords(8, 0),
            makeFaceTexCoords(8, 0),
            makeFaceTexCoords(8, 0),
            makeFaceTexCoords(8, 0),
            makeFaceTexCoords(10, 0), // bottom
            makeFaceTexCoords(9, 0), // top
          ].flat();

          pipeline.addGeometry(gl, mesh);

          coloring = COLORING_TEXTURE;
          break;
        }
        case Shape.PLANE: {
          mesh = makePlane(10, 10);
          pipeline.addGeometry(gl, mesh);

          coloring = COLORING_TEXTURE_COORDINATES;
          break;
        }
        case Shape.SPHERE: {
          break;
        }
        case Shape.WAVY: {
          const wavyVertex = new Shader(gl, { type: gl.VERTEX_SHADER, source: wavy });

          const wavyProgram = new Program(gl, wavyVertex, fragment);

          pipeline = new Pipeline(wavyProgram, texture, null, []);
          mesh = makePlane(100, 100);
          pipeline.addGeometry(gl, mesh);

          coloring = COLORING_POSITIONS;
          break;
        }

        default:
          let a: never = settings.shape;
          throw new Error(`${a} is not a recognized shape`);
      }

      if (mesh && settings.showNormals) {
        pipeline.addGeometry(gl, mesh.createNormalsMesh());
      }
    }),
  );

  /*
   * "Render loop"
   */

  // drag: translation --> current position of the mouse
  // ctrl + drag: rotation --> starting point + the current one
  // shift + drag: scale

  const move$ = fromEvent<MouseEvent>(document, 'mousemove');
  const down$ = fromEvent<MouseEvent>(document, 'mousedown');
  const up$ = fromEvent<MouseEvent>(document, 'mouseup');
  const zoom$ = fromEvent<WheelEvent>(document, 'wheel');
  const windowResize$ = fromEvent(window, 'resize');

  const userInput$ = down$.pipe(
    mergeMap((downMouseEvent) =>
      move$.pipe(
        pairwise(),
        map(([previousMoveMouseEvent, currentMoveMouseEvent]) =>
          getUserInput(previousMoveMouseEvent, currentMoveMouseEvent),
        ),
        takeUntil(up$),
      ),
    ),
  );

  function getUserInput(previousMouseEvent: MouseEvent, currentMouseEvent: MouseEvent): UserDragInput {
    return {
      yawAngle: glMatrix.toRadian((currentMouseEvent.clientX - previousMouseEvent.clientX) * -0.5),
      pitchAngle: glMatrix.toRadian((currentMouseEvent.clientY - previousMouseEvent.clientY) * -0.5),
    };
  }

  const DEFAULT_USER_INPUT: UserDragInput = {
    yawAngle: 0,
    pitchAngle: 0,
  };

  combineLatestTopLevel(
    updateShape$,
    image$.pipe(mapTo(undefined)),
    windowResize$.pipe(startWith(undefined)),
    userInput$.pipe(
      scan<UserDragInput>(
        (acc, curr) => ({
          yawAngle: acc.yawAngle + curr.yawAngle,
          pitchAngle: Math.max(
            Math.min(acc.pitchAngle + curr.pitchAngle, glMatrix.toRadian(89.9)),
            glMatrix.toRadian(-89.9),
          ),
        }),
        DEFAULT_USER_INPUT,
      ),
      startWith(DEFAULT_USER_INPUT),
    ),
    zoom$.pipe(
      scan<WheelEvent, { orbitDistance: number }>(
        (acc, curr) => ({
          orbitDistance: acc.orbitDistance + Math.sign(curr.deltaY) * acc.orbitDistance * 0.075,
        }),
        { orbitDistance: 5 },
      ),
      startWith({ orbitDistance: 5 }),
    ),
    of(null).pipe(
      timestamp(),
      map(({ timestamp }) => timestamp),
      switchMap((timeProgramStartedMs) =>
        interval(16).pipe(
          timestamp(),
          map(({ timestamp }) => (timestamp - timeProgramStartedMs) / 1000),
        ),
      ),
    ),
  )
    .pipe(
      tap(([_1, _2, _3, userInput, { orbitDistance }, timeInSeconds]) => {
        render(canvas, gl, pipeline, userInput, orbitDistance, timeInSeconds);
      }),
    )
    .subscribe();
};

function render(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  userDragInput: UserDragInput,
  orbitDistance: number,
  timeInSeconds: number,
) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  let transformationMatrix = mat4.create();

  let eyePosition = vec3.fromValues(0, 0, orbitDistance);
  if (userDragInput) {
    vec3.rotateX(eyePosition, eyePosition, [0, 0, 0], userDragInput.pitchAngle);
    vec3.rotateY(eyePosition, eyePosition, [0, 0, 0], userDragInput.yawAngle);
  }

  const viewMatrix = mat4.lookAt(
    mat4.create(),
    eyePosition, // Eye position
    [0, 0, 0], // Point to look at
    [0, 1, 0], // Up direction
  );
  mat4.multiply(transformationMatrix, viewMatrix, transformationMatrix);

  const projectionMatrix = mat4.perspective(
    mat4.create(),
    // Field of View Y (angle between top and bottom planes of camera)
    glMatrix.toRadian(60.0),
    // Aspect ratio
    canvas.width / canvas.height,
    0.1, // Near clipping distance
    100.0, // Far clipping distance
  );
  mat4.multiply(transformationMatrix, projectionMatrix, transformationMatrix);

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderPipeline(gl, pipeline, transformationMatrix, timeInSeconds);
}

function renderPipeline(
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  projectionFromWorld: mat4,
  timeInSeconds: number,
) {
  const worldFromLocal = mat4.create();
  const worldFromLocalNormal = mat3.normalFromMat4(mat3.create(), worldFromLocal);

  const uniformColor = vec3.fromValues(1.0, 0.85, 0.7);
  const opacity = 1.0;

  pipeline.program.use(() => {
    pipeline.program.setMatrixUniform(worldFromLocal, `worldFromLocal`);
    pipeline.program.setMatrixUniform(worldFromLocalNormal, `worldFromLocalNormal`);
    pipeline.program.setMatrixUniform(projectionFromWorld, `projectionFromWorld`);

    pipeline.program.setIntUniform(coloring, `coloring`);
    pipeline.program.setFloatUniform(uniformColor, `uniformColor`);
    pipeline.program.setFloatUniform(opacity, `opacity`);
    pipeline.program.setFloatUniform(timeInSeconds, `timeInSeconds`);

    if (pipeline.texture) {
      pipeline.program.setTextureUniform(pipeline.texture, `tex`);
    }

    pipeline.geometry.forEach((geometry) => {
      geometry.vertexArray.render(geometry.primitiveType, 0, geometry.vertexCount, geometry.indexBuffer);
    });
  });
}
