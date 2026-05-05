import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  metaDescription?: string;
  keywords?: string[];
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

interface RawFrontmatter {
  title?: string;
  excerpt?: string;
  date?: string | Date;
  readTime?: string;
  tags?: unknown;
  metaDescription?: string;
  keywords?: unknown;
}

function toIsoDate(value: string | Date | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function loadPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));

  const posts = files.map<BlogPost>((file) => {
    const slug = file.replace(/\.mdx$/, '');
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data } = matter(raw);
    const fm = data as RawFrontmatter;

    if (!fm.title || !fm.excerpt || !fm.date || !fm.readTime) {
      throw new Error(
        `Blog post ${file} is missing required frontmatter (title, excerpt, date, readTime)`,
      );
    }

    return {
      slug,
      title: fm.title,
      excerpt: fm.excerpt,
      date: toIsoDate(fm.date),
      readTime: fm.readTime,
      tags: toStringArray(fm.tags),
      metaDescription: fm.metaDescription,
      keywords: toStringArray(fm.keywords),
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const POSTS: BlogPost[] = loadPosts();

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getOtherPosts(slug: string, limit = 2): BlogPost[] {
  return POSTS.filter((p) => p.slug !== slug).slice(0, limit);
}

export function formatPostDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getPostFilePath(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}
