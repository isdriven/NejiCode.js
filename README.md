# NejiCode.javascript

NejiCode.javascript is a 2D game engine developed by NejiCode, a small independent game development group in Japan.
It was originally created for internal use in our own game projects.

While the source code of our games will remain private, the core engine is open source, and we plan to gradually release additional modules and extensions as well.

This engine is tailored to our specific development needs, which means some features commonly found in other engines may be intentionally omitted — simply because we don’t use them.

## Runtime Environment

Use it within JavaScript module environments such as Vue or Vite.
All APIs are provided as ES modules via export.

## Setup

### startWorld(game screen width, game screen height)

```javascript
<script setup>
  import { startWorld } from "NejiCode"

  startWorld(1200,800); 
</script>
```
Everything begins by calling startWorld.
Only two parameters are required: the width and height of your game screen.
The canvas will automatically scale to fit the current display size.

## Entity

While NejiCode is not a full ECS (Entity-Component System), at its core lies the Entity.
You can create and use an Entity like this:

```javascript
  import { useEntity } from "NejiCode"
  const chara = await useEntity({src:"chara.png"});
```

### Assets Loading 

Each Entity loads its image internally.
Once the image is fully loaded, the Entity becomes usable.
Because loading is asynchronous, you have to await each entity individually.

### Entity options

You can customize an Entity with the following properties:

```javascript
import { useEntity } from "NejiCode"
const chara = await useEntity({
  src: "chara.png",       // Path to the image file
  x: 0,                   // X position (0 is center). Optional, default is 0.
  y: 0,                   // Y position (0 is center). Optional, default is 0.
  zIndex: 10,             // Drawing order. Optional, default is 0.
  scaleX: 1,              // Scale along the X-axis. Optional, default is 1. Set -1 to flip horizontally.
  scaleY: 1,              // Scale along the Y-axis. Optional, default is 1. Set -1 to flip vertically.
  scale: 1,               // Shortcut to set both scaleX and scaleY. Overrides both.
  alpha: 1,               // Transparency (1 = fully visible, 0 = fully transparent). Optional, default is 1.
  anchorX: 0.5,           // Anchor point on X (0 = left, 1 = right). Optional, default is 0.5 (center).
  anchorY: 0.5,           // Anchor point on Y (0 = top, 1 = bottom). Optional, default is 0.5 (center).
  rotate: 0,              // Rotation in **degrees**. Optional, default is 0. (Note: not radians)
  frame: 0,               // Frame index when using sprite sheets. Optional, default is 0.
  frameWidth: 20,         // Width of a single frame (required for sprite sheets).
  frameHeight: 20,        // Height of a single frame (required for sprite sheets).
  update() {
    // Called every frame for this Entity.
    // Use `this.lifeTime` to access how many frames have passed since spawn.
    // Set `this.valid = false` to remove the Entity.
  }
});
```

When using a sprite sheet, the following properties are required:
frame, frameWidth, and frameHeight.
Only evenly spaced sprites (uniform grid) are supported.
(Sorry, no support for irregular sprite atlases(packed sprite sheet))

## Gear

Each Entity has an update() method and can be fully controlled through its lifetime.
However, by using Gear, you can define reusable behavior logic that can be triggered based on conditions or timing.

```javascript
<script setup>
  import { useEntity, useGear } from "NejiCode"

  const char = await useEntity({src:"chara.png"});
  const gearMove = useGear()
    .check((e)=>e.walk)
    .put({x:(e)=>e.x+1});

  char.hasGear(gearMove);
</script>
```

### Gear API

A Gear is created using useGear() and operates based on a chain of method calls.
Each method in the chain is executed in the order it is defined.

```javascript
<script setup>
  import { useEntity, useGear } from "NejiCode"

  useGear().wait(10) // Waits for 10ms.
  useGear().set({ x: 10 }) // Sets a property to a specific value.
  useGear().put({x:(e)=> e.x + 1 }) // Modifies a property on every frame.
   //  The function receives the Entity as an argument and returns the new value.
  useGear().check(e => e.x > 10) // Executes the next step only if the condition returns true.
  useGear().call(e => { /* Do something */ }) // Calls the given function with the entity as the argument.
  useGear().end(() => { /* Called on end */ }) // Stops the gear from looping. Optional function runs on end.
  useGear().checkEnd(() => true, () => { /* Called if true */ }) // Ends if the first condition returns true, then calls the second function.
</script>
```

While end() and checkEnd() exist, in most cases the following pattern is more versatile and preferred:

```javascript
useGear.check((e)=>e.attacking).call(()=> /* do something */)
```
This setup acts like a soft loop: it checks a condition, performs an action, and waits again.
In many cases, this pattern is flexible enough for a wide range of use cases.

## Empty Entities and Empty Gears

Entities and Gears can be created and used even in an "empty" state.

```javascript
// EmptyEntity
useEntity({
  update(){
    // do each frame
  }
})
```

```javascript
// Empty Gear
useGear(false).check(()=>startFlag == true).call()
```

Empty gears are ideal for global condition monitoring.
They allow you to “watch” variables and trigger logic only when the specified conditions are met.

## Coordinate System

The coordinate system in NejiCode is a bit unique compared to traditional frameworks.

### Where is the Origin (0,0)?

In NejiCode, the origin point (0,0) is located at the exact center of the visible display area.

Traditionally, coordinate systems place the origin at the top-left (as in HTML/CSS) or bottom-left (as in OpenGL).

However, NejiCode uses a center-origin approach by default, both for the screen and for entities.
Additionally, the anchor point of images is set to 0.5 by default — meaning they are centered.

Because of this setup, there's no need to calculate offsets using screenWidth, screenHeight, or image width and height just to center something.
You can simply do:

