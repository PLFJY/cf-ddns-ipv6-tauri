use std::cmp::Ordering;
use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr, UdpSocket};

use netdev::{get_interfaces, Interface};

use crate::ipv6_stability::{collect_ranks_from_interfaces, StabilityIndex, StabilityRank};
use crate::models::InterfaceInfo;

pub fn collect_interfaces_and_ipv6(selected_interface: Option<&str>) -> (Vec<InterfaceInfo>, Option<String>) {
  let mut interfaces = get_interfaces();
  interfaces.sort_by(|a, b| a.name.cmp(&b.name));
  let outbound_source_ipv6 = detect_outbound_source_ipv6();
  let stability_index = collect_ranks_from_interfaces(&interfaces);

  let infos = interfaces.iter().map(to_interface_info).collect::<Vec<_>>();

  let current_ipv6 = if let Some(name) = selected_interface {
    interfaces
      .iter()
      .find(|iface| iface.name == name)
      .and_then(|iface| select_ipv6_from_interface(iface, &stability_index, outbound_source_ipv6))
  } else {
    select_ipv6_from_interfaces(&interfaces, &stability_index, outbound_source_ipv6)
  };

  (infos, current_ipv6.map(|addr| addr.to_string()))
}

fn to_interface_info(iface: &Interface) -> InterfaceInfo {
  let mut ipv6 = iface
    .ipv6
    .iter()
    .map(|network| network.addr().to_string())
    .collect::<Vec<_>>();
  ipv6.sort();

  let label = iface
    .friendly_name
    .as_ref()
    .filter(|name| !name.is_empty())
    .cloned()
    .unwrap_or_else(|| iface.name.clone());

  let mac = iface
    .mac_addr
    .as_ref()
    .map(|address| address.to_string())
    .and_then(|value| {
      if value == "00:00:00:00:00:00" {
        None
      } else {
        Some(value)
      }
    });

  let link_speed_mbps = iface
    .transmit_speed
    .or(iface.receive_speed)
    .map(|bits_per_second| bits_per_second / 1_000_000);

  InterfaceInfo {
    id: iface.name.clone(),
    label,
    mac_address: mac,
    ipv6_addresses: ipv6,
    link_speed_mbps,
  }
}

fn select_ipv6_from_interface(
  iface: &Interface,
  stability_index: &StabilityIndex,
  outbound_source_ipv6: Option<Ipv6Addr>,
) -> Option<Ipv6Addr> {
  let candidates = iface
    .ipv6
    .iter()
    .filter_map(|network| to_candidate(iface, network.addr(), network.prefix_len(), stability_index, outbound_source_ipv6))
    .collect::<Vec<_>>();
  pick_best_candidate(candidates)
}

fn select_ipv6_from_interfaces(
  interfaces: &[Interface],
  stability_index: &StabilityIndex,
  outbound_source_ipv6: Option<Ipv6Addr>,
) -> Option<Ipv6Addr> {
  let candidates = interfaces
    .iter()
    .flat_map(|iface| {
      iface
        .ipv6
        .iter()
        .filter_map(|network| to_candidate(iface, network.addr(), network.prefix_len(), stability_index, outbound_source_ipv6))
    })
    .collect::<Vec<_>>();
  pick_best_candidate(candidates)
}

fn to_candidate(
  iface: &Interface,
  addr: Ipv6Addr,
  prefix_len: u8,
  stability_index: &StabilityIndex,
  outbound_source_ipv6: Option<Ipv6Addr>,
) -> Option<Ipv6Candidate> {
  if !is_global_candidate(&addr) {
    return None;
  }
  Some(Ipv6Candidate {
    addr,
    stability_rank: stability_index.rank_for(&iface.name, addr, prefix_len),
    outbound_selected: Some(addr) == outbound_source_ipv6,
  })
}

fn pick_best_candidate(mut candidates: Vec<Ipv6Candidate>) -> Option<Ipv6Addr> {
  if candidates.is_empty() {
    return None;
  }
  candidates.sort_by(order_ipv6_candidates_with_policy);
  candidates.into_iter().next().map(|candidate| candidate.addr)
}

fn order_ipv6_candidates_with_policy(a: &Ipv6Candidate, b: &Ipv6Candidate) -> Ordering {
  a
    .stability_rank
    .cmp(&b.stability_rank)
    .then_with(|| a.outbound_selected.cmp(&b.outbound_selected).reverse())
    .then_with(|| order_ipv6_candidates(&a.addr, &b.addr))
}

fn detect_outbound_source_ipv6() -> Option<Ipv6Addr> {
  // Rust `UdpSocket::connect` docs: for UDP this sets default remote and enables querying selected local address
  // via `local_addr`, without requiring an application-level send.
  let socket = UdpSocket::bind("[::]:0").ok()?;
  if socket.connect("[2606:4700:4700::1111]:53").is_err() {
    return None;
  }
  let local = socket.local_addr().ok()?;
  match local {
    SocketAddr::V6(addr) => Some(*addr.ip()),
    SocketAddr::V4(_) => None,
  }
}

pub fn detect_outbound_source_ipv4() -> Option<Ipv4Addr> {
  // Rust `UdpSocket::connect` docs: use routing-selected local IPv4 without sending payload.
  let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
  if socket.connect("1.1.1.1:53").is_err() {
    return None;
  }
  let local = socket.local_addr().ok()?;
  match local {
    SocketAddr::V4(addr) => Some(*addr.ip()),
    SocketAddr::V6(_) => None,
  }
}

fn is_global_candidate(address: &Ipv6Addr) -> bool {
  !address.is_loopback()
    && !address.is_multicast()
    && !address.is_unicast_link_local()
    && !address.is_unique_local()
    && !address.is_unspecified()
}

fn order_ipv6_candidates(a: &Ipv6Addr, b: &Ipv6Addr) -> Ordering {
  a.octets().cmp(&b.octets())
}

struct Ipv6Candidate {
  addr: Ipv6Addr,
  stability_rank: StabilityRank,
  outbound_selected: bool,
}
