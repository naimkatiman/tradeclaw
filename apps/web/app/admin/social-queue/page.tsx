'use client';

import { useCallback, useEffect, useState } from 'react';

interface Post {
  id: string;
  kind: string;
  signalId: string | null;
  imageUrl: string | null;
  copy: string;
  status: string;
  postUrl: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-zinc-900/40 text-zinc-400',
  approved: 'bg-emerald-900/40 text-emerald-400',
  posted: 'bg-blue-900/40 text-blue-400',
  rejected: 'bg-red-900/40 text-red-400',
};

export default function SocialQueuePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    const secret = localStorage.getItem('admin_secret') ?? '';
    const url = filter
      ? `/api/admin/social-queue?status=${filter}`
      : '/api/admin/social-queue';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const doAction = async (action: string, id: string) => {
    const secret = localStorage.getItem('admin_secret') ?? '';
    await fetch('/api/admin/social-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ action, id }),
    });
    fetchPosts();
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Social Post Queue</h1>

      {/* Auth prompt */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-zinc-400">Admin secret:</label>
        <input
          type="password"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm"
          placeholder="Enter admin secret"
          defaultValue={typeof window !== 'undefined' ? localStorage.getItem('admin_secret') ?? '' : ''}
          onChange={(e) => {
            localStorage.setItem('admin_secret', e.target.value);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchPosts(); }}
        />
        <button onClick={fetchPosts} className="rounded bg-zinc-700 px-3 py-1 text-sm hover:bg-zinc-600">Load</button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        {['', 'pending', 'approved', 'posted', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1 text-sm ${filter === s ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            {s || 'All Actionable'}
          </button>
        ))}
      </div>

      {loading && <p className="text-zinc-500">Loading...</p>}

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status] ?? ''}`}>
                  {post.status}
                </span>
                <span className="text-xs text-zinc-500">{post.kind}</span>
                <span className="text-xs text-zinc-600">{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                {post.status === 'pending' && (
                  <>
                    <button
                      onClick={() => doAction('approve', post.id)}
                      className="rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => doAction('reject', post.id)}
                      className="rounded bg-red-800 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
                {post.postUrl && (
                  <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">
                    View Post
                  </a>
                )}
              </div>
            </div>
            <pre className="whitespace-pre-wrap rounded bg-black/40 p-3 text-sm text-zinc-300">{post.copy}</pre>
            {post.imageUrl && (
              <div className="mt-2">
                <a href={post.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 underline">
                  Preview OG Image
                </a>
              </div>
            )}
          </div>
        ))}
        {!loading && posts.length === 0 && (
          <p className="text-center text-zinc-600">No posts in queue</p>
        )}
      </div>
    </main>
  );
}
