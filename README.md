# DevHub

A central hub for all your development projects. Simple, instantly understandable, and easy to explain.

## Prerequisites

### To use the app
* macOS
* [Git](https://git-scm.com/) installed and available on your `PATH`
* (Optional) GitHub access, to see open pull request and issue counts. Use either:
  * the [GitHub CLI](https://cli.github.com/), logged in with `gh auth login`, or
  * a `GITHUB_TOKEN` or `GH_TOKEN` environment variable

### To build from source
* Go 1.27 or later
* Node.js 24 or later
* Wails 3

## How to run?

```shell
wails3 dev    // runs app in dev mode
wails3 build  // builds app for production
wails3 package  // builds native Os-specific app
```

## Opening the app on macOS

DevHub is not signed or notarized by Apple, so the first time you open it macOS
Gatekeeper blocks it with a message like *"DevHub" cannot be opened because Apple
cannot check it for malicious software*. To allow it:

1. Move `DevHub.app` to your `Applications` folder.
2. Double-click `DevHub.app`. When the warning appears, click **Done** (or **Cancel**).
3. Open **System Settings → Privacy & Security**.
4. Scroll down to the **Security** section. You will see *"DevHub" was blocked to protect your Mac*.
   Click **Open Anyway**.
5. Confirm with your password or Touch ID, then click **Open Anyway** again in the dialog.

macOS remembers this choice, so later launches open normally.

Alternatively, remove the quarantine attribute from the terminal:

```shell
xattr -dr com.apple.quarantine /Applications/DevHub.app
```
