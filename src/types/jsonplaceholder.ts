export type JsonPlaceholderPost = {
  userId: number
  id: number
  title: string
  body: string
}

export type CreatePostBody = { title: string; body: string; userId: number }

export type CreatePostResponse = CreatePostBody & { id: number }

/** JSONPlaceholder отвечает на DELETE телом `{}` */
export type JsonPlaceholderDeleteResult = Record<string, never>
