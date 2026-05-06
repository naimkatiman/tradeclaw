import Link from 'next/link';
import { getOtherPosts, formatPostDate } from '../posts';

interface RelatedPostsProps {
  currentSlug: string;
}

export function RelatedPosts({ currentSlug }: RelatedPostsProps) {
  const related = getOtherPosts(currentSlug);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-12 border-t border-zinc-800 pt-8">
      <h2 id="related-heading" className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-semibold">
        Keep reading
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {related.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600"
          >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{post.title}</h3>
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{post.excerpt}</p>
            <p className="mt-2 text-[11px] text-zinc-500">
              {formatPostDate(post.date)} · {post.readTime} read
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
