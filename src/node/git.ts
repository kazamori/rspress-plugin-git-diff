import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd,
    maxBuffer: 1024 * 1024 * 1024,
    encoding: 'utf8',
  });
  return stdout;
}

/** Runs git and reports only whether it exited with zero. */
export async function testGit(cwd: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync('git', args, { cwd });
    return true;
  } catch {
    return false;
  }
}

/** Reads blob contents in one `git cat-file --batch` process. */
export function readBlobs(cwd: string, hashes: Iterable<string>): Promise<Map<string, string>> {
  const unique = [...new Set(hashes)];
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['cat-file', '--batch'], { cwd });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`git cat-file exited with ${code}`));
        return;
      }
      try {
        resolve(parseCatFileBatch(Buffer.concat(chunks)));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(unique.map((hash) => `${hash}\n`).join(''));
  });
}

export function parseCatFileBatch(output: Buffer): Map<string, string> {
  const blobs = new Map<string, string>();
  let offset = 0;
  while (offset < output.length) {
    const headerEnd = output.indexOf(0x0a, offset);
    const header = output.subarray(offset, headerEnd).toString('utf8');
    const [hash, type, size] = header.split(' ');
    if (type === 'missing') {
      offset = headerEnd + 1;
      continue;
    }
    const start = headerEnd + 1;
    const end = start + Number(size);
    blobs.set(hash, output.subarray(start, end).toString('utf8'));
    // Each object is followed by a newline.
    offset = end + 1;
  }
  return blobs;
}
