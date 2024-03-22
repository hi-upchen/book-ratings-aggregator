export interface RetrievedGoodreadsBookInfo {
  found: boolean;
  title?: string;
  subtitle?: string;
  author?: string | null;
  url?: string;
  rating?: number;
  numRatings?: number;
  fetchedTimestamp?: Date;
}

export interface RetrievedKoboBookInfo {
  title: string;
  subtitle: string;
  author?: string | null;
  url?: string;
  format?: "digital" | "physical";
  fetchedTimestamp?: Date;
}

export interface RetrievedPchomeBookInfo {
  title: string;
  subtitle: string;
  author?: string | null;
  url?: string;
  format?: "digital" | "physical";
  fetchedTimestamp?: Date;
}