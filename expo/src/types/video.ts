export interface Video {
  id: string;
  videoUrl: string;
  thumbnail: string;
  username: string;
  userAvatar: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
}

export interface Comment {
  _id: string;
  content: string;
  author: string;
  publishedAt: string;
  portal: number;
  state: string;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalComments: number;
    commentsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
