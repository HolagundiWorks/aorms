use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // First-run licence / hub bind is handled in the SPA (INSTALL_ID + account).
      let _ = app.get_webview_window("main");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running AORMS desktop");
}
