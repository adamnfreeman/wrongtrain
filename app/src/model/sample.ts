/* The sample trip: ten days through Kyoto, Nara, Osaka and Tokyo, for four made-up travellers.

   Places are real and public; the stays are placeholders for "your hotel in this area".
   Dates are set when the sample is opened so that today is day 2, which shows the trip in
   progress. Clock times are local to each destination. */
import type { Day, Destination, Guide, Leg, Place, PlanItem, Todo, Trip } from './types';
import { addDays, todayIn } from './time';

const TZ = 'Asia/Tokyo';

const destinations: Destination[] = [
  { id: 'kyo', name: 'Kyoto', country: 'JP', timeZone: TZ, color: 'violet' },
  { id: 'nar', name: 'Nara', country: 'JP', timeZone: TZ, color: 'amber' },
  { id: 'osa', name: 'Osaka', country: 'JP', timeZone: TZ, color: 'red' },
  { id: 'tok', name: 'Tokyo', country: 'JP', timeZone: TZ, color: 'green' },
];

type P = Omit<Place, 'id' | 'kind' | 'destinationId'>;
const places: Place[] = [];
function at(destinationId: string | undefined, kind: Place['kind'], id: string, name: string, lat: number | null, lng: number | null, more: Partial<P> = {}) {
  places.push({ id, name, kind, ...(destinationId ? { destinationId } : {}), ...(lat != null ? { lat, lng: lng! } : {}), ...more });
}
const H = (open: string, close: string) => ({ hours: { open, close } });

/* Kyoto */
at('kyo', 'stay', 's-kyo', 'Your Kyoto hotel (Kawaramachi)', 35.0030, 135.7695, { area: 'Shijo-Kawaramachi', address: 'Shijo-dori, Shimogyo-ku, Kyoto', phone: '+81 75-000-0000', booking: 'Confirmation WT-20481, under Alex\nTwo rooms, breakfast included', checkIn: '15:00', checkOut: '11:00', notes: 'Sample stay in the middle of downtown Kyoto. Swap in your own hotel.' });
at('kyo', 'transit', 'kyoto-st', 'Kyoto Station', 34.985849, 135.7587667, { notes: 'JR, Kintetsu and subway lines, plus the main bus terminal out front.' });
at('kyo', 'transit', 'yamato-kyo', 'Yamato Transport, Kyoto Station Center', 34.988014, 135.7533269, { ...H('08:00', '20:00'), notes: 'Luggage forwarding (takkyubin). Bags dropped by 10 AM arrive at an Osaka hotel the same evening.' });
at('kyo', 'sight', 'fushimi', 'Fushimi Inari Taisha', 34.9676945, 135.7791876, { hours: '24h', notes: 'Thousands of red torii gates winding up Mount Inari. Free and always open. Before 8 AM you have the lower gates nearly to yourself; the full loop to the summit takes 2–3 hours.' });
at('kyo', 'sight', 'kiyomizu', 'Kiyomizu-dera', 34.9946662, 135.784661, { ...H('06:00', '18:00'), notes: 'Temple with a wooden stage built out over the hillside and views across the city.' });
at('kyo', 'shop', 'ninenzaka', 'Ninenzaka & Sannenzaka', 34.9983989, 135.7808431, { ...H('10:00', '18:00'), notes: 'Stone-paved lanes of craft, pottery and sweet shops below Kiyomizu-dera.' });
at('kyo', 'area', 'gion', 'Gion', 35.0037816, 135.777245, { notes: 'The old teahouse district. Walk Hanamikoji and Shirakawa at dusk, and please do not photograph geiko or maiko up close.' });
at('kyo', 'area', 'pontocho', 'Pontocho', 35.0064277, 135.7712162, { notes: 'Lantern-lit alley of restaurants along the Kamo River. Many have riverside decks from May to September.' });
at('kyo', 'area', 'arashiyama', 'Arashiyama', 35.009449, 135.666773, { notes: 'Bamboo grove, Tenryu-ji temple and Togetsukyo Bridge in west Kyoto. Go early: the bamboo path is packed by 10 AM.' });
at('kyo', 'shop', 'nishiki', 'Nishiki Market', 35.0050258, 135.764723, { ...H('10:00', '17:00'), notes: 'A 400 m covered food market. Many stalls close by 5–6 PM, and eating while walking is frowned on, so stand by the stall.' });
at('kyo', 'event', 'teamlab-kyo', 'teamLab Biovortex Kyoto', 34.9837159, 135.7649368, { notes: 'Immersive digital art a short walk from Kyoto Station. Timed entry, booked ahead.' });
at('kyo', 'coffee', 'arabica', '% Arabica Kyoto Arashiyama', 35.0135422, 135.6764367, { area: 'Arashiyama', notes: 'Riverside espresso bar and Arashiyama\'s most photographed coffee. The line moves fast.' });
at('kyo', 'coffee', 'rokuyosha', 'Rokuyosha Coffee', 35.008466, 135.7691875, { area: 'Kawaramachi-Sanjo', notes: 'Basement kissaten from the 1950s: hand-drip coffee and doughnuts.' });
at('kyo', 'coffee', 'smart', 'Smart Coffee', 35.0094531, 135.7670815, { area: 'Teramachi', notes: 'Old-school coffee shop since 1932, known for thick French toast and pudding.' });
at('kyo', 'coffee', 'weekenders', 'Weekenders Coffee', 34.998953, 135.76608, { area: 'Tominokoji', notes: 'Tiny stand-up counter tucked behind a parking lot; serious espresso.' });
at('kyo', 'food', 'engine', 'Kyoto Engine Ramen', 35.0045147, 135.767484, { ...H('12:00', '22:30'), area: 'Near Nishiki Market', diet: 'veg', dietNote: 'Clearly marked vegan and gluten-free bowls', notes: 'Lively ramen shop where vegan and regular bowls sit side by side on the menu, so a mixed group can eat together.' });
at('kyo', 'food', 'moonback', 'MOON and BACK Ramen Bar', 35.0055627, 135.7649774, { ...H('10:00', '22:30'), area: 'Near Nishiki Market', diet: 'veg', dietNote: 'Vegan ramen options', notes: 'Ramen and cocktails; the spicy vegan tantan is the one to order.' });
at('kyo', 'food', 'mumokuteki', 'Mumokuteki Cafe', 35.0065374, 135.7666091, { ...H('11:30', '20:00'), area: 'Teramachi', diet: 'veg', notes: 'Vegan cafe above a homeware shop: lunch sets and rice bowls.' });
at('kyo', 'food', 'shigetsu', 'Shigetsu', null, null, { area: 'Tenryu-ji, Arashiyama', diet: 'veg', notes: 'Shojin ryori, the Buddhist vegetarian set meal, served inside the Tenryu-ji temple grounds. A calm, memorable lunch.' });
at('kyo', 'food', 'tokkyu', 'Tokkyu Ramen', null, null, { area: 'Gion', diet: 'veg-some', dietNote: 'One vegan sesame-miso bowl', notes: 'Small ramen counter in Gion.' });
at('kyo', 'food', 'duck', 'Gion Duck Noodles', null, null, { area: 'Gion', diet: 'no', notes: 'Walk-in shop with a beautifully clear, rich duck broth. Expect a short wait.' });

