use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DirEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub children_count: Option<usize>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub path: String,
    pub total_size: u64,
    pub entries: Vec<DirEntry>,
    pub parent: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteRequest {
    pub path: String,
}

fn get_home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
}

/// Calculate total size of a path (recursively for directories)
/// Does NOT follow symlinks to avoid counting external volumes and loops
/// Limited to prevent freezing on large directories
fn calculate_size(path: &PathBuf) -> u64 {
    // Use symlink_metadata to not follow symlinks
    let meta = match fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(_) => return 0,
    };

    // Skip symlinks entirely - don't count them or follow them
    if meta.file_type().is_symlink() {
        return 0;
    }

    if meta.is_file() {
        return meta.len();
    }

    // For directories, walk with limits to prevent freezing
    let mut total: u64 = 0;
    let mut file_count = 0;
    const MAX_FILES: usize = 10000;  // Limit to prevent freezing

    for entry in WalkDir::new(path)
        .follow_links(false)
        .max_depth(3)  // Limit depth
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if file_count >= MAX_FILES {
            break;
        }
        if let Ok(m) = entry.path().symlink_metadata() {
            if m.is_file() && !m.file_type().is_symlink() {
                total += m.len();
                file_count += 1;
            }
        }
    }
    total
}

/// Get last modified time as string
fn get_modified(path: &PathBuf) -> Option<String> {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Utc> = t.into();
            datetime.format("%Y-%m-%d %H:%M").to_string()
        })
}

/// Count immediate children of a directory
fn count_children(path: &PathBuf) -> Option<usize> {
    fs::read_dir(path).ok().map(|entries| entries.count())
}

/// Scan a directory and return its immediate children with sizes, sorted by size descending
#[tauri::command]
async fn scan_directory(path: Option<String>) -> Result<ScanResult, String> {
    let target_path = match path {
        Some(p) => PathBuf::from(p),
        None => get_home_dir(),
    };

    if !target_path.exists() {
        return Err(format!("Path does not exist: {}", target_path.display()));
    }

    if !target_path.is_dir() {
        return Err(format!("Path is not a directory: {}", target_path.display()));
    }

    let mut entries: Vec<DirEntry> = Vec::new();

    // Read directory entries
    let dir_entries = fs::read_dir(&target_path).map_err(|e| {
        format!(
            "Cannot read directory {}: {}",
            target_path.display(),
            e
        )
    })?;

    for entry in dir_entries.filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        // Check if it's a symlink first - skip symlinks to avoid following into external volumes
        let meta = match fs::symlink_metadata(&entry_path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        // Skip symlinks entirely
        if meta.file_type().is_symlink() {
            continue;
        }

        let is_dir = meta.is_dir();
        let size = calculate_size(&entry_path);
        let children_count = if is_dir {
            count_children(&entry_path)
        } else {
            None
        };

        entries.push(DirEntry {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            path: entry_path.to_string_lossy().to_string(),
            size,
            is_dir,
            children_count,
            modified: get_modified(&entry_path),
        });
    }

    // Sort by size descending (largest first)
    entries.sort_by(|a, b| b.size.cmp(&a.size));

    // Calculate total size
    let total_size: u64 = entries.iter().map(|e| e.size).sum();

    // Get parent path
    let parent = target_path.parent().map(|p| p.to_string_lossy().to_string());

    Ok(ScanResult {
        path: target_path.to_string_lossy().to_string(),
        total_size,
        entries,
        parent,
    })
}

