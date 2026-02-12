export const categories = [
  {
    id: 'docker',
    name: 'Docker',
    icon: 'Container',
    color: '#2496ed',
    description: 'Docker images, containers, volumes, and build cache',
  },
  {
    id: 'node',
    name: 'Node.js / npm',
    icon: 'Package',
    color: '#339933',
    description: 'node_modules folders and package manager caches',
  },
  {
    id: 'homebrew',
    name: 'Homebrew',
    icon: 'Beer',
    color: '#fbb040',
    description: 'Old formula versions and caches',
  },
  {
    id: 'xcode',
    name: 'Xcode',
    icon: 'Hammer',
    color: '#147efb',
    description: 'Derived data, archives, and simulators',
  },
  {
    id: 'python',
    name: 'Python',
    icon: 'Code',
    color: '#3776ab',
    description: 'pip cache, __pycache__, and virtual environments',
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
    description: 'System, user, and application logs',
  },
  {
    id: 'misc',
    name: 'Misc Dev',
    icon: 'Layers',
    color: '#af52de',
    description: 'Gradle, Maven, Rust, Go caches',
  },
];

export const getCategoryById = (id) => categories.find((c) => c.id === id);
