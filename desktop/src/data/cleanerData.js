// Sizes in bytes
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export const categories = [
  {
    id: 'node',
    name: 'Node.js',
    icon: 'Package',
    color: '#339933',
    description: 'node_modules and package caches',
  },
  {
    id: 'xcode',
    name: 'Xcode',
    icon: 'Hammer',
    color: '#147efb',
    description: 'Derived data and simulators',
  },
  {
    id: 'docker',
    name: 'Docker',
    icon: 'Container',
    color: '#2496ed',
    description: 'Images, containers, and volumes',
  },
  {
    id: 'homebrew',
    name: 'Homebrew',
    icon: 'Beer',
    color: '#fbb040',
    description: 'Old versions and caches',
  },
  {
    id: 'python',
    name: 'Python',
    icon: 'Code',
    color: '#3776ab',
    description: 'pip cache and virtual environments',
  },
  {
    id: 'system',
    name: 'System Caches',
    icon: 'HardDrive',
    color: '#8e8e93',
    description: 'Application and browser caches',
  },
  {
    id: 'logs',
    name: 'Logs',
    icon: 'FileText',
    color: '#ff9500',
    description: 'System and application logs',
  },
  {
    id: 'misc',
    name: 'Misc Dev',
    icon: 'Layers',
    color: '#af52de',
    description: 'Gradle, Maven, Rust, Go caches',
  },
];

