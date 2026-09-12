import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // 1. Try Cloudinary if credentials exist
      if (cloudName && uploadPreset) {
        try {
          const base64Data = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
          const cFormData = new FormData();
          cFormData.append('file', base64Data);
          cFormData.append('upload_preset', uploadPreset);
          cFormData.append('folder', 'skin-hub/uploads');

          const cRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
            method: 'POST',
            body: cFormData,
          });

          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData.secure_url) {
              uploadedUrls.push(cData.secure_url);
              continue;
            }
          }
        } catch (cErr) {
          console.warn('Cloudinary upload failed, falling back to local/base64 storage:', cErr);
        }
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

