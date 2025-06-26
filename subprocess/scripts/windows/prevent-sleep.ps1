# Prevent-Sleep.ps1
try {
    # ES_CONTINUOUS (0x80000000) - Informs the system that the state being set should remain in effect until the next call that uses ES_CONTINUOUS and one of the other state flags is cleared.
    # ES_SYSTEM_REQUIRED (0x00000001) - Forces the system to be in the working state by preventing the system from sleeping.
    # ES_DISPLAY_REQUIRED (0x00000002) - Forces the display to be on by preventing the display from turning off.

    # Combine flags: ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
    $state = [uint32]0x80000000 -bor [uint32]0x00000001 -bor [uint32]0x00000002

    # PInvoke SetThreadExecutionState
    # Need to define the function signature if not already available in this session
    # This is a more robust way to ensure the function is available.
    $signature = @"
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
"@
    Add-Type -MemberDefinition $signature -Name "Kernel32" -Namespace "Win32" -PassThru | Out-Null

    $previousState = [Win32.Kernel32]::SetThreadExecutionState($state)

    if ($previousState -ne 0) {
        # Successfully set the state
        @{ success = $true; result = "Sleep prevention (system & display) activated. Previous state flags: $previousState" } | ConvertTo-Json -Compress
    } else {
        # Failed to set the state, get last error
        $lastError = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        @{ success = $false; error = "Failed to activate sleep prevention. SetThreadExecutionState returned 0. Win32Error: $lastError" } | ConvertTo-Json -Compress
    }
} catch {
     @{ success = $false; error = "General error activating sleep prevention: $($_.Exception.Message)" } | ConvertTo-Json -Compress
}
