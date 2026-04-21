# xsuite

**One native Mac window. All your X & xAI apps.**

xsuite is a beautiful, minimal desktop application that combines **X**, **Grok**, **xAI Console**, and **Grokipedia** into a single seamless window with one X login.
No more browser tabs. No more separate logins. Just one clean, native app with your custom logo and a compact centered sidebar.

## Installation (Mac)

1. Download the latest .dmg from the Releases page
2. Open the .dmg and drag **xsuite** to your Applications folder
3. Launch xsuite from Applications or Spotlight
4. Sign in with X once — everything else unlocks automatically

## Building from Source (for developers)

Build from source for most up-to-date version (minor bug fixes/additions); releases will come with major feature updates

```bash

git clone https://github.com/nickpio/xsuite.git
cd xsuite
npm install
npm run tauri dev    # development
npm run tauri build  # build .app / .dmg
