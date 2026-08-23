/**
 * CloudinaryService.ts
 * 
 * Handles uploading images and PDFs to Cloudinary.
 * Since this is an MVP without active npm install of the cloudinary SDK, 
 * this service uses the REST API if credentials exist, otherwise returns a mock URL.
 */

export class CloudinaryService {
  private static cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  private static uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || ''; // Unsigned preset

  /**
   * Uploads a base64 file to Cloudinary.
   * @param base64Data The base64 string of the file (e.g., data:image/png;base64,...)
   * @param folder The folder to store the file in (e.g., 'telemedicine/reports')
   * @returns The secure URL of the uploaded file.
   */
  static async uploadFile(base64Data: string, folder: string = 'telemedicine'): Promise<string> {
    if (!this.cloudName || !this.uploadPreset) {
      console.warn('Cloudinary credentials missing. Returning mock URL.');
      return `https://res.cloudinary.com/demo/image/upload/sample.jpg?mock=true&folder=${folder}`;
    }

    try {
      const formData = new FormData();
      formData.append('file', base64Data);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message}`);
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error in CloudinaryService:', error);
      throw error;
    }
  }
}
