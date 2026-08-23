import { execSync } from 'child_process';
const run = (cmd: string) => {
  try {
    console.log(`=== RUNNING: ${cmd} ===`);
    console.log(execSync(cmd, { encoding: 'utf8' }));
  } catch (e: any) {
    console.log(`Error running '${cmd}':`, e.message);
  }
};

run('ls -la /root');
run('ls -la /workspace');
run('ls -la /var');
run('find / -maxdepth 2 2>/dev/null');
