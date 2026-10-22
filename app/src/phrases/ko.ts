/* Korean phrase pack. No recorded clips: every phrase uses the phone's own Korean voice.
   The "ja" field holds the Hangul (the field name is historical); "ro" is Revised Romanization. */
import type { PhrasePack } from './types';

const ko: PhrasePack = {
  lang: 'ko',
  speechLang: 'ko-KR',
  name: 'Korean',
  intro: 'Vowels: a “ah”, eo “uh”, o “oh”, u “oo”, eu a short “uh” with lips spread, i “ee”, e and ae both “eh”. Doubled letters (kk, tt, pp, ss, jj) are said tight with no puff of air, and g, d, b, j at the start of a word sound halfway to k, t, p, ch.',
  dictionary: { label: 'Naver dictionary', url: 'https://en.dict.naver.com/#/search?query=' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "안녕하세요",
    "ro": "Annyeonghaseyo",
    "say": "ahn-nyoung-hah-seh-yo",
    "when": "The all-purpose greeting, fine at any time of day. Staff call out “eoseo oseyo” (welcome) as you walk in. You don't need to answer; a nod is fine."
   },
   {
    "en": "Good morning",
    "ja": "좋은 아침이에요",
    "ro": "Joeun achimieyo",
    "say": "joh-un ah-chee-mee-eh-yo",
    "when": "Friendly, but most Koreans just say annyeonghaseyo in the morning too. Either is fine with hotel staff."
   },
   {
    "en": "Goodbye (when you leave)",
    "ja": "안녕히 계세요",
    "ro": "Annyeonghi gyeseyo",
    "say": "ahn-nyoung-hee gyeh-seh-yo",
    "when": "Korean has no separate evening greeting, but it has two goodbyes. Say this one as you leave a shop or restaurant (“stay well”). When the other person is the one leaving, say “annyeonghi gaseyo” (“go well”)."
   },
   {
    "en": "Thank you",
    "ja": "감사합니다",
    "ro": "Gamsahamnida",
    "say": "gahm-sah-hahm-nee-dah",
    "when": "The polite form, right for staff and strangers. “Gomapseumnida” is just as polite. Use it when handed change, when someone holds a door, when leaving a shop."
   },
   {
    "en": "Excuse me",
    "ja": "저기요",
    "ro": "Jeogiyo",
    "say": "juh-gee-yo",
    "when": "Call a waiter or get a stranger's attention; in restaurants it's normal to call out. To squeeze past someone in a crowd, say “jamsimanyo” (one moment, please)."
   },
   {
    "en": "I'm sorry",
    "ja": "죄송합니다",
    "ro": "Joesonghamnida",
    "say": "chweh-song-hahm-nee-dah",
    "when": "A real apology, for when you bump into someone or make a mistake. “Mianhamnida” is a little less formal."
   },
   {
    "en": "Yes / No",
    "ja": "네 / 아니요",
    "ro": "Ne / Aniyo",
    "say": "neh / ah-nee-yo",
    "when": "“Ne” also means “I see” or “OK”, and with a rising tone, “pardon?”. “Aniyo” on its own can sound blunt; to turn something down, “gwaenchanayo” (next) is softer.",
    "tts": "네. 아니요."
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "괜찮아요",
    "ro": "Gwaenchanayo",
    "say": "gwen-chah-nah-yo",
    "when": "Politely turn down a bag, a receipt, a refill or a flyer. It also means “it's OK” when someone apologises to you, and as a question, “are you OK?”."
   },
   {
    "en": "Please (give me)",
    "ja": "주세요",
    "ro": "Juseyo",
    "say": "joo-seh-yo",
    "when": "Put it after whatever you want: “mul juseyo” (water, please). Pointing and saying “igeo juseyo” (this, please) is a complete request."
   },
   {
    "en": "I don't understand",
    "ja": "못 알아들었어요",
    "ro": "Mot aradeureosseoyo",
    "say": "moh-dah-rah-duh-ruh-ssuh-yo",
    "when": "Literally “I didn't catch that”. Follow it with “hangugeo jal mothaeyo” (I don't speak Korean well)."
   },
   {
    "en": "Do you speak English?",
    "ja": "영어 하실 수 있어요?",
    "ro": "Yeongeo hasil su isseoyo?",
    "say": "yung-uh hah-sheel soo ee-ssuh-yo",
    "when": "Ask before launching into English. Many people read English better than they speak it, so short, simple English or a typed message helps. Papago is the translation app most Koreans use."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "다시 한 번 천천히 말씀해 주세요",
    "ro": "Dasi han beon cheoncheonhi malsseumhae juseyo",
    "say": "dah-shee hahn bun chun-chun-hee mahl-ssum-heh joo-seh-yo",
    "when": "When you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "화장실이 어디예요?",
    "ro": "Hwajangsiri eodiyeyo?",
    "say": "hwah-jahng-shee-ree uh-dee-yeh-yo",
    "when": "Subway stations, department stores and big cafés have free toilets. In small buildings the toilet may be shared and locked with a code; ask staff for it."
   },
   {
    "en": "Cheers!",
    "ja": "건배!",
    "ro": "Geonbae!",
    "say": "gun-beh",
    "when": "Before the first drink; with friends, “jjan!” is more casual. Pour for others rather than yourself, and with someone much older, turn your head slightly away as you drink."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "네 명이요",
    "ro": "Ne myeongiyo",
    "say": "neh myung-ee-yo",
    "when": "The first thing staff ask is how many (“myeot buniseyo?”). Holding up four fingers works too."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "영어 메뉴 있어요?",
    "ro": "Yeongeo menyu isseoyo?",
    "say": "yung-uh meh-nyoo ee-ssuh-yo",
    "when": "Worth asking in tourist areas. Many places have picture menus on the wall, or an ordering tablet or kiosk with an English button."
   },
   {
    "en": "This one, please",
    "ja": "이거 주세요",
    "ro": "Igeo juseyo",
    "say": "ee-guh joo-seh-yo",
    "when": "Point at the menu, a picture on the wall or what the next table is eating."
   },
   {
    "en": "Two of these, please",
    "ja": "이거 두 개 주세요",
    "ro": "Igeo du gae juseyo",
    "say": "ee-guh doo geh joo-seh-yo",
    "when": "Counting things: han gae (1), du gae (2), se gae (3), ne gae (4). At barbecue places, meat is ordered by portion (“inbun”), and many ask for at least two."
   },
   {
    "en": "I'm vegetarian",
    "ja": "저는 채식주의자예요",
    "ro": "Jeoneun chaesikjuuijayeyo",
    "say": "juh-nun cheh-sheek-joo-ee-jah-yeh-yo",
    "when": "A start, but vegetarian food is rare and often taken loosely: soups use meat or anchovy stock, and most kimchi has fish sauce or salted shrimp. Follow it with the next phrase."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "고기하고 생선은 안 먹어요",
    "ro": "Gogihago saengseoneun an meogeoyo",
    "say": "goh-gee-hah-goh seng-suh-nun ahn muh-guh-yo",
    "when": "Clearer than “vegetarian”. Say it when ordering, before the food is made. For all seafood, say “haesanmul” in place of “saengseon”."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "이거 고기나 생선 들어가요?",
    "ro": "Igeo gogina saengseon deureogayo?",
    "say": "ee-guh goh-gee-nah seng-sun duh-ruh-gah-yo",
    "when": "Point at a dish and ask. “Deureogayo” means it does; “an deureogayo” means it doesn't."
   },
   {
    "en": "Is the broth made with meat or fish (anchovy)?",
    "ja": "육수에 고기나 멸치가 들어가요?",
    "ro": "Yuksue gogina myeolchiga deureogayo?",
    "say": "yook-soo-eh goh-gee-nah myul-chee-gah duh-ruh-gah-yo",
    "when": "Stews and soups, even vegetable ones like doenjang-jjigae and kimchi-jjigae, usually start from dried anchovy (myeolchi) or beef stock. Kimchi and many side dishes also use fish sauce (aekjeot) or salted shrimp (saeujeot)."
   },
   {
    "en": "Without meat, please",
    "ja": "고기 빼 주세요",
    "ro": "Gogi ppae juseyo",
    "say": "goh-gee ppeh joo-seh-yo",
    "when": "Asks them to leave it out. Swap “gogi” for “saengseon” (fish). Small kitchens may say a dish can't be changed."
   },
   {
    "en": "Water, please",
    "ja": "물 좀 주세요",
    "ro": "Mul jom juseyo",
    "say": "mool jom joo-seh-yo",
    "when": "Water is free, often self-service from a fridge or dispenser (look for “selpeu”, self). Side dishes (banchan) are free and refilled on request."
   },
   {
    "en": "It's delicious",
    "ja": "맛있어요",
    "ro": "Masisseoyo",
    "say": "mah-shee-ssuh-yo",
    "when": "Say it to the cook or server. It goes down very well at small family-run places."
   },
   {
    "en": "Thank you for the meal",
    "ja": "잘 먹었습니다",
    "ro": "Jal meogeotseumnida",
    "say": "jahl muh-guht-ssum-nee-dah",
    "when": "Say it to the staff as you pay or leave. Before eating, people say “jal meokgetseumnida”."
   },
   {
    "en": "The bill, please",
    "ja": "계산해 주세요",
    "ro": "Gyesanhae juseyo",
    "say": "gyeh-sahn-heh joo-seh-yo",
    "when": "Usually you take the bill from your table and pay at the counter by the door. There is no tipping."
   },
   {
    "en": "Can I pay by card?",
    "ja": "카드 돼요?",
    "ro": "Kadeu dwaeyo?",
    "say": "kah-duh dweh-yo",
    "when": "Cards work almost everywhere. Carry some cash for traditional markets and street stalls; some ordering kiosks reject foreign cards, so pay at the counter instead."
   },
   {
    "en": "To take away, please",
    "ja": "포장해 주세요",
    "ro": "Pojanghae juseyo",
    "say": "poh-jahng-heh joo-seh-yo",
    "when": "At cafés they ask whether you are eating in (“deusigo gaseyo?”). Cafés may not serve drinks in takeaway cups to people sitting inside."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Seoul Station?",
    "ja": "서울역이 어디예요?",
    "ro": "Seoullyeogi eodiyeyo?",
    "say": "suh-ool-lyuh-gee uh-dee-yeh-yo",
    "when": "Swap in any place: put its name in front of “eodiyeyo”. “Yeok” means station. Naver Map and KakaoMap give far better directions in Korea than Google Maps."
   },
   {
    "en": "Does this train go to Busan?",
    "ja": "이 기차 부산 가요?",
    "ro": "I gicha Busan gayo?",
    "say": "ee gee-chah boo-sahn gah-yo",
    "when": "Swap in your stop. For the subway, say “jihacheol” in place of “gicha”: “I jihacheol Hongdae-ipgu gayo?”. On the KTX your car (“hocha”) and seat are on the ticket."
   },
   {
    "en": "Which platform?",
    "ja": "몇 번 타는 곳이에요?",
    "ro": "Myeot beon taneun gosieyo?",
    "say": "myut bun tah-nun goh-shee-eh-yo",
    "when": "Show your ticket as you ask. On the subway, check the direction by the next station's name on the sign."
   },
   {
    "en": "To here, please",
    "ja": "여기로 가 주세요",
    "ro": "Yeogiro ga juseyo",
    "say": "yuh-gee-roh gah joo-seh-yo",
    "when": "For taxis. Show the address in Korean on your phone; drivers often type it straight into their navigation. Kakao T is the app for calling one."
   },
   {
    "en": "I'm getting off",
    "ja": "내릴게요",
    "ro": "Naerilgeyo",
    "say": "neh-reel-geh-yo",
    "when": "On a packed train or bus, say it with “jamsimanyo” and people will make room. On buses, tap your card again as you get off, or you lose the transfer discount."
   },
   {
    "en": "Is this seat taken?",
    "ja": "여기 자리 있어요?",
    "ro": "Yeogi jari isseoyo?",
    "say": "yuh-gee jah-ree ee-ssuh-yo",
    "when": "“Isseoyo” means it's taken; “eopseoyo” means it's free. On the subway, leave the pink seats for pregnant women and the end seats for older people."
   },
   {
    "en": "I'm lost",
    "ja": "길을 잃었어요",
    "ro": "Gireul ireosseoyo",
    "say": "gee-rul ee-ruh-ssuh-yo",
    "when": "Then show where you are trying to go. The 1330 Korea travel hotline answers in English, day and night."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "이거 얼마예요?",
    "ro": "Igeo eolmayeyo?",
    "say": "ee-guh ul-mah-yeh-yo",
    "when": "Most shops have price tags. Useful at markets and street stalls."
   },
   {
    "en": "Do you have this?",
    "ja": "이거 있어요?",
    "ro": "Igeo isseoyo?",
    "say": "ee-guh ee-ssuh-yo",
    "when": "Show a photo on your phone. Works well in cosmetics shops, pharmacies and bookshops."
   },
   {
    "en": "Can I get the tax refund?",
    "ja": "택스 리펀드 돼요?",
    "ro": "Taekseu ripeondeu dwaeyo?",
    "say": "tek-suh ree-pun-duh dweh-yo",
    "when": "At shops with a Tax Free sign, show your passport. Many take the tax off at the till; otherwise you get a receipt to claim at a refund kiosk at the airport before checking your bags."
   },
   {
    "en": "Can I try this on?",
    "ja": "입어 봐도 돼요?",
    "ro": "Ibeo bwado dwaeyo?",
    "say": "ee-buh bwah-doh dweh-yo",
    "when": "For shoes, “sineo bwado dwaeyo?”. Fitting rooms often give you a face cover to keep makeup off the clothes, and some market stalls don't allow trying on."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "더 큰 사이즈 있어요?",
    "ro": "Deo keun saijeu isseoyo?",
    "say": "duh keun sai-juh ee-ssuh-yo",
    "when": "Korean sizes run small, and many shops sell only “free size” (one size). For smaller, say “deo jageun” in place of “deo keun”."
   },
   {
    "en": "I don't need a bag",
    "ja": "봉투는 필요 없어요",
    "ro": "Bongtuneun piryo eopseoyo",
    "say": "bong-too-nun pee-ryoh up-ssuh-yo",
    "when": "Cashiers ask whether you want a bag (“bongtu piryohaseyo?”); bags cost a little extra."
   },
   {
    "en": "I'm just looking",
    "ja": "그냥 구경하는 거예요",
    "ro": "Geunyang gugyeonghaneun geoyeyo",
    "say": "guh-nyahng goo-gyung-hah-nun guh-yeh-yo",
    "when": "If staff come over to help and you want to browse. Cosmetics shop staff follow you closely; this is normal."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "체크인하려고요",
    "ro": "Chekeuinharyeogoyo",
    "say": "cheh-kuh-een-hah-ryuh-goh-yo",
    "when": "Have passports ready; hotels ask to see them."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "짐 좀 맡아 주실 수 있어요?",
    "ro": "Jim jom mata jusil su isseoyo?",
    "say": "jeem jom mah-tah joo-sheel soo ee-ssuh-yo",
    "when": "Before check-in time or after checkout. Nearly every hotel will; big subway stations have lockers too."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "와이파이 비밀번호가 뭐예요?",
    "ro": "Waipai bimilbeonhoga mwoyeyo?",
    "say": "wai-pai bee-meel-bun-hoh-gah mwuh-yeh-yo",
    "when": "Usually on a card in the room. Cafés often print it on the receipt."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "사진 찍어도 돼요?",
    "ro": "Sajin jjigeodo dwaeyo?",
    "say": "sah-jeen jjee-guh-doh dweh-yo",
    "when": "Ask in shops, inside temples and before photographing people. Some shops and cafés don't allow it."
   },
   {
    "en": "Could you take our photo?",
    "ja": "사진 좀 찍어 주실 수 있어요?",
    "ro": "Sajin jom jjigeo jusil su isseoyo?",
    "say": "sah-jeen jom jjee-guh joo-sheel soo ee-ssuh-yo",
    "when": "Hand over the phone with the camera already open. People often take several to be safe."
   },
   {
    "en": "Are tattoos OK?",
    "ja": "문신 있어도 괜찮아요?",
    "ro": "Munsin isseodo gwaenchanayo?",
    "say": "moon-sheen ee-ssuh-doh gwen-chah-nah-yo",
    "when": "Ask at jjimjilbang (bathhouse spas), saunas, pools and gyms before paying. Most bathhouses are fine with small ones, but some spas and hotel pools turn tattooed guests away or ask you to cover them."
   },
   {
    "en": "Is this OK?",
    "ja": "이래도 돼요?",
    "ro": "Iraedo dwaeyo?",
    "say": "ee-reh-doh dweh-yo",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this? In a jjimjilbang, the baths are single-sex and you bathe naked; you wear the clothes they give you in the shared rooms."
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "도와주세요",
    "ro": "Dowajuseyo",
    "say": "doh-wah-joo-seh-yo",
    "when": "For real trouble. For a small favour, start with “jeogiyo”."
   },
   {
    "en": "I don't feel well",
    "ja": "몸이 안 좋아요",
    "ro": "Momi an joayo",
    "say": "moh-mee ahn joh-ah-yo",
    "when": "Tell hotel or station staff; they can point you to a clinic or pharmacy."
   },
   {
    "en": "Where is a hospital?",
    "ja": "병원이 어디예요?",
    "ro": "Byeongwoni eodiyeyo?",
    "say": "byung-wuh-nee uh-dee-yeh-yo",
    "when": "For a pharmacy, say “yakguk” in place of “byeongwon”; look for the big 약 sign."
   },
   {
    "en": "I lost my passport",
    "ja": "여권을 잃어버렸어요",
    "ro": "Yeogwoneul ireobeoryeosseoyo",
    "say": "yuh-gwuh-nul ee-ruh-buh-ryuh-ssuh-yo",
    "when": "Swap in “jigap” (wallet) or “haendeupon” (phone). Go to a police box (“pachulso”); lost things are often handed in and listed on lost112.go.kr."
   },
   {
    "en": "Please call an ambulance",
    "ja": "구급차 불러 주세요",
    "ro": "Gugeupcha bulleo juseyo",
    "say": "goo-guhp-chah bool-luh joo-seh-yo",
    "when": "Emergency numbers: 119 for ambulance or fire, 112 for police. 1330 is the travel hotline, in English."
   }
  ]
 }
],
};
export default ko;
