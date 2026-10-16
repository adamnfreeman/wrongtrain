/* Japanese phrase pack. Each phrase with a recorded clip plays it from public/phrases/ja.json
   (keyed by the "tts" text, or the Japanese when there is none); the rest use the phone's own voice. */
import type { PhrasePack } from './types';

const ja: PhrasePack = {
  lang: 'ja',
  speechLang: 'ja-JP',
  name: 'Japanese',
  audio: 'phrases/ja.json',
  intro: 'Vowels are always a “ah”, i “ee”, u “oo”, e “eh”, o “oh”. A line over a vowel (ō, ū) means hold it twice as long. The “u” in desu and masu is nearly silent.',
  dictionary: { label: 'Jisho dictionary', url: 'https://jisho.org/search/' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "こんにちは",
    "ro": "Konnichiwa",
    "say": "kon-nee-chee-wah",
    "when": "Daytime greeting, from late morning until evening. Shop staff will call out “irasshaimase” (welcome) as you walk in. You don't need to answer; a nod is fine."
   },
   {
    "en": "Good morning",
    "ja": "おはようございます",
    "ro": "Ohayō gozaimasu",
    "say": "oh-hah-yoh go-zai-mahss",
    "when": "Until about 10 or 11 AM. Good for hotel staff and the first café of the day."
   },
   {
    "en": "Good evening",
    "ja": "こんばんは",
    "ro": "Konbanwa",
    "say": "kon-bahn-wah",
    "when": "After dark, in place of konnichiwa."
   },
   {
    "en": "Thank you",
    "ja": "ありがとうございます",
    "ro": "Arigatō gozaimasu",
    "say": "ah-ree-gah-toh go-zai-mahss",
    "when": "The polite form, right for staff and strangers. Use it constantly: when handed change, when someone holds a door, when leaving a shop."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "すみません",
    "ro": "Sumimasen",
    "say": "soo-mee-mah-sen",
    "when": "The most useful word to learn. Call a waiter, squeeze past someone, get a stranger's attention, or apologise for something small."
   },
   {
    "en": "I'm sorry",
    "ja": "ごめんなさい",
    "ro": "Gomen nasai",
    "say": "go-men nah-sai",
    "when": "A real apology, for when you bump into someone or make a mistake."
   },
   {
    "en": "Yes / No",
    "ja": "はい / いいえ",
    "ro": "Hai / Iie",
    "say": "hai / ee-eh",
    "when": "“Iie” on its own can sound blunt. To turn something down, “daijōbu desu” (next) is softer.",
    "tts": "はい。いいえ。"
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "大丈夫です",
    "ro": "Daijōbu desu",
    "say": "dai-joh-boo dess",
    "when": "Politely turn down a bag, a receipt, a refill or a flyer. It also means “it's OK” when someone apologises to you."
   },
   {
    "en": "Please",
    "ja": "お願いします",
    "ro": "Onegaishimasu",
    "say": "oh-neh-gai-shee-mahss",
    "when": "Add it after whatever you are asking for. Pointing at something and saying this is a complete request."
   },
   {
    "en": "I don't understand",
    "ja": "わかりません",
    "ro": "Wakarimasen",
    "say": "wah-kah-ree-mah-sen",
    "when": "When someone speaks to you in Japanese and you are lost. Say it with sumimasen."
   },
   {
    "en": "Do you speak English?",
    "ja": "英語は話せますか？",
    "ro": "Eigo wa hanasemasu ka?",
    "say": "eh-go wah hah-nah-seh-mahss kah",
    "when": "Ask before launching into English. Many people understand more than they are comfortable speaking, so short, simple English helps."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "もう一度、ゆっくりお願いします",
    "ro": "Mō ichido, yukkuri onegaishimasu",
    "say": "moh ee-chee-doh, yook-koo-ree oh-neh-gai-shee-mahss",
    "when": "When you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "トイレはどこですか？",
    "ro": "Toire wa doko desu ka?",
    "say": "toy-reh wah doh-koh dess kah",
    "when": "Stations, department stores and convenience stores all have public toilets."
   },
   {
    "en": "Cheers!",
    "ja": "乾杯",
    "ro": "Kanpai",
    "say": "kahn-pai",
    "when": "Before the first drink. Wait until everyone has a glass."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "4人です",
    "ro": "Yonin desu",
    "say": "yoh-neen dess",
    "when": "The first thing staff ask is how many (“nan-mei sama desu ka?”). Holding up four fingers works too.",
    "tts": "よにんです"
   },
   {
    "en": "Do you have an English menu?",
    "ja": "英語のメニューはありますか？",
    "ro": "Eigo no menyū wa arimasu ka?",
    "say": "eh-go no men-yoo wah ah-ree-mahss kah",
    "when": "Worth asking everywhere. Many places also have picture menus or a tablet with an English button."
   },
   {
    "en": "This one, please",
    "ja": "これをお願いします",
    "ro": "Kore o onegaishimasu",
    "say": "koh-reh oh oh-neh-gai-shee-mahss",
    "when": "Point at the menu, a display dish or a ticket-machine button."
   },
   {
    "en": "Two of these, please",
    "ja": "これを二つお願いします",
    "ro": "Kore o futatsu onegaishimasu",
    "say": "koh-reh oh foo-tah-tsoo oh-neh-gai-shee-mahss",
    "when": "Counting things: hitotsu (1), futatsu (2), mittsu (3), yottsu (4)."
   },
   {
    "en": "I'm vegetarian",
    "ja": "私はベジタリアンです",
    "ro": "Watashi wa bejitarian desu",
    "say": "wah-tah-shee wah beh-jee-tah-ree-ahn dess",
    "when": "A start, but “vegetarian” is often taken loosely and fish stock may not count. Follow it with the next phrase."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "肉と魚は食べません",
    "ro": "Niku to sakana wa tabemasen",
    "say": "nee-koo toh sah-kah-nah wah tah-beh-mah-sen",
    "when": "Clearer than “vegetarian”. Say it when ordering, before the food is made."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "これは肉か魚が入っていますか？",
    "ro": "Kore wa niku ka sakana ga haitte imasu ka?",
    "say": "koh-reh wah nee-koo kah sah-kah-nah gah hite-teh ee-mahss kah",
    "when": "Point at a dish and ask. “Haitte imasu” means it does; “haitte imasen” means it doesn't."
   },
   {
    "en": "Is there fish in the broth, or fish sauce?",
    "ja": "出汁に魚は入っていますか？魚醤は使っていますか？",
    "ro": "Dashi ni sakana wa haitte imasu ka? Gyoshō wa tsukatte imasu ka?",
    "say": "dah-shee nee sah-kah-nah wah hite-teh ee-mahss kah? gyoh-shoh wah tsoo-kaht-teh ee-mahss kah?",
    "when": "Two questions in one: is there fish in the stock, and do you use fish sauce? Dashi (stock) is usually made from bonito flakes and hides in miso soup, noodle broth, sauces and even some vegetable dishes. Gyoshō is fish sauce; in Thai or Vietnamese places ask about “nanpurā” (nam pla) instead.",
    "tts": "だしに魚は入っていますか。ぎょしょうは使っていますか。"
   },
   {
    "en": "Without meat, please",
    "ja": "肉抜きでお願いします",
    "ro": "Niku nuki de onegaishimasu",
    "say": "nee-koo noo-kee deh oh-neh-gai-shee-mahss",
    "when": "Asks them to leave it out. Swap “niku” for “sakana” (fish). Small kitchens may say they can't change a dish."
   },
   {
    "en": "Water, please",
    "ja": "お水をお願いします",
    "ro": "Omizu o onegaishimasu",
    "say": "oh-mee-zoo oh oh-neh-gai-shee-mahss",
    "when": "Water and tea are free in most restaurants."
   },
   {
    "en": "It's delicious",
    "ja": "おいしいです",
    "ro": "Oishii desu",
    "say": "oy-shee dess",
    "when": "Say it to the chef or server. It goes down very well at small counters."
   },
   {
    "en": "Thank you for the meal",
    "ja": "ごちそうさまでした",
    "ro": "Gochisōsama deshita",
    "say": "go-chee-soh-sah-mah desh-tah",
    "when": "Say it to the staff as you leave. It is the standard way to thank them for the food."
   },
   {
    "en": "The bill, please",
    "ja": "お会計お願いします",
    "ro": "Okaikei onegaishimasu",
    "say": "oh-kai-keh oh-neh-gai-shee-mahss",
    "when": "Often you take the slip from your table and pay at the register by the door. There is no tipping."
   },
   {
    "en": "Can I pay by card?",
    "ja": "カードは使えますか？",
    "ro": "Kādo wa tsukaemasu ka?",
    "say": "kah-doh wah tsoo-kah-eh-mahss kah",
    "when": "Small shops, temples and older restaurants can be cash only."
   },
   {
    "en": "To take away, please",
    "ja": "持ち帰りでお願いします",
    "ro": "Mochikaeri de onegaishimasu",
    "say": "moh-chee-kah-eh-ree deh oh-neh-gai-shee-mahss",
    "when": "At cafés and counters they ask whether you are eating in (“tennai de”) or taking away."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Kyoto Station?",
    "ja": "京都駅はどこですか？",
    "ro": "Kyōto-eki wa doko desu ka?",
    "say": "kyoh-toh eh-kee wah doh-koh dess kah",
    "when": "Swap in any place: put its name in front of “wa doko desu ka”. “Eki” means station."
   },
   {
    "en": "Does this train go to Shinjuku?",
    "ja": "この電車は新宿に行きますか？",
    "ro": "Kono densha wa Shinjuku ni ikimasu ka?",
    "say": "koh-no den-shah wah sheen-joo-koo nee ee-kee-mahss kah",
    "when": "Ask station staff or anyone on the platform before you board. Swap in your stop."
   },
   {
    "en": "Which platform?",
    "ja": "何番線ですか？",
    "ro": "Nanban-sen desu ka?",
    "say": "nahn-bahn-sen dess kah",
    "when": "Show your ticket or the station name on your phone as you ask."
   },
   {
    "en": "To here, please",
    "ja": "ここまでお願いします",
    "ro": "Koko made onegaishimasu",
    "say": "koh-koh mah-deh oh-neh-gai-shee-mahss",
    "when": "For taxis. Show the address or map pin on your phone. Taxi doors open and close by themselves."
   },
   {
    "en": "I'm getting off",
    "ja": "降ります",
    "ro": "Orimasu",
    "say": "oh-ree-mahss",
    "when": "On a packed train or bus, say it with sumimasen and people will make room."
   },
   {
    "en": "Is this seat free?",
    "ja": "この席は空いていますか？",
    "ro": "Kono seki wa aite imasu ka?",
    "say": "koh-no seh-kee wah ai-teh ee-mahss kah",
    "when": "For unreserved cars and shared café tables."
   },
   {
    "en": "I'm lost",
    "ja": "道に迷いました",
    "ro": "Michi ni mayoimashita",
    "say": "mee-chee nee mah-yoy-mahsh-tah",
    "when": "Then show where you are trying to go. Police boxes (kōban) near stations help with directions."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "これはいくらですか？",
    "ro": "Kore wa ikura desu ka?",
    "say": "koh-reh wah ee-koo-rah dess kah",
    "when": "Most things have a price tag. Useful at markets and at card shops with unpriced singles."
   },
   {
    "en": "Do you have this?",
    "ja": "これはありますか？",
    "ro": "Kore wa arimasu ka?",
    "say": "koh-reh wah ah-ree-mahss kah",
    "when": "Show a photo on your phone. Works well in card shops, toy shops and camera shops."
   },
   {
    "en": "Tax-free, please",
    "ja": "免税でお願いします",
    "ro": "Menzei de onegaishimasu",
    "say": "men-zeh deh oh-neh-gai-shee-mahss",
    "when": "For ¥5,000 or more at a tax-free shop, with your passport. Through Oct 31, 2026 the tax comes off at the till. From Nov 1, 2026 you pay the full price and claim the tax back at the airport before checking your bags."
   },
   {
    "en": "Can I try this on?",
    "ja": "試着してもいいですか？",
    "ro": "Shichaku shite mo ii desu ka?",
    "say": "shee-chah-koo shteh moh ee dess kah",
    "when": "Take your shoes off in the fitting room."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "もっと大きいサイズはありますか？",
    "ro": "Motto ōkii saizu wa arimasu ka?",
    "say": "mot-toh oh-kee sai-zoo wah ah-ree-mahss kah",
    "when": "Japanese sizes run small. For smaller, say “chiisai” in place of “ōkii”."
   },
   {
    "en": "I don't need a bag",
    "ja": "袋はいりません",
    "ro": "Fukuro wa irimasen",
    "say": "foo-koo-roh wah ee-ree-mah-sen",
    "when": "Cashiers ask whether you want a bag (“fukuro wa?”), which costs a few yen."
   },
   {
    "en": "I'm just looking",
    "ja": "見ているだけです",
    "ro": "Mite iru dake desu",
    "say": "mee-teh ee-roo dah-keh dess",
    "when": "If staff come over to help and you want to browse."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "チェックインをお願いします",
    "ro": "Chekku-in o onegaishimasu",
    "say": "chek-koo een oh oh-neh-gai-shee-mahss",
    "when": "Have passports ready; hotels are required to copy them."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "荷物を預かってもらえますか？",
    "ro": "Nimotsu o azukatte moraemasu ka?",
    "say": "nee-moh-tsoo oh ah-zoo-kaht-teh moh-rah-eh-mahss kah",
    "when": "Before check-in time or after checkout. Nearly every hotel will."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Wi-Fiのパスワードは何ですか？",
    "ro": "Waifai no pasuwādo wa nan desu ka?",
    "say": "wai-fai no pah-soo-wah-doh wah nahn dess kah",
    "when": "Usually on a card in the room.",
    "tts": "ワイファイのパスワードは何ですか"
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "写真を撮ってもいいですか？",
    "ro": "Shashin o totte mo ii desu ka?",
    "say": "shah-sheen oh tot-teh moh ee dess kah",
    "when": "Ask in shops, at shrines and before photographing people. Some shops and temple interiors don't allow it."
   },
   {
    "en": "Could you take our photo?",
    "ja": "写真を撮ってもらえますか？",
    "ro": "Shashin o totte moraemasu ka?",
    "say": "shah-sheen oh tot-teh moh-rah-eh-mahss kah",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Are tattoos OK?",
    "ja": "タトゥーは大丈夫ですか？",
    "ro": "Tatū wa daijōbu desu ka?",
    "say": "tah-too wah dai-joh-boo dess kah",
    "when": "Ask at baths (onsen and sentō), pools and gyms before paying. Many still turn tattooed guests away."
   },
   {
    "en": "Is this OK?",
    "ja": "これは大丈夫ですか？",
    "ro": "Kore wa daijōbu desu ka?",
    "say": "koh-reh wah dai-joh-boo dess kah",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this?"
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "助けてください",
    "ro": "Tasukete kudasai",
    "say": "tah-skeh-teh koo-dah-sai",
    "when": "For real trouble. For a small favour, use sumimasen."
   },
   {
    "en": "I don't feel well",
    "ja": "具合が悪いです",
    "ro": "Guai ga warui desu",
    "say": "goo-eye gah wah-roo-ee dess",
    "when": "Tell hotel or station staff; they can point you to a clinic or pharmacy."
   },
   {
    "en": "Where is a hospital?",
    "ja": "病院はどこですか？",
    "ro": "Byōin wa doko desu ka?",
    "say": "byoh-een wah doh-koh dess kah",
    "when": "For a pharmacy, say “yakkyoku” in place of “byōin”."
   },
   {
    "en": "I lost my passport",
    "ja": "パスポートをなくしました",
    "ro": "Pasupōto o nakushimashita",
    "say": "pah-soo-poh-toh oh nah-koo-shee-mahsh-tah",
    "when": "Swap in “saifu” (wallet) or “keitai” (phone). Go to a police box (kōban); lost things are handed in remarkably often."
   },
   {
    "en": "Please call an ambulance",
    "ja": "救急車を呼んでください",
    "ro": "Kyūkyūsha o yonde kudasai",
    "say": "kyoo-kyoo-shah oh yon-deh koo-dah-sai",
    "when": "Emergency numbers: 119 for ambulance or fire, 110 for police."
   }
  ]
 }
],
};
export default ja;
