# Driver AI

Driver AI is a tool for automating and controlling your computer (macOS and Windows) using AI. Install it and automate tasks in under a minute. No scripting/coding required.

<img width="1512" alt="Screenshot 2025-06-26 at 1 38 09 PM" src="https://github.com/user-attachments/assets/0f49e9c5-5778-4b5d-be43-1a28aa3328e1" />

## Getting Started

1. **Clone the repository:**

   ```
   git clone <repo-url>
   cd <repo-directory>
   ```

2. **Set up your environment variables:**

   - Copy `example.env.json` to `env.json`:

     ```
     cp example.env.json env.json
     ```
     (On Windows, you might use `copy example.env.json env.json`)

   - Open `env.json` in your editor and add your API keys for your chosen AI provider(s).

3. **Install dependencies:**

   ```
   npm install
   ```
   *Note for Windows users:* `robotjs`, one of our dependencies for computer control, is a native Node module. If you encounter issues during `npm install`, you might need to install the Visual Studio C++ build tools and Python. You can typically install these with `npm install --global --production windows-build-tools` (run as Administrator) or by installing them via the Visual Studio Installer.

4. **Start the application:**

   ```
   npm start
   ```

   The app will use the API keys you provided in `env.json` to connect to your AI provider (for example, [Anthropic Console](https://console.anthropic.com/) or [OpenAI Platform](https://platform.openai.com/account/api-keys)), depending on which backend you plan to use.

That's it! Driver AI should now be running.

## Requirements

- Node.js (v18 or higher recommended)
- macOS or Windows

## Building for Different Platforms

You can create distributable packages for different platforms using Electron Forge:

- **For macOS:**
  ```
  npm run make -- --platform=darwin
  ```
- **For Windows:**
  ```
  npm run make -- --platform=win32
  ```
- **For Linux (if supported in the future):**
  ```
  npm run make -- --platform=linux
  ```
  (Note: Linux support beyond basic `robotjs` functionality is not yet implemented.)

Find the packaged application in the `out` directory.

## Notes

- **Permissions:**
    - **macOS:** For best results, make sure you have the necessary accessibility permissions enabled on your Mac for the application to control input and screen recording.
    - **Windows:** Generally, specific accessibility permissions are not required for basic automation. However, interacting with applications running with Administrator privileges might require Driver AI to also be run with elevated privileges (not recommended for general use).
- **Screen Lock Feature:**
    - **macOS:** Includes input blocking and sleep prevention.
    - **Windows:** Currently, the "Screen Lock" feature primarily implements sleep prevention. Full input blocking is not yet supported on Windows.
- See the code and comments for more details on usage and capabilities.

## Developer Notes

- **OS-Specific Control Scripts:**
    - **macOS:** Uses a Swift executable found in `subprocess/mac_subprocess` (source: `subprocess/main.swift`).
    - **Windows:** Uses PowerShell scripts located in `subprocess/scripts/windows/`.
- **Packaging Scripts:** These OS-specific control scripts are packaged into the application's resources directory during the build process (configured in `forge.config.ts` via `extraResource`). The application logic locates these scripts at runtime.

[end of README.md]
