export type DeveloperContact = {
	name: string;
	email: string;
	whatsappHref: string;
	whatsappLabel: string;
	websiteHref: string;
	websiteLabel: string;
};

function trimEnv(value: string | undefined) {
	return value?.trim() || '';
}

function websiteLabelFromHref(href: string) {
	try {
		return new URL(href).hostname.replace(/^www\./, '');
	} catch {
		return href.replace(/^https?:\/\//, '').replace(/\/$/, '');
	}
}

/** Server-only developer contact from env. Returns null when incomplete. */
export function getDeveloperContact(): DeveloperContact | null {
	const name = trimEnv(process.env.DEVELOPER_CONTACT_NAME);
	const email = trimEnv(process.env.DEVELOPER_CONTACT_EMAIL);
	const whatsappDigits = trimEnv(process.env.DEVELOPER_CONTACT_WHATSAPP).replace(
		/\D/g,
		''
	);
	const whatsappLabel = trimEnv(process.env.DEVELOPER_CONTACT_WHATSAPP_LABEL);
	const websiteHref = trimEnv(process.env.DEVELOPER_CONTACT_WEBSITE);

	if (!name || !email || !whatsappDigits || !whatsappLabel || !websiteHref) {
		return null;
	}

	return {
		name,
		email,
		whatsappHref: `https://wa.me/${whatsappDigits}`,
		whatsappLabel,
		websiteHref,
		websiteLabel: websiteLabelFromHref(websiteHref)
	};
}