/* Nara */
at('nar', 'transit', 'kintetsu-nara', 'Kintetsu-Nara Station', 34.6844361, 135.8274194);
at('nar', 'sight', 'nara-park', 'Nara Park', 34.685047, 135.843012, { notes: 'Over a thousand freely roaming deer. Deer crackers (shika senbei) are sold at stalls; the deer bow for them, and nip if you tease.' });
at('nar', 'sight', 'todaiji', 'Tōdai-ji', 34.6889851, 135.8398158, { ...H('07:30', '17:30'), notes: 'The Great Buddha Hall, one of the largest wooden buildings in the world, with a 15 m bronze Buddha inside.' });
at('nar', 'shop', 'higashimuki', 'Higashimuki Shopping Street', 34.6831902, 135.8287538, { notes: 'Covered arcade from the station toward the park. Watch the high-speed mochi pounding at Nakatanidou.' });

/* Osaka */
at('osa', 'stay', 's-osa', 'Your Osaka hotel (Shinsaibashi)', 34.6742, 135.5015, { area: 'Shinsaibashi', address: 'Shinsaibashi-suji, Chuo-ku, Osaka', phone: '+81 6-0000-0000', booking: 'Confirmation WT-33910, under Sam', checkIn: '15:00', checkOut: '10:00', notes: 'Sample stay between Shinsaibashi and Dotonbori. Swap in your own hotel.' });
at('osa', 'transit', 'namba', 'Osaka-Namba Station', 34.6657531, 135.5010362);
at('osa', 'transit', 'shin-osaka', 'Shin-Osaka Station', 34.7334658, 135.5002547, { notes: 'Shinkansen station, 15 minutes north of Namba on the Midosuji subway line.' });
at('osa', 'area', 'dotonbori', 'Dotonbori', 34.6686471, 135.5030983, { notes: 'Neon canal street of giant signs and street food: takoyaki, okonomiyaki, kushikatsu. Best after dark.' });
at('osa', 'shop', 'shinsaibashisuji', 'Shinsaibashi-suji', 34.6724248, 135.5010362, { notes: 'Covered shopping street running 600 m north from Dotonbori.' });
at('osa', 'area', 'amemura', 'Amerikamura', 34.6719318, 135.4988498, { notes: 'Streetwear, vintage clothing and cafes, a block west of Shinsaibashi-suji.' });
at('osa', 'sight', 'castle', 'Osaka Castle', 34.6872571, 135.5258546, { ...H('09:00', '17:00'), notes: 'Rebuilt keep with a museum inside, set in a big park with moats and stone walls. The grounds are free.' });
at('osa', 'shop', 'kuromon', 'Kuromon Market', 34.6653511, 135.5062417, { ...H('09:00', '17:00'), notes: 'Covered food market: grilled scallops, fruit, wagyu skewers. Good for a grazing lunch.' });
at('osa', 'area', 'denden', 'Den Den Town', 34.6619602, 135.5050576, { notes: 'Osaka\'s electronics and anime district around Nipponbashi: retro games, figures, card shops.' });
at('osa', 'shop', 'doguyasuji', 'Sennichimae Doguyasuji', 34.6640141, 135.5035063, { ...H('10:00', '18:00'), notes: 'Kitchenware arcade: knives, takoyaki pans and the plastic food samples restaurants put in their windows.' });
at('osa', 'shop', 'donki', 'Don Quijote Dotonbori', 34.6692407, 135.5027407, { hours: '24h', notes: 'The discount store with a Ferris wheel on the canal. Snacks, cosmetics, souvenirs; tax-free counter upstairs.' });
at('osa', 'area', 'umeda', 'Umeda', 34.7005588, 135.4957339, { notes: 'North Osaka\'s skyscraper district. The Umeda Sky Building has an open-air deck at sunset.' });
at('osa', 'coffee', 'glitch-osa', 'GLITCH COFFEE Osaka', 34.6934048, 135.4955867, { area: 'Nakanoshima', notes: 'Light-roast single-origin specialists.' });
at('osa', 'coffee', 'lilo', 'LiLo Coffee Roasters', 34.6740723, 135.4980336, { area: 'Nishi-Shinsaibashi', notes: 'Small roaster near Amerikamura.' });
at('osa', 'food', 'greenearth', 'Green Earth', null, null, { area: 'Shinsaibashi', diet: 'veg', notes: 'Fully vegan, with daily lunch sets including curry.' });
at('osa', 'food', 'gyozaoh', 'Gyozaoh Dotonbori', null, null, { area: 'Dotonbori', diet: 'veg-some', dietNote: 'Vegetable gyoza and veggie sides', notes: 'Casual counter gyoza bar right on Dotonbori.' });
at('osa', 'food', 'mizuno', 'Mizuno', null, null, { area: 'Dotonbori', diet: 'veg-some', dietNote: 'Ask for a veg-only mix', notes: 'Okonomiyaki institution for over 70 years. Expect a line at dinner.' });
at('osa', 'food', 'daruma', 'Kushikatsu Daruma', null, null, { area: 'Dotonbori', diet: 'veg-some', dietNote: 'Veggie skewers available', notes: 'Deep-fried skewers, and the famous rule: never double-dip in the shared sauce.' });

