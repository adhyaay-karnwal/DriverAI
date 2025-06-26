# Switch-ToApplication.ps1
param (
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

try {
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class User32 {
        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool IsIconic(IntPtr hWnd);

        // Constants for ShowWindow
        public const int SW_RESTORE = 9;
    }
"@
    # Try to find by process name first, then by window title
    $processes = Get-Process | Where-Object { $_.ProcessName -eq $AppName -or ($_.MainWindowTitle -like "*$AppName*" -and $_.MainWindowHandle -ne [IntPtr]::Zero) }

    if ($processes.Count -gt 0) {
        $process = $processes | Sort-Object StartTime -Descending | Select-Object -First 1 # Pick the most recently started if multiple matches
        $hWnd = $process.MainWindowHandle

        if ($hWnd -ne [IntPtr]::Zero) {
            # Restore window if minimized
            if ([User32]::IsIconic($hWnd)) {
                [User32]::ShowWindow($hWnd, [User32]::SW_RESTORE) | Out-Null
                Start-Sleep -Milliseconds 100 # Give time for window to restore
            }
            # Bring to foreground
            $success = [User32]::SetForegroundWindow($hWnd)
            Start-Sleep -Milliseconds 100 # Give time for window to come to foreground

            # Verify if foreground (optional, can be complex)
            # $currentForegroundHwnd = [User32]::GetForegroundWindow()
            # if ($currentForegroundHwnd -eq $hWnd) { ... }

            if ($success) {
                 @{ success = $true; result = "Successfully set foreground window for $AppName (PID: $($process.Id))" } | ConvertTo-Json -Compress
            } else {
                 @{ success = $false; error = "SetForegroundWindow failed for $AppName (PID: $($process.Id)). The application might be elevated or another window is interfering." } | ConvertTo-Json -Compress
            }
        } else {
            @{ success = $false; error = "Application '$AppName' (PID: $($process.Id)) found but has no main window handle (possibly a background process or minimized without a standard window)." } | ConvertTo-Json -Compress
        }
    } else {
        # Fallback using WScript.Shell for apps that might not be easily found by process name/title
        try {
            Write-Host "Process '$AppName' not found by name or title, trying AppActivate..."
            (New-Object -ComObject WScript.Shell).AppActivate($AppName)
            Start-Sleep -Milliseconds 300 # AppActivate is asynchronous
            @{ success = $true; result = "Attempted to switch to '$AppName' using AppActivate. Check if window is active." } | ConvertTo-Json -Compress
        } catch {
             @{ success = $false; error = "Application '$AppName' not found or could not be switched to using process list or AppActivate. Error: $($_.Exception.Message)" } | ConvertTo-Json -Compress
        }
    }
} catch {
    @{ success = $false; error = "Overall error switching to application '$AppName': $($_.Exception.Message)" } | ConvertTo-Json -Compress
}
