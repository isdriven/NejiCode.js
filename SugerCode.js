/* SugerCode.js 
 *  Author: isdriven
 *  This is Game Library.
 *  canvas with WebGL
 */

const FPS = 60;
const entities = [];
let ctx = null;
let canvas = null;
let uiLayer = null;
let canvasSelector = "canvas";
let lastTs = 0;
let beatIsActive = true;
let requestId = null;
let renderer = null;
let fieldX = null;
let fieldY = null;
let fieldScale = 1;

const audioContext = new (window.AudioContext || window.webkitAudioContext)()
const seGainNode = audioContext.createGain()
seGainNode.connect(audioContext.destination)

function beat(ts) {
  if (!beatIsActive){
    requestId = requestAnimationFrame(beat)
    return;
  }

  if (ts - lastTs > 1000 / FPS) {
    renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
    lastTs = ts
    const sorted = [...entities].filter(t=>t.loaded).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    sorted.forEach(t => applyUpdate(t))
    sorted.forEach(t => applyGear(t))
    sorted.forEach(t => renderer.drawGl(t))
  }

  requestId = requestAnimationFrame(beat)
}

function pause() {
  beatIsActive = false
}

function resume(){
  beatIsActive = true
}

export function pauseAndResumeWorld(){
  // world全体をpauseしたり、resumeする。
  beatIsActive = !beatIsActive
}

export function startWorld(_fieldX, _fieldY) {
  fieldX = _fieldX
  fieldY = _fieldY

  entities.length = 0;
  ctx = null;
  canvas = null;
  uiLayer = null;
  lastTs = 0;

  useCamera(0, 0, 1, 0);

  if (!canvasSelector) {
    throw new Error(`No Canvas selector.`);
  }
  document.body.style.overflow = "hidden";
  canvas = document.querySelector(canvasSelector);
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  canvas.style.margin = "auto auto";  

  // for Ui
  const parent = canvas.parentElement;
  if (!parent) throw new Error("Canvas has no parent element.");
  parent.style.position = "relative";

  uiLayer = parent.querySelector(".canvas-dom-layer");
  if (!uiLayer) {
    const uiCover = document.createElement("div");
    Object.assign(uiCover.style, {
      position: "absolute",
      top: "0", left: "0", width: "100%", height: "100%",
      margin: "0", padding: "0", pointerEvents: "none",
    });
    parent.appendChild(uiCover);

    uiLayer = document.createElement("div");
    uiLayer.className = "canvas-dom-layer";
    Object.assign(uiLayer.style, {
      margin: "auto auto", width: canvas.width + "px", height: canvas.height + "px",
      pointerEvents: "none", position: "relative",
      overflow: "hidden"
    });
    uiCover.appendChild(uiLayer);
  }  

  renderer = new WebGLRenderer(canvas);
  //renderer.gl.clearColor(0, 0, 0, 1);
  renderer.gl.clearColor(255, 255, 255, 1);

  if (!canvas) { throw new Error(`Canvas not found: ${config.canvasSelector}`);}

  adjustField();

  initializeTouchInput(canvas);  
  createSystemEntities()  
  beat()
}

// ----- Camera -----
export function useCamera(x=0, y=0, scale=1, rotate=0){
  cameraMatrix = Matrix2D.identity()
    .translate(x, y)
    .rotate(rotate * Math.PI / 180)
    .scale(scale, scale);
}

function adjustField() {
  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight
  const scaleX = innerWidth / fieldX;
  const scaleY = innerHeight / fieldY;
  fieldScale = Math.min(scaleX, scaleY);
  fieldScale = Math.min(1, fieldScale); // 最大1に抑える制限が必要なら

  let displayWidth, displayHeight;
  
  if (scaleX > scaleY) {
    displayHeight = fieldY * scaleY
    displayWidth = fieldX * scaleY;
  } else {
    displayHeight = fieldY * scaleX;
    displayWidth = fieldX * scaleX
  }

  displayHeight = Math.min( displayHeight, fieldY )
  displayWidth = Math.min( displayWidth, fieldX )
  
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = displayWidth;
  canvas.height = displayHeight;
  //console.log( canvas.style.x, canvas.style.y )
  uiLayer.style.width = `${displayWidth}px`;
  uiLayer.style.height = `${displayHeight}px`;

  if (renderer) {
    renderer.gl.viewport(0, 0, canvas.width, canvas.height);
    //renderer = new WebGLRenderer(canvas);
    //renderer.gl.clearColor(0, 0, 0, 1);
  }
}
// ----- Gear -----
export function useGear() {
  return new Gear();
}