/* Tokyo */
at('tok', 'stay', 's-tok', 'Your Tokyo hotel (Nihonbashi)', 35.6855, 139.7790, { area: 'Nihonbashi', address: 'Nihonbashi, Chuo-ku, Tokyo', phone: '+81 3-0000-0000', booking: 'Confirmation WT-77102, under Jordan\nLate check-out asked for', checkIn: '15:00', checkOut: '11:00', notes: 'Sample stay in quiet, central Nihonbashi. Swap in your own hotel.' });
at('tok', 'transit', 'tokyo-st', 'Tokyo Station', 35.681236, 139.767125);
at(undefined, 'transit', 'narita', 'Narita Airport', 35.770178, 140.3843215);
at('tok', 'sight', 'sensoji', 'Sensō-ji, Asakusa', 35.7147651, 139.7966553, { hours: '24h', notes: 'Tokyo\'s oldest temple. The grounds are always open; the main hall from 6 AM. Draw an omikuji fortune for ¥100.' });
at('tok', 'shop', 'nakamise', 'Nakamise-dori', 35.7118413, 139.7964542, { ...H('10:00', '17:00'), notes: 'Lane of snack and souvenir stalls leading up to Sensō-ji.' });
at('tok', 'shop', 'kappabashi', 'Kappabashi Kitchen Town', 35.7105797, 139.7879645, { ...H('09:00', '17:00'), closedDays: [0], notes: 'Knives, ceramics and plastic food samples. Many shops close on Sundays.' });
at('tok', 'area', 'akihabara', 'Akihabara', 35.698383, 139.7730717, { notes: 'Electronics, anime and games. Sundays the main street is closed to cars in the afternoon.' });
at('tok', 'shop', 'radiokaikan', 'Akihabara Radio Kaikan', 35.6979149, 139.7719571, { ...H('10:00', '20:00'), notes: 'Ten floors of specialist hobby, figure and trading card shops.' });
at('tok', 'shop', 'yodobashi', 'Yodobashi Akiba', 35.698917, 139.774798, { ...H('09:30', '22:00'), notes: 'Huge electronics store: cameras, film, toys. Tax-free with your passport.' });
at('tok', 'area', 'scramble', 'Shibuya Crossing', 35.659482, 139.7005596, { notes: 'The world\'s busiest crossing. Watch it from the walkway inside Shibuya Station or the Starbucks above.' });
at('tok', 'shop', 'parco', 'Shibuya PARCO', 35.6620484, 139.6987767, { ...H('11:00', '21:00'), notes: 'Nintendo TOKYO, the Pokémon Center and the Capcom Store are all on the 6th floor.' });
at('tok', 'shop', 'takeshita', 'Takeshita Street', 35.6710335, 139.7051821, { notes: 'Harajuku\'s crowded lane of youth fashion, crêpes and character shops.' });
at('tok', 'shop', 'kiddyland', 'Kiddy Land Harajuku', 35.667733, 139.7065474, { ...H('11:00', '20:00'), notes: 'Five floors of character toys on Omotesando.' });
at('tok', 'shop', 'isetan', 'Isetan Shinjuku', 35.691574, 139.7046466, { ...H('10:00', '20:00'), notes: 'Department store with a spectacular basement food hall (depachika).' });
at('tok', 'shop', 'kinokuniya', 'Books Kinokuniya Shinjuku', 35.6919678, 139.7028227, { ...H('10:00', '21:00'), notes: 'Manga, art books and stationery; English books upstairs.' });
at('tok', 'transit', 'shinjuku-st', 'Shinjuku Station', 35.6896067, 139.7005713, { notes: 'The world\'s busiest station. Agree on a named exit before you split up.' });
at('tok', 'shop', 'amazake', 'Amazake Yokocho', 35.6853583, 139.7836529, { notes: 'A lane of old family shops by Ningyocho Station: rice crackers, taiyaki, tea.' });
at('tok', 'coffee', 'mameya', 'Koffee Mameya', 35.668368, 139.710888, { area: 'Omotesando', notes: 'No menu: tell the barista what you like and they pick the beans.' });
at('tok', 'coffee', 'bluebottle', 'Blue Bottle Kiyosumi-Shirakawa', 35.6777557, 139.8005894, { area: 'Kiyosumi-Shirakawa', notes: 'Flagship roastery cafe in a converted warehouse, in Tokyo\'s coffee district.' });
at('tok', 'food', 'masaka', 'Izakaya Masaka', 35.6621009, 139.6984833, { ...H('12:00', '22:00'), area: 'Shibuya PARCO B1F', diet: 'veg', notes: 'Fully vegan izakaya: gyoza, karaage and lemon sours.' });
at('tok', 'food', 'tstantan', 'T\'s TanTan', null, null, { area: 'Tokyo Station (inside the gates)', diet: 'veg', notes: 'Fully vegan ramen, handy before a train.' });
at('tok', 'food', 'zen', 'Zen Okonomiyaki', null, null, { area: 'Shinjuku', diet: 'veg', dietNote: 'Marked vegetarian section', notes: 'Cabbage-pancake specialist with an English menu.' });
at('tok', 'food', 'brownrice', 'Brown Rice Cafe', null, null, { area: 'Omotesando', diet: 'veg', notes: 'Organic vegan set lunches with grilled tofu and miso soup.' });
at('tok', 'food', 'genki', 'Yasai Izakaya Genki', null, null, { area: 'Kanda, near Akihabara', diet: 'veg', notes: 'Vegetable-focused izakaya with vegan and gluten-free menus. Good for a group dinner.' });
at('tok', 'food', 'tamai', 'Nihonbashi Tamai', null, null, { area: 'Nihonbashi', diet: 'no', dietNote: 'Fish specialist', notes: 'Generations-old anago (conger eel) house.' });
at('tok', 'area', 'odaiba', 'Odaiba', 35.6205834, 139.7805445, { wishlist: true, notes: 'Bay island with teamLab Planets and the life-size Gundam. Half a day.' });
at('tok', 'sight', 'skytree', 'Tokyo Skytree', 35.7100627, 139.8107004, { wishlist: true, notes: '634 m tower one stop from Asakusa. Book a time slot online to skip the line.' });
at('tok', 'shop', 'nakano', 'Nakano Broadway', 35.7089689, 139.6657328, { wishlist: true, notes: 'Arcade mall packed with collectors\' shops: vintage toys, manga, watches.' });
at('tok', 'shop', 'itoya', 'Ginza Itoya', 35.6731273, 139.7672138, { ...H('10:00', '20:00'), wishlist: true, notes: 'Twelve floors of stationery.' });
/* Kamakura day trip, filed under Tokyo */
at('tok', 'transit', 'kamakura-st', 'Kamakura Station', 35.3190722, 139.5504361, { notes: 'About an hour from Tokyo on the JR Yokosuka line.' });
at('tok', 'sight', 'daibutsu', 'Great Buddha of Kamakura', 35.3167, 139.5358, { ...H('08:00', '17:30'), notes: 'The 13 m bronze Buddha at Kōtoku-in, sitting outdoors since a tsunami washed its hall away in 1498.' });
at('tok', 'sight', 'hokokuji', 'Hōkoku-ji', 35.3199921, 139.5692379, { ...H('09:00', '16:00'), notes: 'Small temple with a dense bamboo grove and a tea house inside it.' });
at('tok', 'shop', 'komachi', 'Komachi-dori', 35.3216554, 139.5524551, { ...H('10:00', '18:00'), notes: 'Kamakura\'s main shopping street, right outside the station.' });
at('tok', 'sight', 'enoshima', 'Enoshima', 35.29972, 139.48028, { notes: 'Small island joined by a bridge: shrines, caves, a lighthouse and sunset views of Mt. Fuji on clear days.' });
at('tok', 'food', 'iwata', 'Iwata Coffee', null, null, { area: 'Kamakura', diet: 'veg-some', notes: 'Thick, fluffy hotcakes since 1945. Long weekend waits.' });
at('tok', 'food', 'magokoro', 'Magokoro', null, null, { area: 'Hase, Kamakura', diet: 'veg', notes: 'Relaxed vegetarian-friendly cafe near the Great Buddha.' });

