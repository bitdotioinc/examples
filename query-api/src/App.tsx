import { useEffect, useState } from 'react'
import './App.css'

const QUERY_URL = "https://api.bit.io/v2beta/query?data_format=objects";
const DB_NAME = "george-bitdotio/query-api-example";
const API_KEY = "v2_3ywaN_Uu27Ng7q9kYRzKZNk2fuAnz";

interface QueryResult<T> {
  data: T[];
  metadata: Record<string, string>;
  query_string: string;
}

interface Genre {
  GenreId: number;
  Name: string;
}

interface Album {
  id: number
  artist: string;
  title: string;
  length_milliseconds: number;
}

type TableState =
  | { status: "loading" }
  | { status: "done", albums: Album[] }
  | { status: "empty" }

async function runQuery<T>(query: string): Promise<QueryResult<T>> {
  return fetch(QUERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      database_name: DB_NAME,
      query_string: query,
    }),
  }).then((res) => res.json());
}

function GenreSelector({ genres, onSelect }: { genres: Genre[], onSelect: (genreId: number) => void }) {
  return (
    <select onChange={(e) => onSelect(parseInt(e.target.value))}>
      {genres.length === 0
        ? <option value="-1">Loading...</option>
        : <option value="-1">Select a genre</option>
      }
      {genres.map((genre) => (
        <option key={genre.GenreId} value={genre.GenreId}>{genre.Name}</option>
      ))}
    </select>
  );
}

function Table({ tableState }: { tableState: TableState }) {
  if (tableState.status === "empty") {
    return <div className="text-center">Select a genre to see a table of albums</div>;
  }
  if (tableState.status === "loading") {
    return <div className="text-center">Loading...</div>;
  }
  const { albums } = tableState;
  return (
    <table>
      <thead>
        <tr>
          <th>Artist</th>
          <th>Title</th>
          <th>Length (minutes)</th>
        </tr>
      </thead>
      <tbody>
        {albums.map((album) => (
          <tr key={album.id}>
            <td>{album.artist}</td>
            <td>{album.title}</td>
            <td className="text-center">{(album.length_milliseconds / 1000 / 60).toFixed(0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function App() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreId, setGenreId] = useState<number>(-1);
  const [tableState, setTableState] = useState<TableState>({ status: "empty" });

  useEffect(() => {
    runQuery<Genre>("SELECT * FROM genres").then((res) => setGenres(res.data));
  }, []);

  useEffect(() => {
    console.log("genreId changed", genreId);
    if (genreId === -1) {
      setTableState({ status: "empty" });
    } else {
      setTableState({ status: "loading" });
      runQuery<Album>(`
        SELECT
          albums."AlbumId" AS id,
          albums."Title" AS title,
          artists."Name" AS artist,
          sum(tracks."Milliseconds") AS length_milliseconds
        FROM tracks
        INNER JOIN albums ON albums."AlbumId" = tracks."AlbumId"
        INNER JOIN artists ON artists."ArtistId" = albums."ArtistId"
        WHERE tracks."GenreId" = ${genreId}
        GROUP BY albums."AlbumId", artists."Name"
        ORDER BY albums."AlbumId";
      `).then((res) => setTableState({ status: "done", albums: res.data }));
    }
  }, [genreId]);

  return (
    <div className="App">
      <div className="text-center">
        <h1>Album Recommender</h1>
      </div>
      <div className="genre-select">
        <GenreSelector genres={genres} onSelect={(genreId) => setGenreId(genreId)} />
      </div>
      <Table tableState={tableState} />
    </div>
  )
}

export default App
