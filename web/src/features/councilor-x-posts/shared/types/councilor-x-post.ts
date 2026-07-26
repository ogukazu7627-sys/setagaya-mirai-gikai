export type CouncilorXPostType = "original" | "quote";

export type StoredCouncilorXPost = {
  postId: string;
  councilorId: string;
  postUrl: string;
  postedAt: string;
  postType: CouncilorXPostType;
};

export type PublicCouncilorXPost = {
  postId: string;
  councilorName: string;
  postUrl: string;
  postedAt: string;
};

export type CouncilorXSyncSource = {
  councilorId: string;
  xUsername: string;
  xUserId: string | null;
  lastSeenPostId: string | null;
};

export type CouncilorXSyncStateInput = {
  councilorId: string;
  xUsername: string;
  xUserId: string;
  lastSeenPostId: string | null;
};