/* airports sit outside the cities */
at(undefined, 'transit', 'kix', 'Kansai International Airport', 34.43056, 135.23028);

/* ---------- days ---------- */

let n = 0;
const plan = (text: string, more: Partial<PlanItem> = {}): PlanItem => ({ id: `p${n++}`, text, ...more });
const tip = (text: string, sub?: string[]) => ({ text, ...(sub ? { sub } : {}) });

function days(): Omit<Day, 'date'>[] {
  return [
    {
      id: 'd1', destinationId: 'kyo', title: 'Arrive · Kyoto', stayId: 's-kyo',
      summary: 'Land at Kansai Airport, Haruka to Kyoto, an easy first dinner downtown',
      plan: [
        plan('Land at Kansai International Airport. Immigration and customs take 45–90 minutes; have everyone\'s Visit Japan Web QR codes open.', { time: '14:30', placeId: 'kix' }),
        plan('Haruka limited express to Kyoto, 75 minutes. Reserved seats, cars 1–3.', { time: '16:16' }),
        plan('Check in, then walk the Kamo River and get dinner around Kawaramachi.', { time: '18:30', placeId: 's-kyo' }),
      ],
      tips: [tip('Buy or top up an IC card (ICOCA) at the airport if you have not added one to your phone. It covers almost every train and bus on the trip.')],
      around: [tip('Taxi from Kyoto Station to Kawaramachi is about 15 minutes and ¥1,500–2,000. The subway to Shijo then a short walk is cheaper with bags on wheels.')],
      eatIds: ['engine', 'moonback'],
    },
    {
      id: 'd2', destinationId: 'kyo', stayId: 's-kyo',
      summary: 'Fushimi Inari at first light, Kiyomizu-dera and the old lanes, teamLab at 5:00 PM',
      plan: [
        plan('Fushimi Inari before the crowds. JR Nara line to Inari Station, 5 minutes from Kyoto Station. Turn back at the Yotsutsuji viewpoint if you are short on time.', { time: '07:30', placeId: 'fushimi' }),
        plan('Kiyomizu-dera, then wander down Sannenzaka and Ninenzaka. Lunch along the way.', { time: '11:00', placeId: 'kiyomizu', sub: ['Ninenzaka & Sannenzaka shops mostly open 10 AM–6 PM.'] }),
        plan('Nishiki Market for snacks before the stalls close; coffee at Rokuyosha.', { time: '14:30', placeId: 'nishiki' }),
        plan('teamLab Biovortex Kyoto, timed entry, booked for four.', { time: '17:00', fixed: true, placeId: 'teamlab-kyo' }),
        plan('Dinner in Pontocho, then a walk through Gion.', { time: '19:30', placeId: 'pontocho' }),
      ],
      tips: [
        tip('Temples and shrines: bow at the gate, wash hands at the basin (left, right, mouth from your palm), and do not walk down the middle of the path, which is for the gods.'),
        tip('Kiyomizu-dera charges ¥500 entry; Fushimi Inari is free.'),
      ],
      around: [
        tip('Kyoto city buses are a flat ¥230; tap your IC card when you get off at the front.'),
        tip('Cutting it close for teamLab? A taxi from downtown is about ¥1,500–2,000 and safer than a bus at rush hour.'),
      ],
      eatIds: ['engine', 'moonback', 'mumokuteki', 'tokkyu', 'duck'],
    },
    {
      id: 'd3', destinationId: 'kyo', stayId: 's-kyo',
      summary: 'Arashiyama\'s bamboo grove early, temple lunch at Tenryu-ji, a slow afternoon in Gion',
      plan: [
        plan('JR Sagano line to Saga-Arashiyama, then straight to the bamboo grove before 8:30 AM.', { time: '07:45', placeId: 'arashiyama' }),
        plan('Coffee by the river at % Arabica, then Togetsukyo Bridge.', { time: '09:30', placeId: 'arabica' }),
        plan('Shojin ryori lunch at Shigetsu inside Tenryu-ji. Walk-ins are fine at opening; book ahead for a group.', { time: '11:00', placeId: 'shigetsu' }),
        plan('Back east for an unhurried afternoon in Gion and Shirakawa.', { time: '15:00', placeId: 'gion' }),
      ],
      tips: [tip('Tonight, pack an overnight bag: the big bags get sent ahead to Osaka tomorrow morning.')],
      around: [tip('The Randen tram back from Arashiyama to Shijo-Omiya is slower but far more scenic than the JR line.')],
      eatIds: ['shigetsu', 'tokkyu', 'duck', 'mumokuteki'],
    },
    {
      id: 'd4', destinationId: 'osa', route: ['kyo', 'nar', 'osa'], stayId: 's-osa',
      summary: 'Bags sent ahead, the Nara deer and the Great Buddha, evening in Dotonbori',
      plan: [
        plan('Drop the big bags at Yamato in Kyoto Station for same-day delivery to the Osaka hotel.', { time: '10:00', fixed: true, timeKind: 'by', placeId: 'yamato-kyo' }),
        plan('Kintetsu limited express to Nara, 35 minutes. Reserved seats.', { time: '11:25' }),
        plan('Nara Park and the deer, then Tōdai-ji and the Great Buddha.', { time: '12:15', placeId: 'nara-park', sub: ['Tōdai-ji is open 7:30 AM–5:30 PM; entry ¥800.'] }),
        plan('Kintetsu limited express to Osaka-Namba, 40 minutes.', { time: '16:03' }),
        plan('Check in, then out to Dotonbori after dark.', { time: '18:00', placeId: 'dotonbori' }),
      ],
      tips: [tip('Deer crackers are ¥200 a stack. Hold them up high, show empty hands when you are done, and keep paper maps out of reach.')],
      around: [tip('Both Kintetsu trains are reserved: tap your IC card at the gate for the base fare and show the seat ticket on your phone if asked.')],
      eatIds: ['gyozaoh', 'mizuno', 'daruma', 'greenearth'],
    },
    {
      id: 'd5', destinationId: 'osa', stayId: 's-osa',
      summary: 'Osaka Castle, a grazing lunch at Kuromon Market, Den Den Town and kitchen street',
      plan: [
        plan('Osaka Castle and its park. The grounds are free; the keep museum is ¥600.', { time: '09:30', placeId: 'castle' }),
        plan('Grazing lunch at Kuromon Market.', { time: '12:30', placeId: 'kuromon' }),
        plan('Den Den Town for games and figures, then Sennichimae Doguyasuji for knives and food samples.', { time: '14:00', placeId: 'denden' }),
        plan('Evening free: Umeda for sunset views, or Amerikamura for vintage shops.', { time: '18:00' }),
      ],
      tips: [tip('Tax-free shopping needs your passport and a total of ¥5,000 or more in one shop on the same day.')],
      around: [tip('The Midosuji subway line runs straight from Namba to Umeda and Shin-Osaka; trains every few minutes.')],
      eatIds: ['mizuno', 'daruma', 'gyozaoh', 'greenearth'],
    },
    {
      id: 'd6', destinationId: 'tok', route: ['osa', 'tok'], stayId: 's-tok',
      summary: 'Shinkansen to Tokyo with Mt. Fuji out the window, an evening in Shinjuku',
      plan: [
        plan('Nozomi shinkansen from Shin-Osaka to Tokyo, 2 h 27 min. Seat E faces Mt. Fuji around the 1 h 50 min mark.', { time: '10:12' }),
        plan('Check in at Nihonbashi; leave bags early if the room is not ready.', { time: '13:30', placeId: 's-tok' }),
        plan('Shinjuku: Isetan\'s basement food hall, Kinokuniya, then the lanes of Omoide Yokocho for dinner.', { time: '16:00', placeId: 'isetan' }),
      ],
      tips: [tip('Bags over 160 cm in total (length + width + height) need an oversized-baggage seat on the shinkansen, booked in advance.')],
      around: [tip('Tokyo Station to Nihonbashi is a 10-minute walk, or one stop on the Ginza line.')],
      eatIds: ['zen', 'tstantan'],
    },
    {
      id: 'd7', destinationId: 'tok', stayId: 's-tok',
      summary: 'Sensō-ji in the morning, Kappabashi for kitchen goods, Akihabara all afternoon',
      plan: [
        plan('Sensō-ji early, then Nakamise-dori as the stalls open.', { time: '08:30', placeId: 'sensoji' }),
        plan('Kappabashi Kitchen Town, a 10-minute walk west.', { time: '11:00', placeId: 'kappabashi' }),
        plan('Akihabara: Radio Kaikan, Yodobashi, retro game shops.', { time: '13:30', placeId: 'akihabara' }),
        plan('Group dinner at Yasai Izakaya Genki near Kanda.', { time: '19:00', placeId: 'genki' }),
      ],
      tips: [tip('Akihabara\'s main street becomes a pedestrian zone on Sunday afternoons.')],
      around: [tip('Asakusa to Akihabara: Tsukuba Express, 4 minutes.')],
      eatIds: ['genki', 'tamai'],
    },
    {
      id: 'd8', destinationId: 'tok', stayId: 's-tok',
      summary: 'Omotesando coffee, Harajuku\'s Takeshita Street, Shibuya Crossing and PARCO',
      plan: [
        plan('Pour-over at Koffee Mameya, then down Omotesando.', { time: '10:00', placeId: 'mameya' }),
        plan('Takeshita Street and Kiddy Land.', { time: '11:30', placeId: 'takeshita' }),
        plan('Shibuya Crossing, then the 6th floor of Shibuya PARCO.', { time: '14:30', placeId: 'scramble' }),
        plan('Dinner at Izakaya Masaka in PARCO\'s basement.', { time: '18:30', placeId: 'masaka' }),
      ],
      tips: [tip('Takeshita Street is calmest before 11 AM on weekdays.')],
      around: [tip('Harajuku to Shibuya is one stop on the JR Yamanote line, or a 20-minute walk along Cat Street.')],
      eatIds: ['masaka', 'brownrice'],
    },
    {
      id: 'd9', destinationId: 'tok', title: 'Kamakura & Enoshima', stayId: 's-tok',
      summary: 'Day trip: the Great Buddha, a bamboo tea house, and sunset on Enoshima',
      plan: [
        plan('JR Yokosuka line from Tokyo Station to Kamakura, about an hour.', { time: '08:30' }),
        plan('Hōkoku-ji bamboo grove and matcha in the tea house.', { time: '09:45', placeId: 'hokokuji' }),
        plan('Komachi-dori for lunch and snacks.', { time: '11:30', placeId: 'komachi' }),
        plan('Enoden train to Hase for the Great Buddha.', { time: '13:30', placeId: 'daibutsu' }),
        plan('Enoden on to Enoshima for the caves and sunset.', { time: '15:00', placeId: 'enoshima' }),
      ],
      tips: [tip('The Enoshima-Kamakura Freepass covers the Enoden line and the trip from Tokyo; worth it for this route.')],
      around: [tip('The little Enoden train runs along the coast every 12 minutes and gets packed on weekends.')],
      eatIds: ['magokoro', 'iwata'],
    },
    {
      id: 'd10', destinationId: 'tok', title: 'Fly home', travel: true,
      summary: 'Last breakfast, Narita Express from Tokyo Station, evening flight home',
      plan: [
        plan('Last walk through Amazake Yokocho for gifts.', { time: '09:00', placeId: 'amazake' }),
        plan('Check out and head to Tokyo Station.', { time: '12:00' }),
        plan('Narita Express to the airport, 55 minutes.', { time: '13:03' }),
      ],
      tips: [tip('Tax-free purchases may be checked at departure: keep them unopened and in your carry-on.')],
      around: [],
      eatIds: ['tstantan'],
    },
  ];
}

