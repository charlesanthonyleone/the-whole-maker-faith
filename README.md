# The Faith of the Whole Maker

This repository is the public website of The Faith of the Whole Maker, an offered faith.

It is not a registered church. These pages claim no incorporation, charitable certification, tax exemption, or 501(c)(3) status. They are not a state church, and they are not a department of The Formation Party.

The doctrinal source is [FOUNDING-THEOLOGY.md](FOUNDING-THEOLOGY.md). The site publishes that text, including the preamble, all four parts, and all forty-four chapters. It does not add doctrine, and it does not resolve tensions the founding theology leaves visible.

The visual identity lives in `styles.css`, `site.js`, and self-hosted fonts under `fonts/`: a warm living light behind parchment reading pages.

## GitHub Pages

The site is static HTML at the repository root. `.nojekyll` is present so GitHub Pages serves the files as they are, without Jekyll processing.

Publish from the **main** branch, folder **`/`** (the repository root).

The project address is `https://charlesanthonyleone.github.io/the-whole-maker-faith/`.

## Pages

- [Home](index.html)
- [Confession](confession.html)
- [Founding theology](theology/index.html), with the preamble and chapters 1–44 in full
- [Practice](practice.html): prayer, the ordinary rule of life, gathering, and the four traditions
- [Belonging](belonging.html)
- [Receiving other faiths](receiving.html)
- [Public life](public-life.html)

`python3 tools/build_site.py` regenerates the HTML from `FOUNDING-THEOLOGY.md`.
