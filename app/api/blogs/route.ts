import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getBlogPosts,
  getBlogPostById,
  addBlogPost,
  updateBlogPost,
  deleteBlogPost,
  incrementBlogViews,
} from '@/lib/db/blogs';
import type { BlogPost } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (id) {
      const post = await getBlogPostById(id);
      if (!post) {
        return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
      }
      // Increment views on detail fetch
      await incrementBlogViews(id);
      return NextResponse.json(post);
    }

    const admin = searchParams.get('admin') === 'true';
    const category = searchParams.get('category') || 'All';
    const search = searchParams.get('search') || '';
    const featured = searchParams.get('featured') === 'true' ? true : undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '100');

    // If requesting admin view, verify doctor session
    if (admin) {
      const session = await getSession();
      if (!session || session.role !== 'doctor') {
        return NextResponse.json({ error: 'Unauthorized admin request' }, { status: 401 });
      }
    }

    const result = await getBlogPosts({
      admin,
      category,
      search,
      featured,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load blogs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor login required' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const blogData = body.blog || body;
      const { title, summary, content, category, author, imageUrl, tags, status, featured, seoTitle, seoDescription, readTime } = blogData;
      if (!title || !content || !summary) {
        return NextResponse.json(
          { error: 'Title, summary and content are required' },
          { status: 400 }
        );
      }

      const randomId = `blog-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPost: BlogPost = {
        id: randomId,
        title,
        summary,
        content,
        category: category || 'Aesthetic Care',
        author: author || 'Dr. Prateek Tiwari',
        readTime: readTime || '3 min read',
        imageUrl: imageUrl || `https://picsum.photos/seed/${randomId}/800/500`,
        tags: tags || [],
        status: status || 'published',
        featured: !!featured,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || summary,
        views: 0,
        createdAt: new Date().toISOString(),
      };

      await addBlogPost(newPost);
      return NextResponse.json({ success: true, blog: newPost });
    }

    if (action === 'update') {
      const { id, blog } = body;
      if (!id || !blog) {
        return NextResponse.json({ error: 'Blog ID and update fields required' }, { status: 400 });
      }
      
      const success = await updateBlogPost(id, blog);
      if (!success) {
        return NextResponse.json({ error: 'Blog not found or update failed' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Blog ID required' }, { status: 400 });
      }
      const deleted = await deleteBlogPost(id);
      if (!deleted) {
        return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Blog operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
