use tauri::Manager;
use tauri::webview::WebviewBuilder;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::Emitter;

const SCROLLBAR_HIDE_SCRIPT: &str = r#"
(function() {
    const CSS = '::-webkit-scrollbar,*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}*,html,body{scrollbar-width:none!important;-ms-overflow-style:none!important;scrollbar-gutter:auto!important}';
    const ID = '__xsuite_no_scrollbar';
    function inject() {
        if (document.getElementById(ID)) return;
        var s = document.createElement('style');
        s.id = ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
"#;

const FUSION_BRIDGE_SCRIPT: &str = r#"
(function() {
    if (window.__xsuite_fusion) return;
    window.__xsuite_fusion = true;
    
    document.addEventListener('xsuite-scrape', async () => {
        // Simple scraper: get the main text content or thread content if on X
        const text = document.body.innerText;
        const url = window.location.href;
        const title = document.title;
        
        // Emit back to the main app
        if (window.__TAURI__) {
            window.__TAURI__.event.emit('xsuite-scraped-data', { text, url, title });
        }
    });
})();
"#;

/// Disable native scroll indicators on the WKWebView's enclosing NSScrollView.
#[cfg(target_os = "macos")]
fn disable_scroll_indicators(webview: &tauri::Webview) {
    let _ = webview.with_webview(|platform_wv| {
        unsafe {
            use objc2_app_kit::NSView;

            let wk_webview: *mut objc2::runtime::AnyObject = platform_wv.inner().cast();
            if wk_webview.is_null() { return; }

            let ns_view: &NSView = &*(wk_webview as *const NSView);

            // WKWebView embeds content in an NSScrollView child.
            // Walk subviews to find it and disable scroll indicators.
            let scroll_cls_name = c"NSScrollView";
            let scroll_cls = objc2::runtime::AnyClass::get(scroll_cls_name);

            if let Some(cls) = scroll_cls {
                for subview in ns_view.subviews().iter() {
                    let sv: &NSView = &subview;
                    let obj: &objc2::runtime::AnyObject = &*(sv as *const NSView as *const objc2::runtime::AnyObject);
                    let is_scroll: bool = objc2::msg_send![&*obj, isKindOfClass: cls];
                    if is_scroll {
                        let _: () = objc2::msg_send![&*obj, setHasVerticalScroller: false];
                        let _: () = objc2::msg_send![&*obj, setHasHorizontalScroller: false];
                    }
                }
            }
        }
    });
}

#[cfg(not(target_os = "macos"))]
fn disable_scroll_indicators(_webview: &tauri::Webview) {}

#[tauri::command]
fn create_webview(app: tauri::AppHandle, label: String, url: String) -> Result<(), String> {
    let window = app.get_window("main").ok_or("main window not found")?;

    let webview_builder = WebviewBuilder::new(&label, tauri::WebviewUrl::External(url.parse().map_err(|e| format!("{e}"))?))
        .initialization_script(SCROLLBAR_HIDE_SCRIPT)
        .initialization_script(FUSION_BRIDGE_SCRIPT)
        .background_color(tauri::window::Color(0, 0, 0, 255));

    let webview = window.add_child(webview_builder, tauri::LogicalPosition::new(0, 0), tauri::LogicalSize::new(1, 1))
        .map_err(|e| format!("{e}"))?;

    // Disable native scroll indicators at the OS level
    disable_scroll_indicators(&webview);

    Ok(())
}

#[tauri::command]
fn eval_in_webview(app: tauri::AppHandle, label: String, script: String) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or_else(|| format!("webview '{label}' not found"))?;
    webview.eval(&script).map_err(|e| format!("{e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![create_webview, eval_in_webview])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let x_i = MenuItem::with_id(app, "open_X", "X", true, None::<&str>)?;
      let grok_i = MenuItem::with_id(app, "open_Grok", "Grok", true, None::<&str>)?;
      let grokpedia_i = MenuItem::with_id(app, "open_Grokipedia", "Grokipedia", true, None::<&str>)?;
      let xai_i = MenuItem::with_id(app, "open_console.x.ai", "xAI Console", true, None::<&str>)?;

      let menu = Menu::with_items(
        app,
        &[&x_i, &grok_i, &grokpedia_i, &xai_i, &quit_i],
      )?;

      let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| {
          match event.id.as_ref() {
            "quit" => {
              app.exit(0);
            }
            id if id.starts_with("open_") => {
              let tab_id = &id[5..]; // extract the app ID
              if let Some(window) = app.get_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
              let _ = app.emit("open-app-from-tray", tab_id);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
            if let Some(window) = tray.app_handle().get_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
          }
        })
        .build(app)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
