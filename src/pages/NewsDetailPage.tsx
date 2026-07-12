import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { news } from "../lib/api";
import { useSeo } from "../hooks/useSeo";

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["news", slug],
    queryFn: () => news.get(slug!),
    enabled: !!slug,
  });

  useSeo({ title: post?.title, description: post?.body });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-6 bg-gray-100 rounded w-1/4 mb-4" />
        <div className="h-8 bg-gray-100 rounded w-3/4 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        <p>News post not found.</p>
        <Link to="/" className="text-violet-700 hover:underline text-sm mt-4 inline-block">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/news" className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block">
        ← All news
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>

      <p className="text-sm text-gray-400 mb-8">
        {post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN", {
          year: "numeric", month: "long", day: "numeric"
        }) : ""}
        {post.author?.username && ` · ${post.author.username}`}
      </p>

      {post.summary && (
        <p className="text-lg text-gray-600 mb-6 leading-relaxed border-l-4 border-violet-200 pl-4">
          {post.summary}
        </p>
      )}

      <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
        {post.body}
      </div>
    </div>
  );
}
