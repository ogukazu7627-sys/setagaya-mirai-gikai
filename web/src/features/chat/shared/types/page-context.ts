export type ChatPageContext = {
  type: "home" | "council" | "bill";
  bills?: Array<{
    id?: string;
    name: string;
    summary?: string;
    tags?: string[];
    isFeatured?: boolean;
  }>;
};
