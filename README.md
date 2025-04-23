# NejiCode.js

A powerful, lightweight and flexible game library powered by WebGL

## Runtime Environment

Use it within JavaScript module environments such as Vue or Vite.
All APIs are provided as ES modules via export.

## APIs

### startWorld(game screen width, game screen height)

```
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



- Render with pure WebGL
- Entity & gear system for dynamic behavior
- Timeline, camera, and matrix transforms
- Gamepad and touch input support
- Sound and music engine with channel management
- Utility functions for math, easing, hit detection, and more
- DOM UI overlay support
- Character & text system using sprite sheets

Ideal for building 2D games with modern graphics and smooth animations.