import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserEntry {
  id: string;
  name: string;
  useCase: string;
  country: string;
  createdAt: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

function readUsers(): UserEntry[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as UserEntry[];
  } catch {
    return [];
  }
}

function writeUsers(users: UserEntry[]): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

export function getUsers(): UserEntry[] {
  const users = readUsers();
  return [...users].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface AddUserInput {
  name: string;
  useCase: string;
  country?: string;
}

export function addUser(input: AddUserInput): UserEntry {
  const users = readUsers();
  const entry: UserEntry = {
    id: `u_${crypto.randomBytes(4).toString('hex')}`,
    name: input.name.trim().slice(0, 60),
    useCase: input.useCase.trim().slice(0, 120),
    country: (input.country ?? '').trim().slice(0, 8),
    createdAt: new Date().toISOString(),
  };
  users.push(entry);
  writeUsers(users);
  return entry;
}
