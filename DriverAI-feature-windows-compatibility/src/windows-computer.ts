import { Computer, ScreenDimensions } from "./computer";
import { app, screen, desktopCapturer, nativeImage } from "electron"; // Added app
import * as robot from "robotjs";
import log from "electron-log";
import { spawn } from "child_process";
import * as path from "path";

export class WindowsComputer extends Computer {
  private screenWidth: number;
  private screenHeight: number;

  constructor() {
    super();
    const primaryDisplay = screen.getPrimaryDisplay();
    this.screenWidth = primaryDisplay.size.width;
    this.screenHeight = primaryDisplay.size.height;

    // Configure robotjs
    robot.setMouseDelay(10); // Consider adjusting delays if needed for Windows
    robot.setKeyboardDelay(10);

    log.info(`Windows Computer initialized - Screen: ${this.screenWidth}x${this.screenHeight}`);
  }

  async screenshot(): Promise<string> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: {
          width: this.screenWidth,
          height: this.screenHeight,
        },
      });

      if (sources.length === 0) {
        log.error("No screen sources found for Windows screenshot.");
        throw new Error("No screen sources available");
      }

      // TODO: Handle multiple screens on Windows if necessary, for now, use the first.
      const source = sources[0];
      const image = source.thumbnail;

      return image.toPNG().toString("base64");
    } catch (error) {
      log.error("Windows screenshot failed:", error);
      // Return a dummy image on failure
      const dummyImage = nativeImage.createEmpty();
      return dummyImage.toPNG().toString("base64");
    }
  }

  async click(x: number, y: number, button: string = "left"): Promise<void> {
    robot.moveMouse(x, y);
    robot.mouseClick(button as any); // robotjs types might not be perfectly aligned
  }

  async doubleClick(x: number, y: number): Promise<void> {
    robot.moveMouse(x, y);
    robot.mouseClick("left", true); // true for double click
  }

  async scroll(x: number, y: number, scrollX: number, scrollY: number): Promise<void> {
    robot.moveMouse(x, y);
    robot.scrollMouse(scrollX, scrollY);
  }

  async type(text: string): Promise<void> {
    log.info(`[WindowsComputer][Type] About to type: "${text}"`);
     // Safety: Release any stuck modifier keys before typing
    try {
      // For Windows, common modifiers are ctrl, alt, shift. 'command' is macOS specific.
      robot.keyToggle("control", "up");
      robot.keyToggle("alt", "up");
      robot.keyToggle("shift", "up");
      log.info(`[WindowsComputer][Type] Released common modifier keys`);
    } catch (error) {
      log.warn(`[WindowsComputer][Type] Warning: Could not release modifier keys:`, error);
    }
    await this.wait(50); // Small delay
    robot.typeString(text);
  }

  async keypress(keys: string[]): Promise<void> {
    log.info(`[WindowsComputer][Keypress] Received keys: ${JSON.stringify(keys)}`);
    const convertedKeys = keys.map((key) => {
      const keyLower = key.toLowerCase();
      // Windows specific mappings if any, otherwise rely on robotjs cross-platform names
      // For example, 'command' is specific to macOS. For Windows, it's usually 'control' or 'win'.
      // robotjs uses 'control' for Ctrl. For 'win' key, robotjs might need specific handling or it might not be supported directly.
      // For now, we'll map 'cmd' to 'control' for Windows too, or consider it an invalid key for Windows if strictness is needed.
      switch (keyLower) {
        case "cmd": // Or 'win', 'super'
          return "control"; // Or potentially 'command' if robotjs handles it, but 'control' is safer for typical Ctrl actions.
                           // If 'win' key is needed, further investigation for robotjs or alternatives is required.
        case "ctrl":
          return "control";
        case "alt":
        case "option": // Option is macOS specific, map to alt
          return "alt";
        case "shift":
          return "shift";
        case "return":
        case "enter":
          return "enter";
        case "esc":
          return "escape";
        case "space":
          return "space";
        case "tab":
          return "tab";
        case "backspace":
          return "backspace";
        case "delete":
          return "delete";
        case "arrowup":
        case "up":
          return "up";
        case "arrowdown":
        case "down":
          return "down";
        case "arrowleft":
        case "left":
          return "left";
        case "arrowright":
        case "right":
          return "right";
        // Add other specific key mappings for Windows if necessary
        default:
          return key.toLowerCase();
      }
    });

    log.info(`[WindowsComputer][Keypress] Converted keys for Windows: ${JSON.stringify(convertedKeys)}`);

    if (convertedKeys.length === 0) {
        log.warn("[WindowsComputer][Keypress] No valid keys to press.");
        return;
    }

    const key = convertedKeys.pop()!; // Main key to tap
    const modifiers = convertedKeys; // Remaining keys are modifiers

    if (modifiers.length > 0) {
      robot.keyTap(key, modifiers);
    } else {
      robot.keyTap(key);
    }
    log.info(`[WindowsComputer][Keypress] Successfully executed keypress.`);
  }

  async move(x: number, y: number): Promise<void> {
    robot.moveMouse(x, y);
  }

  async drag(pathArray: Array<{ x: number; y: number }>): Promise<void> {
    if (pathArray.length === 0) return;
    const start = pathArray[0];
    robot.moveMouse(start.x, start.y);
    robot.mouseToggle("down");
    for (let i = 1; i < pathArray.length; i++) {
      robot.moveMouse(pathArray[i].x, pathArray[i].y);
      await this.wait(50); // Small delay
    }
    robot.mouseToggle("up");
  }

  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getDimensions(): ScreenDimensions {
    return {
      width: this.screenWidth,
      height: this.screenHeight,
    };
  }

  getEnvironment(): string {
    return "windows";
  }

  getCurrentUrl(): string {
    // This might need a more specific implementation for Windows if we want to get
    // the URL from a browser or specific app. For now, a generic desktop identifier.
    return "system://windows-desktop";
  }

  // --- OS-specific functionalities implemented with PowerShell ---

  private getScriptPath(scriptName: string): string {
    // In development, __dirname is .../driver-ai/src
    // In production, __dirname is .../driver-ai/.webpack/main (or similar)
    // process.resourcesPath points to the 'resources' folder in a packaged app (asar or unpacked)
    // Scripts should be copied to the resources folder during packaging.
    const isDev = process.env.NODE_ENV === "development" || !process.resourcesPath;
    if (isDev) {
      // In development, scripts are relative to the app's root path.
      return path.join(app.getAppPath(), "subprocess", "scripts", "windows", scriptName);
    } else {
      // In production, `extraResource: ["subprocess/"]` copies the `subprocess` folder
      // into the root of the resources directory.
      return path.join(process.resourcesPath, "subprocess", "scripts", "windows", scriptName);
    }
  }

  private async callPowerShell(scriptName: string, scriptArgs: string[] = []): Promise<any> {
    const scriptPath = this.getScriptPath(scriptName);
    log.info(`[WindowsComputer][PowerShell] Attempting to execute: ${scriptPath} with args: ${JSON.stringify(scriptArgs)}`);

    // Check if script exists
    const fs = require("fs");
    if (!fs.existsSync(scriptPath)) {
        log.error(`[WindowsComputer][PowerShell] Script not found at: ${scriptPath}`);
        return Promise.reject(new Error(`PowerShell script not found: ${scriptName} at ${scriptPath}`));
    }

    return new Promise((resolve, reject) => {
      // Using -File is generally safer for script paths and arguments
      // -ExecutionPolicy Bypass -Scope Process : To ensure script can run
      // -NoProfile : For faster startup
      // -NonInteractive : To ensure no interactive prompts hang the process
      const psArgs = ["-ExecutionPolicy", "Bypass", "-Scope", "Process", "-NoProfile", "-NonInteractive", "-File", scriptPath, ...scriptArgs];
      const ps = spawn("powershell.exe", psArgs);

      let stdout = "";
      let stderr = "";

      ps.stdout.on("data", (data) => {
        stdout += data.toString();
        log.info(`[WindowsComputer][PowerShell STDOUT] ${data.toString().trim()}`);
      });

      ps.stderr.on("data", (data) => {
        stderr += data.toString();
        log.error(`[WindowsComputer][PowerShell STDERR] ${data.toString().trim()}`);
      });

      ps.on("close", (code) => {
        log.info(`[WindowsComputer][PowerShell] Process closed with code: ${code}`);
        if (stderr && code !== 0) { // Only reject on stderr if there's an error code
          log.error(`[WindowsComputer][PowerShell] Error (Code ${code}): ${stderr}`);
          return reject(new Error(`PowerShell script failed with code ${code}: ${stderr.trim()}`));
        }
        if (code !== 0 && !stderr) { // Handle cases where code is non-zero but no stderr
             return reject(new Error(`PowerShell script failed with code ${code} (no stderr). Stdout: ${stdout.trim()}`));
        }
        try {
          // Attempt to parse as JSON, otherwise return raw stdout
          resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          resolve(stdout.trim()); // Return as plain text if not JSON
        }
      });

      ps.on("error", (err) => {
        log.error("[WindowsComputer][PowerShell] Failed to start PowerShell process:", err);
        reject(err);
      });
    });
  }

  async getActiveApplication(): Promise<string> {
    try {
      log.info("[WindowsComputer] Getting active application via PowerShell");
      const result = await this.callPowerShell("get-active-application.ps1");
      if (result && result.success && result.result && result.result.processName) {
        // Prefer process name, fallback to title if processName is "Unknown" or empty
        if (result.result.processName && result.result.processName !== "Unknown") {
            return result.result.processName;
        }
        return result.result.title || "Unknown";
      }
      log.warn("[WindowsComputer] Failed to get active application or parse result:", result);
      return "Unknown";
    } catch (error) {
      log.error("[WindowsComputer] Error getting active application:", error);
      return "Unknown";
    }
  }

  async switchToApplication(appName: string): Promise<boolean> {
    try {
      log.info(`[WindowsComputer] Switching to application "${appName}" via PowerShell`);
      const result = await this.callPowerShell("switch-to-application.ps1", [
        "-AppName",
        `"${appName.replace(/"/g, '""')}"`, // Basic escaping for appName
      ]);
      if (result && result.success) {
        return true;
      }
      log.warn(`[WindowsComputer] Failed to switch to application "${appName}":`, result?.error || "Unknown error");
      return false;
    } catch (error) {
      log.error(`[WindowsComputer] Error switching to application "${appName}":`, error);
      return false;
    }
  }

  async openApplication(appName: string): Promise<boolean> {
    try {
      log.info(`[WindowsComputer] Opening application "${appName}" via PowerShell`);
      const result = await this.callPowerShell("open-application.ps1", [
        "-AppName",
        `"${appName.replace(/"/g, '""')}"`, // Basic escaping for appName
      ]);
      if (result && result.success) {
        return true;
      }
      log.warn(`[WindowsComputer] Failed to open application "${appName}":`, result?.error || "Unknown error");
      return false;
    } catch (error) {
      log.error(`[WindowsComputer] Error opening application "${appName}":`, error);
      return false;
    }
  }

  async startScreenLock(): Promise<boolean> {
    // Prevent sleep (lock screen) using PowerShell script
    try {
      await this.callPowerShell("prevent-sleep.ps1");
      return true;
    } catch (error) {
      log.error("[WindowsComputer] Error activating sleep prevention:", error);
      return false;
    }
  }

  async stopScreenLock(): Promise<boolean> {
    // Allow sleep (unlock screen) using PowerShell script
    try {
      await this.callPowerShell("allow-sleep.ps1");
      return true;
    } catch (error) {
      log.error("[WindowsComputer] Error deactivating sleep prevention:", error);
      return false;
    }
  }

  async checkAccessibilityPermissions(): Promise<boolean> {
    // Windows does not require explicit accessibility permissions for automation
    log.info("[WindowsComputer] checkAccessibilityPermissions (stub - returning true by default for Windows)");
    return true;
  }
}
