Alas Digitals site: v4.20 update (Nov 2026)
Everything since v3: Brand Kit v2 motion, loading screen, scroll snapping, section rail, back-to-top,
the alasOS brand line and free-sketch offer, the correct Vera-Fi homepage screenshots, More work hidden,
and the two-part hero: (1) headline, audience switch and the 3D Vera-Fi lineup that follows the cursor,
(2) what I do, the result, Mark's photo with his words, and the tools strip, sized to fit one screen.
Larger projects now start at $2,000, and "Who this is for" includes amps and DACs.
The main page holds on the first screen until the visitor picks "I sell by DM" or "I have a store", and the page scrollbar is hidden.
New Recommendations section with three LinkedIn recommendations, word for word, in equal-height cards with Read more.
v4.12: header scrolls away, stronger gold shine with glow, timeline hover, sticky journey heading with focus-on-scroll steps,
before/after, friction fixes and recommendations as one sideways row each (one screen), no links that leave the page. The switch in the top bar is gone.
v4.13: every section from Starting point to Questions now fits one screen on laptops, hovers and controls answer faster,
section reveals stagger a little tighter, and on phones the row arrows sit on the left, clear of the back-to-top button.
v4.14: the gold words flash a white glow at the moment the shine crosses their centre, phones stack the before/after pairs
(the product photo pair no longer sits in an empty sideways slide), and every pick on the first screen glides down to part 2.
v4.15: softer glow, card tops no longer clipped on hover, and the sideways rows can be dragged with the mouse or moved with the scroll wheel.
v4.16: white wordmark on the loading screen; June 2024 section with the heading pinned at the top, steps starting mid-screen,
a stronger fade, and a gold path that fills through the step bullets as you scroll.
v4.17: June 2024 section moves one step per scroll, with the step in focus a quarter of the way down; steps still to come wait at a soft fade.
v4.18: the header shows again at the top of the page (scroll snapping was landing just below it).
v4.19: on laptops and desktops the page glides between sections and steps with one slow, eased move per scroll.
v4.20: the loading screen plays once per visit instead of on every arrival and reload; on phones the 3D lineup is drawn once
and moves only when touched; the hidden More work section (placeholders) is gone; the fix cards, copy-email button and form
now live in one shared file (assets/form.js) used by / and /start; /store and /dm are served from the main page by vercel.json.
Also in v4.20 (search): robots.txt and sitemap.xml, a canonical link on / and /start, a shorter meta description,
structured data (Alas Digitals, Ace, the fixes and prices), and four security headers in vercel.json.

Copy everything in this folder into the site repo over the existing files, keeping the same folders.
Then DELETE the store/ and dm/ folders from the repo (vercel.json now serves both from index.html; while those folders
exist, Vercel shows the old copies instead). Then push.
New in v4.20: assets/form.js, vercel.json, robots.txt, sitemap.xml. Earlier: assets/motion.js, assets/mark-schifter.webp, assets/lineup/, assets/vendor/ (three.js 0.169.0, MIT, self-hosted).
assets/mark-schifter.jpg is no longer used. This folder replaces every earlier update folder (v4-update to v4.19-update).

Needs v3 already in the repo (Brand Kit v2 fonts in assets/fonts and the existing photos).
If the repo still has the old paper-and-orange site, upload the full alas-digitals-site-v4 folder instead.
