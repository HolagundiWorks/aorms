import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Blog content — plain markdown files in content/blog/, no CMS, no
 * database table, no admin UI (2026-09-10, explicit direction: "no blog
 * pages infra, just blogs written in md files and displayed as content").
 * This is the one small reading layer that makes them viewable — parses
 * each file's frontmatter and exposes list/get-by-slug, nothing more
 * (no tags, no categories, no pagination, no drafts/scheduling).
 *
 * Frontmatter parsing is hand-rolled (a `---`-delimited `key: value`
 * block — see parseFrontmatter below) rather than a library like
 * gray-matter: the format here is deliberately minimal (three plain
 * string fields, no nested YAML, no arrays) and hand-rolling it avoids a
 * dependency for something this simple. Markdown-to-HTML itself is NOT
 * hand-rolled (`marked`, a real dependency) — converting arbitrary
 * markdown to HTML correctly and safely is a materially different, much
 * riskier undertaking than parsing three flat key: value lines.
 */

const BLOG_DIR = join(process.cwd(), "content", "blog");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string;
};

export type BlogPostMeta = Omit<BlogPost, "content">;

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    meta[key] = value;
  }
  return { meta, content: match[2] };
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

/** Every post, newest first. Reads every file — fine at this content
 * volume (a handful of posts); revisit if this ever needs to scale past
 * "read them all on every request." */
export function listBlogPosts(): BlogPostMeta[] {
  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((filename) => {
    const raw = readFileSync(join(BLOG_DIR, filename), "utf8");
    const { meta } = parseFrontmatter(raw);
    return {
      slug: slugFromFilename(filename),
      title: meta.title ?? slugFromFilename(filename),
      description: meta.description ?? "",
      date: meta.date ?? "",
    };
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPost(slug: string): BlogPost | null {
  // Reject anything that isn't a plain filename component before it ever
  // touches the filesystem — slug comes from a URL param, and without
  // this a request for a slug containing ".." could escape content/blog/
  // entirely (path traversal). listBlogPosts() only ever produces slugs
  // from real filenames, so this also just rejects garbage early either way.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  let raw: string;
  try {
    raw = readFileSync(join(BLOG_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }

  const { meta, content } = parseFrontmatter(raw);
  return {
    slug,
    title: meta.title ?? slug,
    description: meta.description ?? "",
    date: meta.date ?? "",
    content,
  };
}