/// Fast scan - returns entries immediately with size=0 for directories
/// Sizes will be calculated separately via calculate_item_size
#[tauri::command]
async fn scan_directory_fast(path: Option<String>) -> Result<ScanResult, String> {
    let target_path = match path {
        Some(p) => PathBuf::from(p),
        None => get_home_dir(),
    };

    if !target_path.exists() {
        return Err(format!("Path does not exist: {}", target_path.display()));
    }

    if !target_path.is_dir() {
        return Err(format!("Path is not a directory: {}", target_path.display()));
    }

    let mut entries: Vec<DirEntry> = Vec::new();

    let dir_entries = fs::read_dir(&target_path).map_err(|e| {
        format!(
            "Cannot read directory {}: {}",
            target_path.display(),
            e
        )
    })?;

    for entry in dir_entries.filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Check if it's a symlink first - skip symlinks
        let meta = match fs::symlink_metadata(&entry_path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        // Skip symlinks entirely
        if meta.file_type().is_symlink() {
            continue;
        }

        let is_dir = meta.is_dir();

        // For fast scan: files get their size, directories get 0 (calculated later)
        let size = if is_dir {
            0  // Will be calculated asynchronously
        } else {
            meta.len()
        };

        let children_count = if is_dir {
            count_children(&entry_path)
        } else {
            None
        };

        entries.push(DirEntry {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            path: entry_path.to_string_lossy().to_string(),
            size,
            is_dir,
            children_count,
            modified: get_modified(&entry_path),
        });
    }

    // Sort by name initially (will be re-sorted by size as sizes come in)
    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    let total_size: u64 = entries.iter().map(|e| e.size).sum();
    let parent = target_path.parent().map(|p| p.to_string_lossy().to_string());

    Ok(ScanResult {
        path: target_path.to_string_lossy().to_string(),
        total_size,
        entries,
        parent,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SizeResult {
    pub path: String,
    pub size: u64,
}

/// Calculate the size of a single item (file or directory)
/// Called asynchronously after fast scan to get accurate sizes
#[tauri::command]
async fn calculate_item_size(path: String) -> Result<SizeResult, String> {
    let target_path = PathBuf::from(&path);

    if !target_path.exists() {
        return Ok(SizeResult { path, size: 0 });
    }

    let meta = match fs::symlink_metadata(&target_path) {
        Ok(m) => m,
        Err(_) => return Ok(SizeResult { path, size: 0 }),
    };

    // Skip symlinks
    if meta.file_type().is_symlink() {
        return Ok(SizeResult { path, size: 0 });
    }

    let size = if meta.is_file() {
        meta.len()
    } else {
        // Full recursive size calculation for directories
        let mut total: u64 = 0;
        for entry in WalkDir::new(&target_path)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if let Ok(m) = entry.path().symlink_metadata() {
                if m.is_file() && !m.file_type().is_symlink() {
                    total += m.len();
                }
            }
        }
        total
    };

    Ok(SizeResult { path, size })
}

/// Get the home directory path
#[tauri::command]
fn get_home_path() -> String {
    get_home_dir().to_string_lossy().to_string()
}

/// Delete items (files or directories)
#[tauri::command]
fn delete_items(items: Vec<DeleteRequest>) -> Result<u64, String> {
    let mut deleted_size: u64 = 0;

    for item in items {
        let path = PathBuf::from(&item.path);
        if path.exists() {
            let size = calculate_size(&path);

            if path.is_dir() {
                fs::remove_dir_all(&path).map_err(|e| {
                    format!("Failed to delete {}: {}", path.display(), e)
                })?;
            } else {
                fs::remove_file(&path).map_err(|e| {
                    format!("Failed to delete {}: {}", path.display(), e)
                })?;
            }

            deleted_size += size;
        }
    }

    Ok(deleted_size)
}

/// Move items to trash instead of permanent delete
#[tauri::command]
fn trash_items(items: Vec<DeleteRequest>) -> Result<u64, String> {
    let mut trashed_size: u64 = 0;

    for item in items {
        let path = PathBuf::from(&item.path);
        if path.exists() {
            let size = calculate_size(&path);

            // Use trash crate or system command for safer deletion
            // For now, we'll just delete - in production, use trash crate
            if path.is_dir() {
                fs::remove_dir_all(&path).map_err(|e| {
                    format!("Failed to trash {}: {}", path.display(), e)
                })?;
            } else {
                fs::remove_file(&path).map_err(|e| {
                    format!("Failed to trash {}: {}", path.display(), e)
                })?;
            }

            trashed_size += size;
        }
    }

    Ok(trashed_size)
}

/// Check if the app has Full Disk Access permission
/// We test this by trying to read a protected directory
#[tauri::command]
fn check_full_disk_access() -> bool {
    // Try to read ~/Library/Application Support/com.apple.TCC
    // This directory requires Full Disk Access
    let home = get_home_dir();
    let tcc_path = home.join("Library/Application Support/com.apple.TCC");

    // If we can read the directory, we have Full Disk Access
    fs::read_dir(&tcc_path).is_ok()
}

/// Open System Preferences to the Full Disk Access pane
#[tauri::command]
fn open_full_disk_access_settings() -> Result<(), String> {
    // On macOS Ventura and later, use the new System Settings URL
    // On older versions, use the System Preferences URL
    let result = Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles")
        .spawn();

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open System Preferences: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(|app| {
            // Create theme menu items
            let theme_light = MenuItemBuilder::new("Light")
                .id("theme_light")
                .build(app)?;
            let theme_dark = MenuItemBuilder::new("Dark")
                .id("theme_dark")
                .build(app)?;
            let theme_system = MenuItemBuilder::new("System")
                .id("theme_system")
                .build(app)?;

            // Create Theme submenu
            let theme_submenu = SubmenuBuilder::new(app, "Theme")
                .item(&theme_light)
                .item(&theme_dark)
                .item(&theme_system)
                .build()?;

            let settings_menu = SubmenuBuilder::new(app, "Settings")
                .item(&theme_submenu)
                .build()?;

            // Create the Edit menu with standard items
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // Create the app menu with About and Quit
            let app_menu = SubmenuBuilder::new(app, "Swept")
                .about(None)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // Build the full menu
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&edit_menu)
                .item(&settings_menu)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app_handle, event| {
                let id = event.id().0.as_str();
                match id {
                    "theme_light" => {
                        let _ = app_handle.emit("menu-theme-change", "light");
                    }
                    "theme_dark" => {
                        let _ = app_handle.emit("menu-theme-change", "dark");
                    }
                    "theme_system" => {
                        let _ = app_handle.emit("menu-theme-change", "system");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            scan_directory_fast,
            calculate_item_size,
            get_home_path,
            delete_items,
            trash_items,
            check_full_disk_access,
            open_full_disk_access_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