const legs: Omit<Leg, 'id'>[] = [
  { from: 'Phone', to: 'Every train and bus', mode: 'other', how: 'IC card (Suica, PASMO or ICOCA) in your phone\'s wallet', status: 'todo', statusText: 'To set up', tickets: 'Before you fly', details: 'Add it in Apple Wallet and top it up with a card. Covers local trains, subways, buses and convenience stores.' },
  { dayId: 'd1', from: 'Home', to: 'Kansai Airport (KIX)', mode: 'flight', how: 'Overnight flight, lands 2:30 PM', arrive: '14:30', status: 'booked', statusText: 'Booked' },
  { dayId: 'd1', from: 'Kansai Airport', to: 'Kyoto', mode: 'train', how: 'Haruka limited express, 4:16 PM, reserved', depart: '16:16', arrive: '17:31', fromPlaceId: 'kix', status: 'booked', statusText: 'Booked', details: 'Pick up the tickets at the JR West counter in the airport station with the booking QR code.' },
  { dayId: 'd4', from: 'Kyoto', to: 'Kintetsu-Nara', mode: 'train', how: 'Kintetsu limited express, 11:25 AM, reserved', depart: '11:25', arrive: '12:00', fromPlaceId: 'kyoto-st', status: 'booked', statusText: 'Booked' },
  { dayId: 'd4', from: 'Kintetsu-Nara', to: 'Osaka-Namba', mode: 'train', how: 'Kintetsu limited express, 4:03 PM, reserved', depart: '16:03', arrive: '16:41', fromPlaceId: 'kintetsu-nara', status: 'booked', statusText: 'Booked' },
  { dayId: 'd6', from: 'Shin-Osaka', to: 'Tokyo', mode: 'train', how: 'Nozomi shinkansen, 10:12 AM, seats E', depart: '10:12', arrive: '12:39', fromPlaceId: 'shin-osaka', status: 'booked', statusText: 'Booked', tickets: 'Smart EX app', details: 'About ¥14,500 each. The QR code in the app is your ticket at the gate.' },
  { dayId: 'd9', from: 'Tokyo', to: 'Kamakura', mode: 'train', how: 'JR Yokosuka line, unreserved', status: 'none', statusText: 'Nothing to book', tickets: 'IC card' },
  { dayId: 'd10', from: 'Tokyo Station', to: 'Narita Airport', mode: 'train', how: 'Narita Express (N\'EX), 1:03 PM', depart: '13:03', arrive: '13:58', fromPlaceId: 'tokyo-st', status: 'todo', statusText: 'To book', tickets: 'Online or at the station', details: 'Reserved seats only; book a few days ahead.' },
  { dayId: 'd10', from: 'Narita Airport', to: 'Home', mode: 'flight', how: 'Evening flight, 5:30 PM', depart: '17:30', fromPlaceId: 'narita', status: 'booked', statusText: 'Booked' },
];

