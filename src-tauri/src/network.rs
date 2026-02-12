use std::cmp::Ordering;
use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr, UdpSocket};

use netdev::{get_interfaces, Interface};

use crate::models::InterfaceInfo;

pub fn collect_interfaces_and_ipv6(selected_interface: Option<&str>) -> (Vec<InterfaceInfo>, Option<String>) {
  let mut interfaces = get_interfaces();
  interfaces.sort_by(|a, b| a.name.cmp(&b.name));
  let outbound_source_ipv6 = detect_outbound_source_ipv6();

  let infos = interfaces.iter().map(to_interface_info).collect::<Vec<_>>();

  let selected = selected_interface
    .and_then(|name| interfaces.iter().find(|iface| iface.name == name))
    .and_then(|iface| select_ipv6_from_interface(iface, outbound_source_ipv6))
    .map(|addr| addr.to_string());

  if selected.is_some() {
    return (infos, selected);
  }

  if let Some(outbound) = outbound_source_ipv6 {
    let exists = interfaces
      .iter()
      .any(|iface| iface.ipv6.iter().any(|network| network.addr() == outbound));
    if exists {
      return (infos, Some(outbound.to_string()));
    }
  }

  let fallback = interfaces
    .iter()
    .filter_map(|iface| select_ipv6_from_interface(iface, outbound_source_ipv6))
    .map(|addr| addr.to_string())
    .next();

  (infos, fallback)
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

fn select_ipv6_from_interface(iface: &Interface, outbound_source_ipv6: Option<Ipv6Addr>) -> Option<Ipv6Addr> {
  let mut candidates = iface
    .ipv6
    .iter()
    .map(|network| network.addr())
    .filter(is_global_candidate)
    .collect::<Vec<_>>();

  if let Some(outbound) = outbound_source_ipv6 {
    if candidates.contains(&outbound) {
      // Rust `UdpSocket::local_addr` returns the source address selected by OS routing/address policy
      // after `connect`; when that address exists on this interface, we prioritize it for DDNS updates.
      return Some(outbound);
    }
  }

  // Rust std docs: `Ipv6Addr` helpers let us exclude loopback/link-local/multicast/unique-local.
  // netdev's cross-platform interface model does not expose "temporary" flags uniformly, so
  // we use deterministic lexical order as the fallback heuristic for repeatable behavior.
  candidates.sort_by(order_ipv6_candidates);
  candidates.into_iter().next()
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
