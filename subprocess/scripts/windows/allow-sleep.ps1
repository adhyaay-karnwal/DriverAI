# Allow-Sleep.ps1
try {
    # ES_CONTINUOUS (0x80000000) - Informs the system that the state being set should remain in effect
    # until the next call that uses ES_CONTINUOUS and one of the other state flags is cleared.
    # To allow sleep, we just set ES_CONTINUOUS, clearing any previous ES_SYSTEM_REQUIRED or ES_DISPLAY_REQUIRED.

    $state = [uint32]0x80000000

    $signature = @"
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
"@
    Add-Type -MemberDefinition $signature -Name "Kernel32" -Namespace "Win32" -PassThru | Out-Null

    $previousState = [Win32.Kernel32]::SetThreadExecutionState($state)

    if ($previousState -ne 0) {
        # Successfully set the state (cleared system/display requirements)
        @{ success = $true; result = "Sleep prevention deactivated (system restored to normal sleep behavior). Previous state flags: $previousState" } | ConvertTo-Json -Compress
    } else {
        $lastError = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        @{ success = $false; error = "Failed to deactivate sleep prevention. SetThreadExecutionState returned 0. Win32Error: $lastError" } | ConvertTo-Json -Compress
    }
} catch {
     @{ success = $false; error = "General error deactivating sleep prevention: $($_.Exception.Message)" } | ConvertTo-Json -Compress
}
