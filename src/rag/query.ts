import 'dotenv/config'

import { Index as UpstashIndex } from '@upstash/vector'

const index = new UpstashIndex({})

/**
 * Namespaces provide a way to logically separate data within the same index.
 * This is useful when you want to have multiple isolated datasets (e.g., per user or per project)
 * but keep them under the same vector index for efficiency.
 * By specifying a namespace (such as `index.namespace(userId)`),
 * you can ensure that queries, inserts, and updates only affect the data associated with that specific namespace.
 */

// Example
/**
 * const userId = "<USER_ID>";
 * const userNamespace = index.namespace(userId);
 *
 * // Insert a vector into the user's namespace (using either vector or text data):
 * await userNamespace.upsert([
 *   {
 *     id: "<VECTOR_ID>",
 *     data: "<VECTOR_TEXT_OR_DATA>",
 *     metadata: {}
 *   }
 * ]);
 *
 * // Query vectors within the user's namespace (using either a vector or text data):
 * const results = await userNamespace.query({
 *   vector: [], // your query vector (optional)
 *   data: "",   // your query as text (optional)
 *   topK: 5
 * });
 *
 * console.log(results);
 */

// Partial<Type> is a TypeScript utility type that makes all properties of Type optional.
// For example:
// type MovieMetadata = { title: string; year: number; genre: string }
// type PartialMovie = Partial<MovieMetadata>
// This allows: const movie: PartialMovie = { title: "Inception" } // year and genre are optional

export const queryMovies = async ({ args }: { args: Record<string, any> }) => {
  console.log(args)

  const { query, filters = {}, sort_by, sort_order = 'desc', limit = 5 } = args

  const conditions: string[] = []
  if (filters) {
    if (filters.genre) conditions.push(`genre GLOB '*${filters.genre}*'`)
    if (filters.director) conditions.push(`director = '${filters.director}'`)
    if (filters.year) conditions.push(`year = '${filters.year}'`)
    if (filters.actors) conditions.push(`actors GLOB '*${filters.actors}*'`)
  }

  // Build filter string if filters provided
  const filterString =
    conditions.length > 0 ? conditions.join(' AND ') : undefined

  console.log(filterString)

  const results = await index.query({
    data: query,
    topK: limit,
    // filter: filterString,
    includeData: true,
    includeMetadata: true,
  })

  let sorted = results

  if (sort_by) {
    sorted = [...results].sort((a, b) => {
      const aVal = (a.metadata?.[sort_by] ?? 0) as number
      const bVal = (b.metadata?.[sort_by] ?? 0) as number
      return sort_order === 'desc' ? bVal - aVal : aVal - bVal
    })
  }

  /**
   * TODO:(1) - Query fining and filter fining; see args for various prompts
   * TODO:(2) - refer below
   *
   * Current issue-
   * Sorting happens after semantic topK retrieval, so true top-rated/top-grossing
   * results may never enter the candidate set.
   *
   * Next-
   * [ ] Move sorting into DB (ORDER BY ...)
   * [ ] Fetch larger sorted candidate pool (limit * N)
   * [ ] Run semantic search only over those candidates
   * [ ] Return semantic topK from ranked pool
   *
   * Later-
   * [ ] Consider hybrid score = semantic relevance + sort metric
   *
   * Fix-
   * [ ] Replace metadata?.sort_by with metadata?.[sort_by]
   */

  return sorted.slice(0, limit)
}
