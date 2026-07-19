import { request } from './http';

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await request<{ url: string }>('/api/v1/uploads', { method: 'POST', formData });
  return url;
}
