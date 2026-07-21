import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

const cargoHome = process.env.CARGO_HOME ?? join(homedir(), '.cargo');
const cargoBin = join(cargoHome, 'bin');
const cargoPath = process.platform === 'win32' ? join(cargoBin, 'cargo.exe') : join(cargoBin, 'cargo');

if (!existsSync(cargoPath)) {
  console.error(`[tauri-wrapper] Cargo not found at: ${cargoPath}`);
  console.error('[tauri-wrapper] Make sure Rust is installed: https://rustup.rs');
  process.exit(1);
}

process.env.PATH = `${cargoBin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`;

const args = process.argv.slice(2);
const child = spawn('tauri', args, { stdio: 'inherit', shell: true });

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
