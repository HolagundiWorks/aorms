namespace AStudio.Shell.Services;

/// <summary>
/// Tray hook placeholder (W2). Full HWND notify-icon lands with AppWindow subclassing;
/// SPA taskbar remains primary sync UX.
/// </summary>
public sealed class TrayIconService : IDisposable
{
    private readonly Action _onShow;
    private readonly Action _onQuit;

    public TrayIconService(string tip, Action onShow, Action onQuit)
    {
        _ = tip;
        _onShow = onShow;
        _onQuit = onQuit;
    }

    public void Install()
    {
        _ = _onShow;
        _ = _onQuit;
    }

    public void Dispose() { }
}