const todos: Omit<Todo, 'id'>[] = [
  { group: 'Before the trip', text: 'Check passports', details: 'Valid for the whole trip, with blank pages. Some airlines want six months left.', when: 'Now', done: true },
  { group: 'Before the trip', text: 'Register on Visit Japan Web', details: 'One registration per traveller; gives the QR codes for immigration and customs.', when: 'A week before', done: false, link: 'https://www.vjw.digital.go.jp/', everyone: true, checks: ['Sam', 'Riley'] },
  { group: 'Before the trip', text: 'Add an IC card to your phone', details: 'Suica, PASMO or ICOCA in Apple Wallet. Top it up with ¥5,000 to start.', when: 'Before you fly', done: false },
  { group: 'Before the trip', text: 'Set up an eSIM', details: 'Install before you leave so data works the moment you land.', when: 'Before you fly', done: false },
  { group: 'Before the trip', text: 'Book teamLab Biovortex', details: 'Timed tickets sell out on weekends.', when: 'Two weeks before', done: true },
  { group: 'Before the trip', text: 'Reserve shinkansen seats', details: 'Smart EX opens one month ahead. Ask for seat E for Mt. Fuji.', when: 'One month before', done: true },
  { group: 'Before the trip', text: 'Tell your bank you are travelling', when: 'A week before', done: false },
  { group: 'Before the trip', text: 'Download offline maps', details: 'Google Maps offline areas for Kyoto, Osaka and Tokyo, and the Japanese pack in Google Translate.', when: 'Before you fly', done: false },
  { group: 'During the trip', text: 'Send big bags ahead to Osaka', details: 'Yamato counter at Kyoto Station by 10 AM.', when: 'Day 4', done: false, who: ['Alex', 'Jordan'], checks: ['Jordan'] },
  { group: 'During the trip', text: 'Book the Narita Express', when: 'By day 8', done: false },
  { group: 'During the trip', text: 'Get yen from a 7-Eleven ATM', details: 'Small shops, temples and food stalls are often cash only.', when: 'Day 1', done: false },
];

