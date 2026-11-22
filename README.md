# Cosy Cats

A small, goal-free game: be a mother cat or one of her kittens, wander your home, your garden and the neighbours' gardens, and curl up somewhere for the night. No scoring, no threat, nothing to fail.

Play it in a browser: https://rel-op.github.io/cosy-cats/

`trailer.mp4` in this folder shows it in motion.

## Install and update

From the web address the game can be installed as an app, which opens full screen with its own icon and works with no network:

- **Chrome or Edge** (Mac, Windows, ROG Ally, Android): open the cat chooser (Enter, Start or the paw icon) and choose **install as an app**. The browser's own install button in the address bar does the same.
- **Safari on a Mac:** File menu, then Add to Dock. **iPhone or iPad:** Share, then Add to Home Screen. The chooser row lists these steps.

It updates by itself. Each time the game is opened it looks for a new version and fetches it in the background. If that finishes while the title is still showing, it switches straight away; if someone is already playing, nothing interrupts them: the new version is used the next time the game is opened, and the chooser shows **new version ready: restart** for anyone who wants it sooner. Restarting keeps the saved game.

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
| Pick up, eat, hop on, bat things, curl up | X or B | E |
| Meow (the others answer and come over) | Y | Q |
| Swap cats | LB / RB | Tab |
| Choose cats | Start | Enter |

**Touch and mouse** work too, without on-screen sticks:

| Tap or click | What happens |
|---|---|
| The ground | Walk there, finding the way round fences |
| Something high (a tree fork, a roof, a shelf) | Walk to it and climb up |
| A toy, a bowl, a doorway, a bed | Go and pick it up, eat, go in, or settle down |
| A swing, the garden tap, the chimes | Go and hop on, turn it, or ring them |
| Your own cat | Hop (or settle down, if she is standing in a bed) |
| Another cat | Meow to call it; a kitten next to mama hops on her back |
| Twice quickly | Hop on the way |
| Press and hold | She follows your finger |

Two corner icons: the moon curls up for a nap anywhere, the paw opens the cat chooser (which also lets you switch which cat you are). Touch and mouse steer the same cat as the keyboard, so one person can mix them; a gamepad can still join as the second player.

- The first device to press something plays mama. A second gamepad (or the keyboard) can join at any time and takes a kitten.
- Walk into something and keep pushing to climb it. Every cat climbs anything climbable. A kitten can still hop on mama's back for the ride, and kittens nobody is steering do that by themselves when she goes up something tall.
- Walking into a small space (a cat flap, the cardboard box, a shed door, the hollow log) takes the whole family inside. Every house has a cat flap in its garden door, and inside each is a hallway with rooms off it.
- Curl up together anywhere and everyone sleeps until morning.
- The game remembers: it reopens where the family last slept, with every toy and treasure where it was left (in a bed, on the ground, wherever) and you as the same cat. Things tucked into a bed can be taken out again by walking up to them nose-first, or by tapping them. The save lives in the browser, so each device and browser has its own.
- The "choose cats" panel changes coats, adds or removes kittens (up to four) and turns the sound words and music on or off. Nothing resets.
- Now and then there is a gentle shower; indoors you hear it on the roof.
- `T` skips ahead towards night, `P` starts or stops a shower.

## Things to play with

Nothing here is needed for anything; each just answers when a cat touches it.

- **See-saw** (next door, left): stand on one end and one of the others comes and sits on the far end. Jump, and when you land they fly up. A heavy cat sends a light one much higher than the other way round.
- **Swings:** the swing set next door on the left, and an old tyre on a rope in the overgrown garden. The action button beside one hops on; push the stick to go higher; jump to leap off. Walking into a swing gives it a push, with or without someone on it.
- **Garden tap** (vegetable garden, on the greenhouse wall): bat it and the sprinkler comes on, with a rainbow in the spray by day, and flowers come up where the water falls. Bat it again to turn it off, or it stops by itself.
- **The loose stepping stone** (koi garden, by the stone lantern): stand on it and water runs into the bamboo tipper, which fills, tips and knocks back with a clack, and the lantern lights.
- **Wind chimes** (tea house veranda): walk through them or bat them. Five notes that sound well in any order.
- **Pots on the front wall** (home): walk along the wall into them, or bat them from below, and they tumble onto the lane. They don't break, and can be carried back.
- **Doves:** a flock that feeds on the lawns. Run at them and they all go up and come down somewhere else, sometimes close by and sometimes gardens away. Creep, and you get closer. After a few goes they sit somewhere high for a while.

