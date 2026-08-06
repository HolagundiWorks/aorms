using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Windowing;
using Windows.Graphics;
using WinRT.Interop;
using AStudio.Shell.Services;

namespace AStudio.Shell;

public sealed partial class MainWindow : Window
{
    private readonly NodeStackService _nodeStack = new();
    private readonly SpaHostService _spaHost;
    private bool _bridgeReady;
    private TrayIconService? _tray;

    public MainWindow()
    {
        InitializeComponent();
        Title = ShellProfile.ProductName;
        ExtendsContentIntoTitleBar = true;
        SetTitleBar(AppTitleBar);

        TryApplyMica();
        ResizeDefault();

        _spaHost = new SpaHostService(SpaView);
        if (Content is FrameworkElement root)
        {
            root.Loaded += OnLoaded;
        }
        else
        {
            Activated += (_, _) =>
            {
                if (!_bridgeReady && Content is FrameworkElement fe)
                {
                    fe.Loaded += OnLoaded;
                }
            };
        }
        Closed += OnClosed;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            ProductLabel.Text = ShellProfile.ProductName;
            StatusText.Text = "Starting local node stack...";

            var started = await _nodeStack.EnsureStartedAsync().ConfigureAwait(false);
            await RunOnUiAsync(() =>
            {
                StatusText.Text = started
                    ? "Node stack ready - loading SPA..."
                    : "Node stack not detected - loading SPA URL anyway...";
            }).ConfigureAwait(false);

            await RunOnUiAsync(async () =>
            {
                // NavigateAsync registers the document-created bridge before first load.
                await _spaHost.NavigateAsync(ShellProfile.SpaUrl).ConfigureAwait(true);
                _bridgeReady = true;
                StatusText.Text = ShellProfile.ProductName;
                BuildNativeMenu();
                _tray = new TrayIconService(ShellProfile.ProductName, OnTrayShow, OnTrayQuit);
                _tray.Install();
            }).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            try
            {
                var log = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "AORMS",
                    "shell-crash.log");
                Directory.CreateDirectory(Path.GetDirectoryName(log)!);
                await File.AppendAllTextAsync(log, $"{DateTimeOffset.Now:o} {ex}\n").ConfigureAwait(false);
                await RunOnUiAsync(() => StatusText.Text = $"Shell error: {ex.GetType().Name}").ConfigureAwait(false);
            }
            catch
            {
                // ignore secondary failures
            }
        }
    }

    private Task RunOnUiAsync(Action action)
    {
        var tcs = new TaskCompletionSource();
        var dq = DispatcherQueue;
        if (dq is null || dq.HasThreadAccess)
        {
            try
            {
                action();
                tcs.SetResult();
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
            return tcs.Task;
        }

        if (!dq.TryEnqueue(() =>
            {
                try
                {
                    action();
                    tcs.SetResult();
                }
                catch (Exception ex)
                {
                    tcs.SetException(ex);
                }
            }))
        {
            tcs.SetException(new InvalidOperationException("DispatcherQueue.TryEnqueue failed"));
        }
        return tcs.Task;
    }

    private Task RunOnUiAsync(Func<Task> action)
    {
        var tcs = new TaskCompletionSource();
        var dq = DispatcherQueue;
        async void Run()
        {
            try
            {
                await action().ConfigureAwait(true);
                tcs.SetResult();
            }
            catch (Exception ex)
            {
                tcs.SetException(ex);
            }
        }

        if (dq is null || dq.HasThreadAccess)
        {
            Run();
            return tcs.Task;
        }

        if (!dq.TryEnqueue(Run))
        {
            tcs.SetException(new InvalidOperationException("DispatcherQueue.TryEnqueue failed"));
        }
        return tcs.Task;
    }

    private void OnTrayShow() => Activate();

    private void OnTrayQuit() => Close();

    private void OnClosed(object sender, WindowEventArgs args)
    {
        _tray?.Dispose();
        _ = _nodeStack.StopAsync(graceful: true);
    }

    private void TryApplyMica()
    {
        try
        {
            SystemBackdrop = new Microsoft.UI.Xaml.Media.MicaBackdrop();
        }
        catch
        {
            // Older builds without Mica
        }
    }

    private void ResizeDefault()
    {
        try
        {
            var hwnd = WindowNative.GetWindowHandle(this);
            var id = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(hwnd);
            var appWindow = AppWindow.GetFromWindowId(id);
            appWindow.Resize(new SizeInt32(1440, 900));
        }
        catch
        {
            // ignore
        }
    }

    private void BuildNativeMenu()
    {
        MenuProject.Items.Clear();
        MenuEdit.Items.Clear();
        MenuView.Items.Clear();
        MenuAi.Items.Clear();
        MenuHelp.Items.Clear();

        AddBar(MenuProject, "New...", "project.new");
        AddBar(MenuProject, "Open...", "project.open");
        AddBar(MenuProject, "Save", "document.save");
        AddBar(MenuEdit, "Find", "search.find");
        AddBar(MenuEdit, "Command palette", "command.palette");
        AddBar(MenuView, "Toggle rail", "view.toggleRail");
        AddBar(MenuView, "Refresh", "view.refresh");
        AddBar(MenuAi, "Ask ESTI", "ai.ask");
        AddBar(MenuHelp, "Keyboard shortcuts", "help.shortcuts");
        AddBar(MenuHelp, "About", "help.about");
    }

    private void AddBar(MenuBarItem parent, string label, string commandId)
    {
        var item = new MenuFlyoutItem { Text = label, Tag = commandId };
        item.Click += async (_, _) =>
        {
            if (!_bridgeReady) return;
            await _spaHost.PostCommandAsync(commandId);
        };
        parent.Items.Add(item);
    }

    private async void OnReloadClick(object sender, RoutedEventArgs e)
    {
        try
        {
            await RunOnUiAsync(async () => await _spaHost.NavigateAsync(ShellProfile.SpaUrl).ConfigureAwait(true))
                .ConfigureAwait(false);
        }
        catch
        {
            // ignore reload errors
        }
    }

    private async void OnStartStackClick(object sender, RoutedEventArgs e)
    {
        try
        {
            await RunOnUiAsync(() => StatusText.Text = "Starting node stack...").ConfigureAwait(false);
            var ok = await _nodeStack.EnsureStartedAsync(force: true).ConfigureAwait(false);
            await RunOnUiAsync(() =>
            {
                StatusText.Text = ok
                    ? "Node stack started"
                    : "Failed to start node stack - see desktop/scripts/start-node.ps1";
            }).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            await RunOnUiAsync(() => StatusText.Text = $"Stack error: {ex.GetType().Name}").ConfigureAwait(false);
        }
    }
}
