import { NextResponse } from "next/server";

import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
});

export async function GET(request: Request) {
  return NextResponse.json({ "Hello World": "api/book/GET" })
}

export async function POST(request: Request) {
  let {goodreads, kobo, pchome, bokelai, taaze}: Partial<BookPostBody> = await request.clone().json()

  // console.log('goodreads', goodreads)
  // console.log('kobo', kobo)
  // console.log('pchome', pchome)

  try {
    const client = await pool.connect();
    let goodreadsBookId, koboBookId, pchomeBookId, bokelaiBookId, taazeBookId;

    if (goodreads) {
      goodreadsBookId = await upsertGoodreadsBook(client, goodreads, 'goodreads_book');
    }
    if (kobo) {
      koboBookId = await upsertBook(client, kobo, 'kobo_book');
    }
    if (pchome) {
      pchomeBookId = await upsertBook(client, pchome, 'pchome_book');
    }
    if (bokelai) {
      bokelaiBookId = await upsertBook(client, bokelai, 'bokelai_book');
    }
    if (taaze) {
      taazeBookId = await upsertBook(client, taaze, 'taaze_book');
    }

    client.release();

    return NextResponse.json({ status: 'OK', goodreads, kobo, pchome, bokelai, taaze })
  } catch (error) {
    console.error('Error executing query', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error,
      goodreads, kobo, pchome, bokelai, taaze }, { status: 500 })
  }
}


async function upsertGoodreadsBook(client: any, book: any, tableName: string): Promise<number | null> {
  if ( !book.title || book.title==='') {
    return null; // do nothing
  }

  const query =
      `INSERT INTO goodreads_book (found, title, subtitle, url, rating, num_ratings, fetched_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (title)
      DO UPDATE SET
        subtitle = COALESCE(NULLIF(EXCLUDED.subtitle, ''), goodreads_book.subtitle),
        url = COALESCE(NULLIF(EXCLUDED.url, ''), goodreads_book.url),
        rating = COALESCE(EXCLUDED.rating, goodreads_book.rating),
        num_ratings = COALESCE(EXCLUDED.num_ratings, goodreads_book.num_ratings),
        found = EXCLUDED.found,
        updated_at = NOW()
      WHERE
        (EXCLUDED.found = true AND EXCLUDED.title <> '') OR 
        (EXCLUDED.found = true AND goodreads_book.found = false) OR
        (EXCLUDED.found = false AND goodreads_book.found = false)
      RETURNING id;
    `;

  const result = await client.query(query, [book.found || false, book.title, book.subtitle, book.url, book.rating, book.numRatings]);

  // Check if any rows were affected
  if (result.rowCount > 0) {
      return result.rows[0].id; // Return the ID of the inserted or updated row
  } else {
      return null; // No rows were affected
  }
}

async function upsertBook(client: any, book: any, tableName: string): Promise<number | null> {
  if ( !book.title || book.title==='') {
    return null; // do nothing
  }

  const query =
    `INSERT INTO ${tableName} (title, subtitle, author, url, format, rating, num_ratings, price, currency, thumbnail_url, isbn, fetched_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (title, format)
      DO UPDATE SET
        subtitle = COALESCE(NULLIF(EXCLUDED.subtitle, ''), ${tableName}.subtitle),
        author = COALESCE(NULLIF(EXCLUDED.author, ''), ${tableName}.author),
        url = COALESCE(NULLIF(EXCLUDED.url, ''), ${tableName}.url),
        format = COALESCE(NULLIF(EXCLUDED.format, ''), ${tableName}.format),
        rating = COALESCE(EXCLUDED.rating, ${tableName}.rating),
        num_ratings = COALESCE(EXCLUDED.num_ratings, ${tableName}.num_ratings),
        price = COALESCE(EXCLUDED.price, ${tableName}.price),
        currency = COALESCE(EXCLUDED.currency, ${tableName}.currency),
        thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, ${tableName}.thumbnail_url),
        isbn = COALESCE(EXCLUDED.isbn, ${tableName}.isbn),
        updated_at = NOW()
      RETURNING id;
    `;

  const result = await client.query(query, [
    book.title, book.subtitle, book.author, book.url, book.format, book.rating, book.numRatings, book.price, book.currency, book.thumbnailUrl, book.isbn]);

  // Check if any rows were affected
  if (result.rowCount > 0) {
    return result.rows[0].id; // Return the ID of the inserted or updated row
  } else {
    return null; // No rows were affected
  }
}