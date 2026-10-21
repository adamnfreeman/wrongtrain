/* The Shopping tab's products: travel gear we like, with a link to buy it. A starter list of
   well-known things; Adam swaps in his own favourites and his Amazon Associates tag here.
   Honest rules (VISION.md): labelled when a link earns anything, never ranked by commission. */
export const AMAZON_TAG = ''; // Amazon Associates tag, e.g. "wrongtrain-20"; empty means plain links

export interface Product { name: string; why: string; cat: string; url?: string }

export const PRODUCTS: Product[] = [
  { cat: 'Bags', name: 'Peak Design Travel Backpack 45L', why: 'Carry-on size that opens like a suitcase.' },
  { cat: 'Bags', name: 'Bellroy Sling', why: 'Phone, wallet, passport and a snack, worn on the front in crowds.' },
  { cat: 'Bags', name: 'Packable daypack', why: 'Folds into its own pocket for day trips.' },
  { cat: 'Everyday carry', name: 'Apple AirTag', why: 'Know where your checked bag is.' },
  { cat: 'Everyday carry', name: 'Coin purse', why: 'Japan still runs on coins.' },
  { cat: 'Everyday carry', name: 'Compact travel umbrella', why: 'Rain comes out of nowhere.' },
  { cat: 'Tech', name: 'Anker power bank 10000mAh', why: 'A full day of maps and photos.' },
  { cat: 'Tech', name: 'Universal travel adapter with USB-C', why: 'One plug for every country.' },
  { cat: 'Tech', name: 'Short USB-C cable', why: 'Less tangle in a sling.' },
  { cat: 'Packing', name: 'Packing cubes', why: 'A cube per person or per day.' },
  { cat: 'Packing', name: 'Laundry bag', why: 'Keeps worn clothes apart.' },
  { cat: 'Comfort', name: 'Neck pillow', why: 'Long flights and Shinkansen naps.' },
  { cat: 'Comfort', name: 'Blister plasters', why: '20,000 steps a day.' },
];

export function productLink(p: Product): string {
  if (p.url) return p.url;
  return `https://www.amazon.com/s?k=${encodeURIComponent(p.name)}${AMAZON_TAG ? `&tag=${encodeURIComponent(AMAZON_TAG)}` : ''}`;
}
