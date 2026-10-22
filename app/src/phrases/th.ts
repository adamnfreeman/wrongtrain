/* Thai phrase pack. No recorded clips: every phrase uses the phone's own Thai voice. "tts" reads
   both polite endings with a pause (ครับ, then ค่ะ or คะ) so the voice doesn't read out the slash. */
import type { PhrasePack } from './types';

const th: PhrasePack = {
  lang: 'th',
  speechLang: 'th-TH',
  name: 'Thai',
  intro: 'Thai has five tones, and the marks show them: à low, â falling, á high, ǎ rising, no mark level; get them roughly right and point, and you will be understood. End almost every phrase with khráp if you are a man or khâ if you are a woman (khá in a question): it makes anything polite.',
  dictionary: { label: 'thai-language.com', url: 'http://www.thai-language.com/dict?action=search&search=' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "สวัสดีครับ / ค่ะ",
    "ro": "Sà-wàt-dii khráp / khâ",
    "say": "sah-waht-dee krahp / kah",
    "when": "Hello and goodbye, at any time of day. If someone greets you with a wai (palms together, a small bow), return it; you don't need to wai shop or hotel staff first.",
    "tts": "สวัสดีครับ ค่ะ"
   },
   {
    "en": "Good morning",
    "ja": "อรุณสวัสดิ์ครับ / ค่ะ",
    "ro": "À-run sà-wàt khráp / khâ",
    "say": "ah-roon sah-waht krahp / kah",
    "when": "Correct but formal, like a morning TV host. Most Thais just say sawatdii at any hour, and so can you.",
    "tts": "อรุณสวัสดิ์ครับ ค่ะ"
   },
   {
    "en": "Good night",
    "ja": "ราตรีสวัสดิ์ครับ / ค่ะ",
    "ro": "Raa-trii sà-wàt khráp / khâ",
    "say": "rah-tree sah-waht krahp / kah",
    "when": "Thai has no everyday “good evening”: sawatdii covers it. This is “good night”, a little formal, for parting late or at bedtime.",
    "tts": "ราตรีสวัสดิ์ครับ ค่ะ"
   },
   {
    "en": "Thank you",
    "ja": "ขอบคุณครับ / ค่ะ",
    "ro": "Khàwp-khun khráp / khâ",
    "say": "kop-koon krahp / kah",
    "when": "Use it constantly: when handed change, when someone helps, when leaving a shop. “Khàwp-khun mâak” is “thank you very much”.",
    "tts": "ขอบคุณครับ ค่ะ"
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "ขอโทษครับ / ค่ะ",
    "ro": "Khǎw-thôot khráp / khâ",
    "say": "kor-toht krahp / kah",
    "when": "Squeeze past someone, get a stranger's attention, or apologise for something small. To call a server, this or a raised hand works; Thais often call young staff “nóng”.",
    "tts": "ขอโทษครับ ค่ะ"
   },
   {
    "en": "I'm sorry",
    "ja": "ขอโทษจริงๆ ครับ / ค่ะ",
    "ro": "Khǎw-thôot jing-jing khráp / khâ",
    "say": "kor-toht jing-jing krahp / kah",
    "when": "A real apology, for when you bump into someone or make a mistake. Stay calm and smile: raising your voice embarrasses everyone.",
    "tts": "ขอโทษจริงๆ ครับ ค่ะ"
   },
   {
    "en": "Yes / No",
    "ja": "ใช่ / ไม่ใช่",
    "ro": "Châi / Mâi châi",
    "say": "chai / my chai",
    "when": "Literally “that's right / that's not right”. A plain khráp or khâ on its own is also a polite “yes”.",
    "tts": "ใช่ ไม่ใช่"
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "ไม่เป็นไร ขอบคุณครับ / ค่ะ",
    "ro": "Mâi pen rai, khàwp-khun khráp / khâ",
    "say": "my pen rye, kop-koon krahp / kah",
    "when": "Politely turn down a bag, a straw, a refill or a tuk-tuk ride. “Mâi pen rai” on its own (“never mind, no problem”) is also the reply when someone apologises or thanks you.",
    "tts": "ไม่เป็นไร ขอบคุณครับ ค่ะ"
   },
   {
    "en": "Please (may I have…)",
    "ja": "ขอ…หน่อยครับ / ค่ะ",
    "ro": "Khǎw … nòi khráp / khâ",
    "say": "kor … noy krahp / kah",
    "when": "Put what you want in the middle: “khǎw náam nòi khâ” is “water, please”. Pointing and saying “khǎw an-níi” (this one) is a complete request.",
    "tts": "ขอ หน่อยครับ ค่ะ"
   },
   {
    "en": "I don't understand",
    "ja": "ไม่เข้าใจครับ / ค่ะ",
    "ro": "Mâi khâo-jai khráp / khâ",
    "say": "my cow-jai krahp / kah",
    "when": "When someone speaks Thai to you and you are lost. Say it with a smile; people will usually switch to gestures or a translation app.",
    "tts": "ไม่เข้าใจครับ ค่ะ"
   },
   {
    "en": "Do you speak English?",
    "ja": "พูดภาษาอังกฤษได้ไหมครับ / คะ",
    "ro": "Phûut phaa-sǎa ang-grìt dâai mǎi khráp / khá?",
    "say": "poot pah-sah ahng-grit dai my krahp / kah",
    "when": "Ask before switching to English. In tourist areas many people do; elsewhere, short simple English or a translation app works best.",
    "tts": "พูดภาษาอังกฤษได้ไหมครับ คะ"
   },
   {
    "en": "Once more, slowly, please",
    "ja": "พูดอีกครั้ง ช้าๆ หน่อยได้ไหมครับ / คะ",
    "ro": "Phûut ìik khráng, cháa-cháa nòi dâai mǎi khráp / khá?",
    "say": "poot eek krahng, chah-chah noy dai my krahp / kah",
    "when": "When you nearly caught it.",
    "tts": "พูดอีกครั้ง ช้าๆ หน่อยได้ไหมครับ คะ"
   },
   {
    "en": "Where is the toilet?",
    "ja": "ห้องน้ำอยู่ที่ไหนครับ / คะ",
    "ro": "Hâwng-náam yùu thîi-nǎi khráp / khá?",
    "say": "hong-nahm yoo tee-nye krahp / kah",
    "when": "Malls and big stations have the cleanest. Many toilets have a hose instead of paper, and some charge a few baht, so carry tissues and coins.",
    "tts": "ห้องน้ำอยู่ที่ไหนครับ คะ"
   },
   {
    "en": "Cheers!",
    "ja": "ชนแก้ว",
    "ro": "Chon gâew",
    "say": "chon gaow",
    "when": "Literally “bump glasses”. Friends keep topping each other up, so leave your glass full when you've had enough."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "สี่คนครับ / ค่ะ",
    "ro": "Sìi khon khráp / khâ",
    "say": "see kon krahp / kah",
    "when": "The first thing staff ask is how many (“kìi thân?”). Holding up four fingers works too.",
    "tts": "สี่คนครับ ค่ะ"
   },
   {
    "en": "Do you have an English menu?",
    "ja": "มีเมนูภาษาอังกฤษไหมครับ / คะ",
    "ro": "Mii mee-nuu phaa-sǎa ang-grìt mǎi khráp / khá?",
    "say": "mee meh-noo pah-sah ahng-grit my krahp / kah",
    "when": "Most places in tourist areas have one, often with pictures. Street stalls may have no menu at all: point at what others are eating.",
    "tts": "มีเมนูภาษาอังกฤษไหมครับ คะ"
   },
   {
    "en": "This one, please",
    "ja": "เอาอันนี้ครับ / ค่ะ",
    "ro": "Ao an-níi khráp / khâ",
    "say": "ow ahn-nee krahp / kah",
    "when": "Point at the menu, a photo or the food on the cart. “Ao” (I'll take) is the everyday way to order.",
    "tts": "เอาอันนี้ครับ ค่ะ"
   },
   {
    "en": "Two of these, please",
    "ja": "เอาอันนี้สองที่ครับ / ค่ะ",
    "ro": "Ao an-níi sǎwng thîi khráp / khâ",
    "say": "ow ahn-nee song tee krahp / kah",
    "when": "“Thîi” counts plates. Numbers: nùeng (1), sǎwng (2), sǎam (3), sìi (4), hâa (5).",
    "tts": "เอาอันนี้สองที่ครับ ค่ะ"
   },
   {
    "en": "I'm vegetarian",
    "ja": "กินมังสวิรัติครับ / ค่ะ",
    "ro": "Kin mang-sà-wí-rát khráp / khâ",
    "say": "gin mahng-sah-wee-raht krahp / kah",
    "when": "Understood in restaurants, but fish sauce and shrimp paste often don't count, so follow it with the next phrases. A yellow flag with a red “เจ” (jay) means vegan food, with no garlic or onion either.",
    "tts": "กินมังสวิรัติครับ ค่ะ"
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "ไม่กินเนื้อสัตว์และปลาครับ / ค่ะ",
    "ro": "Mâi kin núea-sàt láe plaa khráp / khâ",
    "say": "my gin nua-saht lae plah krahp / kah",
    "when": "Clearer than “vegetarian”. Say the whole “núea-sàt” (any meat): “núea” on its own usually means beef.",
    "tts": "ไม่กินเนื้อสัตว์และปลาครับ ค่ะ"
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "อันนี้ใส่เนื้อสัตว์หรือปลาไหมครับ / คะ",
    "ro": "An-níi sài núea-sàt rǔe plaa mǎi khráp / khá?",
    "say": "ahn-nee sai nua-saht ruh plah my krahp / kah",
    "when": "Point at a dish and ask. “Sài” means it has it; “mâi sài” means it doesn't.",
    "tts": "อันนี้ใส่เนื้อสัตว์หรือปลาไหมครับ คะ"
   },
   {
    "en": "Is there fish sauce or shrimp paste in it?",
    "ja": "ใส่น้ำปลาหรือกะปิไหมครับ / คะ",
    "ro": "Sài náam-plaa rǔe kà-pì mǎi khráp / khá?",
    "say": "sai nahm-plah ruh gah-pee my krahp / kah",
    "when": "Náam-plaa (fish sauce) and kà-pì (shrimp paste) hide in curry pastes, dips, som tam and “vegetable” stir-fries, which often get oyster sauce too. Soy sauce (sii-íu) is the usual swap.",
    "tts": "ใส่น้ำปลาหรือกะปิไหมครับ คะ"
   },
   {
    "en": "Without meat, please",
    "ja": "ไม่ใส่เนื้อสัตว์ครับ / ค่ะ",
    "ro": "Mâi sài núea-sàt khráp / khâ",
    "say": "my sai nua-saht krahp / kah",
    "when": "Asks them to leave it out; most dishes are cooked to order, so it's easy. Swap in “plaa” (fish) or “náam-plaa” (fish sauce); for not spicy, say “mâi phèt”.",
    "tts": "ไม่ใส่เนื้อสัตว์ครับ ค่ะ"
   },
   {
    "en": "Water, please",
    "ja": "ขอน้ำเปล่าครับ / ค่ะ",
    "ro": "Khǎw náam-plàao khráp / khâ",
    "say": "kor nahm-plow krahp / kah",
    "when": "“Plàao” means plain. Don't drink tap water; restaurant water comes in bottles, often for a few baht, and the ice is made from purified water.",
    "tts": "ขอน้ำเปล่าครับ ค่ะ"
   },
   {
    "en": "It's delicious",
    "ja": "อร่อยมากครับ / ค่ะ",
    "ro": "À-ròi mâak khráp / khâ",
    "say": "ah-roy mahk krahp / kah",
    "when": "Say it to the cook or server, especially at a street stall. It always gets a smile.",
    "tts": "อร่อยมากครับ ค่ะ"
   },
   {
    "en": "I'm full, thank you so much",
    "ja": "อิ่มแล้ว ขอบคุณมากครับ / ค่ะ",
    "ro": "Ìm láew, khàwp-khun mâak khráp / khâ",
    "say": "eem laow, kop-koon mahk krahp / kah",
    "when": "Thai has no set phrase for after a meal, so this is how to thank a host or cook. “Ìm láew” also politely turns down more food.",
    "tts": "อิ่มแล้ว ขอบคุณมากครับ ค่ะ"
   },
   {
    "en": "The bill, please",
    "ja": "เช็คบิลครับ / ค่ะ",
    "ro": "Chék bin khráp / khâ",
    "say": "check bin krahp / kah",
    "when": "Or catch the server's eye and draw a small rectangle in the air. Tipping isn't expected; leaving the coins is a nice touch.",
    "tts": "เช็คบิลครับ ค่ะ"
   },
   {
    "en": "Can I pay by card?",
    "ja": "จ่ายบัตรได้ไหมครับ / คะ",
    "ro": "Jàai bàt dâai mǎi khráp / khá?",
    "say": "jai baht dai my krahp / kah",
    "when": "Street food, markets and small shops are cash only (or a Thai QR code). Some places add about 3% for cards.",
    "tts": "จ่ายบัตรได้ไหมครับ คะ"
   },
   {
    "en": "To take away, please",
    "ja": "เอากลับบ้านครับ / ค่ะ",
    "ro": "Ao klàp bâan khráp / khâ",
    "say": "ow glahp bahn krahp / kah",
    "when": "Literally “take home”. Staff ask “thaan thîi-nîi rǔe klàp bâan?” (eat here or take away?); street food comes in bags, with the sauce tied in its own little bag.",
    "tts": "เอากลับบ้านครับ ค่ะ"
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Siam Station?",
    "ja": "สถานีสยามอยู่ที่ไหนครับ / คะ",
    "ro": "Sà-thǎa-nii Sà-yǎam yùu thîi-nǎi khráp / khá?",
    "say": "sah-tah-nee sah-yahm yoo tee-nye krahp / kah",
    "when": "Swap in any place: put its name before “yùu thîi-nǎi”. “Sà-thǎa-nii” means station; Siam is where the two main BTS Skytrain lines meet.",
    "tts": "สถานีสยามอยู่ที่ไหนครับ คะ"
   },
   {
    "en": "Does this train go to Ayutthaya?",
    "ja": "รถไฟขบวนนี้ไปอยุธยาไหมครับ / คะ",
    "ro": "Rót-fai khà-buan níi pai À-yút-thá-yaa mǎi khráp / khá?",
    "say": "rot-fai kah-boo-un nee pie ah-yoot-tah-yah my krahp / kah",
    "when": "Ask staff or anyone on the platform before you board, and swap in your stop. Most trains to Ayutthaya leave from Krung Thep Aphiwat, Bangkok's main station.",
    "tts": "รถไฟขบวนนี้ไปอยุธยาไหมครับ คะ"
   },
   {
    "en": "Which platform?",
    "ja": "ชานชาลาที่เท่าไหร่ครับ / คะ",
    "ro": "Chaan-chaa-laa thîi thâo-rài khráp / khá?",
    "say": "chahn-chah-lah tee tao-rye krahp / kah",
    "when": "Show your ticket or the station name on your phone as you ask. On the BTS and MRT, follow the signs for the last station in your direction.",
    "tts": "ชานชาลาที่เท่าไหร่ครับ คะ"
   },
   {
    "en": "To here, please",
    "ja": "ไปที่นี่ครับ / ค่ะ",
    "ro": "Pai thîi-nîi khráp / khâ",
    "say": "pie tee-nee krahp / kah",
    "when": "For taxis and tuk-tuks: show the map pin on your phone. In a taxi ask for the meter (“pòet mii-tôe dûai”); agree a tuk-tuk's price before you get in.",
    "tts": "ไปที่นี่ครับ ค่ะ"
   },
   {
    "en": "I'm getting off",
    "ja": "ขอลงครับ / ค่ะ",
    "ro": "Khǎw long khráp / khâ",
    "say": "kor long krahp / kah",
    "when": "Tell the driver of a bus or songthaew (or press the buzzer). On a packed train, “khǎw thaang nòi” (make way, please) gets people moving.",
    "tts": "ขอลงครับ ค่ะ"
   },
   {
    "en": "Is this seat free?",
    "ja": "ที่นั่งนี้ว่างไหมครับ / คะ",
    "ro": "Thîi-nâng níi wâang mǎi khráp / khá?",
    "say": "tee-nahng nee wahng my krahp / kah",
    "when": "For shared tables at food courts and markets. On trains and boats, give up seats to monks, older people and anyone pregnant.",
    "tts": "ที่นั่งนี้ว่างไหมครับ คะ"
   },
   {
    "en": "I'm lost",
    "ja": "หลงทางครับ / ค่ะ",
    "ro": "Lǒng thaang khráp / khâ",
    "say": "long tahng krahp / kah",
    "when": "Then show where you are trying to go. The Tourist Police (call 1155) speak English and help visitors.",
    "tts": "หลงทางครับ ค่ะ"
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "อันนี้เท่าไหร่ครับ / คะ",
    "ro": "An-níi thâo-rài khráp / khá?",
    "say": "ahn-nee tao-rye krahp / kah",
    "when": "At markets a friendly haggle is normal; malls, 7-Eleven and food stalls have fixed prices.",
    "tts": "อันนี้เท่าไหร่ครับ คะ"
   },
   {
    "en": "Do you have this?",
    "ja": "มีอันนี้ไหมครับ / คะ",
    "ro": "Mii an-níi mǎi khráp / khá?",
    "say": "mee ahn-nee my krahp / kah",
    "when": "Show a photo on your phone. Works well at pharmacies, markets and mall shops.",
    "tts": "มีอันนี้ไหมครับ คะ"
   },
   {
    "en": "The VAT refund form, please",
    "ja": "ขอแบบฟอร์มคืนภาษีครับ / ค่ะ",
    "ro": "Khǎw bàep-fawm khuen phaa-sǐi khráp / khâ",
    "say": "kor bairp-form koon pah-see krahp / kah",
    "when": "In shops with a “VAT Refund for Tourists” sign, spend 2,000 baht or more in a day and show your passport. At the airport, get the forms stamped by customs before checking your bags (5,000 baht in all, at least).",
    "tts": "ขอแบบฟอร์มคืนภาษีครับ ค่ะ"
   },
   {
    "en": "Can I try this on?",
    "ja": "ลองได้ไหมครับ / คะ",
    "ro": "Lawng dâai mǎi khráp / khá?",
    "say": "long dai my krahp / kah",
    "when": "Malls have fitting rooms; market stalls often don't, but may let you hold it up or try a top over your clothes.",
    "tts": "ลองได้ไหมครับ คะ"
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "มีไซซ์ใหญ่กว่านี้ไหมครับ / คะ",
    "ro": "Mii sai yài kwàa níi mǎi khráp / khá?",
    "say": "mee sai yai gwah nee my krahp / kah",
    "when": "Thai sizes run small. For smaller, say “lék” in place of “yài”.",
    "tts": "มีไซซ์ใหญ่กว่านี้ไหมครับ คะ"
   },
   {
    "en": "I don't need a bag",
    "ja": "ไม่เอาถุงครับ / ค่ะ",
    "ro": "Mâi ao thǔng khráp / khâ",
    "say": "my ow toong krahp / kah",
    "when": "Market stalls hand out plastic bags freely. Big chains like 7-Eleven stopped giving free ones, so carry a tote.",
    "tts": "ไม่เอาถุงครับ ค่ะ"
   },
   {
    "en": "I'm just looking",
    "ja": "ดูเฉยๆ ครับ / ค่ะ",
    "ro": "Duu chǒei-chǒei khráp / khâ",
    "say": "doo choey-choey krahp / kah",
    "when": "When a seller follows you round the stall. Said with a smile, it usually ends the pitch.",
    "tts": "ดูเฉยๆ ครับ ค่ะ"
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "ขอเช็คอินครับ / ค่ะ",
    "ro": "Khǎw chék-in khráp / khâ",
    "say": "kor check-in krahp / kah",
    "when": "Have passports ready; hotels must register foreign guests. Many also take a deposit, by card or cash.",
    "tts": "ขอเช็คอินครับ ค่ะ"
   },
   {
    "en": "Can you hold our bags?",
    "ja": "ฝากกระเป๋าไว้ได้ไหมครับ / คะ",
    "ro": "Fàak krà-pǎo wái dâai mǎi khráp / khá?",
    "say": "fahk grah-pow wai dai my krahp / kah",
    "when": "Before check-in time or after checkout. Nearly every hotel will.",
    "tts": "ฝากกระเป๋าไว้ได้ไหมครับ คะ"
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "รหัสไวไฟอะไรครับ / คะ",
    "ro": "Rá-hàt wai-fai à-rai khráp / khá?",
    "say": "rah-haht wai-fai ah-rye krahp / kah",
    "when": "Usually on a card in the room. Cafés often print it on the receipt.",
    "tts": "รหัสไวไฟอะไรครับ คะ"
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "ถ่ายรูปได้ไหมครับ / คะ",
    "ro": "Thàai rûup dâai mǎi khráp / khá?",
    "say": "tie roop dai my krahp / kah",
    "when": "Ask before photographing people, monks included, and inside temple halls: some, like the Emerald Buddha's at the Grand Palace, don't allow it.",
    "tts": "ถ่ายรูปได้ไหมครับ คะ"
   },
   {
    "en": "Could you take our photo?",
    "ja": "ช่วยถ่ายรูปให้หน่อยได้ไหมครับ / คะ",
    "ro": "Chûai thàai rûup hâi nòi dâai mǎi khráp / khá?",
    "say": "chooay tie roop hai noy dai my krahp / kah",
    "when": "Hand over the phone with the camera already open.",
    "tts": "ช่วยถ่ายรูปให้หน่อยได้ไหมครับ คะ"
   },
   {
    "en": "I have tattoos. Is that OK?",
    "ja": "มีรอยสัก เข้าได้ไหมครับ / คะ",
    "ro": "Mii roi-sàk, khâo dâai mǎi khráp / khá?",
    "say": "mee roy-sahk, cow dai my krahp / kah",
    "when": "Tattoos are rarely a problem in Thailand; this checks at a spa, pool or gym. In temples, cover shoulders and knees, and cover any tattoo of the Buddha: it can give real offence.",
    "tts": "มีรอยสัก เข้าได้ไหมครับ คะ"
   },
   {
    "en": "Is this OK?",
    "ja": "แบบนี้ได้ไหมครับ / คะ",
    "ro": "Bàep níi dâai mǎi khráp / khá?",
    "say": "bairp nee dai my krahp / kah",
    "when": "An all-purpose check: is it OK to sit here, to wear this into a temple, to bring this in? Shoes come off before temple halls and many homes and small shops.",
    "tts": "แบบนี้ได้ไหมครับ คะ"
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "ช่วยด้วย",
    "ro": "Chûai dûai!",
    "say": "chooay dooay",
    "when": "Shout it in real trouble. For a small favour, start with khǎw-thôot."
   },
   {
    "en": "I don't feel well",
    "ja": "ไม่สบายครับ / ค่ะ",
    "ro": "Mâi sà-baai khráp / khâ",
    "say": "my sah-bye krahp / kah",
    "when": "Tell hotel staff. Pharmacies are everywhere, and pharmacists can help with small things and often speak some English.",
    "tts": "ไม่สบายครับ ค่ะ"
   },
   {
    "en": "Where is a hospital?",
    "ja": "โรงพยาบาลอยู่ที่ไหนครับ / คะ",
    "ro": "Roong-phá-yaa-baan yùu thîi-nǎi khráp / khá?",
    "say": "rohng-pah-yah-bahn yoo tee-nye krahp / kah",
    "when": "Private hospitals in the cities are very good and used to foreigners; bring your passport and insurance details. For a pharmacy, say “ráan khǎai yaa”.",
    "tts": "โรงพยาบาลอยู่ที่ไหนครับ คะ"
   },
   {
    "en": "I lost my passport",
    "ja": "หนังสือเดินทางหายครับ / ค่ะ",
    "ro": "Nǎng-sǔe doen-thaang hǎai khráp / khâ",
    "say": "nahng-sue dern-tahng hai krahp / kah",
    "when": "Swap in “krà-pǎo sà-taang” (wallet) or “mue-thǔe” (phone). Report it to the Tourist Police (1155) and get a police report for your embassy and insurer.",
    "tts": "หนังสือเดินทางหายครับ ค่ะ"
   },
   {
    "en": "Please call an ambulance",
    "ja": "ช่วยเรียกรถพยาบาลด้วยครับ / ค่ะ",
    "ro": "Chûai rîak rót-phá-yaa-baan dûai khráp / khâ",
    "say": "chooay ree-uhk rot-pah-yah-bahn dooay krahp / kah",
    "when": "Emergency numbers: 1669 for an ambulance, 191 for police, 199 for fire, 1155 for the English-speaking Tourist Police.",
    "tts": "ช่วยเรียกรถพยาบาลด้วยครับ ค่ะ"
   }
  ]
 }
],
};
export default th;
