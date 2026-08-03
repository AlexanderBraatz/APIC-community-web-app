'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
]);

function accountRedirect(opts: { error?: string; message?: string }): never {
	const params = new URLSearchParams();
	if (opts.error) params.set('error', opts.error);
	if (opts.message) params.set('message', opts.message);
	const qs = params.toString();
	redirect(qs ? `/account?${qs}` : '/account');
}

async function requireUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		redirect('/sign-in?next=/account');
	}

	return { supabase, user };
}

function extensionForMime(mime: string) {
	switch (mime) {
		case 'image/jpeg':
			return 'jpg';
		case 'image/png':
			return 'png';
		case 'image/webp':
			return 'webp';
		case 'image/gif':
			return 'gif';
		default:
			return null;
	}
}

export async function updateFullName(formData: FormData) {
	const fullName = String(formData.get('full_name') ?? '').trim();

	if (!fullName) {
		accountRedirect({ error: 'Name is required.' });
	}
	if (fullName.length > 200) {
		accountRedirect({ error: 'Name must be 200 characters or fewer.' });
	}

	const { supabase, user } = await requireUser();

	const { error } = await supabase
		.from('profiles')
		.update({ full_name: fullName })
		.eq('id', user.id);

	if (error) {
		accountRedirect({ error: error.message });
	}

	revalidatePath('/account');
	revalidatePath('/community-calendar');
	accountRedirect({ message: 'Name saved.' });
}

export async function uploadAvatar(formData: FormData) {
	const entry = formData.get('avatar');
	const file = entry instanceof File && entry.size > 0 ? entry : null;

	if (!file) {
		accountRedirect({ error: 'Choose an image to upload.' });
	}

	if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
		accountRedirect({
			error: 'Use a JPEG, PNG, WebP, or GIF image.'
		});
	}

	if (file.size > MAX_AVATAR_BYTES) {
		accountRedirect({ error: 'Avatar must be 2 MB or smaller.' });
	}

	const ext = extensionForMime(file.type);
	if (!ext) {
		accountRedirect({ error: 'Unsupported image type.' });
	}

	const { supabase, user } = await requireUser();
	const objectPath = `${user.id}/avatar.${ext}`;
	const bytes = new Uint8Array(await file.arrayBuffer());

	const { error: uploadError } = await supabase.storage
		.from(AVATAR_BUCKET)
		.upload(objectPath, bytes, {
			contentType: file.type,
			upsert: true,
			cacheControl: '3600'
		});

	if (uploadError) {
		accountRedirect({ error: uploadError.message });
	}

	const {
		data: { publicUrl }
	} = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

	const avatarUrl = `${publicUrl}?v=${Date.now()}`;

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ avatar_url: avatarUrl })
		.eq('id', user.id);

	if (profileError) {
		accountRedirect({ error: profileError.message });
	}

	revalidatePath('/account');
	revalidatePath('/community-calendar');
	accountRedirect({ message: 'Avatar updated.' });
}

export async function removeAvatar() {
	const { supabase, user } = await requireUser();

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ avatar_url: null })
		.eq('id', user.id);

	if (profileError) {
		accountRedirect({ error: profileError.message });
	}

	// Best-effort: clear known object names under the user's folder.
	const candidates = ['jpg', 'png', 'webp', 'gif'].map(
		ext => `${user.id}/avatar.${ext}`
	);
	await supabase.storage.from(AVATAR_BUCKET).remove(candidates);

	revalidatePath('/account');
	revalidatePath('/community-calendar');
	accountRedirect({ message: 'Avatar removed.' });
}

export async function changePassword(formData: FormData) {
	const password = String(formData.get('password') ?? '');
	const confirm = String(formData.get('confirm') ?? '');

	if (!password || password.length < 8) {
		accountRedirect({ error: 'Password must be at least 8 characters.' });
	}
	if (password !== confirm) {
		accountRedirect({ error: 'Passwords do not match.' });
	}

	const { supabase } = await requireUser();
	const { error } = await supabase.auth.updateUser({ password });

	if (error) {
		accountRedirect({ error: error.message });
	}

	accountRedirect({ message: 'Password updated.' });
}
