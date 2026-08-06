using System.Diagnostics;

namespace AStudio.Shell.Services;

/// <summary>
/// Detects / starts the local node stack via desktop/scripts/start-node.ps1 (Docker Compose).
/// Does not bundle Postgres — W2 lifecycle only.
/// </summary>
public sealed class NodeStackService
{
    private Process? _startedProcess;

    public async Task<bool> EnsureStartedAsync(bool force = false)
    {
        if (!force && await IsApiReachableAsync())
        {
            return true;
        }

        var repoRoot = FindRepoRoot();
        if (repoRoot is null)
        {
            return await IsApiReachableAsync();
        }

        var script = Path.Combine(repoRoot, "desktop", "scripts", "start-node.ps1");
        if (!File.Exists(script))
        {
            return await IsApiReachableAsync();
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{script}\"",
                WorkingDirectory = repoRoot,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            psi.Environment["ESTI_DESKTOP"] = "true";
            psi.Environment["ESTI_ROLE"] = "node";
            psi.Environment["STORAGE_DRIVER"] =
                Environment.GetEnvironmentVariable("STORAGE_DRIVER") ?? "fs";
            psi.Environment["INSTALL_ID"] =
                Environment.GetEnvironmentVariable("INSTALL_ID") ?? Guid.NewGuid().ToString("D");

            _startedProcess = Process.Start(psi);
            // Give compose a head start; SPA can retry API
            await Task.Delay(TimeSpan.FromSeconds(3));
            for (var i = 0; i < 20; i++)
            {
                if (await IsApiReachableAsync()) return true;
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }
        catch
        {
            // Fall through — SPA may still load if stack already up
        }

        return await IsApiReachableAsync();
    }

    public Task StopAsync(bool graceful)
    {
        // Do not tear down shared Docker stack by default — other tools may use it.
        // Explicit stop is operator-owned (docker compose down).
        _ = graceful;
        return Task.CompletedTask;
    }

    private static async Task<bool> IsApiReachableAsync()
    {
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            foreach (var path in new[] { "http://127.0.0.1:4000/health", "http://127.0.0.1:4000/trpc/health" })
            {
                try
                {
                    var res = await http.GetAsync(path);
                    if (res.IsSuccessStatusCode) return true;
                }
                catch
                {
                    // try next
                }
            }
            return false;
        }
        catch
        {
            return false;
        }
    }

    private static string? FindRepoRoot()
    {
        // Published artifacts live outside the repo — prefer explicit env first.
        var envRoot = Environment.GetEnvironmentVariable("AORMS_REPO_ROOT");
        if (!string.IsNullOrWhiteSpace(envRoot) && Directory.Exists(envRoot))
        {
            var envScript = Path.Combine(envRoot, "desktop", "scripts", "start-node.ps1");
            if (File.Exists(envScript)) return envRoot;
        }

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var marker = Path.Combine(dir.FullName, "desktop", "scripts", "start-node.ps1");
            if (File.Exists(marker) && Directory.Exists(Path.Combine(dir.FullName, "frontend")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }

        var cwd = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (cwd is not null)
        {
            var marker = Path.Combine(cwd.FullName, "desktop", "scripts", "start-node.ps1");
            if (File.Exists(marker)) return cwd.FullName;
            cwd = cwd.Parent;
        }

        return null;
    }
}
