import { apiClient } from './client';
import type { CategoryOption } from '@/types/document';

export async function getCategories(): Promise<CategoryOption[]> {
  const response = await apiClient.get<CategoryOption[]>('/api/categories');
  return response.data;
}
