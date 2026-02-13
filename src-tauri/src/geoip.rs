use std::net::IpAddr;
use std::path::{Path, PathBuf};

use maxminddb::{geoip2, Reader};

use crate::carrier_map;
use crate::models::IpGeoInfo;

const ASN_DB_FILE: &str = "GeoLite2-ASN.mmdb";
const COUNTRY_DB_FILE: &str = "GeoLite2-Country.mmdb";
const ASN_DB_URL_ENV: &str = "CF_DDNS_GEOIP_ASN_URL";
const COUNTRY_DB_URL_ENV: &str = "CF_DDNS_GEOIP_COUNTRY_URL";
const DEFAULT_ASN_DB_URL: &str =
  "https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-ASN.mmdb";
const DEFAULT_COUNTRY_DB_URL: &str =
  "https://raw.githubusercontent.com/P3TERX/GeoLite.mmdb/download/GeoLite2-Country.mmdb";

pub struct GeoIpLookup {
  asn_db: Option<Reader<Vec<u8>>>,
  country_db: Option<Reader<Vec<u8>>>,
}

pub struct GeoIpEnsureResult {
  pub changed: bool,
  pub errors: Vec<String>,
}

impl GeoIpLookup {
  pub fn new(config_path: &Path, resource_dir: Option<PathBuf>) -> Self {
    let config_dir = config_path.parent().map(Path::to_path_buf);
    let asn_path = find_database_path(
      "CF_DDNS_GEOIP_ASN_DB",
      ASN_DB_FILE,
      config_dir.as_deref(),
      resource_dir.as_deref(),
    );
    let country_path = find_database_path(
      "CF_DDNS_GEOIP_COUNTRY_DB",
      COUNTRY_DB_FILE,
      config_dir.as_deref(),
      resource_dir.as_deref(),
    );

    Self {
      asn_db: asn_path.as_deref().and_then(open_reader),
      country_db: country_path.as_deref().and_then(open_reader),
    }
  }

  pub fn lookup_ip(&self, ip: &str) -> Option<IpGeoInfo> {
    let parsed_ip = ip.parse::<IpAddr>().ok()?;
    let mut info = IpGeoInfo {
      asn: None,
      organization: None,
      carrier_name: None,
      country_iso_code: None,
    };

    if let Some(reader) = &self.asn_db {
      if let Ok(Some(record)) = reader.lookup::<geoip2::Asn<'_>>(parsed_ip) {
        info.asn = record.autonomous_system_number;
        info.organization = record.autonomous_system_organization.map(str::to_string);
      }
    }

    if let Some(reader) = &self.country_db {
      if let Ok(Some(record)) = reader.lookup::<geoip2::Country<'_>>(parsed_ip) {
        info.country_iso_code = record
          .country
          .and_then(|country| country.iso_code)
          .or_else(|| record.registered_country.and_then(|country| country.iso_code))
          .map(str::to_uppercase);
      }
    }

    info.carrier_name = carrier_map::resolve_carrier_name(info.asn, info.organization.as_deref()).map(str::to_string);

    if info.asn.is_none() && info.organization.is_none() && info.country_iso_code.is_none() && info.carrier_name.is_none() {
      None
    } else {
      Some(info)
    }
  }

  pub fn missing_any_database(&self) -> bool {
    self.asn_db.is_none() || self.country_db.is_none()
  }
}

fn open_reader(path: &Path) -> Option<Reader<Vec<u8>>> {
  Reader::open_readfile(path).ok()
}

pub async fn ensure_geoip_databases(config_path: &Path) -> GeoIpEnsureResult {
  let geoip_dir = geoip_dir_from_config(config_path);
  let asn_path = geoip_dir.join(ASN_DB_FILE);
  let country_path = geoip_dir.join(COUNTRY_DB_FILE);

  if let Err(error) = tokio::fs::create_dir_all(&geoip_dir).await {
    return GeoIpEnsureResult {
      changed: false,
      errors: vec![format!("failed creating geoip dir {}: {error}", geoip_dir.display())],
    };
  }

  let mut changed = false;
  let mut errors = Vec::new();

  if !asn_path.exists() {
    let url = std::env::var(ASN_DB_URL_ENV).unwrap_or_else(|_| DEFAULT_ASN_DB_URL.to_string());
    match download_db_file(&url, &asn_path).await {
      Ok(downloaded) => {
        changed = changed || downloaded;
      }
      Err(error) => errors.push(format!("ASN db download failed: {error}")),
    }
  }

  if !country_path.exists() {
    let url = std::env::var(COUNTRY_DB_URL_ENV).unwrap_or_else(|_| DEFAULT_COUNTRY_DB_URL.to_string());
    match download_db_file(&url, &country_path).await {
      Ok(downloaded) => {
        changed = changed || downloaded;
      }
      Err(error) => errors.push(format!("Country db download failed: {error}")),
    }
  }

  GeoIpEnsureResult { changed, errors }
}

fn geoip_dir_from_config(config_path: &Path) -> PathBuf {
  let fallback = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("geoip");
  match config_path.parent() {
    Some(parent) => parent.join("geoip"),
    None => fallback,
  }
}

fn find_database_path(
  env_name: &str,
  file_name: &str,
  config_dir: Option<&Path>,
  resource_dir: Option<&Path>,
) -> Option<PathBuf> {
  if let Ok(path) = std::env::var(env_name) {
    let explicit = PathBuf::from(path);
    if explicit.exists() {
      return Some(explicit);
    }
  }

  for candidate in build_candidates(file_name, config_dir, resource_dir) {
    if candidate.exists() {
      return Some(candidate);
    }
  }

  None
}

fn build_candidates(file_name: &str, config_dir: Option<&Path>, resource_dir: Option<&Path>) -> Vec<PathBuf> {
  let mut candidates = Vec::new();

  if let Some(dir) = config_dir {
    candidates.push(dir.join(file_name));
    candidates.push(dir.join("geoip").join(file_name));
  }

  if let Some(dir) = resource_dir {
    candidates.push(dir.join(file_name));
    candidates.push(dir.join("geoip").join(file_name));
  }

  let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  candidates.push(manifest_dir.join(file_name));
  candidates.push(manifest_dir.join("geoip").join(file_name));
  candidates.push(manifest_dir.join("..").join(file_name));
  candidates.push(manifest_dir.join("..").join("geoip").join(file_name));
  candidates
}

async fn download_db_file(url: &str, destination: &Path) -> Result<bool, String> {
  let client = reqwest::Client::builder()
    .user_agent("cf-ddns-ipv6-tauri/0.1.1")
    .build()
    .map_err(|error| format!("failed building request client: {error}"))?;
  let response = client
    .get(url)
    .send()
    .await
    .map_err(|error| format!("request error: {error}"))?;
  if !response.status().is_success() {
    return Err(format!("http {}", response.status()));
  }
  let bytes = response
    .bytes()
    .await
    .map_err(|error| format!("failed reading response body: {error}"))?;

  let temp_path = destination.with_extension("mmdb.tmp");
  tokio::fs::write(&temp_path, &bytes)
    .await
    .map_err(|error| format!("failed writing temporary file {}: {error}", temp_path.display()))?;
  tokio::fs::rename(&temp_path, destination)
    .await
    .map_err(|error| format!("failed moving db file into {}: {error}", destination.display()))?;
  Ok(true)
}
