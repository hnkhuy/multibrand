import { execSync } from 'child_process';

export default async function globalTeardown() {
  const cmds = [
    "pkill -f 'playwright/lib/common/process'",
    "pkill -f 'chrome-headless-shell'",
    "pkill -f 'ffmpeg.*playwright'",
  ];
  for (const cmd of cmds) {
    try { execSync(`${cmd} 2>/dev/null`, { shell: '/bin/zsh' }); } catch { /* no matching process */ }
  }
}
