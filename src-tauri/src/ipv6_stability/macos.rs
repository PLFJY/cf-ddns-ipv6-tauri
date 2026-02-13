use std::collections::HashMap;
use std::net::Ipv6Addr;

use super::StabilityRank;

pub(super) fn collect_stability_ranks() -> HashMap<(String, Ipv6Addr), StabilityRank> {
  // macOS does not expose Windows-like PrefixOrigin/SuffixOrigin metadata via getifaddrs.
  // We return an empty map and rely on the shared /64 fallback heuristic in `mod.rs`.
  HashMap::new()
}
