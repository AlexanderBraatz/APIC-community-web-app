-- Listing tag aliases (text[]) + Places type cache on listings.
-- Canonical listing_tags.name uniqueness unchanged; aliases are not unique.

alter table public.listing_tags
  add column if not exists aliases text[] not null default '{}';

alter table public.listings
  add column if not exists places_primary_type text,
  add column if not exists places_types text[] not null default '{}';

comment on column public.listing_tags.aliases is
  'Hidden under-the-hood alternate labels for resolve/search; not shown on member browse chips.';

comment on column public.listings.places_primary_type is
  'Google Places primaryType (machine key), cached from Place Details.';

comment on column public.listings.places_types is
  'Google Places types array cached from Place Details.';

-- Curated seed aliases for common vocabulary (only fills empty arrays).
update public.listing_tags
set aliases = v.aliases
from (
  values
    ('restaurant', array['ristorante', 'ristoranti', 'dining', 'eatery']),
    ('ristorante', array['restaurant', 'dining']),
    ('trattoria', array['trattorie', 'restaurant']),
    ('osteria', array['osterie', 'restaurant']),
    ('pizzeria', array['pizza', 'pizzerie']),
    ('pizza', array['pizzeria', 'pizzerie']),
    ('café', array['cafe', 'coffee shop', 'bar']),
    ('coffee', array['cafe', 'café', 'coffee shop', 'caffè']),
    ('bakery', array['pasticceria', 'panificio', 'baker']),
    ('pasticceria', array['bakery', 'pastry', 'cake shop']),
    ('wine', array['vino', 'wines', 'enoteca']),
    ('winery', array['cantina', 'wine estate', 'vineyard']),
    ('dentist', array['dental', 'dental clinic', 'dentista', 'odontoiatra']),
    ('pharmacy', array['farmacia', 'chemist']),
    ('physiotherapist', array['physiotherapy', 'fisio', 'fisioterapista']),
    ('chiropractor', array['chiropractic', 'chiropratica']),
    ('veterinary', array['vet', 'veterinarian', 'veterinario', 'animal hospital']),
    ('veterinarien', array['vet', 'veterinary', 'veterinarian']),
    ('hospital', array['ospedale', 'emergency room', 'er']),
    ('ospedale', array['hospital']),
    ('doctor', array['medico', 'gp', 'physician', 'medical doctor']),
    ('hair-salon', array['hairdresser', 'parrucchiere', 'salon', 'barber']),
    ('beauty', array['cosmetics', 'esthetician', 'bellezza']),
    ('supermarket', array['grocery', 'supermercato', 'alimentari']),
    ('organic', array['bio', 'biologico', 'organic food']),
    ('gardening', array['gardener', 'landscaping', 'giardiniere', 'giardinaggio']),
    ('gardener', array['gardening', 'landscaping', 'giardiniere']),
    ('electrical', array['electrician', 'elettricista']),
    ('hvac-plumbing', array['plumber', 'heating', 'idraulico', 'heating and plumbing']),
    ('carpentry', array['carpenter', 'joiner', 'falegname']),
    ('carpenter', array['carpentry', 'joiner', 'falegname']),
    ('pest-control', array['exterminator', 'disinfestazione']),
    ('fitness', array['gym', 'personal trainer', 'palestra']),
    ('tuscan', array['toscana', 'tuscany', 'tuscan cuisine']),
    ('fish', array['seafood', 'pesce', 'fish restaurant']),
    ('vegetarian', array['veggie', 'plant-based']),
    ('gluten-free', array['senza glutine', 'celiac', 'celiac-friendly']),
    ('fine-dining', array['gourmet', 'haute cuisine']),
    ('eye-care', array['ophthalmologist', 'optician', 'oculista', 'ophtalmologist']),
    ('ophtalmologist', array['ophthalmologist', 'eye care', 'oculista']),
    ('real-estate', array['immobiliare', 'estate agent', 'realtor']),
    ('whatsapp', array['wa', 'whats app']),
    ('appointment-needed', array['by appointment', 'su appuntamento']),
    ('outdoor-seating', array['terrace', 'patio', 'dehors']),
    ('castelfalfi', array['castel falfi', 'castelfalfi village'])
  ) as v(name_key, aliases)
where lower(trim(listing_tags.name)) = v.name_key
  and listing_tags.aliases = '{}';
