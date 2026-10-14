import { query } from "../database/client.js";
import { parseSnapshotEnvelope, type SnapshotEnvelope } from "./snapshot.js";
import type { EditionWindow } from "./types.js";

export interface StoredSnapshot extends SnapshotEnvelope {
	publicationStatus: "pending" | "published" | "failed";
	publicationUrl: string | null;
	publishedCommit: string | null;
}

export async function persistSnapshot(
	window: EditionWindow,
	envelope: SnapshotEnvelope,
): Promise<void> {
	const validated = parseSnapshotEnvelope(envelope);
	const key = `${window.day}:${window.kind}`;
	const result = await query<{ checksum: string }>(
		`INSERT INTO edition_snapshots
			(edition_key, schema_version, template_version, checksum, snapshot, generation_status)
		 VALUES ($1, $2, $3, $4, $5::jsonb, $6)
		 ON CONFLICT (edition_key) DO UPDATE SET updated_at = edition_snapshots.updated_at
		 RETURNING checksum`,
		[
			key,
			validated.snapshot.schemaVersion,
			validated.snapshot.templateVersion,
			validated.checksum,
			JSON.stringify(validated.snapshot),
			validated.snapshot.generationStatus,
		],
	);
	if (result.rows[0]?.checksum !== validated.checksum) {
		throw new Error(`An immutable snapshot already exists for ${key}`);
	}
}

interface SnapshotRow {
	snapshot: unknown;
	checksum: string;
	publication_status: StoredSnapshot["publicationStatus"];
	publication_url: string | null;
	published_commit: string | null;
}

export async function getSnapshot(key: string): Promise<StoredSnapshot | null> {
	const result = await query<SnapshotRow>(
		`SELECT snapshot, checksum, publication_status, publication_url, published_commit
		   FROM edition_snapshots WHERE edition_key = $1`,
		[key],
	);
	const row = result.rows[0];
	if (!row) return null;
	return {
		...parseSnapshotEnvelope({
			snapshot: row.snapshot,
			checksum: row.checksum,
		}),
		publicationStatus: row.publication_status,
		publicationUrl: row.publication_url,
		publishedCommit: row.published_commit,
	};
}

export async function listSnapshots(): Promise<SnapshotEnvelope[]> {
	const result = await query<{ snapshot: unknown; checksum: string }>(
		`SELECT snapshot, checksum FROM edition_snapshots
		 WHERE publication_status = 'published'
		 ORDER BY snapshot->'window'->>'day', snapshot->'window'->>'end'`,
	);
	return result.rows.map((row) =>
		parseSnapshotEnvelope({ snapshot: row.snapshot, checksum: row.checksum }),
	);
}

export async function markSnapshotPublished(
	key: string,
	url: string,
	commit: string,
): Promise<void> {
	const result = await query(
		`UPDATE edition_snapshots
		    SET publication_status = 'published', publication_url = $2,
		        published_commit = $3, published_at = NOW(), updated_at = NOW()
		  WHERE edition_key = $1 AND publication_status <> 'published'`,
		[key, url, commit],
	);
	if ((result.rowCount ?? 0) === 0) {
		const existing = await getSnapshot(key);
		if (
			!existing ||
			existing.publicationUrl !== url ||
			existing.publishedCommit !== commit
		)
			throw new Error(`Could not transition snapshot ${key} to published`);
	}
}

export async function markSnapshotPublicationFailed(
	key: string,
): Promise<void> {
	await query(
		`UPDATE edition_snapshots SET publication_status = 'failed', updated_at = NOW()
		  WHERE edition_key = $1 AND publication_status = 'pending'`,
		[key],
	);
}
