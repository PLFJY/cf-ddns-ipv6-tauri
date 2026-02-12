use anyhow::{Context, Result};
use reqwest::StatusCode;
use serde::{de::DeserializeOwned, Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct UpdateDnsRecordRequest {
  content: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  ttl: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct CloudflareEnvelope {
  success: bool,
  #[serde(default)]
  result: Option<serde_json::Value>,
  #[serde(default)]
  errors: Vec<CloudflareErrorMessage>,
}

#[derive(Debug, Deserialize)]
struct CloudflareErrorMessage {
  code: u64,
  message: String,
}

#[derive(Debug, Deserialize)]
pub struct DnsRecordSummary {
  pub id: String,
}

fn cloudflare_client() -> Result<reqwest::Client> {
  reqwest::Client::builder()
    .user_agent("cf-ddns-ipv6-tauri/0.1.1")
    .build()
    .context("failed to create Cloudflare HTTP client")
}

async fn parse_envelope<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
  let status = response.status();
  let text = response
    .text()
    .await
    .context("failed to read Cloudflare response body")?;
  let envelope = serde_json::from_str::<CloudflareEnvelope>(&text)
    .with_context(|| format!("failed to parse Cloudflare response json: {text}"))?;

  if status == StatusCode::OK && envelope.success {
    let result_value = envelope
      .result
      .ok_or_else(|| anyhow::anyhow!("Cloudflare response missing result payload"))?;
    return serde_json::from_value::<T>(result_value)
      .context("failed to parse Cloudflare result payload");
  }

  let message = envelope
    .errors
    .iter()
    .map(|item| format!("{}: {}", item.code, item.message))
    .collect::<Vec<_>>()
    .join(", ");
  Err(anyhow::anyhow!(
    "Cloudflare API request failed with HTTP {}: {}",
    status.as_u16(),
    if message.is_empty() { text } else { message }
  ))
}

pub async fn find_aaaa_record_id(zone_id: &str, domain: &str, token: &str) -> Result<String> {
  // Cloudflare API docs: "DNS Records for a Zone" -> "List DNS Records"
  // (`GET /zones/{zone_id}/dns_records`) supports `type` and `name` query filtering.
  let url = format!("https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records");
  let client = cloudflare_client()?;
  let response = client
    .get(url)
    .bearer_auth(token)
    .query(&[("type", "AAAA"), ("name", domain), ("per_page", "100")])
    .send()
    .await
    .context("failed to send Cloudflare record lookup request")?;

  let records = parse_envelope::<Vec<DnsRecordSummary>>(response).await?;
  records
    .into_iter()
    .next()
    .map(|record| record.id)
    .ok_or_else(|| anyhow::anyhow!("no AAAA record found for domain {}", domain))
}

pub async fn update_aaaa_record(
  zone_id: &str,
  record_id: &str,
  token: &str,
  ipv6: &str,
  ttl: Option<u32>,
) -> Result<()> {
  // Cloudflare API docs: "DNS Records for a Zone" -> "Update DNS Record"
  // (`PATCH /zones/{zone_id}/dns_records/{dns_record_id}`) with bearer token auth.
  let url = format!(
    "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}"
  );
  let body = UpdateDnsRecordRequest {
    // Cloudflare "Update DNS Record" accepts partial PATCH payloads.
    // We send only mutable AAAA data (`content` + optional `ttl`) to avoid unnecessary field churn.
    content: ipv6.to_string(),
    ttl,
  };

  let client = cloudflare_client()?;

  let response = client
    .patch(url)
    .bearer_auth(token)
    .json(&body)
    .send()
    .await
    .context("failed to send Cloudflare update request")?;

  let _ = parse_envelope::<serde_json::Value>(response).await?;
  Ok(())
}
