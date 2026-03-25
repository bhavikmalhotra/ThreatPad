export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarColor: string;
  };
  accessToken: string;
  expiresIn: number;
}

export interface SearchRequest {
  query: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface SearchResult {
  noteId: string;
  title: string;
  snippet: string;
  tags: { id: string; name: string; color: string }[];
  updatedAt: string;
  relevanceScore: number;
}
