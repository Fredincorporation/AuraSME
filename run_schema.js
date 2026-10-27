import { Client } from 'pg';
import fs from 'node:fs';

// Credentials come from the environment (.env.local) and must never be committed.
// Supply either SUPABASE_DB_URL, or DATABASE_PASSWORD + NEXT_PUBLIC_SUPABASE_URL.
function resolveConnectionStrings() {
  if (process.env.SUPABASE_DB_URL) {
    return { direct: process.env.SUPABASE_DB_URL, pooled: process.env.SUPABASE_DB_URL };
  }

  const password = process.env.DATABASE_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!password || !supabaseUrl) {
    throw new Error(
      'Missing credentials. Set DATABASE_PASSWORD and NEXT_PUBLIC_SUPABASE_URL, or provide SUPABASE_DB_URL.'
    );
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const encoded = encodeURIComponent(password);

  return {
    direct: `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`,
    pooled: `postgresql://postgres.${projectRef}:${encoded}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  };
}

async function executeSql() {
  const { direct, pooled } = resolveConnectionStrings();

  console.log('Connecting to PostgreSQL database...');
  let client = new Client({ connectionString: direct, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected directly to the Supabase database.');
  } catch (err) {
    console.log('Direct connect failed, trying session pooler...', err.message);
    client = new Client({ connectionString: pooled, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('Connected via Supabase pooler successfully.');
  }

  try {
    const sql = fs.readFileSync('supabase_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Successfully executed schema DDL!');

    const seedQuery = `
      INSERT INTO sme_companies (company_name, trade_license, jurisdiction, zone_type, industry, hr_contact_name, hr_contact_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (trade_license) DO NOTHING;
    `;
    await client.query(seedQuery, [
      'Al-Futtaim Logistics SME LLC',
      'UAE-DXB-984210',
      'Dubai (DHA)',
      'Freezone',
      'Logistics & Supply Chain',
      'Tariq Al-Mansoor',
      'tariq.mansoor@alfuttaim-logistics.ae'
    ]);
    console.log('Seeded sample SME company successfully into Supabase!');
    await client.end();
  } catch (err) {
    console.error('Execution error:', err.message);
    try {
      await client.end();
    } catch {
      // connection already closed
    }
    process.exitCode = 1;
  }
}

executeSql();