class Gear {
  constructor() {
    this.commandLines = [];
    this.currentIndex = 0;
    this.valid = true;
    this.gearTime = -1;
  }
  
  check(f){ this.commandLines.push({ type: "check", func: f });  return this; }
  checkEnd(f, onEnd){ this.commandLines.push({ type: "checkEnd", func: f, onEnd: onEnd }); return this;}  
  set(list){ this.commandLines.push({ type:"set", list:list }); return this;}
  wait(ms){ this.commandLines.push({type:"wait", ms: ms}); return this; }
  call(f){ this.commandLines.push({type:"call", func: f}); return this; }
  put(list){ this.commandLines.push({type:"put", list: list}); return this; }
  end(onEnd){ this.commandLines.push({type:"end", func:onEnd}); return this; }

  nextCommand(command){
    this.currentIndex += 1;
    this.gearTime = -1;
  }
  resetCommand(){
    this.currentIndex = 0;
    this.gearTime = -1;
  }
  
  run(entity){
    const command = this.commandLines[this.currentIndex];
    if( typeof command == "undefined" ){
      this.resetCommand();
      return;
    }
    const type = command["type"];
    switch(type){
      case "check":
        if( command["func"](entity) === true ){
          this.nextCommand(command);
        }
        break;
      case "checkEnd":
        if ( command["func"](entity) === true) {
          if (typeof command["onEnd"] === "function") {
            command["onEnd"](entity);
          }
          this.valid = false;
        } else {
          this.nextCommand();
        }
        break;        
      case "set":
        Object.assign(entity, command["list"]); 
        this.nextCommand();
        break;
      case "wait":
        this.gearTime++;
        if( this.gearTime > command["ms"] ){
          this.nextCommand();
        }
        break;
      case "call":
        command["func"](entity)
        this.nextCommand()
        break;
      case "put":
        this.gearTime++;
        const list = command["list"];
        for (const [key, fn] of Object.entries(list)) {
          if (typeof fn === "function") {
            entity[key] = fn(entity, this.gearTime);
          }else if( key == "time" ){
          }else{
            console.log(`put needs function for entity.  { x : (entity) => {} }`)
          }
        }
        if (this.gearTime >= command["list"]["time"]) {
          this.nextCommand();
        }
        break;
      case "end":
        if( typeof command["func"] == "function" ){
          command["func"](entity)
        }
        this.valid = false
        break;
    }
  }

  drive(entity, args){
    const gear = useGear();
    gear.commandLines = this.commandLines;
    gear.end()
    entity.driveBy(gear)
  }
}

