import { Box, Code2, Container, Hammer, Coffee, HardDrive, ScrollText, Layers } from '@lucide/vue'
export const categories = [
  {
    id: 'node',
    name: 'Node.js',
    description: 'Dependencies & package caches',
    icon: Box,
    color: '#33906b',
  },
  {
    id: 'xcode',
    name: 'Xcode',
    description: 'Builds, archives & device support',
    icon: Hammer,
    color: '#387ee8',
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Images, containers & volumes',
    icon: Container,
    color: '#289ac2',
  },
  {
    id: 'homebrew',
    name: 'Homebrew',
    description: 'Downloads & old formula versions',
    icon: Coffee,
    color: '#b18434',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Bytecode, caches & environments',
    icon: Code2,
    color: '#5278ae',
  },
  {
    id: 'system',
    name: 'App caches',
    description: 'Temporary application content',
    icon: HardDrive,
    color: '#7f7bba',
  },
  {
    id: 'logs',
    name: 'Logs',
    description: 'Application logs & crash reports',
    icon: ScrollText,
    color: '#b77e56',
  },
  {
    id: 'misc',
    name: 'Other developer tools',
    description: 'Rust, Go, Gradle & Maven',
    icon: Layers,
    color: '#9070bb',
  },
]
export const riskLabel: Record<string, string> = {
  rebuildable: 'Rebuildable',
  review: 'Review first',
  personal: 'Review contents',
}
