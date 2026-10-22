/* Mandarin phrase pack, in simplified characters as used in mainland China. There are no recorded
   clips: every phrase uses the phone's own voice. ("ja" holds the Chinese; the field name is historical.) */
import type { PhrasePack } from './types';

const zh: PhrasePack = {
  lang: 'zh',
  speechLang: 'zh-CN',
  name: 'Mandarin',
  intro: 'Mandarin has four tones, shown by the mark over a vowel: ā high and flat, á rising, ǎ dipping, à falling. They change the meaning, but context and pointing carry you a long way. In pinyin, x sounds like “sh”, q like “ch”, zh like “j”, c like “ts” and z like “dz”.',
  dictionary: { label: 'MDBG dictionary', url: 'https://www.mdbg.net/chinese/dictionary?wdqb=' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "你好",
    "ro": "Nǐ hǎo",
    "say": "nee how",
    "when": "Works at any time of day. “Nín hǎo” (您好) is more polite, for older people and hotel staff. Shop staff may call out “huānyíng guānglín” (welcome) as you walk in; a nod is fine."
   },
   {
    "en": "Good morning",
    "ja": "早上好",
    "ro": "Zǎoshang hǎo",
    "say": "dzow-shahng how",
    "when": "Until about 10 AM. Friends and colleagues often say just “zǎo” (早)."
   },
   {
    "en": "Good evening",
    "ja": "晚上好",
    "ro": "Wǎnshang hǎo",
    "say": "wahn-shahng how",
    "when": "Heard more in hotels and on TV than on the street. Nǐ hǎo is fine after dark too."
   },
   {
    "en": "Thank you",
    "ja": "谢谢",
    "ro": "Xièxie",
    "say": "shyeh-shyeh",
    "when": "Use it often: when handed something, when someone helps you, when leaving a shop. For a big thank you, “fēicháng gǎnxiè” (非常感谢)."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "不好意思",
    "ro": "Bù hǎoyìsi",
    "say": "boo how-ee-suh",
    "when": "The most useful phrase to learn. Get a stranger's attention, squeeze past someone, or apologise for something small. To call a waiter, “fúwùyuán” (服务员) is normal and not rude."
   },
   {
    "en": "I'm sorry",
    "ja": "对不起",
    "ro": "Duìbuqǐ",
    "say": "dway-boo-chee",
    "when": "A real apology, for when you bump into someone or make a mistake."
   },
   {
    "en": "Yes / No",
    "ja": "是 / 不是",
    "ro": "Shì / Bú shì",
    "say": "shir / boo shir",
    "when": "Mandarin has no single yes or no: people repeat the verb. “Yǒu / méiyǒu” is “there is / there isn't”, “duì / bú duì” is “right / not right”.",
    "tts": "是。不是。"
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "不用了，谢谢",
    "ro": "Bú yòng le, xièxie",
    "say": "boo yong luh, shyeh-shyeh",
    "when": "Politely turn down a bag, a receipt, a refill or a flyer. When someone apologises to you, “méi guānxi” (没关系) means “it's OK”."
   },
   {
    "en": "Please",
    "ja": "请",
    "ro": "Qǐng",
    "say": "ching",
    "when": "It goes at the start: “qǐng gěi wǒ…” (please give me…). Pointing and saying “zhège” (this one) is a complete request. To ask a favour, start with “máfan nǐ” (麻烦你, sorry to trouble you)."
   },
   {
    "en": "I don't understand",
    "ja": "我听不懂",
    "ro": "Wǒ tīng bu dǒng",
    "say": "waw ting boo dong",
    "when": "Literally “I hear but don't understand”, for when someone speaks to you in Chinese. Say it with bù hǎoyìsi."
   },
   {
    "en": "Do you speak English?",
    "ja": "你会说英语吗？",
    "ro": "Nǐ huì shuō Yīngyǔ ma?",
    "say": "nee hway shwaw ying-yoo mah",
    "when": "Young people in big cities often understand some. A translation app helps; Google Translate needs roaming data or a foreign eSIM in mainland China."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "请再说一遍，慢一点",
    "ro": "Qǐng zài shuō yí biàn, màn yìdiǎn",
    "say": "ching dzai shwaw ee byen, mahn ee-dyen",
    "when": "When you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "洗手间在哪里？",
    "ro": "Xǐshǒujiān zài nǎlǐ?",
    "say": "shee-show-jyen dzai nah-lee",
    "when": "“Cèsuǒ” (厕所) works too. Carry tissues: many public toilets have no paper, and squat toilets are common outside hotels and malls."
   },
   {
    "en": "Cheers!",
    "ja": "干杯",
    "ro": "Gānbēi",
    "say": "gahn-bay",
    "when": "Literally “dry the glass”, so at a dinner it can mean drink it all. Touch your glass a little lower than your host's or an older person's, as a sign of respect."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "四个人",
    "ro": "Sì ge rén",
    "say": "suh guh ren",
    "when": "The first thing staff ask is how many (“jǐ wèi?”). Holding up four fingers works too."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "有英文菜单吗？",
    "ro": "Yǒu Yīngwén càidān ma?",
    "say": "yo ying-wen tsai-dahn mah",
    "when": "Often there isn't one, but many menus have pictures. Many places take orders by scanning a QR code on the table with WeChat or Alipay, which your phone's camera can translate."
   },
   {
    "en": "This one, please",
    "ja": "我要这个",
    "ro": "Wǒ yào zhège",
    "say": "waw yow jay-guh",
    "when": "Point at the menu, a picture or a dish on someone else's table."
   },
   {
    "en": "Two of these, please",
    "ja": "这个来两份",
    "ro": "Zhège lái liǎng fèn",
    "say": "jay-guh lie lyahng fen",
    "when": "“Fèn” means portions. Counting: yī (1), liǎng (2; not “èr” when counting things), sān (3), sì (4). Dishes in China are for sharing, so order about one per person plus rice."
   },
   {
    "en": "I'm vegetarian",
    "ja": "我吃素",
    "ro": "Wǒ chī sù",
    "say": "waw chir soo",
    "when": "A start, but dishes may be cooked in lard or meat stock, or have a little minced pork. Follow it with the next phrase. Buddhist vegetarian restaurants (素食餐厅) are the safest bet."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "我不吃肉，也不吃鱼",
    "ro": "Wǒ bù chī ròu, yě bù chī yú",
    "say": "waw boo chir roh, yeh boo chir yoo",
    "when": "Clearer than “vegetarian”; “ròu” on its own often means pork. Say it when ordering, before the food is made."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "这个有没有肉或者鱼？",
    "ro": "Zhège yǒu méiyǒu ròu huòzhě yú?",
    "say": "jay-guh yo may-yo roh hwaw-juh yoo",
    "when": "Point at a dish and ask. “Yǒu” means it does; “méiyǒu” means it doesn't."
   },
   {
    "en": "Is the broth made with meat or fish?",
    "ja": "汤底有没有用肉或者鱼？",
    "ro": "Tāngdǐ yǒu méiyǒu yòng ròu huòzhě yú?",
    "say": "tahng-dee yo may-yo yong roh hwaw-juh yoo",
    "when": "Noodle soups, hotpot and many vegetable dishes use pork or chicken stock. At hotpot, a mushroom broth (菌汤) is a good choice, but ask about it too: it can still be made with chicken stock."
   },
   {
    "en": "Without meat, please",
    "ja": "不要放肉",
    "ro": "Bú yào fàng ròu",
    "say": "boo yow fahng roh",
    "when": "Asks them to leave it out. Swap “ròu” for “yú” (fish). Also handy: “bú yào là” (not spicy) and “shǎo là” (a little spicy)."
   },
   {
    "en": "Water, please",
    "ja": "请给我一杯水",
    "ro": "Qǐng gěi wǒ yì bēi shuǐ",
    "say": "ching gay waw ee bay shway",
    "when": "Restaurants usually bring hot water or tea, free. For cold, ask for “bīng shuǐ” (ice water); not every place has it. Don't drink the tap water."
   },
   {
    "en": "It's delicious",
    "ja": "很好吃",
    "ro": "Hěn hǎochī",
    "say": "hun how-chir",
    "when": "Say it to the chef or server. For a drink, “hǎohē” (好喝)."
   },
   {
    "en": "Thank you for the meal",
    "ja": "谢谢你的款待",
    "ro": "Xièxie nǐ de kuǎndài",
    "say": "shyeh-shyeh nee duh kwahn-dye",
    "when": "For when someone has treated you or cooked for you. In a restaurant there is no set phrase: a “xièxie, hěn hǎochī” as you leave is perfect."
   },
   {
    "en": "The bill, please",
    "ja": "买单",
    "ro": "Mǎidān",
    "say": "my-dahn",
    "when": "“Jiézhàng” (结账) works too. Often you pay at the counter, or by scanning the QR code on the table. There is no tipping in mainland China."
   },
   {
    "en": "Can I pay by card?",
    "ja": "可以刷卡吗？",
    "ro": "Kěyǐ shuā kǎ ma?",
    "say": "kuh-yee shwah kah mah",
    "when": "Most of China pays by phone with WeChat Pay or Alipay, and many small places take nothing else. Both accept foreign cards now: set one up before you go, and carry some cash as a backup."
   },
   {
    "en": "To take away, please",
    "ja": "我要打包",
    "ro": "Wǒ yào dǎbāo",
    "say": "waw yow dah-bow",
    "when": "Also how you ask to box up leftovers, which is normal. At cafés they may ask “zài zhèr chī háishi dàizǒu?” (eat here or take away?)."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Beijing Railway Station?",
    "ja": "北京站在哪里？",
    "ro": "Běijīng Zhàn zài nǎlǐ?",
    "say": "bay-jing jahn dzai nah-lee",
    "when": "Swap in any place: put its name in front of “zài nǎlǐ”. Big cities have several main stations (Beijing South, Shanghai Hongqiao), so check the one on your ticket."
   },
   {
    "en": "Does this train go to Tiananmen East?",
    "ja": "这趟车到天安门东吗？",
    "ro": "Zhè tàng chē dào Tiān'ānmén Dōng ma?",
    "say": "jay tahng chuh dow tyen-ahn-mun dong mah",
    "when": "Ask staff or anyone on the platform before you board. Swap in your stop. Metro signs and announcements in big cities are in English too, and there is a bag check at every entrance."
   },
   {
    "en": "Which platform?",
    "ja": "几号站台？",
    "ro": "Jǐ hào zhàntái?",
    "say": "jee how jahn-tie",
    "when": "At big stations you wait in a hall and board through a numbered gate shown on the screens: ask “jǐ hào jiǎnpiàokǒu?” (which gate?). Show your train number as you ask."
   },
   {
    "en": "To here, please",
    "ja": "师傅，去这里",
    "ro": "Shīfu, qù zhèlǐ",
    "say": "shir-foo, chew jay-lee",
    "when": "For taxis. “Shīfu” is the polite way to address a driver. Show the address in Chinese characters on your phone; drivers rarely read English or pinyin. DiDi works in English inside Alipay."
   },
   {
    "en": "I'm getting off",
    "ja": "我要下车",
    "ro": "Wǒ yào xià chē",
    "say": "waw yow shyah chuh",
    "when": "On a packed metro or bus, say it with bù hǎoyìsi and move toward the doors early."
   },
   {
    "en": "Is this seat free?",
    "ja": "这里有人吗？",
    "ro": "Zhèlǐ yǒu rén ma?",
    "say": "jay-lee yo ren mah",
    "when": "Literally “is someone here?”, so “méiyǒu” means it's free. For café tables and buses; seats on fast trains are reserved."
   },
   {
    "en": "I'm lost",
    "ja": "我迷路了",
    "ro": "Wǒ mí lù le",
    "say": "waw mee loo luh",
    "when": "Then show where you are going in Chinese characters. Amap (Gaode) or Apple Maps work best in China; Google Maps is often out of date there."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "这个多少钱？",
    "ro": "Zhège duōshao qián?",
    "say": "jay-guh dwaw-shaow chyen",
    "when": "At markets and street stalls, haggling is expected: start well below and meet in the middle. Not in malls or chain shops."
   },
   {
    "en": "Do you have this?",
    "ja": "有这个吗？",
    "ro": "Yǒu zhège ma?",
    "say": "yo jay-guh mah",
    "when": "Show a photo on your phone. “Yǒu” means yes, “méiyǒu” means no."
   },
   {
    "en": "Tax refund, please",
    "ja": "我要办退税",
    "ro": "Wǒ yào bàn tuìshuì",
    "say": "waw yow bahn tway-shway",
    "when": "At shops with a Tax Refund sign, for 200 yuan or more in one shop on one day, with your passport. Keep the form and invoice and have them checked at the airport before you check your bags. Some shops refund on the spot."
   },
   {
    "en": "Can I try this on?",
    "ja": "可以试一下吗？",
    "ro": "Kěyǐ shì yíxià ma?",
    "say": "kuh-yee shir ee-shyah mah",
    "when": "The fitting room is the “shìyījiān” (试衣间)."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "有大一点的吗？",
    "ro": "Yǒu dà yìdiǎn de ma?",
    "say": "yo dah ee-dyen duh mah",
    "when": "Chinese sizes run small, often by one or two. For smaller, say “xiǎo” in place of “dà”."
   },
   {
    "en": "I don't need a bag",
    "ja": "不用袋子",
    "ro": "Bú yòng dàizi",
    "say": "boo yong dye-dzuh",
    "when": "Cashiers ask whether you want a bag (“yào dàizi ma?”), which costs a little."
   },
   {
    "en": "I'm just looking",
    "ja": "我随便看看",
    "ro": "Wǒ suíbiàn kànkan",
    "say": "waw sway-byen kahn-kahn",
    "when": "If staff come over to help and you want to browse. Useful at markets where sellers call out."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "我要办入住",
    "ro": "Wǒ yào bàn rùzhù",
    "say": "waw yow bahn roo-joo",
    "when": "Have passports ready: hotels register foreign guests with the police. Some cheap hotels can't take foreigners, so book ones that say they do."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "可以寄存行李吗？",
    "ro": "Kěyǐ jìcún xíngli ma?",
    "say": "kuh-yee jee-tsun shing-lee mah",
    "when": "Before check-in time or after checkout. Nearly every hotel will."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Wi-Fi密码是多少？",
    "ro": "Wi-Fi mìmǎ shì duōshao?",
    "say": "wai-fai mee-mah shir dwaw-shaow",
    "when": "Literally “what number is the password?”, as they usually are. Google, WhatsApp and Instagram are blocked on Chinese Wi-Fi; roaming data or a foreign eSIM gets round it."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "可以拍照吗？",
    "ro": "Kěyǐ pāizhào ma?",
    "say": "kuh-yee pie-jaow mah",
    "when": "Ask before photographing people, and inside temples and museums. Some halls and exhibits don't allow it."
   },
   {
    "en": "Could you take our photo?",
    "ja": "能帮我们拍张照吗？",
    "ro": "Néng bāng wǒmen pāi zhāng zhào ma?",
    "say": "nung bahng waw-men pie jahng jaow mah",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Are tattoos OK?",
    "ja": "有纹身可以泡温泉吗？",
    "ro": "Yǒu wénshēn kěyǐ pào wēnquán ma?",
    "say": "yo wun-shun kuh-yee pow wun-chwen mah",
    "when": "Literally “can I use the hot springs with tattoos?”. Most bathhouses and spas don't mind, but some hot springs, pools and gyms turn away visible tattoos, so ask before paying."
   },
   {
    "en": "Is this OK?",
    "ja": "这样可以吗？",
    "ro": "Zhèyàng kěyǐ ma?",
    "say": "jay-yahng kuh-yee mah",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this?"
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "请帮帮我",
    "ro": "Qǐng bāngbang wǒ",
    "say": "ching bahng-bahng waw",
    "when": "In real danger, shout “jiùmìng!” (救命, help!). For a small favour, use bù hǎoyìsi."
   },
   {
    "en": "I don't feel well",
    "ja": "我不舒服",
    "ro": "Wǒ bù shūfu",
    "say": "waw boo shoo-foo",
    "when": "Tell hotel staff; they can point you to a clinic. Pharmacies (药店) are everywhere, with a green cross."
   },
   {
    "en": "Where is a hospital?",
    "ja": "医院在哪里？",
    "ro": "Yīyuàn zài nǎlǐ?",
    "say": "ee-ywen dzai nah-lee",
    "when": "For a pharmacy, say “yàodiàn” in place of “yīyuàn”. Big city hospitals often have an international clinic with English-speaking doctors; you usually pay up front."
   },
   {
    "en": "I lost my passport",
    "ja": "我的护照丢了",
    "ro": "Wǒ de hùzhào diū le",
    "say": "waw duh hoo-jaow dyo luh",
    "when": "Swap in “qiánbāo” (wallet) or “shǒujī” (phone). For a passport, get a loss report from the police, then contact your embassy; you also need a new exit visa before you can leave."
   },
   {
    "en": "Please call an ambulance",
    "ja": "请叫救护车",
    "ro": "Qǐng jiào jiùhùchē",
    "say": "ching jyaow jyo-hoo-chuh",
    "when": "Emergency numbers: 120 for ambulance, 110 for police, 119 for fire."
   }
  ]
 }
],
};
export default zh;