const guides: Omit<Guide, 'id'>[] = [
  { group: 'Before you go', title: 'Documents & entry', items: [
    { title: 'Passport', body: 'Valid for your whole stay. Many nationalities can visit visa-free for up to 90 days; check yours before booking.' },
    { title: 'Visit Japan Web', body: 'Fill in immigration and customs online before you fly and show the QR codes on arrival.' },
    { title: 'Travel insurance', body: 'Worth having: medical care is excellent but not free for visitors.' },
  ] },
  { group: 'Before you go', title: 'Money', items: [
    { title: 'Cards and cash', body: 'Cards work in most shops and restaurants, but temples, food stalls and small family places are often cash only.' },
    { title: 'ATMs', body: '7-Eleven and Japan Post ATMs reliably accept foreign cards.' },
    { title: 'No tipping', body: 'Leaving money on the table can cause staff to chase after you to return it.' },
  ] },
  { group: 'Before you go', title: 'Phone & data', items: [
    { title: 'eSIM or pocket Wi-Fi', body: 'An eSIM installs before you leave. Pocket Wi-Fi is picked up at the airport and shared by the group.' },
    { title: 'Apps', body: 'Google Maps for transit directions, Google Translate with the camera, GO for taxis.' },
  ] },
  { group: 'Good to know', title: 'Getting around', items: [
    { title: 'IC cards', body: 'Tap in and out on every train, subway and bus. Top up at any station machine.' },
    { title: 'Shinkansen', body: 'Reserve seats ahead on busy days. Large bags need an oversized-baggage seat.' },
    { title: 'Luggage forwarding', body: 'Takkyubin (Yamato, "Black Cat") sends bags hotel to hotel, usually next day, for about ¥2,000–3,000 a bag.' },
    { title: 'Taxis', body: 'Doors open and close by themselves. Show the address on your phone.' },
  ] },
  { group: 'Good to know', title: 'Etiquette', items: [
    { title: 'Quiet trains', body: 'No phone calls on trains; keep conversations low.' },
    { title: 'Bins', body: 'Public bins are rare. Carry a small bag for your rubbish.' },
    { title: 'Shoes', body: 'Take them off where you see a step up at the entrance, in fitting rooms and on tatami.' },
  ] },
];

/* ---------- the made-up group, so the sample shows what a shared trip looks like ---------- */

/** A drawn face for a made-up friend: a coloured circle with their initial and a little shine. */
const face = (initial: string, a: string, b: string) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><circle cx="48" cy="38" r="17" fill="#fff" opacity=".92"/><path d="M18 92c4-20 16-30 30-30s26 10 30 30z" fill="#fff" opacity=".92"/><text x="48" y="45" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="800" text-anchor="middle" fill="${b}">${initial}</text></svg>`);

/** The sample's travellers as people on the trip, with pictures (for notes, lists and the map). */
export const SAMPLE_PEOPLE = [
  { user_id: 'sample-alex', name: 'Alex', role: 'owner' as const, avatar: face('A', '#f2994a', '#c2410c') },
  { user_id: 'sample-sam', name: 'Sam', role: 'editor' as const, avatar: face('S', '#56ccf2', '#1d4ed8') },
  { user_id: 'sample-jordan', name: 'Jordan', role: 'contributor' as const, avatar: face('J', '#6fcf97', '#15803d') },
  { user_id: 'sample-riley', name: 'Riley', role: 'viewer' as const, avatar: face('R', '#bb6bd9', '#7e22ce') },
];

/** Where two of the made-up friends are "right now", in Kyoto: shared with the group for the day. */
export function sampleSpots(now = new Date()) {
  const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
  const until = new Date(now.getTime() + 6 * 3600_000).toISOString();
  return [
    { user_id: 'sample-sam', lat: 35.0050258, lng: 135.764723, acc: 15, at: ago(3), until },
    { user_id: 'sample-jordan', lat: 35.0037816, lng: 135.777245, acc: 25, at: ago(12), until },
  ];
}

/** The sample's photos: drawings standing in for the group's own, by day. */
export const SAMPLE_PHOTOS = [
  { day: 'd1', src: 'sample/photo-river.svg', by: 'Sam', caption: 'First night by the Kamo River' },
  { day: 'd2', src: 'sample/photo-torii.svg', by: 'Jordan', caption: 'Fushimi Inari at 7:40 AM, nearly empty' },
  { day: 'd2', src: 'sample/photo-bamboo.svg', by: 'Alex', caption: 'Detour through the bamboo' },
  { day: 'd4', src: 'sample/photo-deer.svg', by: 'Riley', caption: 'He bowed first' },
];

/** The "Right now" train in the sample: leaves about 35 minutes after you look, today (day 2),
    so the Right now page always has something to show. Set when the sample opens and each load. */
export function freshenSample(t: Trip, now = new Date()): Trip {
  const min = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now).replace(':', '').replace(/^(\d\d)(\d\d)$/, (_, h, m) => String(+h * 60 + +m)));
  const at = Math.min(23 * 60 + 55, Math.ceil((min + 35) / 5) * 5);
  const hm = (x: number) => `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  return { ...t, legs: t.legs.map(l => (l.id === 'l-now' ? { ...l, depart: hm(at), arrive: hm(Math.min(at + 29, 23 * 60 + 59)) } : l)) };
}

