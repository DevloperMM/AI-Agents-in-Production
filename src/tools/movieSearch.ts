import type { ToolFn } from '../../types'
import { z } from 'zod'
import { queryMovies } from '../rag/query'

export const movieSearchDefinition = {
  name: 'search-movie',
  parameters: z.object({
    query: z.string().describe(
      `Primary semantic subject to search for after removing ranking and structured constraints.
      
      Query must contain only the core movie subject, theme, plot, mood, or concept.
      
      Extract and REMOVE from query:
      - Ranking terms: best, top, highest rated, lowest rated, most popular, highest grossing
      - Structured filters: genre, director, actors, year
      - Sort concepts: rating, revenue, votes, metascore
      
      Examples:
      - "highest rated comedy movie" -> query="movie", genre="comedy", sort_by="rating"
      - "top sci-fi films" -> query="films", genre="sci-fi", sort_by="rating"
      - "highest grossing Nolan movies" -> query="movies", director="Christopher Nolan", sort_by="revenue"
      - "movies about memory loss" -> query="memory loss"
      
      Do not duplicate extracted filters or ranking language inside query.`,
    ),
    filters: z
      .object({
        genre: z
          .string()
          .nullable()
          .describe(
            `Movie genre if explicitly requested or clearly implied. Examples: "horror", "sci-fi", "comedy". Null if absent.`,
          ),

        director: z
          .string()
          .nullable()
          .describe(
            `Director name when user specifies a filmmaker. Examples: "Christopher Nolan", "Hayao Miyazaki". Null if absent.`,
          ),

        actors: z
          .string()
          .nullable()
          .describe(
            `Actor or performer name when user asks for movies featuring someone. Examples: "Tom Cruise", "Scarlett Johansson". Null if absent.`,
          ),

        year: z
          .string()
          .nullable()
          .describe(
            `Release year or explicit year constraint.Examples: "1999", "2023". Use only exact year values, not vague eras like "90s". Null if absent.`,
          ),
      })
      .nullable()
      .describe(
        `Structured metadata filters extracted from user constraints. Use only explicit constraints. Leave null if no filter is clearly requested.`,
      ),

    sort_by: z
      .enum(['rating', 'revenue', 'votes', 'metascore'])
      .nullable()
      .describe(
        `Numeric field for ranking results. Use when user asks for best, top, highest, most popular, most successful, or similar.
        Mapping guidance:
          - "best", "highest rated" -> rating
          - "most popular", "most reviewed" -> votes
          - "highest grossing" -> revenue
          - "best reviewed by critics" -> metascore
        Null when ranking is not requested.`,
      ),

    sort_order: z
      .enum(['asc', 'desc'])
      .nullable()
      .default('desc')
      .describe(
        `Sort direction. Use "desc" for highest/top/best/most (default). Use "asc" for lowest/worst/least.`,
      ),

    limit: z
      .number()
      .min(1)
      .max(20)
      .nullable()
      .default(5)
      .describe(
        `Maximum number of results. Infer from requests like "top 10" or "show 3". Default to 5 if unspecified.`,
      ),
  }),

  description: `Use this tool to search movies and answer questions using semantic intent plus structured metadata. Extract broad themes into query, explicit constraints into filters, and ranking requests into sort fields. Prefer sorting over restrictive filters for "best", "top", "highest" or similar requests. Only populate filters when the user clearly expresses a constraint. Use null rather than guessing missing values.`,
}

type Args = z.infer<typeof movieSearchDefinition.parameters>

export const movieSearch: ToolFn<Args, string> = async ({ toolArgs }) => {
  let results
  try {
    results = await queryMovies({ args: toolArgs })
  } catch (error) {
    console.error(error)
    return 'Error: Failed to search for movies'
  }

  const formattedResults = results.map((result) => {
    const { metadata, data } = result
    return {
      ...metadata,
      description: data,
    }
  })

  return JSON.stringify(formattedResults, null, 2)
}