## The place

Five back gardens in a row, each different, joined by gaps in their fences and by a lane along the front:

- **Home:** patio, cardboard box, a tree with a fork to sleep in, a log store with hay, a pond.
- **Next door, left:** an oak with a treehouse, a trampoline, a swing, a sandpit, a paddling pool and a picnic.
- **Far left:** a koi pond with a red bridge, a tea house, bamboo and a maple.
- **Next door, right:** vegetable beds, a greenhouse, a scarecrow, and food left out by the back door.
- **Far right:** an overgrown garden with long grass, a potting shed, a hollow log and an upturned boat.

## The houses

Each house has a cat flap in its garden door. Behind it is a hallway, with doors to three or four rooms, the shut front door at the far end, and (in four of them) stairs up to a landing with a cushion. Walk into a doorway to go through; the way back to the hallway is the door in each room's left wall.

- **Home (the cottage):** the sitting room with the fire, cat tree and food; a kitchen with a table to get up on and a bowl of milk; a bedroom with the big bed and a window seat; a bathroom with a bath to jump into and a rubber duck.
- **Next door, left (the family house):** a playroom with a tent, a toy train, balls and a teddy; a room with bunk beds (the ladder goes to the top bunk) and a rocket; a laundry room with a warm dryer and a basket of washing.
- **Far left (the timber house):** a tatami room with a quilted low table and a futon; a bath house with a steaming wooden tub; a study with scrolls, a bonsai and a low writing desk.
- **Next door, right (the farmhouse):** a kitchen with a warm range, a dresser and a long table; a pantry of jars with flour sacks to sleep on; a sun room full of plants with a wicker chair.
- **Far right (the old stone house):** a library with books to the ceiling and a shelf a cat fits on; a music room where walking along the piano keys plays them; a painter's studio where paint puddles leave paw prints; a bedroom with a four-poster.

## Code

- `src/main.js` game loop, players, the "do" button, followers, doorways, sleeping, camera
- `src/cat.js` the procedural cat, its coats, animation and movement
- `src/world.js`, `src/rooms.js`, `src/props.js`, `src/critters.js` gardens, interiors, scenery pieces, wildlife
- `src/houses.js` the insides of the five houses, built from a small kit of furniture
- `src/toys.js` the things that do something: see-saw, swings, tap and sprinkler, stepping stone and water tipper, chimes, pots
- `src/pixel.js` the pixel-art renderer (low-resolution render, outlines, glow, palette, iris wipes)
- `src/build.js` shared materials and the builder that bakes scenery into a few meshes
- `src/pointer.js`, `src/nav.js` touch and mouse taps, and route-finding for tap-to-go
- `src/app.js` the install offer and the new-version notice; `tools/sw-template.js` is the offline script, which the build (`vite.config.js`) completes with the list of built files and a version made from their contents
- `src/daynight.js`, `src/audio.js`, `src/labels.js`, `src/fx.js`, `src/menu.js`, `src/input.js` light, sound, floating words, particles, the cat chooser, input

## Tools

- `node tools/gen-audio.mjs` generates the sound effects, ambience and music with ElevenLabs (needs `ELEVENLABS_API_KEY` in `.env.local`).
- `node tools/play.mjs <script.js>` drives the game in headless Chrome for tests and screenshots.
- `node tools/play.mjs tools/doors-check.js` walks through every doorway in both directions.
- `node tools/toys-check.mjs` checks the garden toys, the doves, kittens climbing, and that an older saved game still loads.
- `node tools/save-check.mjs` checks that carried things and the chosen cat survive closing the game.
- `node tools/app-check.mjs` checks offline play, the install row and switching to a new version, against a built copy (`npm run build`, `npm run preview`).
- `node tools/make-icons.mjs` photographs the app icons from the game (dev server running).
- `node tools/trailer.mjs` films `trailer.mp4`; the shots are scripted in `tools/director.js`. The dev server must be running.
