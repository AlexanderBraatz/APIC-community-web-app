/**
 * Backfill phone/email/website/opening_hours from free-text contact + notes.
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/migrate-listings-fields.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-listings-fields.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { extractListingFields } from './lib/listings-field-extract.mjs';

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

const dryRun = process.argv.includes('--dry-run');

async function main() {
	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const { data: rows, error } = await supabase
		.from('listings_backup_20260804')
		.select('id, name, contact, remark')
		.order('name');
	if (error) throw new Error(error.message);

	let updated = 0;
	let withPhone = 0;
	let withEmail = 0;
	let withWebsite = 0;
	let withHours = 0;
	const ambiguous = [];

	for (const row of rows ?? []) {
		const extracted = extractListingFields({
			contact: row.contact,
			notes: row.remark
		});
		// Skip known false positives from "24 hours" phrasing
		if (
			row.name === 'AniCura Veterinary Clinic Cascina' ||
			row.name === 'Dr. Francesco Lotti'
		) {
			extracted.opening_hours = null;
			extracted.notes = row.remark;
		}
		if (
			extracted.opening_hours &&
			Object.keys(extracted.opening_hours.days).length === 0
		) {
			ambiguous.push({
				name: row.name,
				note: extracted.opening_hours.note
			});
			extracted.opening_hours = null;
		}

		if (extracted.phone) withPhone += 1;
		if (extracted.email) withEmail += 1;
		if (extracted.website) withWebsite += 1;
		if (extracted.opening_hours) withHours += 1;

		if (dryRun) {
			console.log('---', row.name);
			console.log(JSON.stringify(extracted, null, 2));
			updated += 1;
			continue;
		}

		const { error: updateError } = await supabase
			.from('listings')
			.update({
				phone: extracted.phone,
				email: extracted.email,
				website: extracted.website,
				notes: extracted.notes,
				opening_hours: extracted.opening_hours
			})
			.eq('id', row.id);
		if (updateError) {
			throw new Error(`Update failed for ${row.name}: ${updateError.message}`);
		}
		updated += 1;
	}

	console.log(
		`${dryRun ? 'Dry-run reviewed' : 'Updated'} ${updated} listings.`
	);
	console.log(
		`phone=${withPhone} email=${withEmail} website=${withWebsite} opening_hours=${withHours}`
	);
	if (ambiguous.length) {
		console.log(`Ambiguous hours (stored as note only): ${ambiguous.length}`);
		for (const row of ambiguous) {
			console.log(`  - ${row.name}: ${row.note?.slice(0, 120)}`);
		}
	}
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
