# Cosy Cats

A small sandbox game for a young child: be a mama cat or her kitten, wander a back garden, and curl up somewhere for the night. No goals, no scoring, nothing to fail.

## Run

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## Controls

| | Gamepad | Keyboard |
|---|---|---|
| Walk and climb | Stick | Arrows / WASD |
| Jump | A | Space |
| Pick up, hop on, curl up | X or B | E |
| Meow (calls the other cat) | Y | Q |
| Swap cats | LB / RB | Tab |

- The first device to press something plays mama. A second gamepad (or the keyboard) can join at any time and takes the kitten.
- Walk into something and hold the stick to climb it. Mama climbs anything; the kitten manages low things and rides on mama's back for the rest.
- Curl up together anywhere and the cats sleep until morning. Things carried to a bed stay there.
- `T` skips ahead towards night, `H` shows the controls again.

## Code

- `src/main.js` game loop, players, the "do" button, the follower cat, sleeping, camera
- `src/cat.js` the procedural cat model, its animation and movement
- `src/world.js` the garden, its colliders, beds and things to carry
- `src/daynight.js`, `src/labels.js`, `src/sound.js`, `src/fx.js`, `src/input.js` lighting, floating words, sounds, particles, input