```javascript
const chara = useEntity({
  src: "chara.png",
  x:0, y:0
})
```

And it will appear right in the center of the screen.
The coordinate system is structured as follows:

     +y
      |
      |
-x ---------- +x
      |
      |
     -y

So for example, to position something slightly below the center, you can set:

```javascript
x:0, y:-200
```

This makes it very intuitive to position elements relative to the center of the screen.

### Nested Entities

```javascript
const chara = await useEntity({src:"chara.png"})
const weapon = await useEntity({src:"weapon.png"})
chara.has(weapon)
```

Entities can, of course, be nested.
When an Entity is nested inside another, its origin (0, 0) is relative to the parent entity’s image origin (0, 0).
This means the child entity will completely follow the movement of its parent.

By nesting entities using has(), you can effectively use them as layers to group and structure your scene.

You can adjust the anchor of a child entity, but note that it is always positioned relative to the parent’s image origin (0, 0).
The anchor of the parent entity does not affect the positioning of its children.

## Camera

Especially in RPGs and other games with large fields, you may want to move the camera itself to control what part of the world is visible.
In NejiCode, you can do this by shifting the entire drawing area using the camera:

```javascript
useCamera(x=0, y=0, scale=1, rotate=0);
```

By default, the camera is set to (0, 0, 1, 0) — meaning no offset, normal scale, and no rotation.
Keep in mind that changing the x and y values here will shift the origin point accordingly.

## Advanced Usage

Once you've created a behavior recipe using Gear, there are more ways to reuse and apply it flexibly across multiple entities.

### Entity.clone()

An Entity can be fully cloned without reloading its image.
This allows you to quickly duplicate entities with different properties.

```javascript
const bullet = useEntity({src:"bullet.png", alpha: 0})
bullet.clone({alpha:1,x:10,y:10})
```

### Gear.drive()

A Gear can be used not only by attaching it to an entity, but also by driving entities at runtime.
This lets you control multiple entities using a single Gear instance.

```javascript
const gear = useGear();
gear.drive(bullet1); // 
gear.drive(bullet2); // 
gear.drive(bullet3); // 
gear.drive(bullet4); //
```

## UI

In NejiCode, most of the rendering is handled using WebGL.
However, for UI elements, you can directly use standard HTML elements (DOM).
This includes elements like text, textarea, div, and more — all usable as-is.

The coordinate system for UI elements is the same as that used in WebGL, making it easy to position elements consistently.
The function signature is:

``` useUi(tag, style, className, listener) ```


```javascript
  const dom = useUi("div", {backgroundColor: "black"}, "button", {onPress:(e)=>{} })
  dom.innerText = "push me";
```

Note:
UI elements are not affected by useCamera or any internal canvas transformations.
To hide UI elements, you need to either move them outside the visible area manually, or set opacity: 0 in their style.

## Text

In addition to general UI, text-related elements like dialog boxes for character conversations can greatly benefit from the strengths of web technologies.
In many cases, it's ideal to use useUi for handling text elements.

However, if you want to render text directly onto the canvas, NejiCode supports that as well.

To draw text on the canvas, you typically need a font sprite sheet prepared in advance.
NejiCode includes a built-in font, so if you're using alphanumeric characters, you can display text by simply specifying the string:

```javascript
const text = useText("damage!!", {
  x: 0, y: 0, rotate: 0, scale: 1,
  life: 20 // Displays for 20ms. Set to 0 to keep it visible indefinitely.
  charMove(charEntity, lifetime){
    // Optional: adjust position of each individual character.    
  },
  lineMove(lineEntity, lifetime){
    // Optional: adjust the entire line's position as a group.
  }
})
```

This is useful for effects like floating damage numbers, and provides fine control over how each character and line is displayed or animated.


## Sound Effetcts and Music

NejiCode supports both sound effects and background music.

```javascript
const se = await useSound({src:"sound.mp3"});
se.play();

const music = await = useMusic({src:"music.mp3"});;
music.play();
music.stop();
```

Sound effects are routed to a dedicated single channel.
Music playback supports crossfading between two channels for smooth transitions.

## 入力

NejiCode supports both gamepad input and touch/click input.

```javascript
// gamePad
const input = useInput("gamePad.leftStick");
input() // return exsample {pressed:true, pressedTime:0~, angle:0, magnitude:1}
```

### gamePad list and return values
"gamePad.leftStick", {pressed:true, pressedTime:0~, angle:0, magnitude:1}
"gamePad.rightStick", {pressed:true, pressedTime:0~, angle:0, magnitude:1}
"gamePad.a", {pressed:true, pressedTime:0~}
"gamePad.b", {pressed:true, pressedTime:0~}
"gamePad.x", {pressed:true, pressedTime:0~}
"gamePad.y", {pressed:true, pressedTime:0~}
"gamePad.start", {pressed:true, pressedTime:0~}
"gamePad.select", {pressed:true, pressedTime:0~}
"gamePad.lb", {pressed:true, pressedTime:0~}
"gamePad.rb", {pressed:true, pressedTime:0~}
"gamePad.lt", {pressed:true, pressedTime:0~}
"gamePad.rt", {pressed:true, pressedTime:0~}
"gamePad.crossup", {pressed:true, pressedTime:0~}
"gamePad.crossdown", {pressed:true, pressedTime:0~}
"gamePad.crossleft", {pressed:true, pressedTime:0~}
"gamePad.crossright", {pressed:true, pressedTime:0~}
"gamePad.home", {pressed:true, pressedTime:0~}


### Touching Entities on Canvas

You can check whether an entity is being touched (or clicked) using the "touchMe.pressed" input:

```javascript
useGear().check( (e)=> useInput("touchMe.pressed", e) )
```

This will return true only if the entity is currently being touched/clicked.
