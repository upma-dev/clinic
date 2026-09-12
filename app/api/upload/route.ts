import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Support both single file ("file") and multiple files ("files")
    const rawFiles = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
      ...formData.getAll('files[]'),
      ...formData.getAll('file[]'),
    ];

    const files: File[] = [];
    for (const entry of rawFiles) {
      if (entry && typeof entry === 'object' && 'arrayBuffer' in entry && (entry as File).size > 0) {
        files.push(entry as File);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // 1. Try Cloudinary if credentials exist
      const cloudinaryUrl = await uploadToCloudinary(buffer, file.type || 'image/jpeg', 'skin-hub/uploads');
      if (cloudinaryUrl) {
        uploadedUrls.push(cloudinaryUrl);
        continue;
      }

      // 2. Try Local Filesystem
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'image.jpg';
        const filename = `${Date.now()}-${safeName}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        uploadedUrls.push(`/uploads/${filename}`);
      } catch (fsErr) {
        // 3. Fallback to Base64 Data URL (for Vercel serverless / read-only filesystem)
        console.warn('Local filesystem write failed (Vercel serverless environment), converting to Data URL:', fsErr);
        const mimeType = file.type || 'image/jpeg';
        const base64Url = `data:${mimeType};base64,${buffer.toString('base64')}`;
        uploadedUrls.push(base64Url);
      }
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      imageUrl: uploadedUrls[0] || '',
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 });
  }
}

