import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'node:fs/promises';
import { compileMDX } from 'next-mdx-remote/rsc';

import {
  POSTS,
  getPost,
  getPostFilePath,
  formatPostDate,
  type BlogPost,
} from '../posts';
import { mdxComponents } from '../mdx-components';
import { EmailCapture } from '../components/EmailCapture';
import { RelatedPosts } from '../components/RelatedPosts';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const description = post.metaDescription ?? post.excerpt;

  return {
    title: `${post.title} | TradeClaw Blog`,
    description,
    keywords: post.keywords && post.keywords.length > 0 ? post.keywords : undefined,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: '/api/og', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: ['/api/og'],
    },
  };
}

function articleJsonLd(post: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'TradeClaw' },
    publisher: {
      '@type': 'Organization',
      name: 'TradeClaw',
      url: 'https://tradeclaw.win',
    },
    keywords: [...post.tags, ...(post.keywords ?? [])].join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://tradeclaw.win/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const source = await fs.readFile(getPostFilePath(slug), 'utf8');
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: { parseFrontmatter: true },
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }}
      />

      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/blog"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            ← Blog
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          {post.title}
        </h1>

        <div className="text-sm text-zinc-400 mb-8">
          {formatPostDate(post.date)} · {post.readTime} read
        </div>

        <div className="space-y-6 text-sm leading-7">{content}</div>

        <EmailCapture source={`blog-${post.slug}`} />

        <RelatedPosts currentSlug={post.slug} />
      </article>
    </div>
  );
}
