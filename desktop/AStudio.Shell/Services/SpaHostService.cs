using System.Text.Json;
using Microsoft.UI.Xaml.Controls;

namespace AStudio.Shell.Services;

/// <summary>WebView2 host for the AORMS React SPA + native→SPA command bridge.</summary>
public sealed class SpaHostService
{
    private readonly WebView2 _webView;
    private bool _bridgeRegistered;

    public SpaHostService(WebView2 webView)
    {
        _webView = webView;
    }

    public async Task NavigateAsync(string url)
    {
        // Register document-created boot script BEFORE first Navigate so
        // `__AORMS_NATIVE_SHELL__` is present for DesktopLicenceBind + menu bridge.
        await EnsureBridgeAsync();
        _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
        _webView.CoreWebView2.Navigate(url);
    }

    public async Task EnsureBridgeAsync()
    {
        await _webView.EnsureCoreWebView2Async();
        if (_bridgeRegistered) return;
        var profile = ShellProfile.Id.Replace("'", "\\'", StringComparison.Ordinal);
        var boot =
            "window.__AORMS_NATIVE_SHELL__ = {" +
            $" profile: '{profile}'," +
            " host: 'desktop'," +
            " postToHost: function (msg) {" +
            "   try {" +
            "     if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {" +
            "       window.chrome.webview.postMessage(msg);" +
            "     }" +
            "   } catch (e) {}" +
            " }" +
            "};";
        await _webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(boot);
        _bridgeRegistered = true;
    }

    /// <summary>Dispatch a command ID into the SPA (same IDs as DESKTOP-WEB-PARITY keymap).</summary>
    public async Task PostCommandAsync(string commandId)
    {
        await _webView.EnsureCoreWebView2Async();
        var json = JsonSerializer.Serialize(new { type = "aorms.command", id = commandId });
        var script =
            $"window.dispatchEvent(new CustomEvent('aorms-native-command', {{ detail: {json} }}));";
        await _webView.CoreWebView2.ExecuteScriptAsync(script);
    }
}