export function makeSample(now: Date): Trip {
  n = 0;
  const today = todayIn(TZ, now);
  const start = addDays(today, -1);
  const ds = days().map((d, i) => ({ ...d, date: addDays(start, i) }));
  const stamp = now.toISOString();
  const teamlab = ds[1].plan.find(p => /teamLab/.test(p.text));
  const trip: Trip = {
    id: 'sample',
    name: 'Japan in ten days',
    travelers: ['Alex', 'Sam', 'Jordan', 'Riley'],
    destinations,
    days: ds,
    legs: [...legs.map((l, i) => ({ id: `l${i}`, ...l })),
      /* booked for a time just ahead of now (freshenSample), so Right now always shows */
      { id: 'l-now', dayId: 'd2', from: 'Kyoto', to: 'Uji', mode: 'train', how: 'JR Nara line rapid', depart: '12:00', arrive: '12:29', fromPlaceId: 'kyoto-st', status: 'booked', statusText: 'Booked',
        tickets: 'IC card; the group fare is on the sample ticket', details: 'Platform 8, cars 1–4. Get off at Uji (3 stops) for Byodo-in, 10 minutes\' walk.' }],
    places: places.map(p => ({ ...p })),
    todoGroups: ['Before the trip', 'During the trip'],
    todos: todos.map((t, i) => ({ id: `t${i}`, ...t, ...(t.done ? { doneBy: 'Sam' } : {}) })),
    notes: [
      { id: 'n1', author: 'Sam', text: 'vegan ramen near nishiki market pls', at: addDays(today, -6) + 'T09:35:00.000Z', done: true,
        filed: 'Added Kyoto Engine Ramen and MOON and BACK Ramen Bar to the Kyoto food ideas, both near Nishiki Market with vegan bowls.' },
      { id: 'n3', author: 'Jordan', text: 'our flight home moved to 5:30pm, same flight number', at: addDays(today, -3) + 'T14:12:00.000Z', done: true,
        filed: 'Moved the flight home on the last day to 5:30 PM and left the Narita Express as it was; you still have time.' },
      { id: 'n4', author: 'Riley', text: 'muji and uniqlo at some point', at: addDays(today, -2) + 'T10:05:00.000Z', done: true,
        filed: 'Added MUJI and UNIQLO to the Tokyo shopping ideas: both have big stores in Shinjuku and Ginza.' },
      { id: 'n2', author: 'Alex', text: 'Can we fit in a sentō (public bath) one evening in Tokyo?', at: addDays(today, -1) + 'T18:57:00.000Z', done: false },
    ],
    guides: guides.map((g, i) => ({ id: `g${i}`, ...g })),
    phrasePack: 'ja',
    docs: [
      { id: 'doc-uji', title: 'Train to Uji', kind: 'ticket', picture: 'sample/ticket-uji.svg', for: { kind: 'leg', id: 'l-now' }, addedBy: 'Sam', at: stamp, notes: 'Platform 8, cars 1–4.' },
      { id: 'doc-nozomi', title: 'Shinkansen to Tokyo', kind: 'ticket', picture: 'sample/ticket-nozomi.svg', for: { kind: 'leg', id: 'l5' }, addedBy: 'Alex', at: stamp, notes: 'Seats 8E, 9D, 9E, 10E. Each person scans their own QR at the gate.' },
      ...(teamlab ? [{ id: 'doc-teamlab', title: 'teamLab tickets', kind: 'ticket' as const, picture: 'sample/ticket-teamlab.svg', for: { kind: 'plan' as const, id: teamlab.id }, addedBy: 'Jordan', at: stamp }] : []),
      { id: 'doc-hotel', title: 'Kyoto hotel booking', kind: 'booking', picture: 'sample/booking-hotel.svg', addedBy: 'Alex', at: stamp, notes: 'Two twin rooms. Check-in from 3 PM.' },
      { id: 'doc-insurance', title: 'Travel insurance', kind: 'insurance', picture: 'sample/insurance.svg', addedBy: 'Riley', at: stamp },
    ],
    currency: 'USD',
    expenses: [
      { id: 'e1', what: 'Haruka tickets from the airport', amount: 14400, currency: 'JPY', rate: 0.0067, paidBy: 'Alex', split: [{ who: 'Alex' }, { who: 'Sam' }, { who: 'Jordan' }, { who: 'Riley' }], at: ds[0].date + 'T08:30:00.000Z', dayId: 'd1', addedBy: 'Alex' },
      { id: 'e2', what: 'First dinner: izakaya in Pontocho', amount: 21800, currency: 'JPY', rate: 0.0067, paidBy: 'Sam', split: [{ who: 'Alex' }, { who: 'Sam' }, { who: 'Jordan' }, { who: 'Riley' }], at: ds[0].date + 'T11:40:00.000Z', dayId: 'd1', addedBy: 'Sam' },
      { id: 'e3', what: 'teamLab tickets', amount: 132, currency: 'USD', rate: 1, paidBy: 'Jordan', split: [{ who: 'Alex' }, { who: 'Sam' }, { who: 'Jordan' }, { who: 'Riley' }], at: ds[0].date + 'T02:00:00.000Z', addedBy: 'Jordan' },
      { id: 'e4', what: 'Matcha and wagashi in Gion', amount: 4200, currency: 'JPY', rate: 0.0067, paidBy: 'Riley', split: [{ who: 'Sam', amount: 2100 }, { who: 'Riley', amount: 2100 }], at: ds[1].date + 'T05:10:00.000Z', dayId: 'd2', addedBy: 'Riley' },
    ],
    settlements: [{ id: 's1', from: 'Riley', to: 'Alex', amount: 24, at: ds[1].date + 'T01:00:00.000Z', via: 'venmo' }],
    venmo: { Alex: 'alex-sample', Sam: 'sam-sample', Jordan: 'jordan-sample' },
    sample: true,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return freshenSample(trip, now);
}
