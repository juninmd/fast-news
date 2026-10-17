pub mod api;
pub mod blocking;
pub mod cmd_editions;
pub mod cmd_financial;
pub mod cmd_news;
pub mod cmd_rag;
pub mod cmd_settings;
pub mod cmd_stories;
pub mod cmd_topics;
pub mod config;
pub mod error;
pub mod model;
pub mod net;

#[cfg(test)]
mod live;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

use crate::config::ConfigState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(ConfigState::load(&dir));
            build_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd_settings::settings_get,
            cmd_settings::settings_set_base_url,
            cmd_settings::settings_reset_base_url,
            cmd_settings::api_health,
            cmd_settings::open_link,
            cmd_news::news_list,
            cmd_news::news_top,
            cmd_news::news_categories,
            cmd_news::news_search,
            cmd_news::news_detail,
            cmd_news::news_related,
            cmd_rag::rag_search,
            cmd_editions::editions_list,
            cmd_stories::stories_list,
            cmd_stories::story_detail,
            cmd_topics::topics_list,
            cmd_topics::topic_analysis,
            cmd_topics::topic_history,
            cmd_financial::financial_list,
            cmd_financial::financial_summary,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Fast News");
}

/// A tray so the reader can be reached again after being hidden; closing the window quits normally.
fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::with_id("fast-news-tray")
        .icon(app.default_window_icon().cloned().unwrap())
        .tooltip("Fast News")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => focus_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                focus_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
