//! Tauri command for the receipt projection (V1L).
//!
//! Receipts are a view over `DeviceModel`. Mode code passes the model
//! it already holds and gets back a `ReceiptView` it can render. The
//! command is pure — no I/O, no parsing, no state.

use crate::engines::network_model::DeviceModel;
use crate::engines::receipt::{project_receipt, ReceiptView};

#[tauri::command]
pub fn project_device_receipt(device_model: DeviceModel) -> ReceiptView {
    project_receipt(&device_model)
}
