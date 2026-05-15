//! Tauri commands for the Vendor Registry Engine.

use crate::engines::vendor_registry::{self, VendorPlatform};

#[tauri::command]
pub fn list_vendor_platforms() -> Vec<VendorPlatform> {
    vendor_registry::list_platforms()
}

#[tauri::command]
pub fn get_vendor_platform(id: String) -> Result<VendorPlatform, String> {
    vendor_registry::get_platform(&id).map_err(|e| e.to_string())
}
