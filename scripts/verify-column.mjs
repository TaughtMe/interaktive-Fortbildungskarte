import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require' });
const rows = await client`
  SELECT column_name, data_type, is_nullable
  FROM   information_schema.columns
  WHERE  table_name  = 'profiles'
  AND    column_name = 'scheduled_deletion_at'
`;
if (rows.length > 0) {
  console.log('✅ Spalte vorhanden:', JSON.stringify(rows[0]));
} else {
  console.error('❌ Spalte NICHT gefunden!');
  process.exit(1);
}
await client.end();
