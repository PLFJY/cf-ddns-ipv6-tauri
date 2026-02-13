use std::collections::HashMap;
use std::net::Ipv6Addr;

use netdev::Interface;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(any(target_os = "macos", target_os = "ios"))]
mod macos;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub(crate) enum StabilityRank {
  PreferredStable,
  Stable,
  Fallback,
  Temporary,
}

#[derive(Default)]
pub(crate) struct StabilityIndex {
  ranks: HashMap<(String, Ipv6Addr), StabilityRank>,
}

impl StabilityIndex {
  pub(crate) fn collect() -> Self {
    #[cfg(target_os = "windows")]
    {
      return Self {
        ranks: windows::collect_stability_ranks(),
      };
    }
    #[cfg(target_os = "linux")]
    {
      return Self {
        ranks: linux::collect_stability_ranks(),
      };
    }
    #[cfg(any(target_os = "macos", target_os = "ios"))]
    {
      return Self {
        ranks: macos::collect_stability_ranks(),
      };
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos", target_os = "ios")))]
    {
      Self::default()
    }
  }

  pub(crate) fn rank_for(&self, iface_name: &str, addr: Ipv6Addr, prefix_len: u8) -> StabilityRank {
    if let Some(rank) = self.ranks.get(&(iface_name.to_string(), addr)) {
      return *rank;
    }
    // Cross-platform fallback heuristic: global /64 addresses are typically more stable
    // than temporary/privacy /128 addresses on desktop OSes.
    if prefix_len == 64 {
      return StabilityRank::Stable;
    }
    StabilityRank::Fallback
  }

  pub(crate) fn upsert_rank(
    ranks: &mut HashMap<(String, Ipv6Addr), StabilityRank>,
    iface_name: String,
    addr: Ipv6Addr,
    rank: StabilityRank,
  ) {
    let key = (iface_name, addr);
    match ranks.get(&key) {
      Some(existing) if *existing <= rank => {}
      _ => {
        ranks.insert(key, rank);
      }
    }
  }
}

pub(crate) fn collect_ranks_from_interfaces(interfaces: &[Interface]) -> StabilityIndex {
  let mut index = StabilityIndex::collect();
  // Ensure every observed global address has at least a fallback rank.
  for iface in interfaces {
    for network in &iface.ipv6 {
      let rank = index.rank_for(&iface.name, network.addr(), network.prefix_len());
      StabilityIndex::upsert_rank(
        &mut index.ranks,
        iface.name.clone(),
        network.addr(),
        rank,
      );
    }
  }
  index
}
