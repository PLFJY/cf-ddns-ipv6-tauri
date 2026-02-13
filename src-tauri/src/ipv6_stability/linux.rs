use std::collections::HashMap;
use std::net::Ipv6Addr;

use super::{StabilityIndex, StabilityRank};

const IFA_F_TEMPORARY: u32 = 0x01;
const IFA_F_DADFAILED: u32 = 0x08;
const IFA_F_DEPRECATED: u32 = 0x20;
const IFA_F_TENTATIVE: u32 = 0x40;
const IFA_F_PERMANENT: u32 = 0x80;
const IFA_F_STABLE_PRIVACY: u32 = 0x800;

pub(super) fn collect_stability_ranks() -> HashMap<(String, Ipv6Addr), StabilityRank> {
  let mut ranks = HashMap::new();
  let Ok(content) = std::fs::read_to_string("/proc/net/if_inet6") else {
    return ranks;
  };

  for line in content.lines() {
    let fields = line.split_whitespace().collect::<Vec<_>>();
    if fields.len() != 6 {
      continue;
    }
    let Some(addr) = parse_if_inet6_address(fields[0]) else {
      continue;
    };
    let Ok(prefix_len) = u8::from_str_radix(fields[2], 16) else {
      continue;
    };
    let Ok(flags) = u32::from_str_radix(fields[4], 16) else {
      continue;
    };
    let iface_name = fields[5].to_string();
    let rank = classify_linux_rank(flags, prefix_len);
    StabilityIndex::upsert_rank(&mut ranks, iface_name, addr, rank);
  }
  ranks
}

fn classify_linux_rank(flags: u32, prefix_len: u8) -> StabilityRank {
  if flags & IFA_F_TEMPORARY != 0 {
    return StabilityRank::Temporary;
  }
  if flags & (IFA_F_TENTATIVE | IFA_F_DEPRECATED | IFA_F_DADFAILED) != 0 {
    return StabilityRank::Fallback;
  }
  if flags & (IFA_F_STABLE_PRIVACY | IFA_F_PERMANENT) != 0 {
    return StabilityRank::PreferredStable;
  }
  if prefix_len == 64 {
    return StabilityRank::Stable;
  }
  StabilityRank::Fallback
}

fn parse_if_inet6_address(raw: &str) -> Option<Ipv6Addr> {
  if raw.len() != 32 {
    return None;
  }
  let mut bytes = [0u8; 16];
  for (idx, chunk) in raw.as_bytes().chunks_exact(2).enumerate() {
    let hex = std::str::from_utf8(chunk).ok()?;
    bytes[idx] = u8::from_str_radix(hex, 16).ok()?;
  }
  Some(Ipv6Addr::from(bytes))
}
