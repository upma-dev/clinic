import { getDb, COLLECTIONS } from '../mongodb';
import type { BlogPost } from '../types';

const SEED_BLOGS: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'Understanding Yellow Peels for Pigmentation & Active Acne',
    summary: 'Yellow peels are popular among patients with melasma and post-acne blemishes.',
    content: 'Yellow chemical peeling uses Retinol, Salicylic acid, Phytic acid, and Kojic acid to trigger skin regeneration.\n\nConsult us at Skin Hub Clinic to determine if a Yellow Peel fits your skin analysis.',
    category: 'Aesthetic Care',
    author: 'Dr. Prateek Tiwari',
    readTime: '4 min read',
    imageUrl: 'https://picsum.photos/seed/yellowpeel/800/500',
    tags: ['Peels', 'Acne', 'Pigmentation'],
    status: 'published',
    featured: true,
    seoTitle: 'Yellow Peels for Pigmentation & Acne | Skin Hub Clinic',
    seoDescription: 'Learn how Yellow Chemical Peels help treat melasma, pigmentation, and active acne blemishes at Skin Hub Clinic Ujjain.',
    views: 120,
    createdAt: new Date().toISOString(),
  },
];

export async function getBlogPosts(options?: {
  admin?: boolean;
  category?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ posts: BlogPost[]; total: number }> {
  try {
    const db = await getDb();
    
    // Seed if empty
    const count = await db.collection(COLLECTIONS.blogs).countDocuments();
    if (count === 0) {
      await db.collection(COLLECTIONS.blogs).insertMany(
        SEED_BLOGS.map(({ _id, ...b }) => {
          const { _id: _, ...rest } = b as any;
          return rest;
        })
      );
    }

    const query: any = {};
    
    // Non-admin can only see published posts
    if (!options?.admin) {
      query.status = 'published';
    }

    if (options?.category && options.category !== 'All') {
      query.category = options.category;
    }

    if (options?.featured !== undefined) {
      query.featured = options.featured;
    }

    if (options?.search) {
      query.$or = [
        { title: { $regex: options.search, $options: 'i' } },
        { summary: { $regex: options.search, $options: 'i' } },
        { content: { $regex: options.search, $options: 'i' } },
      ];
    }

    const total = await db.collection<BlogPost>(COLLECTIONS.blogs).countDocuments(query);
    
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const skip = (page - 1) * limit;

    const docs = await db
      .collection<BlogPost>(COLLECTIONS.blogs)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const posts = docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
    return { posts, total };
  } catch (e) {
    console.error(e);
    return { posts: SEED_BLOGS, total: SEED_BLOGS.length };
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const db = await getDb();
  const doc = await db.collection<BlogPost>(COLLECTIONS.blogs).findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: _id?.toString() };
}

export async function addBlogPost(post: BlogPost): Promise<BlogPost> {
  const db = await getDb();
  const { _id, ...doc } = post;
  doc.views = doc.views || 0;
  doc.status = doc.status || 'published';
  doc.featured = !!doc.featured;
  await db.collection(COLLECTIONS.blogs).insertOne(doc);
  return post;
}

export async function updateBlogPost(id: string, patch: Partial<BlogPost>): Promise<boolean> {
  const db = await getDb();
  const { _id, ...doc } = patch as any;
  const result = await db
    .collection(COLLECTIONS.blogs)
    .updateOne({ id }, { $set: doc });
  return result.modifiedCount > 0;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.blogs).deleteOne({ id });
  return result.deletedCount > 0;
}

export async function incrementBlogViews(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection(COLLECTIONS.blogs).updateOne({ id }, { $inc: { views: 1 } });
  } catch (e) {
    console.error('Error incrementing views:', e);
  }
}

export async function getRelatedBlogs(id: string, category: string, limit = 3): Promise<BlogPost[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<BlogPost>(COLLECTIONS.blogs)
      .find({ id: { $ne: id }, category, status: 'published' })
      .limit(limit)
      .toArray();
    return docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
  } catch {
    return [];
  }
}
