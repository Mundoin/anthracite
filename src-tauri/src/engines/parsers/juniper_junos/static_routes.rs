//! Junos static-route parsing helpers — V1M.
//!
//! Junos style:
//!   set routing-options static route 0.0.0.0/0 next-hop 10.0.0.1
//!   set routing-instances NAME routing-options static route PREFIX next-hop HOP
//!
//! V1M captures `prefix`, `next_hops`, and the enclosing VRF when
//! present. `admin-distance`, `metric`, and `tag` are tolerated but not
//! parsed for V1M (the inputs are rare under the L1/L2 brief).

use crate::engines::network_model::StaticRouteModel;

#[derive(Debug, Default, Clone)]
pub struct RouteBuilder {
    pub prefix: String,
    pub next_hops: Vec<String>,
    pub vrf: Option<String>,
    pub admin_distance: Option<u32>,
    pub metric: Option<u32>,
    pub tag: Option<u32>,
    pub name: Option<String>,
}

impl RouteBuilder {
    pub fn build(mut self) -> StaticRouteModel {
        self.next_hops.sort();
        self.next_hops.dedup();
        StaticRouteModel {
            prefix: self.prefix,
            next_hops: self.next_hops,
            admin_distance: self.admin_distance,
            metric: self.metric,
            tag: self.tag,
            vrf: self.vrf,
            name: self.name,
        }
    }
}
