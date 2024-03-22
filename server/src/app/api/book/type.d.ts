
// define types
interface RetrievedGoodreadsBookInfo {
  found: boolean;
  title?: string;
  subtitle?: string;
  author?: string | null;
  url?: string;
  rating?: number;
  numRatings?: number;
  fetchedTimestamp?: Date;
}

interface RetrievedKoboBookInfo {
  title: string;
  subtitle: string;
  author?: string | null;
  url?: string;
  format?: "digital" | "physical";
  fetchedTimestamp?: Date;
}

interface RetrievedPchomeBookInfo {
  title: string;
  subtitle: string;
  author?: string | null;
  url?: string;
  format?: "digital" | "physical";
  fetchedTimestamp?: Date;
}

interface BookPostBody {
  kobo?: RetrievedGoodreadsBookInfo,
  goodreads?: RetrievedGoodreadsBookInfo,
  pchome?:RetrievedPchomeBookInfo
}