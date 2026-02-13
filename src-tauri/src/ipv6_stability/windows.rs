use std::collections::HashMap;
use std::net::IpAddr;

use windows_sys::Win32::Foundation::{ERROR_BUFFER_OVERFLOW, NO_ERROR};
use windows_sys::Win32::NetworkManagement::IpHelper::{
  GetAdaptersAddresses, GAA_FLAG_INCLUDE_ALL_INTERFACES, IP_ADAPTER_ADDRESSES_LH,
  IP_ADAPTER_UNICAST_ADDRESS_LH,
};
use windows_sys::Win32::Networking::WinSock::{
  AF_INET6, AF_UNSPEC, IpPrefixOriginDhcp, IpPrefixOriginRouterAdvertisement, IpSuffixOriginDhcp,
  IpSuffixOriginLinkLayerAddress, IpSuffixOriginRandom, SOCKADDR_INET, SOCKET_ADDRESS,
};

use super::{StabilityIndex, StabilityRank};

pub(super) fn collect_stability_ranks() -> HashMap<(String, std::net::Ipv6Addr), StabilityRank> {
  let mut ranks = HashMap::new();
  let mut mem = Vec::<u8>::with_capacity(15000);
  let mut retries = 3;
  loop {
    let mut size = mem.capacity() as u32;
    let ret = unsafe {
      GetAdaptersAddresses(
        AF_UNSPEC as u32,
        GAA_FLAG_INCLUDE_ALL_INTERFACES,
        std::ptr::null(),
        mem.as_mut_ptr().cast(),
        &mut size,
      )
    };
    match ret {
      NO_ERROR => {
        unsafe { mem.set_len(size as usize) };
        break;
      }
      ERROR_BUFFER_OVERFLOW if retries > 0 => {
        mem.reserve(size as usize);
        retries -= 1;
      }
      _ => return ranks,
    }
  }

  let head = mem.as_mut_ptr().cast::<IP_ADAPTER_ADDRESSES_LH>();
  for adapter in unsafe { linked_list_iter(&head, |cur| cur.Next) } {
    let name = unsafe { std::ffi::CStr::from_ptr(adapter.AdapterName.cast()) }
      .to_string_lossy()
      .into_owned();
    for unicast in unsafe { linked_list_iter(&adapter.FirstUnicastAddress, |cur| cur.Next) } {
      let Some(ipv6) = (unsafe { socket_address_to_ipv6(&unicast.Address) }) else {
        continue;
      };
      let rank = classify_windows_rank(unicast);
      StabilityIndex::upsert_rank(&mut ranks, name.clone(), ipv6, rank);
    }
  }
  ranks
}

fn classify_windows_rank(unicast: &IP_ADAPTER_UNICAST_ADDRESS_LH) -> StabilityRank {
  if unicast.PrefixOrigin == IpPrefixOriginRouterAdvertisement
    && unicast.SuffixOrigin != IpSuffixOriginRandom
  {
    return StabilityRank::PreferredStable;
  }
  if unicast.SuffixOrigin == IpSuffixOriginRandom {
    return StabilityRank::Temporary;
  }
  if unicast.PrefixOrigin == IpPrefixOriginDhcp
    || unicast.SuffixOrigin == IpSuffixOriginDhcp
    || unicast.SuffixOrigin == IpSuffixOriginLinkLayerAddress
  {
    return StabilityRank::Stable;
  }
  StabilityRank::Fallback
}

unsafe fn socket_address_to_ipv6(addr: &SOCKET_ADDRESS) -> Option<std::net::Ipv6Addr> {
  let sockaddr = addr.lpSockaddr.cast::<SOCKADDR_INET>().as_ref()?;
  if sockaddr.si_family != AF_INET6 {
    return None;
  }
  match unsafe { sockaddr.Ipv6.sin6_addr.u.Byte }.into() {
    IpAddr::V6(ipv6) => Some(ipv6),
    IpAddr::V4(_) => None,
  }
}

unsafe fn linked_list_iter<T>(ptr: &*mut T, next: fn(&T) -> *mut T) -> impl Iterator<Item = &T> {
  let mut ptr = ptr.cast_const();
  std::iter::from_fn(move || {
    let cur = ptr.as_ref()?;
    ptr = next(cur);
    Some(cur)
  })
}
