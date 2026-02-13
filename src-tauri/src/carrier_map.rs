pub fn resolve_carrier_name(asn: Option<u32>, organization: Option<&str>) -> Option<&'static str> {
  if let Some(code) = asn {
    if let Some(name) = lookup_asn(code) {
      return Some(name);
    }
  }
  organization.and_then(lookup_org_keyword)
}

fn lookup_asn(asn: u32) -> Option<&'static str> {
  match asn {
    // Mainland China
    4134 => Some("China Telecom Corporation Limited"),
    4809 => Some("China Telecom Next Carrier Network (CN2)"),
    4812 => Some("China Telecom Group Beijing Ltd"),
    4811 => Some("China Telecom Group Guangdong Ltd"),
    4816 => Some("China Unicom Corporation"),
    4837 => Some("China Unicom Backbone Network"),
    9929 => Some("China Unicom Global"),
    9808 => Some("China Mobile Communications Group Co., Ltd."),
    56040 => Some("China Mobile Communications Group Co., Ltd."),
    24400 => Some("China Mobile Communications Group Co., Ltd."),
    146788 => Some("China Broadcasting Network Co., Ltd."),
    17621 => Some("China Unicom Beijing Province Network"),
    17622 => Some("China Unicom Guangdong Province Network"),
    17623 => Some("China Unicom Shanghai Province Network"),
    23724 => Some("IDC China Telecommunications Corporation"),

    // Hong Kong / Macau / Taiwan
    9304 => Some("HGC Global Communications Limited"),
    4635 => Some("Hong Kong Broadband Network Ltd."),
    3491 => Some("PCCW Global (Hong Kong Telecommunications)"),
    4760 => Some("HKT Limited"),
    9264 => Some("Hong Kong Telecom Global Data Centre"),
    4609 => Some("CTM - Companhia de Telecomunicacoes de Macau, S.A.R.L."),
    9694 => Some("HiNet, Chunghwa Telecom Co., Ltd."),
    3462 => Some("Data Communication Business Group, Chunghwa Telecom Co., Ltd."),
    4780 => Some("Far EasTone Telecommunications Co., Ltd."),
    18182 => Some("Taiwan Mobile Co., Ltd."),
    9924 => Some("Taiwan Fixed Network Co., Ltd."),

    // United States
    701 => Some("Verizon Business"),
    7018 => Some("AT&T Services, Inc."),
    209 => Some("CenturyLink Communications, LLC"),
    7922 => Some("Comcast Cable Communications, LLC"),
    20001 => Some("Charter Communications"),
    22773 => Some("Cox Communications, Inc."),
    11492 => Some("Cable One, Inc. / Sparklight"),
    20115 => Some("Charter Communications"),
    21928 => Some("T-Mobile US, Inc."),
    6167 => Some("Cellco Partnership (Verizon Wireless)"),
    46606 => Some("Unified Layer"),
    16509 => Some("Amazon.com, Inc. (AWS)"),
    14618 => Some("Amazon.com, Inc."),
    15169 => Some("Google LLC"),
    8075 => Some("Microsoft Corporation"),

    // United Kingdom
    5089 => Some("Virgin Media Limited"),
    2856 => Some("British Telecommunications PLC"),
    13285 => Some("TalkTalk Communications Limited"),
    5413 => Some("Sky UK Limited"),
    5607 => Some("Sky UK Limited"),
    1273 => Some("Vodafone Limited"),
    786 => Some("Jisc Services Limited"),

    // Japan
    2516 => Some("KDDI CORPORATION"),
    2497 => Some("Internet Initiative Japan Inc."),
    4713 => Some("NTT Communications Corporation"),
    17676 => Some("SOFTBANK Corp."),
    9605 => Some("NTT DOCOMO, INC."),
    4685 => Some("JCOM Co., Ltd."),
    4725 => Some("ZTV Corporation"),

    // Korea
    4766 => Some("Korea Telecom"),
    9318 => Some("SK Broadband Co Ltd"),
    3786 => Some("LG Uplus Corp."),

    // Europe (major)
    3320 => Some("Deutsche Telekom AG"),
    6805 => Some("Telefonica Germany GmbH & Co. OHG"),
    3209 => Some("Vodafone GmbH"),
    12322 => Some("Free SAS"),
    3215 => Some("Orange S.A."),
    5410 => Some("Bouygues Telecom S.A."),
    3352 => Some("Telefonica de Espana, S.A.U."),
    12479 => Some("Orange Espagne, S.A.U."),
    3356 => Some("Lumen Technologies (Level 3)"),
    6830 => Some("Liberty Global B.V."),
    1200 => Some("Amsterdam Internet Exchange B.V."),
    8455 => Some("A1 Telekom Austria AG"),
    5617 => Some("Orange Polska S.A."),
    1299 => Some("Arelion Sweden AB"),
    1257 => Some("Tele2 Sverige AB"),
    12779 => Some("IT.GATE S.p.A."),
    3269 => Some("TIM S.p.A."),
    16276 => Some("OVH SAS"),
    9009 => Some("M247 Europe SRL"),
    12741 => Some("Netia SA"),
    31424 => Some("NETHINKS GmbH"),
    6871 => Some("Plusnet GmbH"),
    8220 => Some("Colt Technology Services Group Limited"),
    24940 => Some("Hetzner Online GmbH"),

    _ => None,
  }
}

fn lookup_org_keyword(organization: &str) -> Option<&'static str> {
  let normalized = organization.to_ascii_lowercase();
  if normalized.contains("chinanet") {
    return Some("China Telecom Corporation Limited");
  }
  if normalized.contains("china mobile") || normalized.contains("cmnet") {
    return Some("China Mobile Communications Group Co., Ltd.");
  }
  if normalized.contains("china broadnet") || normalized.contains("china broadcasting network") || normalized.contains("chinabtn") {
    return Some("China Broadcasting Network Co., Ltd.");
  }
  if normalized.contains("china unicom") || normalized.contains("cuii") {
    return Some("China Unicom Corporation");
  }
  if normalized.contains("chunghwa") || normalized.contains("hinet") {
    return Some("Chunghwa Telecom Co., Ltd.");
  }
  if normalized.contains("korea telecom") || normalized == "kt" {
    return Some("Korea Telecom");
  }
  None
}