// ----- Entity -----
function getUuid(){
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2)
}
function applyUpdate(entity){
  entity.lifeTime++;
  if (typeof entity.update === "function") {
    entity.update();
  }
  entity.children.forEach(child => applyUpdate(child));
}
function applyGear(entity) {
  if (Array.isArray(entity.gears)) {
     entity.gears = entity.gears.filter(gear => {
      if (!gear.valid) return false;
      gear.run(entity);
      return gear.valid;
    });
  }
  if( entity.drivers.length > 0 ){
    entity.gears = [...entity.gears, ...entity.drivers];
    entity.drivers = [];
  }
  if (Array.isArray(entity.children)) {
    entity.children.forEach(child => applyGear(child));
  }
}
export async function useEntity(args) {
  if( args.scale ){
    args.scaleX = args.scale;
    args.scaleY = args.scale;
  }
  const entity = new Entity(args)
  if( args.src ){
    await entity.init()
  }else{
    entity.loaded =  true
  }
  return entity
}
class Entity {
  constructor(args) {
    Object.assign(this, args); 
    this.lifeTime = 0
    this.loaded = false

    if( this.x == null ) this.x = 0;
    if( this.y == null ) this.y = 0;
    if( this.rotate == null ) this.rotate = 0;
    if( this.alpha == null ) this.alpha = 1;
    if( this.zIndex == null ) this.zIndex = 0;

    this.uuid = getUuid();
    this.children = [];
    this.gears = [];
    this.drivers = [];

    entities.push(this);
  }
  has(...children){
    children.forEach(child => {
      child.parent = this;
      this.children.push(child);
      const idx = entities.findIndex(e => e.uuid === child.uuid);
      if (idx !== -1) {
        entities.splice(idx, 1);
      }      
    });
  }
  hasGear(...gears){
    gears.forEach(gear => {
      this.gears.push(gear);
    });
  }
  driveBy(...drivers){
    drivers.forEach(driver => {
      this.drivers.push(driver);
    });
  }
  getLocalMatrix() {
    return Matrix2D.identity()
      .translate(this.x ?? 0, this.y ?? 0)
      .rotate((this.rotate ?? 0) * Math.PI / 180)
      .scale(this.scaleX ?? 1, this.scaleY ?? 1);
  }
  getWorldMatrix() {
    let mat = Matrix2D.identity();
    let current = this;
    const stack = [];

    // 親から順に積む
    while (current) {
      stack.unshift(current);
      current = current.parent;
    }

    // 親から順に合成
    for (let i = 0; i < stack.length; i++) {
      mat = mat.multiply(stack[i].getLocalMatrix());
    }

    return mat;
  }
  getBoundingBox() {
    const mat = this.getWorldMatrix();
    const width = this.image?.width || 0;
    const height = this.image?.height || 0;
    const ax = ((this.anchorX ?? 0.5)-0.5) * width;
    const ay = ((this.anchorY ?? 0.5)-0.5) * height;
    const x = mat.e - ax;
    const y = mat.f - ay;
    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  }
  async init() {
    if (this.src) {
      try {
        this.image = await this.loadBitmap(this.src);
        this.loaded = true
      } catch (e) {
        console.error("Failed to load image:", e);
      }
    }
  }
  async loadBitmap(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  }
  clone(overrides = {}) {
    const newArgs = {
      ...this,
      ...overrides,
      image: this.image,
      loaded: true,
      src: undefined,
    };
    const entity =  new Entity(newArgs);
    entity.loaded = true
    return entity
  }
  removeSelf() {
    const idx = entities.findIndex(e => e.uuid === this.uuid);
    if (idx !== -1) {
      entities.splice(idx, 1);
    }
    if (this.parent) {
      const childIdx = this.parent.children.findIndex(c => c.uuid === this.uuid);
      if (childIdx !== -1) {
        this.parent.children.splice(childIdx, 1);
      }
      this.parent = null;
    }
  }
}

class Matrix2D {
  constructor(a=1, b=0, c=0, d=1, e=0, f=0) {
    this.a = a; this.b = b;
    this.c = c; this.d = d;
    this.e = e; this.f = f;
  }

  static identity() {
    return new Matrix2D();
  }

  static inverse(m) {
    const {a, b, c, d, e, f} = m;
    const det = a * d - b * c;
    if (det === 0) {
      console.warn("Matrix is not invertible");
      return Matrix2D.identity();
    }

    const idet = 1 / det;
    return new Matrix2D(
      d * idet,
      -b * idet,
      -c * idet,
      a * idet,
      (c * f - d * e) * idet,
      (b * e - a * f) * idet
    );
  }

  multiply(mat) {
    return new Matrix2D(
      this.a * mat.a + this.c * mat.b,
      this.b * mat.a + this.d * mat.b,
      this.a * mat.c + this.c * mat.d,
      this.b * mat.c + this.d * mat.d,
      this.a * mat.e + this.c * mat.f + this.e,
      this.b * mat.e + this.d * mat.f + this.f
    );
  }

  translate(x, y) {
    return this.multiply(new Matrix2D(1, 0, 0, 1, x, y));
  }

  rotate(rad) {
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return this.multiply(new Matrix2D(cos, sin, -sin, cos, 0, 0));
  }

  scale(sx, sy) {
    return this.multiply(new Matrix2D(sx, 0, 0, sy, 0, 0));
  }

  applyToContext(ctx) {
    ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f);
  }

  applyToPoint(x, y) {
    return {
      x: this.a * x + this.c * y + this.e,
      y: this.b * x + this.d * y + this.f
    };
  }
}
let cameraMatrix = Matrix2D.identity(); // has to be after Matrix2D

class WebGLRenderer {
  constructor(canvas) {
    this.gl = canvas.getContext('webgl');
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);    
    if (!this.gl) throw new Error("WebGL not supported");

