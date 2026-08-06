using Microsoft.UI.Xaml;
using AStudio.Shell;

namespace AStudio.Shell;

public partial class App : Application
{
    private Window? _window;

    public App()
    {
        InitializeComponent();
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        Environment.SetEnvironmentVariable("ESTI_DESKTOP", "true");
        Environment.SetEnvironmentVariable("ESTI_ROLE", "node");
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("STORAGE_DRIVER")))
        {
            Environment.SetEnvironmentVariable("STORAGE_DRIVER", "fs");
        }
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("INSTALL_ID")))
        {
            Environment.SetEnvironmentVariable("INSTALL_ID", Guid.NewGuid().ToString("D"));
        }

        _window = new MainWindow();
        _window.Activate();
    }
}

public static class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        WinRT.ComWrappersSupport.InitializeComWrappers();
        Application.Start(_ => new App());
    }
}
