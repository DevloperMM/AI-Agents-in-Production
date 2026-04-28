import 'dotenv/config'

import { Index as UpstashIndex } from '@upstash/vector'
import { parse } from 'csv-parse/sync'
import fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'

// Initialize Upstash vector client index
const index = new UpstashIndex({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
})

// Function to index IMDB movie data
export async function indexMovieData() {
  const spinner = ora('Reading movie data...').start()

  // Read and parse CSV file - ensure to run this from root always
  const csvPath = path.join(process.cwd(), 'src/rag/imdb_movie_dataset.csv')
  let csvData = fs.readFileSync(csvPath, 'utf-8')
  let movies = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  })

  spinner.text = 'Starting movie indexing...'

  // Index each movie
  for (const movie of movies as any[]) {
    spinner.text = `Indexing movie: ${movie.Title}`
    const text = `${movie.Title} is a ${movie.Genre} film about ${movie.Description} from ${movie.Year}, directed by ${movie.Director}, starring ${movie.Actors}.`

    try {
      await index.upsert({
        id: movie.Title, // Using Title as unique ID
        data: text, // Text will be automatically embedded
        metadata: {
          title: movie.Title,
          year: movie.Year,
          genre: movie.Genre,
          director: movie.Director,
          actors: movie.Actors,
          rating: Number(movie.Rating),
          votes: Number(movie.Votes),
          revenue: Number(movie.Revenue),
          metascore: Number(movie.Metascore),
        },
      })
    } catch (error) {
      spinner.fail(`Error indexing movie ${movie.Title}`)
      console.error(error)
    }
  }

  spinner.succeed('Finished indexing movie data')
}

indexMovieData()
