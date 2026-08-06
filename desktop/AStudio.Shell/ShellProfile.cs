namespace AStudio.Shell;

/// <summary>STUDIO | CONSULTANCY packaging profile (compile-time).</summary>
public static class ShellProfile
{
#if AORMS_PROFILE_CONSULTANCY
    public const string Id = "CONSULTANCY";
    public const string ProductName = "AORMS Consultancy";
#else
    public const string Id = "STUDIO";
    public const string ProductName = "AORMS Studio";
#endif

    /// <summary>
    /// Dev default: Vite. Override with AORMS_SPA_URL (file:///… or http://127.0.0.1:5173).
    /// </summary>
    public static string SpaUrl =>
        Environment.GetEnvironmentVariable("AORMS_SPA_URL")
        ?? "http://127.0.0.1:5173";
}
