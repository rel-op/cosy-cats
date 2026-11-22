# Cosy Cats

A small, goal-free game: be a mother cat or one of her kittens, wander your home, your garden and the neighbours' gardens, and curl up somewhere for the night. No scoring, no threat, nothing to fail.

`trailer.mp4` in this folder shows it in motion.

## Run

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173). It works with gamepads and the keyboard, one or two players on one screen.

## Controls

| | Gamepad | Keyboard |
|---|---|---|
| Walk and climb | Stick | Arrows / WASD |
| Jump | A | Space |
| Pick up, eat, hop on, curl up | X or B | E |
| Meow (the others answer and come over) | Y | Q |
| Swap cats | LB / RB | Tab |
| Choose cats | Start | Enter |

**Touch and mouse** work too, without on-screen sticks:

| Tap or click | What happens |
|---|---|
| The ground | Walk there, finding the way round fences |
| Something high (a tree fork, a roof, a shelf) | Walk to it and climb up |
| A toy, a bowl, a doorway, a bed | Go and pick it up, eat, go in, or settle down |
| Your own cat | Hop (or settle down, if she is standing in a bed) |
| Another cat | Meow to call it; a kitten next to mama hops on her back |
| Twice quickly | Hop on the way |
| Press and hold | She follows your finger |

Two corner icons: the moon curls up for a nap anywhere, the paw opens the cat chooser (which also lets you switch which cat you are). Touch and mouse steer the same cat as the keyboard, so one person can mix them; a gamepad can still join as the second player.

- The first device to press something plays mama. A second gamepad (or the keyboard) can join at any time and takes a kitten.
- Walk into something and keep pushing to climb it. Mama climbs anything; kittens manage low things and ride on her back for the rest.
- Walking into a small space (the cat flap, the cardboard box, a shed door, the hollow log) takes the whole family inside.
- Curl up together anywhere and everyone sleeps until morning. The game reopens where the family last slept.
- The "choose cats" panel changes coats, adds or removes kittens (up to four) and turns the sound words and music on or off. Nothing resets.
- Now and then there is a gentle shower; indoors you hear it on the roof.
- `T` skips ahead towards night, `P` starts or stops a shower.

## The place

Five back gardens in a row, each different, joined by gaps in their fences and by a lane along the front:

- **Home:** patio, cardboard box, a tree with a fork to sleep in, a log store with hay, a pond. Through the cat flap is the sitting room with a fire, a cat tree and food.
- **Next door, left:** an oak with a treehouse, a trampoline, a swing, a sandpit, a paddling pool and a picnic.
- **Far left:** a koi pond with a red bridge, a tea house, bamboo and a maple.
- **Next door, right:** vegetable beds, a greenhouse, a scarecrow, and food left out by the back door.
- **Far right:** an overgrown garden with long grass, a potting shed, a hollow log and an upturned boat.

## Code

- `src/main.js` game loop, players, the "do" button, followers, doorways, sleeping, camera
- `src/cat.js` the procedural cat, its coats, animation and movement
- `src/world.js`, `src/rooms.js`, `src/props.js`, `src/critters.js` gardens, interiors, scenery pieces, wildlife
- `src/pixel.js` the pixel-art renderer (low-resolution render, outlines, glow, palette, iris wipes)
- `src/build.js` shared materials and the builder that bakes scenery into a few meshes
- `src/pointer.js`, `src/nav.js` touch and mouse taps, and route-finding for tap-to-go
- `src/daynight.js`, `src/audio.js`, `src/labels.js`, `src/fx.js`, `src/menu.js`, `src/input.js` light, sound, floating words, particles, the cat chooser, input

## Tools

- `node tools/gen-audio.mjs` generates the sound effects, ambience and music with ElevenLabs (needs `ELEVENLABS_API_KEY` in `.env.local`).
- `node tools/play.mjs <script.js>` drives the game in headless Chrome for tests and screenshots.
- `node tools/trailer.mjs` films `trailer.mp4`; the shots are scripted in `tools/director.js`. The dev server must be running.
