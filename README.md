# Kyeju Hana — studio website

Portfolio site for **Kyeju Hana**, a London co-development studio for game design, 3D game art and tech art, specialising in Unreal Engine 5.

Plain HTML, CSS and JavaScript with no build step, so it runs directly on GitHub Pages.

## Run it locally

Use a local server rather than opening the file directly, because the 3D lily uses ES modules:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Publish on GitHub Pages

1. Push to `main`.
2. On GitHub, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. The site goes live at `https://madmango21.github.io/Kaiju_Hana_Website/`.

**Custom domain later:** add a file named `CNAME` containing the domain (e.g. `kyejuhana.com`), point the DNS at GitHub Pages and enable *Enforce HTTPS*.

## Project structure

| Path | What it is |
|---|---|
| `index.html` | Homepage: loader, hero, services, work, before/after, process, team, contact |
| `sunset-ecstasy.html`, `grimdark-racing.html` | Case study pages |
| `404.html` | Not-found page |
| `css/style.css` | All styles. Colour tokens are at the top (`:root`) |
| `js/main.js` | Loader, petal cursor, nav, reveals, scroll storytelling, sliders, form, lightbox |
| `js/ambient.js` | Background canvas: petals, Unreal grid and pollen, switched per section with `data-ambient` |
| `js/lily.js` | Procedural 3D stargazer lily (Three.js) in the hero |
| `assets/img/` | Web-optimised images (JPG, max 1920px) |
| `assets/models/` | Drop the kaiju `.glb` model here |

## Common edits

### Add your kaiju 3D model
Export a `.glb` from Unreal or Blender (keep it under ~5 MB, with Draco compression if possible) and save it as `assets/models/kaiju.glb`. Then in `index.html` change:

```html
<script>window.KH_CONFIG = { kaijuModel: 'assets/models/kaiju.glb' };</script>
```

It's scaled automatically and placed behind the lily.

### Team photos
Put a square-ish photo in `assets/img/team/` and replace the `<svg class="silhouette">…</svg>` inside the member's `.member-portrait` with:

```html
<img src="assets/img/team/humza.jpg" alt="Humza Mustafa">
```

### Before/after sliders
Each slider is a `.compare` block in `index.html`. The first `<img>` is the **after** image and the one inside `.before-layer` is the **before** image. To use a real pair for the arena slot, remove `is-blockout` from the before-layer, point it at your blockout image and delete the placeholder tag.

### Email address
`hello@kyejuhana.com` is a **placeholder**. Search and replace it across `index.html` and `js/main.js`.

### Contact form
Submissions go to Formspree form `xaqlbjyy`. To use a dedicated studio form, change the `action` URL on `#contact-form` in `index.html`.

### Add a new project
1. Copy `grimdark-racing.html` and rename it.
2. Add images to `assets/img/<project>/`. Resize them first: max 1920px wide, JPG at about 80% quality.
3. Add a `.work-card` linking to it in the `#work` section of `index.html`.

## Accessibility and performance
- Visitors with *reduce motion* enabled get no cursor effects, particles or scroll-jacking, and the lily is shown fully open.
- The custom cursor only appears with a mouse or trackpad. Touch devices keep native behaviour.
- The 3D lily pauses when off-screen. If WebGL isn't available, an SVG lily is shown instead.
