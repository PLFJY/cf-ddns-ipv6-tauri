use anyhow::{Context, Result};
use keyring::Entry;

pub struct SecureTokenStore {
  service: String,
  account: String,
}

impl SecureTokenStore {
  pub fn new(app_identifier: &str) -> Self {
    Self {
      service: app_identifier.to_string(),
      account: "cloudflare_api_token".to_string(),
    }
  }

  fn entry(&self) -> Result<Entry> {
    // keyring crate docs: platform-native backends use Windows Credential Manager, macOS Keychain,
    // and Linux Secret Service when the related cargo features are enabled.
    Entry::new(&self.service, &self.account).context("failed to create keyring entry")
  }

  pub fn set_token(&self, token: &str) -> Result<()> {
    self
      .entry()?
      .set_password(token)
      .context("failed to store API token in secure keyring")?;
    Ok(())
  }

  pub fn get_token(&self) -> Result<Option<String>> {
    let entry = self.entry()?;
    match entry.get_password() {
      Ok(token) if token.trim().is_empty() => Ok(None),
      Ok(token) => Ok(Some(token)),
      Err(error) => {
        let text = error.to_string();
        if text.contains("NoEntry") || text.contains("not found") {
          Ok(None)
        } else {
          Err(anyhow::anyhow!("failed to read API token from secure keyring: {text}"))
        }
      }
    }
  }

  pub fn clear_token(&self) -> Result<()> {
    let entry = self.entry()?;
    let _ = entry.delete_credential();
    Ok(())
  }
}
