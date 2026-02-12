export interface PresetModel {
  name: string;
  defaultPort: number;
  icon: string;
  defaultDescription: string;
}

export const SERVICE_PRESETS: PresetModel[] = [
  { name: "Custom", defaultPort: 8080, icon: "fluent:apps-list-detail-24-regular", defaultDescription: "Custom local service" },
  { name: "SMB", defaultPort: 445, icon: "fluent:folder-24-regular", defaultDescription: "Windows file sharing" },
  { name: "Minecraft Server", defaultPort: 25565, icon: "fluent:games-24-regular", defaultDescription: "Minecraft dedicated server" },
  { name: "RDP", defaultPort: 3389, icon: "fluent:desktop-24-regular", defaultDescription: "Remote desktop endpoint" },
  { name: "HTTP", defaultPort: 80, icon: "fluent:globe-24-regular", defaultDescription: "HTTP web service" },
  { name: "HTTPS", defaultPort: 443, icon: "fluent:shield-lock-24-regular", defaultDescription: "HTTPS web service" },
  { name: "FTP", defaultPort: 21, icon: "fluent:arrow-upload-24-regular", defaultDescription: "FTP file transfer" },
  { name: "SSH", defaultPort: 22, icon: "fluent:terminal-24-regular", defaultDescription: "Secure shell access" },
  { name: "MySQL", defaultPort: 3306, icon: "fluent:database-24-regular", defaultDescription: "MySQL database service" },
  { name: "PostgreSQL", defaultPort: 5432, icon: "fluent:database-search-24-regular", defaultDescription: "PostgreSQL database service" },
  { name: "Redis", defaultPort: 6379, icon: "fluent:flash-24-regular", defaultDescription: "Redis cache service" },
  { name: "MongoDB", defaultPort: 27017, icon: "fluent:data-pie-24-regular", defaultDescription: "MongoDB database service" },
  { name: "Jellyfin", defaultPort: 8096, icon: "fluent:video-24-regular", defaultDescription: "Jellyfin media server" },
  { name: "Docker Registry", defaultPort: 5000, icon: "fluent:box-24-regular", defaultDescription: "Docker image registry" },
  { name: "Kibana", defaultPort: 5601, icon: "fluent:chart-multiple-24-regular", defaultDescription: "Kibana dashboard service" },
  { name: "Grafana", defaultPort: 3000, icon: "fluent:gauge-24-regular", defaultDescription: "Grafana monitoring dashboard" },
  { name: "Prometheus", defaultPort: 9090, icon: "fluent:poll-24-regular", defaultDescription: "Prometheus metrics endpoint" }
];

export function findPreset(name: string): PresetModel | undefined {
  return SERVICE_PRESETS.find((preset) => preset.name === name);
}
