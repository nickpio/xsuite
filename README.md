# xsuite

**One native Mac window. All your X & xAI apps.**

xsuite is a beautiful, minimal desktop application that combines **X**, **Grok**, **xAI Console**, and **Grokipedia** into a single seamless window with one X login.

No more browser tabs. No more separate logins. Just one clean, native app with your custom logo and a compact centered sidebar.

![xsuite Login Screen](https://github.com/yourusername/xsuite/raw/main/screenshots/login.png)
*(Your custom logo + Grok stars background)*

## Features

- **Ultra-minimal design** — 80px centered icon-only sidebar, no header, pure black login screen with your logo
- **One-time X login** — signs you into everything automatically via shared session
- **Seamless blending** — sidebar color matches the active tab’s background
- **Native Mac/Linux feel** — system tray, menu bar, custom .icns icon, .dmg packaging
- **Ready for daily use** — fast tab switching, shared cookies, works offline once logged in

## Installation (Mac)

1. Download the latest `xsuite-1.0.0.dmg` from the Releases page
2. Open the .dmg and drag **xsuite** to your Applications folder
3. Launch xsuite from Launchpad or Spotlight
4. Sign in with X once — everything else unlocks automatically

## Usage

- Click any sidebar icon to switch tabs instantly
- Right-click the tray icon (𝕏) for quick access and Quit
- Hover icons for tooltips
- Your custom logo appears on the login screen and as the Dock icon

## Building from Source (for developers)

```bash
git clone https://github.com/yourusername/xsuite.git
cd xsuite
npm install
npm run dev          # development
npm run build        # build
npx electron-builder --mac --x64   # create .dmg