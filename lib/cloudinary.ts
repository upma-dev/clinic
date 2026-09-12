/**
 * Cloudinary Helper Utility for SkinHub Clinic
 * 
 * Automatically handles Cloudinary image uploads using direct REST API.
 * Requires environment variables:
 *  - CLOUDINARY_CLOUD_NAME
 *  - CLOUDINARY_UPLOAD_PRESET
 */

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  fileBuffer: Buffer | ArrayBuffer,
  mimeType: string = 'image/jpeg',
  folder: string = 'skin-hub/uploads'
): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset || cloudName === 'your_cloud_name_here') {
    return null;
  }

  try {
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;

    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Cloudinary Upload API Error:', errorText);
      return null;
    }

    const data = await res.json();
    return data.secure_url || null;
  } catch (error) {
    console.error('Cloudinary upload exception:', error);
    return null;
  }
}
