export interface SessionUser {
  userId: string;
  redditUsername: string;
  avatarUrl?: string;
}

export interface AppSession {
  user?: SessionUser;
}