export const mockItems = {
  node: {
    totalSize: 12.4 * GB,
    items: [
      { id: 'n1', name: 'project-frontend', type: 'node_modules', path: '~/Developer/projects/project-frontend/node_modules', size: 1.8 * GB, lastUsed: '2025-01-28' },
      { id: 'n2', name: 'api-server', type: 'node_modules', path: '~/Developer/projects/api-server/node_modules', size: 890 * MB, lastUsed: '2025-01-20' },
      { id: 'n3', name: 'old-website', type: 'node_modules', path: '~/Developer/archive/old-website/node_modules', size: 1.2 * GB, lastUsed: '2024-06-15' },
      { id: 'n4', name: 'legacy-app', type: 'node_modules', path: '~/Developer/archive/legacy-app/node_modules', size: 2.1 * GB, lastUsed: '2024-03-10' },
      { id: 'n5', name: 'npm cache', type: 'Cache', path: '~/.npm', size: 3.2 * GB, lastUsed: '2025-01-28' },
      { id: 'n6', name: 'Yarn cache', type: 'Cache', path: '~/.yarn/cache', size: 1.8 * GB, lastUsed: '2025-01-25' },
      { id: 'n7', name: 'pnpm store', type: 'Cache', path: '~/.pnpm-store', size: 980 * MB, lastUsed: '2025-01-15' },
    ],
  },
  xcode: {
    totalSize: 45.8 * GB,
    items: [
      { id: 'x1', name: 'DerivedData', type: 'Build Data', path: '~/Library/Developer/Xcode/DerivedData', size: 28.5 * GB, lastUsed: '2025-01-28' },
      { id: 'x2', name: 'iOS DeviceSupport', type: 'Device Support', path: '~/Library/Developer/Xcode/iOS DeviceSupport', size: 8.2 * GB, lastUsed: '2025-01-15' },
      { id: 'x3', name: 'Archives', type: 'Archives', path: '~/Library/Developer/Xcode/Archives', size: 5.4 * GB, lastUsed: '2024-12-01' },
      { id: 'x4', name: 'iOS 16.0 Simulator', type: 'Simulator', path: '~/Library/Developer/CoreSimulator/Devices', size: 2.1 * GB, lastUsed: '2024-06-01' },
      { id: 'x5', name: 'iOS 15.5 Simulator', type: 'Simulator', path: '~/Library/Developer/CoreSimulator/Devices', size: 1.6 * GB, lastUsed: '2024-03-15' },
    ],
  },
  docker: {
    totalSize: 18.7 * GB,
    items: [
      { id: 'd1', name: 'Build Cache', type: 'Build Cache', path: '/var/lib/docker/buildkit', size: 8.4 * GB, lastUsed: '2025-01-25' },
      { id: 'd2', name: 'postgres_data', type: 'Volume', path: '/var/lib/docker/volumes/postgres_data', size: 4.5 * GB, lastUsed: '2024-12-20' },
      { id: 'd3', name: 'my_app_data', type: 'Volume', path: '/var/lib/docker/volumes/my_app_data', size: 2.3 * GB, lastUsed: '2024-06-15' },
      { id: 'd4', name: '<none>:<none>', type: 'Dangling Image', path: 'sha256:c9d0e1f2...', size: 1.2 * GB, lastUsed: '2024-08-10' },
      { id: 'd5', name: 'mongo:6', type: 'Image', path: 'sha256:u1v2w3x4...', size: 697 * MB, lastUsed: '2024-10-15' },
      { id: 'd6', name: 'mysql:8', type: 'Image', path: 'sha256:y5z6a7b8...', size: 544 * MB, lastUsed: '2024-09-01' },
    ],
  },
  homebrew: {
    totalSize: 4.2 * GB,
    items: [
      { id: 'h1', name: 'Homebrew Cache', type: 'Cache', path: '~/Library/Caches/Homebrew', size: 3.1 * GB, lastUsed: '2025-01-28' },
      { id: 'h2', name: 'go@1.20', type: 'Old Version', path: '/usr/local/Cellar/go@1.20', size: 478 * MB, lastUsed: '2024-07-01' },
      { id: 'h3', name: 'ruby@3.1', type: 'Old Version', path: '/usr/local/Cellar/ruby@3.1', size: 267 * MB, lastUsed: '2024-05-20' },
      { id: 'h4', name: 'Homebrew Logs', type: 'Logs', path: '~/Library/Logs/Homebrew', size: 156 * MB, lastUsed: '2025-01-28' },
      { id: 'h5', name: 'python@3.10', type: 'Old Version', path: '/usr/local/Cellar/python@3.10', size: 112 * MB, lastUsed: '2024-08-15' },
    ],
  },
  python: {
    totalSize: 6.7 * GB,
    items: [
      { id: 'p1', name: 'pip cache', type: 'Cache', path: '~/Library/Caches/pip', size: 2.4 * GB, lastUsed: '2025-01-25' },
      { id: 'p2', name: 'ml-project venv', type: 'Virtual Environment', path: '~/Developer/ml-project/.venv', size: 1.8 * GB, lastUsed: '2025-01-20' },
      { id: 'p3', name: 'conda pkgs', type: 'Cache', path: '~/anaconda3/pkgs', size: 1.2 * GB, lastUsed: '2024-11-15' },
      { id: 'p4', name: 'old-django-app venv', type: 'Virtual Environment', path: '~/Developer/archive/old-django-app/venv', size: 890 * MB, lastUsed: '2024-04-10' },
      { id: 'p5', name: '__pycache__ (various)', type: 'Cache', path: '~/Developer/**/__pycache__', size: 420 * MB, lastUsed: '2025-01-28' },
    ],
  },
  system: {
    totalSize: 15.3 * GB,
    items: [
      { id: 's1', name: 'Spotify Cache', type: 'App Cache', path: '~/Library/Caches/com.spotify.client', size: 3.2 * GB, lastUsed: '2025-01-28' },
      { id: 's2', name: 'VS Code Cache', type: 'App Cache', path: '~/Library/Caches/com.microsoft.VSCode', size: 2.3 * GB, lastUsed: '2025-01-28' },
      { id: 's3', name: 'Chrome Cache', type: 'Browser Cache', path: '~/Library/Caches/Google/Chrome', size: 2.1 * GB, lastUsed: '2025-01-28' },
      { id: 's4', name: 'Slack Cache', type: 'App Cache', path: '~/Library/Caches/com.tinyspeck.slackmacgap', size: 1.8 * GB, lastUsed: '2025-01-28' },
      { id: 's5', name: 'Apple Mail Cache', type: 'App Cache', path: '~/Library/Caches/com.apple.mail', size: 1.7 * GB, lastUsed: '2025-01-28' },
      { id: 's6', name: 'Firefox Cache', type: 'Browser Cache', path: '~/Library/Caches/Firefox', size: 1.4 * GB, lastUsed: '2025-01-27' },
      { id: 's7', name: 'Discord Cache', type: 'App Cache', path: '~/Library/Caches/com.hnc.Discord', size: 1.1 * GB, lastUsed: '2025-01-26' },
      { id: 's8', name: 'Safari Cache', type: 'Browser Cache', path: '~/Library/Caches/com.apple.Safari', size: 890 * MB, lastUsed: '2025-01-28' },
    ],
  },
  logs: {
    totalSize: 3.8 * GB,
    items: [
      { id: 'l1', name: 'System Logs', type: 'System', path: '/var/log', size: 1.2 * GB, lastUsed: '2025-01-28' },
      { id: 'l2', name: 'Unified Logs Archive', type: 'System', path: '/var/db/diagnostics', size: 920 * MB, lastUsed: '2025-01-28' },
      { id: 'l3', name: 'User Logs', type: 'User', path: '~/Library/Logs', size: 890 * MB, lastUsed: '2025-01-28' },
      { id: 'l4', name: 'Crash Reports', type: 'Crash', path: '~/Library/Logs/DiagnosticReports', size: 456 * MB, lastUsed: '2025-01-20' },
      { id: 'l5', name: 'Console Logs', type: 'System', path: '~/Library/Logs/Console', size: 234 * MB, lastUsed: '2025-01-28' },
    ],
  },
  misc: {
    totalSize: 9.2 * GB,
    items: [
      { id: 'm1', name: '.gradle cache', type: 'Build Cache', path: '~/.gradle/caches', size: 3.4 * GB, lastUsed: '2024-12-10' },
      { id: 'm2', name: 'Maven .m2/repository', type: 'Build Cache', path: '~/.m2/repository', size: 2.8 * GB, lastUsed: '2024-11-20' },
      { id: 'm3', name: 'Rust target directories', type: 'Build Output', path: '~/Developer/**/target', size: 1.9 * GB, lastUsed: '2025-01-15' },
      { id: 'm4', name: 'Go module cache', type: 'Module Cache', path: '~/go/pkg/mod', size: 890 * MB, lastUsed: '2025-01-10' },
      { id: 'm5', name: 'CocoaPods cache', type: 'Build Cache', path: '~/Library/Caches/CocoaPods', size: 234 * MB, lastUsed: '2024-10-05' },
    ],
  },
};

export function getTotalSize() {
  return Object.values(mockItems).reduce((acc, cat) => acc + cat.totalSize, 0);
}

export function getCategorySizes() {
  return categories.map((cat) => ({
    ...cat,
    size: mockItems[cat.id]?.totalSize || 0,
  }));
}