    this.textureCache = new Map();
    this.initShaders();
    this.initBuffers();
  }
  initShaders() {
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      uniform mat3 u_matrix;
      varying vec2 v_texcoord;
      void main() {
        vec3 pos = u_matrix * vec3(a_position, 1.0);
        gl_Position = vec4(pos.xy, 0.0, 1.0);
        v_texcoord = a_texcoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 v_texcoord;
      uniform sampler2D u_texture;
      uniform float u_alpha;
      void main() {
        vec4 tex = texture2D(u_texture, v_texcoord);
        gl_FragColor = vec4(tex.rgb, tex.a * u_alpha);
      }
    `;

    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    this.program = this.createProgram(vs, fs);
    gl.useProgram(this.program);

    this.u_matrix = gl.getUniformLocation(this.program, 'u_matrix');
    this.u_alpha = gl.getUniformLocation(this.program, 'u_alpha');
    this.u_texture = gl.getUniformLocation(this.program, 'u_texture');

    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.a_texcoord = gl.getAttribLocation(this.program, 'a_texcoord');
  }
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }
  createProgram(vs, fs) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  }
  initBuffers() {
    const gl = this.gl;

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
      -0.5,  0.5,
      -0.5,  0.5,
       0.5, -0.5,
       0.5,  0.5
    ]), gl.STATIC_DRAW);

    this.texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0
    ]), gl.STATIC_DRAW);
  }
  getTexture(image) {
    if (this.textureCache.has(image)) return this.textureCache.get(image);
    const gl = this.gl;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    this.textureCache.set(image, tex);
    return tex;
  }
  matrix2dToUniform(mat) {
    return new Float32Array([
      mat.a, mat.b, 0,
      mat.c, mat.d, 0,
      mat.e, mat.f, 1
    ]);
  }
  createProjectionMatrix(w, h) {
    return new Matrix2D(
      (2 / w) * fieldScale, 0,
      0, (2 / h) * fieldScale,
      0, 0
    );
  }
  setSpriteUV(entity) {
    const gl = this.gl;
  
    const imgW = entity.image.width;
    const imgH = entity.image.height;
    const frameW = entity.frameWidth || imgW;
    const frameH = entity.frameHeight || imgH;
    const frameIndex = entity.frame ?? 0;

    const cols = Math.floor(imgW / frameW);
    const row = Math.floor(frameIndex / cols);
    const col = frameIndex % cols;
  
    const u0 = (col * frameW) / imgW;
    const v0 = (row * frameH) / imgH;
    const u1 = ((col + 1) * frameW) / imgW;
    const v1 = ((row + 1) * frameH) / imgH;
  
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      u0, v1, u1, v1, u0, v0,
      u0, v0, u1, v1, u1, v0
    ]), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this.a_texcoord);
    gl.vertexAttribPointer(this.a_texcoord, 2, gl.FLOAT, false, 0, 0);    
  }
  drawGl(entity, parentAlpha = 1) {
    if (!entity.image){
      if (entity.children?.length) {
        const sortedChildren = [...entity.children].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        sortedChildren.forEach(child => this.drawGl(child, (entity.alpha?entity.alpha:1)));
      }
      return;
    }
    
    // 行列の処理
    const gl = this.gl;
    const imgW = entity.frameWidth || entity.image.width;
    const imgH = entity.frameHeight || entity.image.height;
    let ax = (entity.anchorX ?? 0.5) - 0.5;
    let ay = (entity.anchorY ?? 0.5) - 0.5;

    // プロジェクション行列：canvasピクセル → WebGL座標
    const projection = this.createProjectionMatrix(gl.canvas.width, gl.canvas.height);

    // view（カメラ） * world（親子の変換） * size（画像サイズ）
    const worldMat = entity.getWorldMatrix();
    const viewMat = Matrix2D.inverse(cameraMatrix);
    const sizeMat = Matrix2D.identity().scale(imgW, imgH);

    // anchorを考慮したピクセルオフセット（サイズ＋アンカー）
    const anchorMat = Matrix2D.identity()
      .scale(imgW, imgH)
      .translate(-ax, -ay);

    const finalMat = projection.multiply(viewMat).multiply(worldMat).multiply(anchorMat)
    const alpha = (entity.alpha ?? 1) * parentAlpha;
  
    gl.useProgram(this.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.uniformMatrix3fv(this.u_matrix, false, this.matrix2dToUniform(finalMat));
    gl.uniform1f(this.u_alpha, alpha);
  
    const tex = this.getTexture(entity.image);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.u_texture, 0);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.a_position);
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    this.setSpriteUV(entity)
  
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  
    if (entity.children?.length) {
      const sortedChildren = [...entity.children].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      sortedChildren.forEach(child => this.drawGl(child, alpha));
    }
  }
}

// ----- input -----
//const gamePad2 = navigator.getGamepads()[1];

const padMap = {
  a: 0, b: 1, x: 2, y: 3,
  lb: 4, rb: 5, lt: 6, rt: 7,
  select: 8, start: 9,
  crossup: 12, crossdown: 13, crossleft: 14, crossright: 15,
  home: 16
};

const padState = {};
Object.keys(padMap).forEach(k => {
  padState[k] = { pressed: false, pressedTime: 0 };
});

const leftStick = { pressed: false, pressedTime: 0, angle: null };
const rightStick = { pressed: false, pressedTime: 0, angle: null };

function createSystemEntities(){
  const inputListener = useEntity({
    update() {
      const gamePad = navigator.getGamepads()[0];
      if (gamePad) {
        Object.keys(padMap).forEach(key => {
          const index = padMap[key];
          const isPressed = gamePad.buttons[index]?.pressed ?? false;
          const state = padState[key];

          if (isPressed) {
            state.pressedTime = state.pressed ? state.pressedTime + 1 : 1;
          } else {
            state.pressedTime = 0;
          }
          state.pressed = isPressed;
        });

        // Left stick
        const lx = gamePad.axes[0];
        const ly = gamePad.axes[1];
        const lmag = Math.sqrt(lx * lx + ly * ly);

        if (lmag >= 0.7) {
          leftStick.pressed = true;
          leftStick.pressedTime += 1;
          leftStick.angle = utils.getDegree(0, 0, lx, ly);
          leftStick.magnitude = lmag;
        } else {
          leftStick.pressed = false;
          leftStick.pressedTime = 0;
          leftStick.angle = null;
          leftStick.magnitude = 0;
        }

        // Right stick
        const rx = gamePad.axes[2];
        const ry = gamePad.axes[3];
        const rmag = Math.sqrt(rx * rx + ry * ry);
        if (rmag >= 0.7) {
          rightStick.pressed = true;
          rightStick.pressedTime += 1;
          rightStick.angle = utils.getDegree(0, 0, rx, ry);
          rightStick.magnitude = rmag;
        } else {
          rightStick.pressed = false;
          rightStick.pressedTime = 0;
          rightStick.angle = null;
          rightStick.magnitude = 0;
        }
      }
    }
  });

  // adjust field
  window.addEventListener("resize", adjustField);
}

// used status
const UNUSED = 1;
const READY = 2;
const USED = 3;

class TouchState{
  constructor(){
    this.reset()
  }
  reset(){
    this.x = null;
    this.y = null;
    this.touched = UNUSED;
    this.moving = UNUSED;
    this.released = UNUSED;
  }
  update(x,y,phase){
    if( phase == "touched" ){ 
      if( this.touched == UNUSED ){
        console.log(`touched -> x: ${x}, y:${y}`)
        this.reset();
        this.touched = READY;
        this.moving = READY;
        this.x = x;
        this.y = y;
      }
    }else if( phase == "moving"){
      if( this.moving == READY ){
        console.log(`moving -> x: ${x}, y:${y}`)
        this.x = x;
        this.y = y;
      }
    }else if( phase == "released"){
      if( this.released == UNUSED ){
        console.log(`release -> x: ${x}, y:${y}`)
        this.released = READY;
        this.moving = UNUSED;
        this.touched = UNUSED;
        this.x = x;
        this.y = y;
      }
    }
  }
}
const touchState = new TouchState()

function initializeTouchInput(canvas) {
  canvas.addEventListener('touchstart', updateTouchPosition, false);
  canvas.addEventListener('touchmove', updateMovePosition, false);
  canvas.addEventListener('touchend', updateReleasePosition, false);
  canvas.addEventListener('mousedown', updateTouchPosition, false);
  canvas.addEventListener('mousemove', updateMovePosition, false);
  canvas.addEventListener('mouseup', updateReleasePosition, false);

}

function screenXyToWorldXyFromEvent(event){
  let clientX, clientY;
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }
  const rect = event.target.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const worldX = parseInt((x - canvas.width / 2) / fieldScale + cameraMatrix.e);
  const worldY = parseInt((y - canvas.height / 2) / fieldScale + cameraMatrix.f) * -1;
  return {x: worldX, y: worldY }
}

function updateReleasePosition(event){
  const { x : worldX, y: worldY } = screenXyToWorldXyFromEvent(event)
  touchState.update(worldX, worldY,"released")
}

function updateMovePosition(event){
  const { x : worldX, y: worldY } = screenXyToWorldXyFromEvent(event)
  touchState.update(worldX, worldY,"moving")
}

function updateTouchPosition(event) {
  const { x : worldX, y: worldY } = screenXyToWorldXyFromEvent(event)
  touchState.update(worldX, worldY,"touched")
  event.preventDefault?.();
}

export function useInput(type, target) {
  if (type.includes("gamePad.")) {
    type = type.replace("gamePad.", "");
    if (type === "leftStick") {
      return () => ({
        pressed: leftStick.pressed,
        pressedTime: leftStick.pressedTime,
        angle: leftStick.angle,
        magnitude: leftStick.magnitude
      });
    }
    if (type === "rightStick") {
      return () => ({
        pressed: rightStick.pressed,
        pressedTime: rightStick.pressedTime,
        angle: rightStick.angle,
        magnitude: rightStick.magnitude
      });
    }
    if (!(type in padMap)) {
      console.warn(`useInput: Unknown button type: ${type}`);
      return () => ({ pressed: false, pressedTime: 0 });
    }
    return () => ({
      pressed: padState[type].pressed,
      pressedTime: padState[type].pressedTime
    });
  }else if(type == "touchState"){
    return () => ({
      x: touchState.x,
      y: touchState.y,
      touchState: touchState
    });
  }else if(type.includes("touchMe")) {
    const phase = type.split(".")[1]

    if( phase == "pressed" || phase == "released" ){
      if( touchState.released != READY ){
        return false;
      }
      const touchedEntities = entities.filter(entity => {
        const { x, y, width, height } = entity.getBoundingBox();
        return (
          touchState.x >= x - width/2 &&
          touchState.x <= x + width/2 &&
          touchState.y >= y - height/2 &&
          touchState.y <= y + height/2
        );
      });
      const hit =  touchedEntities.some(ent => ent.uuid === target.uuid );
      if( hit ){
        touchState.reset();
      }
      return hit;
    }
  }
}

// sounds and music
export async function useSound(args) {
  const sound = new Sound(args)
  if( args.src ){
    await sound.init()
  }else{
    return null
  }
  return sound
}

class Sound {
  constructor(args) {
    Object.assign(this, args)
    this.loaded = false
    this.uuid = getUuid()
    this.buffer = null
  }

  async init() {
    if (this.src) {
      try {
        const res = await fetch(this.src)
        const arrayBuffer = await res.arrayBuffer()
        this.buffer = await audioContext.decodeAudioData(arrayBuffer)
        this.loaded = true
      } catch (e) {
        console.error("Failed to load sound:", e)
      }
    }
  }

  play(volume = 1.0) {
    if (!this.buffer) return
    const source = audioContext.createBufferSource()
    source.buffer = this.buffer

    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(volume, audioContext.currentTime)

    source.connect(gain)
    gain.connect(seGainNode) // 1chへルーティング
    source.start()
  }
}

export async function useMusic(args) {
  const music = new Music(args)
  if( args.src ){
    await music.init()
  }else{
    return null
  }
  return music
}

let musicChannels = [null, null]
let musicCurrentIndex = 0

class Music {
  constructor(args) {
    Object.assign(this, args)
    this.loaded = false
    this.buffer = null
    this.loop = args.loop ?? true
    this.uuid = getUuid()
  }

  async init() {
    if (this.src) {
      try {
        const res = await fetch(this.src)
        const arrayBuffer = await res.arrayBuffer()
        this.buffer = await audioContext.decodeAudioData(arrayBuffer)
        this.loaded = true
      } catch (e) {
        console.error("Failed to load music:", e)
      }
    }
  }

  play(volume, fadeDuration = 1.0) {
    if (!this.buffer) return

    // 切り替え先のチャンネル
    const nextIndex = (musicCurrentIndex + 1) % 2

    // 新しいsourceとgain
    const source = audioContext.createBufferSource()
    const gain = audioContext.createGain()
    source.buffer = this.buffer
    source.loop = this.loop
    source.connect(gain)
    gain.connect(audioContext.destination)

    // 再生準備（クロスフェード）
    gain.gain.setValueAtTime(0, audioContext.currentTime)
    gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeDuration)
    source.start()

    // 古いチャンネルをfade out + stop
    const prev = musicChannels[musicCurrentIndex]
    if (prev && prev.source) {
      try {
        prev.gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeDuration)
        prev.source.stop(audioContext.currentTime + fadeDuration)
      } catch (e) {
        console.warn("Previous music channel stop error:", e)
      }
    }

    // 状態更新
    musicChannels[nextIndex] = { source, gain }
    musicCurrentIndex = nextIndex
  }

  stop(fadeDuration = 1.0) {
    const current = musicChannels[musicCurrentIndex]
    if (!current || !current.source) return

    current.gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeDuration)
    current.source.stop(audioContext.currentTime + fadeDuration)
    musicChannels[musicCurrentIndex] = null
  }
}

// ----- Utility -----
const utils = {
  getDxDy(x, y, speed, angle){
    const rad = angle * (Math.PI / 180)
    return {
      x: x + Math.cos(rad) * speed,
      y: y + Math.sin(rad) * speed
    }
  },
  getDegree( x1,y1, x2,y2 ){
    let res = Math.round( utils.rad2deg( utils.getRad( x2-x1 , y2-y1 ) ) );
    if( res < 0 ){ res = 360 + res; }
    return res;
  },  
  rad2deg(rad){
    return rad * (180/Math.PI);
  },
  deg2rad(deg){
    return deg * (Math.PI/180 );
  },
  getRad(x,y){
    return Math.atan2( y , x );
  },
  sample(list){
    return list[utils.rand(0,list.length-1)]
  },
  rand(min,max){
    return Math.floor(Math.random()*(max+1-min))+min
  },
  randFloat(min, max){
    return Math.random() * (max - min) + min;  
  },
  getXy(degree,v,round=false,x=0,y=0){
    let rad = utils.deg2rad(degree)
    if( round ){
      return {x: utils.add(x,Math.round( Math.cos( rad ) * v )) , y: utils.add(y,Math.round( Math.sin( rad ) * v )) };
    }else{
      return {x: utils.add(x,Math.cos( rad ) * v) ,y: utils.add(y,Math.sin( rad ) * v )};
    }
  },
  getDistance(x1,y1,x2,y2){
    let a = x1-x2
    let b = y1-y2
    return Math.sqrt((a*a)+(b*b))
  },
  isInDegreeRange(degree,range,target){
    let min = degree - range / 2
    let max = degree + range / 2
    if( min <= 0 ){
      return ((360 + min) <= target) || (target <= (degree + range /2))
    }else if(max >= 360 ){
      return (target <= (max - 360 )) || ((degree - range / 2) <= target)
    }else{
      return min <= target && target <= max
    }
  },
  add(a, b) {
    const scale = utils.getCommonScale(a, b);
    return (Math.round(a * scale) + Math.round(b * scale)) / scale;
  },
  sub(a, b) {
    const scale = utils.getCommonScale(a, b);
    return (Math.round(a * scale) - Math.round(b * scale)) / scale;
  },
  floor4(v) {
    const digits = utils.getDecimalDigits(v);
    return digits < 4 ? v : Math.floor(v * 10 ** 4) / 10 ** 4;
  },
  getDecimalDigits(v) {
    const parts = String(v).split(".");
    return parts[1] ? parts[1].length : 0;
  },
  getCommonScale(a, b) {
    const sa = 10 ** utils.getDecimalDigits(a);
    const sb = 10 ** utils.getDecimalDigits(b);
    return Math.max(sa, sb);
  },
  isInHitBox(x, y, r, hbHeight, hbWidth, distance, tx, ty) {
    const center = utils.getXy(r, distance + hbHeight / 2, false, x, y);
    const topLeft     = utils.getXy(r + 90, hbWidth / 2, false, center[0], center[1]);
    const topRight    = utils.getXy(r - 90, hbWidth / 2, false, center[0], center[1]);
    const bottomRight = utils.getXy(r + 180, Math.abs(hbHeight) / 2, false, topRight[0], topRight[1]);
    const bottomLeft  = utils.getXy(r + 180, Math.abs(hbHeight) / 2, false, topLeft[0], topLeft[1]);
  
    const corners = [topLeft, topRight, bottomRight, bottomLeft];
  
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      const edge = [b[0] - a[0], b[1] - a[1]];
      const toPoint = [tx - a[0], ty - a[1]];
      const cross = edge[0] * toPoint[1] - toPoint[0] * edge[1];
  
      if (cross > 0) return false;
    }
  
    return true;
  },
  calcEase(value, time, t, type = "easeOutQuad") {
    if (t <= 0 || t > time) return 0;
    const ease = easeFuncs[type] || easeFuncs.easeOutQuad;
    const prevT = (t - 1) / time;
    const nowT = t / time;
    const easedPrev = ease(prevT);
    const easedNow = ease(nowT);
    return (easedNow - easedPrev) * value;
  },
  tap(value, exp){
    console.log(exp, value)
    return value;
  }
}

const easeFuncs = {
  linear: (t) => t,

  // Quad
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Bounce
  easeOutBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

export const useUtility = () => utils

export function useTimeLine(...args){
  let step = null
  let changeStep = (s) => step = s;
  let e = useEntity()
  args.forEach(t=>{
    e.hasGear(useGear().check(() => step == t.flag ).call(()=> t.func(changeStep)))
  })
  return (s) => step = s
}

export function useUi(tag, style, className = null, listener){
  const ui = document.createElement(tag)

  if( className ){
    ui.className = className;
  }

  const uiWidth = style.width? style.width: 10;
  const uiHeight = style.height? style.height : 10 ;
  const uiX = style.x? style.x : 0;
  const uiY = style.y? style.y : 0;

  delete style.x;
  delete style.y;
  delete style.width;
  delete style.height;

  Object.assign(ui.style, style);

  ui.style.position = "absolute";
  ui.style.pointerEvents = "auto";

  const updateUi = ()=>{
    const widthRate = canvas.width / fieldX;
    const heightRate = canvas.height / fieldY;

    ui.style.width = uiWidth * widthRate + "px";
    ui.style.height = uiHeight * heightRate + "px";

    ui.style.left = (uiX * widthRate) + (canvas.width/2) - ((uiWidth * widthRate)/2) + "px";
    ui.style.top = (-uiY * heightRate) + (canvas.height/2) - ((uiHeight * heightRate)/2) + "px";
  }
  updateUi();
  window.addEventListener("resize", updateUi);

  if (listener) {
    Object.entries(listener).forEach(([key, fn]) => {
      const eventName = key.replace(/^on/, "").toLowerCase();
      ui.addEventListener(eventName, fn);
    });
  }

  uiLayer.appendChild(ui);
  return ui;
}

const charMap = {"a":0,"b":1,"c":2,"d":3,"e":4,"f":5,"g":6,"h":7,"i":8,"j":9,"k":10,"l":11,"m":12,"n":13,"o":14,"p":15,"q":16,"r":17,"s":18,"t":19,"u":20,"v":21,"w":22,"x":23,"y":24,"z":25,"A":26,"B":27,"C":28,"D":29,"E":30,"F":31,"G":32,"H":33,"I":34,"J":35,"K":36,"L":37,"M":38,"N":39,"O":40,"P":41,"Q":42,"R":43,"S":44,"T":45,"U":46,"V":47,"W":48,"X":49,"Y":50,"Z":51,"0":52,"1":53,"2":54,"3":55,"4":56,"5":57,"6":58,"7":59,"8":60,"9":61}

export async function useChar(char, args){
  args = Object.assign( args, {
    src: "assets/base/fonts.png",
    frameWidth: 64, frameHeight: 64, 
    frame: charMap[char]
  })
  const c = await useEntity(args)
  return c;
}

export async function useText(text, args) {
  const chars = text.split("");
  const parentX = args.x ? args.x : 0;
  const parentY = args.y ? args.y : 0;
  const x = 0;
  const y = 0;
  const parent = await useEntity({x:x, y:y, zIndex: args.zIndex})
  const scale = args.scale ? args.scale : 1;
  let charSpacing = 32;
  const offsetX = -(((chars.length - 1) * charSpacing) / 2)*scale;
  charSpacing *= scale;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const charEntity = await useChar(char, {
      x: x + offsetX + i * charSpacing,
      y: y,
      scale: scale
    });
    if (args.life > 0) {
      charEntity.hasGear(
        useGear()
          .wait(args.life)
          .call(e => e.removeSelf())
      );
    }
    if (args.charMove) {
      charEntity.textCounter = 0;
      const g = useGear().call((e) => args.charMove(e, e.textCounter));
      charEntity.hasGear(g);
    }
    parent.has(charEntity);
  }
  if (args.life > 0) {
    parent.hasGear(
      useGear()
        .wait(args.life)
        .call(e=>e.removeSelf())
    );
  }
  if (args.lineMove) {
    let counter = 0;
    parent.hasGear(
      useGear().call((e,t) =>{
        counter++;
        args.lineMove(e,counter)
      })
    );
  }
  return parent;
}

// end of SugerCode.js