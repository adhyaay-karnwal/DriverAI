# Open-Application.ps1
param (
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

try {
    # Check if it's a known application name that can be started directly
    $knownApp = Get-Command $AppName -ErrorAction SilentlyContinue
    if ($knownApp) {
        Start-Process -FilePath $AppName -ErrorAction Stop
    } elseif ([System.IO.File]::Exists($AppName) -or [System.IO.Directory]::Exists($AppName)) {
        # If it's a path to an executable or a file/directory to be opened with its default app
        Invoke-Item -Path $AppName -ErrorAction Stop
    } else {
        # Try finding it in common paths if it's just an app name like "notepad" or "chrome"
        # This is a simplified search, more robust would involve checking registry or Program Files
        $commonPaths = @(
            "$env:ProgramFiles",
            "$env:ProgramFiles(x86)",
            "$env:LOCALAPPDATA\Programs"
            # Add more common paths if needed
        )
        $foundPath = $null
        foreach ($basePath in $commonPaths) {
            # Search for executables
            $exePath = Get-ChildItem -Path $basePath -Recurse -Filter "$AppName.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($exePath) {
                $foundPath = $exePath.FullName
                break
            }
            # Search for application shortcuts (lnk)
            $lnkPath = Get-ChildItem -Path $basePath -Recurse -Filter "$AppName.lnk" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($lnkPath) {
                 # Attempt to resolve shortcut, or just invoke it
                $foundPath = $lnkPath.FullName
                break
            }
        }

        if ($foundPath) {
            Invoke-Item -Path $foundPath -ErrorAction Stop
        } else {
            # Last resort, try shell execution which might find it via PATH or app registrations
            Invoke-Expression -Command $AppName -ErrorAction Stop
        }
    }
    @{ success = $true; result = "Attempted to open/run '$AppName'." } | ConvertTo-Json -Compress
} catch {
    @{ success = $false; error = "Failed to open '$AppName': $($_.Exception.Message)" } | ConvertTo-Json -Compress
}
