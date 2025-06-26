# Get-ActiveApplication.ps1
try {
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;
    public class User32 {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        [DllImport("user32.dll", SetLastError=true)]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    }
"@
    $hWnd = [User32]::GetForegroundWindow()
    $sb = New-Object System.Text.StringBuilder 256
    [User32]::GetWindowText($hWnd, $sb, $sb.Capacity) | Out-Null
    $windowTitle = $sb.ToString()

    $processId = 0
    [User32]::GetWindowThreadProcessId($hWnd, [ref]$processId) | Out-Null
    # Handle cases where process might not be found or access is denied
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        $processName = $process.ProcessName
    } else {
        $processName = "Unknown"
    }

    $result = @{
        title = $windowTitle
        processName = $processName
    }

    @{ success = $true; result = $result } | ConvertTo-Json -Compress
} catch {
    @{ success = $false; error = "Error getting active application: $($_.Exception.Message)" } | ConvertTo-Json -Compress
}
