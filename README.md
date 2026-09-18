# Artspire website

A portfolio site for Artspire, with a private CMS at `/admin` that only you can
sign in to. Everyone else can view the finished site, but nobody besides you
can add, edit, or delete anything.

## How it's built

- **Public site** (`public/index.html`, `main.js`) — loads all content from
  `/api/content` and renders it. There is nothing to edit by hand here; all
  real content lives in `data/content.json` and is edited through the CMS.
- **CMS** (`public/admin.html`, `admin.js`) — a password-protected panel at
  `/admin` for editing every section: hero text, "what we do", portfolio
  projects, your story, services, case studies, "why us", testimonials,
  the call-to-action, and contact details.
- **Server** (`server.js`) — a small Node/Express app. Public `GET` routes are
  open to anyone. Every route that changes content (`POST`/`PUT`/`DELETE`)
  requires a signed-in admin session — visitors physically cannot use them,
  even if they find the URLs.
- **Storage** — content lives in `data/content.json` on the server, and
  uploaded images live in `public/assets/uploads/`. No database to set up.

## Running it on your own computer

You'll need [Node.js](https://nodejs.org) installed (version 18 or newer).

```bash
cd artspire-website
npm install
npm run hash-password        # type a password, copy the hash it prints
```

Copy `.env.example` to `.env` and fill it in:

```
ADMIN_USERNAME=william
ADMIN_PASSWORD_HASH=<the hash you just generated>
SESSION_SECRET=<any long random string>
PORT=3000
```

Then start it:

```bash
npm start
```

Visit `http://localhost:3000` for the public site, and
`http://localhost:3000/admin` to sign in and manage content.

## Putting it online

This is a normal Node app, so it runs on any host that supports Node —
Render, Railway, Fly.io, a DigitalOcean droplet, etc. In short, on most of
these:

1. Push this folder to a GitHub repo (the `.gitignore` already keeps your
   `.env` and uploaded images out of git — you'll set those directly on the
   host instead).
2. Create a new "Web Service" from that repo.
3. Set the start command to `npm start` and install command to `npm install`.
4. Add the same three environment variables from your `.env` file
   (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) in the host's
   dashboard — never commit the real `.env` file anywhere.
5. Once it's live, log in at `yourdomain.com/admin` and replace the sample
   project, case study, and testimonial with your real ones.

One thing to know about file-based storage: most hosts reset the filesystem
on each deploy, so uploaded images and CMS edits saved directly to disk can
be lost when you push a new version of the code. This is fine while you're
setting things up. Once the site is live and you're mainly using the CMS
day-to-day rather than redeploying code, ask me and I can wire the same CMS
up to a proper database or persistent storage bucket so nothing gets wiped.

## Using the CMS day to day

- Go to `/admin`, sign in.
- Each item on the left is a section of the site. Text sections (Hero, About,
  Call to action, Contact) just have a form — edit it and click **Save**.
- Portfolio, Services, Case studies, "Why us", and Testimonials are lists —
  click **+ New...** to add one, **Edit** to change it, or **Delete** to
  remove it. Changes appear on the live site immediately, no rebuild needed.

### The hero photo

Go to **Hero**. Under "Hero photo", click the file picker and choose an
image, then click **Save changes**. It replaces the four colour bars next to
the headline. Remove the photo and the colour bars come back, so the page
never looks broken. A landscape or square image around 1200px wide works
best. The "Photo description" box below it is what screen readers announce —
a short sentence is enough.

### Several images in one project

Go to **Portfolio** → **Edit** on a project (or **+ New project**). Under
"Project images", click **Add images** and select as many files as you want
in one go — hold Ctrl (or Cmd on a Mac) to pick several at once.

Each image gets a small tile with three buttons: **←** and **→** reorder it,
**×** removes it. The first tile is marked **Cover** — that's the image
shown on the card in the grid. Click **Save** when you're happy.

On the live site, the whole project card is clickable. Tapping it opens a
full-screen viewer where visitors slide through every image with the arrow
buttons, the arrow keys, the thumbnail strip, or by swiping on a phone.
Escape or the × closes it.

Older projects that only had one image keep working exactly as before —
that image simply becomes the first in the list.

### Contact links

Go to **Contact details**. Everything you fill in becomes a tappable link:

| Field | What the visitor gets |
|---|---|
| Email | Opens their email app, addressed to you |
| Phone | Taps to call on a phone |
| WhatsApp | Opens a WhatsApp chat with you |
| Instagram | Opens your profile |

For **WhatsApp**, just type the number with its country code — for example
`+254712345678`. The `wa.me` link is built for you, so there's no link to
copy from anywhere. A full `https://wa.me/...` link still works if you
already have one. The **WhatsApp opening message** box lets you set the text
that's pre-filled in the visitor's chat box; leave it blank for the default.

A green WhatsApp bubble also floats in the corner of every page whenever a
number is set, and the contact form has a **Send on WhatsApp** button
alongside **Send by email**.

For **Instagram**, a handle like `@artspire` is enough.

Leave any field blank to hide that row from the site entirely.

### Images generally

For any image field you can either upload a file directly, or — if you'd
rather host images elsewhere — paste a direct image URL into the same field.

## Security notes

- Only one admin account exists, defined by `ADMIN_USERNAME` and
  `ADMIN_PASSWORD_HASH` — there's no public sign-up.
- The password is never stored in plain text, only as a bcrypt hash.
- The `/admin` page itself loads for anyone, but it only shows a login form
  until the correct password is entered — no content or edit controls render
  before that, and the server rejects every write request from a
  non-authenticated session regardless of what the browser sends.
- Sessions expire after 12 hours of inactivity, or immediately on sign out.
