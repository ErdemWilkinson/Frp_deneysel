// Büyüler kitabı ve büyü hileleri kitabı: SRD 5.1 (CC-BY 4.0) büyülerinin kısa, özgün Türkçe özetleri.
// Satır biçimi: en | tr | seviye | okul | süre | menzil | bileşenler | etki süresi | sınıflar | özet

export const SPELL_SCHOOLS = ['A', 'C', 'D', 'N', 'E', 'I', 'X', 'T'] as const;
export type SpellSchool = (typeof SPELL_SCHOOLS)[number];
export const SPELL_SCHOOL_TR: Record<SpellSchool, string> = {
  A: 'Koruma', C: 'Çağırma', D: 'Kehanet', N: 'Büyüleme', E: 'Tezahür', I: 'Yanılsama', X: 'Ölüm büyüsü', T: 'Dönüşüm',
};

export const SPELL_CLASSES = ['B', 'C', 'D', 'P', 'R', 'S', 'L', 'W'] as const;
export type SpellClass = (typeof SPELL_CLASSES)[number];
export const SPELL_CLASS_TR: Record<SpellClass, string> = {
  B: 'Bard', C: 'Rahip', D: 'Druid', P: 'Paladin', R: 'Korucu', S: 'Sorcerer', L: 'Warlock', W: 'Sihirbaz',
};
export const SPELL_COMPONENT_TR: Record<string, string> = { V: 'Sözel', S: 'Hareket', M: 'Malzeme' };

export interface Spell {
  id: string;
  name: { en: string; tr: string };
  /** 0 = büyü hilesi. */
  level: number;
  school: SpellSchool;
  time: string;
  range: string;
  components: string[];
  duration: string;
  classes: SpellClass[];
  summary: string;
}

const ROWS = `
Acid Splash|Asit Sıçraması|0|C|1 eylem|60 fit|V,S|Anlık|S,W|Yakındaki iki hedeften her biri çeviklik kurtarmasında başarısız olursa asit hasarı alır.
Chill Touch|Soğuk Dokunuş|0|X|1 eylem|120 fit|V,S|1 tur|S,L,W|Hayalet bir el hedefe soğuk hasar verir; hedef bir tur boyunca iyileşemez.
Dancing Lights|Dans Eden Işıklar|0|E|1 eylem|120 fit|V,S,M|1 dakika, odaklanma|B,S,W|Dört meşale ışığı kadar parlayan ışık küresi yaratır ve yerini değiştirebilir.
Druidcraft|Doğa Hüneri|0|T|1 eylem|30 fit|V,S|Anlık|D|Hava tahmini yapar, bitkiyi çiçeklendirir ya da küçük bir doğa etkisi yaratır.
Eldritch Blast|Ürpertici Patlama|0|E|1 eylem|120 fit|V,S|Anlık|L|Hedefe büyü saldırısıyla güç hasarı veren bir ışın fırlatır; seviye atladıkça ışın sayısı artar.
Fire Bolt|Ateş Oku|0|E|1 eylem|120 fit|V,S|Anlık|S,W|Hedefe büyü saldırısıyla ateş hasarı verir; yanıcı nesneleri tutuşturabilir.
Guidance|Yol Gösterme|0|D|1 eylem|Dokunma|V,S|1 dakika, odaklanma|C,D|Dokunulan yaratık bir yetenek kontrolüne ek bir d4 ekleyebilir.
Light|Işık|0|E|1 eylem|Dokunma|V,M|1 saat|B,C,S,W|Bir nesne 20 fit çevresini parlak ışıkla aydınlatır.
Mage Hand|Büyücü Eli|0|C|1 eylem|30 fit|V,S|1 dakika|B,S,L,W|Hayalet bir el küçük nesneleri taşır, kapı açar ya da kap kaldırır.
Mending|Onarım|0|T|1 dakika|Dokunma|V,S,M|Anlık|B,C,D,S,W|Nesnedeki tek bir yırtık ya da kırığı onarır.
Message|Fısıltı|0|T|1 eylem|120 fit|V,S,M|1 tur|B,S,W|Hedefe duyulmadan fısıltı gönderir; hedef de aynı şekilde yanıtlayabilir.
Minor Illusion|Küçük Yanılsama|0|I|1 eylem|30 fit|S,M|1 dakika|B,S,L,W|Bir ses ya da küçük bir nesne görüntüsü yaratır.
Poison Spray|Zehir Püskürtmesi|0|C|1 eylem|10 fit|V,S|Anlık|D,S,L,W|Hedef dayanıklılık kurtarmasında başarısız olursa zehir hasarı alır.
Prestidigitation|Küçük Hüner|0|T|1 eylem|10 fit|V,S|1 saat|B,S,L,W|Temizleme, ısıtma, tatlandırma ve benzeri küçük hileler yapar.
Produce Flame|Alev Yaratma|0|C|1 eylem|Kendi|V,S|10 dakika|D|Elde ışık veren bir alev belirir; fırlatılarak ateş hasarı verir.
Ray of Frost|Don Işını|0|E|1 eylem|60 fit|V,S|Anlık|S,W|Hedefe büyü saldırısıyla soğuk hasar verir ve hızını düşürür.
Resistance|Direnç|0|A|1 eylem|Dokunma|V,S,M|1 dakika, odaklanma|C,D|Dokunulan yaratık bir kurtarmaya ek bir d4 ekleyebilir.
Sacred Flame|Kutsal Alev|0|E|1 eylem|60 fit|V,S|Anlık|C|Hedef çeviklik kurtarmasında başarısız olursa ışıma hasarı alır; örtü işe yaramaz.
Shillelagh|Meşe Sopa|0|T|1 bonus eylem|Dokunma|V,S,M|1 dakika|D|Sopa ya da asa büyülü olur ve saldırıda bilgelik değeri kullanılır.
Shocking Grasp|Elektrik Pençesi|0|E|1 eylem|Dokunma|V,S|Anlık|S,W|Dokunuşla elektrik hasarı verir; metal zırhlı hedeflere karşı üstünlük sağlar.
Spare the Dying|Ölmekte Olanı Esirge|0|X|1 eylem|Dokunma|V,S|Anlık|C|Can puanı 0 olan yaratığı dengeler.
Thaumaturgy|Mucize Gösterisi|0|T|1 eylem|30 fit|V|1 dakika|C|Sesi gürleştirmek, alevleri titretmek gibi küçük ilahi belirtiler yaratır.
True Strike|Kesin Vuruş|0|D|1 eylem|30 fit|S|1 tur, odaklanma|B,S,L,W|Hedefe yöneltilen bir sonraki saldırıda üstünlük sağlar.
Vicious Mockery|Zalim Alay|0|N|1 eylem|60 fit|V|Anlık|B|Hedef bilgelik kurtarmasında başarısız olursa psişik hasar alır ve sonraki saldırısında dezavantaj yaşar.
Alarm|Alarm|1|A|1 dakika|30 fit|V,S,M|8 saat|R,W|Bir alanı korur; biri girince zihinsel ya da sesli uyarı verir.
Bane|Lanet|1|N|1 eylem|30 fit|V,S,M|1 dakika, odaklanma|B,C|Üç hedef saldırı ve kurtarmalarından d4 çıkarır.
Bless|Kutsama|1|N|1 eylem|30 fit|V,S,M|1 dakika, odaklanma|C,P|Üç hedef saldırı ve kurtarmalarına d4 ekler.
Burning Hands|Yanan Eller|1|E|1 eylem|Kendi (15 fit koni)|V,S|Anlık|S,W|Koni içindeki yaratıklar çeviklik kurtarmasında başarısız olursa ateş hasarı alır.
Charm Person|İnsanı Büyüle|1|N|1 eylem|30 fit|V,S|1 saat|B,D,S,L,W|Bir hümanoid seni dost görür; büyü bitince büyülendiğini anlar.
Command|Emir|1|N|1 eylem|60 fit|V|1 tur|C,P|Hedefe tek kelimelik bir emir verir; hedef başarısız olursa uyar.
Comprehend Languages|Dilleri Anla|1|D|1 eylem|Kendi|V,S,M|1 saat|B,S,L,W|Duyduğun ya da okuduğun her dili anlarsın.
Cure Wounds|Yaraları Sar|1|E|1 eylem|Dokunma|V,S|Anlık|B,C,D,P,R|Dokunulan yaratığın can puanını iyileştirir.
Detect Evil and Good|Kötü ve İyiyi Sez|1|D|1 eylem|Kendi|V,S|10 dakika, odaklanma|C,P|Yakındaki ölümsüz, şeytan ve melek gibi varlıkları hissedersin.
Detect Magic|Büyüyü Sez|1|D|1 eylem|Kendi|V,S|10 dakika, odaklanma|B,C,D,P,R,S,W|Yakındaki büyüyü hissedersin ve okulunu görebilirsin.
Disguise Self|Kılık Değiştir|1|I|1 eylem|Kendi|V,S|1 saat|B,S,W|Kendi görünüşünü ve giysini değiştirirsin.
Entangle|Dolaştır|1|C|1 eylem|90 fit|V,S|1 dakika, odaklanma|D|Otlar ve sarmaşıklar alandaki yaratıkları kısıtlar.
Faerie Fire|Peri Ateşi|1|E|1 eylem|60 fit|V|1 dakika, odaklanma|B,D|Alandaki nesneler ışıldar; hedeflere saldırılar üstünlükle yapılır.
Feather Fall|Tüy Gibi Düş|1|T|1 tepki|60 fit|V,M|1 dakika|B,S,W|Beş yaratığın düşüş hızını yavaşlatır, düşme hasarı almazlar.
Fog Cloud|Sis Bulutu|1|C|1 eylem|120 fit|V,S|1 saat, odaklanma|D,R,S,W|Bir bölgeyi görüşü kapatan sisle doldurur.
Goodberry|Hayırlı Yemiş|1|T|1 eylem|Dokunma|V,S,M|Anlık|D,R|On yemiş yaratırsın; her biri bir can puanı iyileştirir ve gün boyu doyurur.
Grease|Yağ|1|C|1 eylem|60 fit|V,S,M|1 dakika|W|Zemin kayganlaşır; alandakiler düşebilir.
Guiding Bolt|Yol Gösteren Işın|1|E|1 eylem|120 fit|V,S|1 tur|C|Hedefe ışıma hasarı verir; hedefe sonraki saldırı üstünlükle yapılır.
Healing Word|İyileştiren Söz|1|E|1 bonus eylem|60 fit|V|Anlık|B,C,D|Görebildiğin bir yaratığın can puanını iyileştirir.
Hellish Rebuke|Cehennem Misillemesi|1|E|1 tepki|60 fit|V,S|Anlık|L|Sana hasar veren yaratığa ateş hasarı geri döner.
Heroism|Kahramanlık|1|N|1 eylem|Dokunma|V,S|1 dakika, odaklanma|B,P|Hedef korkudan etkilenmez ve her tur geçici can puanı kazanır.
Hunter's Mark|Avcı İşareti|1|D|1 bonus eylem|90 fit|V|1 saat, odaklanma|R|İşaretli hedefe isabetli saldırılar ek hasar verir.
Identify|Tanı|1|D|1 dakika|Dokunma|V,S,M|Anlık|B,W|Büyülü bir nesnenin ya da büyünün özelliklerini öğrenirsin.
Jump|Zıpla|1|T|1 eylem|Dokunma|V,S,M|1 dakika|D,R,S,W|Hedefin zıplama mesafesi üç katına çıkar.
Longstrider|Uzun Adım|1|T|1 eylem|Dokunma|V,S,M|1 saat|B,D,R,W|Hedefin hızı 10 fit artar.
Mage Armor|Büyücü Zırhı|1|A|1 eylem|Dokunma|V,S,M|8 saat|S,W|Zırhsız hedefin zırh sınıfı 13 + çeviklik değiştiricisi olur.
Magic Missile|Büyülü Ok|1|E|1 eylem|120 fit|V,S|Anlık|S,W|Üç ok kaçmadan isabet eder ve her biri güç hasarı verir.
Protection from Evil and Good|Kötü ve İyiden Korunma|1|A|1 eylem|Dokunma|V,S,M|10 dakika, odaklanma|C,P,L,W|Hedef şeytan, ölümsüz gibi varlıkların saldırılarına karşı korunur.
Sanctuary|Sığınak|1|A|1 bonus eylem|30 fit|V,S,M|1 dakika|C|Saldırmak isteyen yaratık önce bilgelik kurtarması yapmak zorundadır.
Shield|Kalkan|1|A|1 tepki|Kendi|V,S|1 tur|S,W|Zırh sınıfın +5 olur ve büyülü ok'u engeller.
Shield of Faith|İnanç Kalkanı|1|A|1 bonus eylem|60 fit|V,S,M|10 dakika, odaklanma|C,P|Hedefin zırh sınıfı +2 artar.
Silent Image|Sessiz Görüntü|1|I|1 eylem|60 fit|V,S,M|10 dakika, odaklanma|B,S,W|Sessiz bir görüntü yaratırsın; nesneye dokunan kişi gerçek olmadığını fark eder.
Sleep|Uyku|1|N|1 eylem|90 fit|V,S,M|1 dakika|B,S,W|Can puanı düşük yaratıklar uykuya dalar.
Speak with Animals|Hayvanlarla Konuş|1|D|1 eylem|Kendi|V,S|10 dakika|B,D,R|Hayvanlarla konuşur ve onları anlarsın.
Thunderwave|Gök Gürültüsü|1|E|1 eylem|Kendi (15 fit küp)|V,S|Anlık|B,D,S,W|Yaratıklar itilir ve gürleme hasarı alır; ses 300 fit öteden duyulur.
Unseen Servant|Görünmez Hizmetkâr|1|C|1 dakika|60 fit|V,S,M|1 saat|B,L,W|Basit işleri yapan görünmez bir güç belirir.
Aid|Yardım|2|A|1 eylem|30 fit|V,S,M|8 saat|C,P|Üç yaratığın en yüksek can puanı 5 artar.
Alter Self|Biçim Değiştir|2|T|1 eylem|Kendi|V,S|1 saat, odaklanma|S,W|Görünüşünü değiştirir, solungaç ya da doğal silah kazanırsın.
Barkskin|Ağaç Kabuğu|2|T|1 eylem|Dokunma|V,S,M|1 saat, odaklanma|D,R|Hedefin zırh sınıfı en az 16 olur.
Blur|Bulanıklaş|2|I|1 eylem|Kendi|V|1 dakika, odaklanma|S,W|Sana yapılan saldırılar dezavantajla yapılır.
Calm Emotions|Duyguları Yatıştır|2|N|1 eylem|60 fit|V,S|1 dakika, odaklanma|B,C|Alandaki hümanoidlerin korku ve düşmanlığını bastırır.
Cloud of Daggers|Hançer Bulutu|2|C|1 eylem|60 fit|V,S,M|1 dakika, odaklanma|B,S,L,W|Dönen hançerler alana giren yaratıklara kesici hasar verir.
Darkness|Karanlık|2|E|1 eylem|60 fit|V,M|10 dakika, odaklanma|S,L,W|Alanı büyülü karanlıkla doldurur; sıradan ışık ve karanlıkgörüşü işe yaramaz.
Darkvision|Karanlıkgörüşü|2|T|1 eylem|Dokunma|V,S,M|8 saat|D,R,S,W|Hedef karanlıkta 60 fit görür.
Detect Thoughts|Düşünceleri Oku|2|D|1 eylem|Kendi|V,S,M|1 dakika, odaklanma|B,S,W|Yakındaki yaratıkların yüzeydeki düşüncelerini okursun.
Enhance Ability|Yeteneği Güçlendir|2|T|1 eylem|Dokunma|V,S,M|1 saat, odaklanma|B,C,D,R,S|Hedefin seçilen yetenek kontrollerinde üstünlük olur.
Flaming Sphere|Alev Küresi|2|C|1 eylem|60 fit|V,S,M|1 dakika, odaklanma|D,W|Hareket ettirebildiğin alev küresi yanındakilere ateş hasarı verir.
Gust of Wind|Rüzgâr Esintisi|2|E|1 eylem|Kendi (60 fit çizgi)|V,S,M|1 dakika, odaklanma|D,R,S,W|Güçlü rüzgâr yaratıkları iter ve alevleri söndürür.
Hold Person|İnsanı Dondur|2|N|1 eylem|60 fit|V,S,M|1 dakika, odaklanma|B,C,D,S,L,W|Hümanoid bilgelik kurtarmasında başarısız olursa felç olur.
Invisibility|Görünmezlik|2|I|1 eylem|Dokunma|V,S,M|1 saat, odaklanma|B,S,L,W|Hedef saldırı yapana ya da büyü kullanana dek görünmez olur.
Knock|Kilit Aç|2|T|1 eylem|60 fit|V|Anlık|B,W|Kilitli ya da mühürlü bir kapı, sandık ya da zinciri açar.
Lesser Restoration|Küçük İyileşme|2|A|1 eylem|Dokunma|V,S|Anlık|B,C,D,P,R|Hedefteki bir hastalığı ya da kör, sağır, felç, zehirli durumunu kaldırır.
Levitate|Havalan|2|T|1 eylem|60 fit|V,S,M|10 dakika, odaklanma|S,W|Bir yaratığı ya da nesneyi havada yükseltir.
Magic Weapon|Büyülü Silah|2|T|1 bonus eylem|Dokunma|V,S|1 saat, odaklanma|P,W|Silah +1 büyülü olur.
Mirror Image|Ayna Görüntüsü|2|I|1 eylem|Kendi|V,S|1 dakika|S,L,W|Üç hayalet kopya saldırıları şaşırtır.
Misty Step|Sisli Adım|2|C|1 bonus eylem|Kendi|V|Anlık|S,L,W|Görebildiğin 30 fit içindeki boş bir yere ışınlanırsın.
Moonbeam|Ay Işığı|2|E|1 eylem|120 fit|V,S,M|1 dakika, odaklanma|D|Alanda ışıma hasarı veren ay ışığı sütunu belirir.
Pass without Trace|İz Bırakmadan Geç|2|A|1 eylem|Kendi|V,S,M|1 saat, odaklanma|D,R|Yakın çevrendeki herkes gizlilikte +10 alır ve iz bırakmaz.
Prayer of Healing|Şifa Duası|2|E|10 dakika|30 fit|V|Anlık|C,P|Altı yaratığın can puanını iyileştirir.
Protection from Poison|Zehirden Korunma|2|A|1 eylem|Dokunma|V,S|1 saat|C,D,P,R|Zehri etkisizleştirir ve zehir hasarına direnç verir.
Ray of Enfeeblement|Zayıflatma Işını|2|X|1 eylem|60 fit|V,S|1 dakika, odaklanma|L,W|Hedefin kuvvet temelli saldırı hasarı yarıya düşer.
Scorching Ray|Yakıcı Işın|2|E|1 eylem|120 fit|V,S|Anlık|S,W|Üç ateş ışını fırlatır; her biri büyü saldırısıyla ateş hasarı verir.
See Invisibility|Görünmezi Gör|2|D|1 eylem|Kendi|V,S,M|1 saat|B,S,W|Görünmez yaratık ve nesneleri görürsün.
Shatter|Paramparça|2|E|1 eylem|60 fit|V,S,M|Anlık|B,S,L,W|Alanda şiddetli bir gürültü gürleme hasarı verir.
Silence|Sessizlik|2|I|1 eylem|120 fit|V,S|10 dakika, odaklanma|B,C,R|Alanda hiçbir ses çıkmaz; sözel bileşenli büyüler yapılamaz.
Spider Climb|Örümcek Tırmanışı|2|T|1 eylem|Dokunma|V,S,M|1 saat, odaklanma|S,L,W|Hedef duvarlara ve tavana tırmanır.
Spiritual Weapon|Ruhani Silah|2|E|1 bonus eylem|60 fit|V,S|1 dakika|C|Süzülen bir silah bonus eylemle saldırır ve güç hasarı verir.
Suggestion|Telkin|2|N|1 eylem|30 fit|V,M|8 saat, odaklanma|B,S,L,W|Hedefe makul bir hareket tarzı telkin edersin.
Web|Ağ|2|C|1 eylem|60 fit|V,S,M|1 saat, odaklanma|S,W|Alanı yapışkan ağlarla doldurur ve yaratıkları kısıtlar.
Zone of Truth|Gerçek Bölgesi|2|N|1 eylem|60 fit|V,S|10 dakika|B,C,P|Alandakiler bilerek yalan söyleyemez.
Animate Dead|Ölüleri Diriltme|3|X|1 dakika|10 fit|V,S,M|Anlık|C,W|Bir iskelet ya da zombi yaratırsın.
Beacon of Hope|Umut Feneri|3|A|1 eylem|30 fit|V,S|1 dakika, odaklanma|C|Hedefler kurtarmalarda üstünlük kazanır, iyileşmeler azami olur.
Bestow Curse|Lanet Ver|3|X|1 eylem|Dokunma|V,S|1 dakika, odaklanma|B,C,W|Hedefe zayıflatan bir lanet yüklersin.
Call Lightning|Yıldırım Çağır|3|C|1 eylem|120 fit|V,S|10 dakika, odaklanma|D|Fırtına bulutu yaratır ve her tur yıldırım düşürürsün.
Clairvoyance|Uzak Görü|3|D|10 dakika|1 mil|V,S,M|10 dakika, odaklanma|B,C,S,W|Tanıdığın bir yerde görünmez bir algılayıcı kurar, oradan görür ya da duyarsın.
Counterspell|Büyüyü Boz|3|A|1 tepki|60 fit|S|Anlık|S,L,W|Büyü yapan yaratığın büyüsünü iptal edersin.
Create Food and Water|Yiyecek ve Su Yarat|3|C|1 eylem|30 fit|V,S|Anlık|C,P|On beş kişiyi bir gün doyurmaya yetecek yiyecek ve su yaratır.
Daylight|Gün Işığı|3|E|1 eylem|60 fit|V,S|1 saat|C,D,P,R,S|60 fit çevresini gün ışığıyla aydınlatır.
Dispel Magic|Büyüyü Dağıt|3|A|1 eylem|120 fit|V,S|Anlık|B,C,D,P,S,L,W|Hedefteki bir büyüyü sonlandırır.
Fear|Korku|3|I|1 eylem|Kendi (30 fit koni)|V,S,M|1 dakika, odaklanma|B,S,L,W|Alandaki yaratıklar başarısız olursa dehşete düşüp kaçar.
Fireball|Ateş Topu|3|E|1 eylem|150 fit|V,S,M|Anlık|S,W|20 fit yarıçaplı patlama alandakilere ateş hasarı verir.
Fly|Uç|3|T|1 eylem|Dokunma|V,S,M|10 dakika, odaklanma|S,L,W|Hedef 60 fit uçuş hızı kazanır.
Haste|Hız|3|T|1 eylem|30 fit|V,S,M|1 dakika, odaklanma|S,W|Hedefin hızı iki katına çıkar, zırh sınıfı +2 olur ve ek eylem alır.
Hypnotic Pattern|Hipnotik Desen|3|I|1 eylem|120 fit|S,M|1 dakika, odaklanma|B,S,L,W|Alandaki yaratıklar büyülenip hareketsiz kalır.
Lightning Bolt|Yıldırım|3|E|1 eylem|Kendi (100 fit çizgi)|V,S,M|Anlık|S,W|Çizgi boyunca yaratıklara elektrik hasarı verir.
Major Image|Büyük Yanılsama|3|I|1 eylem|120 fit|V,S,M|10 dakika, odaklanma|B,S,L,W|Sesli, kokulu, hareketli büyük bir görüntü yaratır.
Mass Healing Word|Toplu İyileştiren Söz|3|E|1 bonus eylem|60 fit|V|Anlık|C|En fazla altı yaratığın can puanını iyileştirir.
Protection from Energy|Enerjiden Korunma|3|A|1 eylem|Dokunma|V,S|1 saat, odaklanma|C,D,R,S,W|Hedef seçilen bir hasar türüne (asit, soğuk, ateş, elektrik, gürleme) direnç kazanır.
Remove Curse|Laneti Kaldır|3|A|1 eylem|Dokunma|V,S|Anlık|C,P,L,W|Hedefteki tüm lanetleri kaldırır.
Revivify|Hayata Döndür|3|C|1 eylem|Dokunma|V,S,M|Anlık|C,P|Bir dakika önce ölen yaratığı 1 can puanıyla geri getirir.
Sleet Storm|Sulu Sepken|3|C|1 eylem|150 fit|V,S,M|1 dakika, odaklanma|D,S,W|Alan kayganlaşır, görüşü kapatır ve ateşleri söndürür.
Slow|Yavaşlat|3|T|1 eylem|120 fit|V,S,M|1 dakika, odaklanma|S,W|Altı yaratığın hızı yarıya iner ve zırh sınıfı düşer.
Speak with Dead|Ölüyle Konuş|3|N|1 eylem|10 fit|V,S,M|10 dakika|B,C|Ceset beş soruyu yanıtlar.
Spirit Guardians|Ruh Muhafızları|3|C|1 eylem|Kendi (15 fit)|V,S,M|10 dakika, odaklanma|C|Çevrende dönen ruhlar düşmanlara ışıma ya da ölüm hasarı verir.
Stinking Cloud|Kokulu Bulut|3|C|1 eylem|90 fit|V,S,M|1 dakika, odaklanma|B,S,W|Midesi bulandıran bir bulut alandakilerin eylem kaybetmesine yol açar.
Tongues|Diller|3|D|1 eylem|Dokunma|V,M|1 saat|B,C,S,L,W|Hedef duyduğu her dili anlar ve her dille konuşabilir.
Vampiric Touch|Vampir Dokunuşu|3|X|1 eylem|Kendi|V,S|1 dakika, odaklanma|L,W|Dokunuşla ölüm hasarı verir ve verilen hasarın yarısı kadar can kazanırsın.
Water Breathing|Su Altında Nefes|3|T|1 eylem|30 fit|V,S,M|24 saat|D,R,S,W|On yaratık su altında nefes alabilir.
Arcane Eye|Büyülü Göz|4|D|1 eylem|30 fit|V,S,M|1 dakika, odaklanma|W|Gördüğünü sen de görebileceğin görünmez bir göz gönderirsin.
Banishment|Sürgün|4|A|1 eylem|60 fit|V,S,M|1 dakika, odaklanma|C,P,S,L,W|Hedef başka bir düzleme sürülür.
Blight|Kuruma|4|X|1 eylem|30 fit|V,S|Anlık|D,S,L,W|Hedef dayanıklılık kurtarmasında başarısız olursa ölüm hasarı alır.
Confusion|Şaşkınlık|4|N|1 eylem|90 fit|V,S,M|1 dakika, odaklanma|B,D,S,W|Alandakiler rastgele davranır.
Death Ward|Ölüm Koruması|4|A|1 eylem|Dokunma|V,S|8 saat|C,P|Hedef bir kez 0 can puanına düşmek yerine 1 can puanında kalır.
Dimension Door|Boyut Kapısı|4|C|1 eylem|500 fit|V|Anlık|B,S,L,W|Kendini ve bir yaratığı menzildeki bir yere ışınlarsın.
Dominate Beast|Hayvana Hükmet|4|N|1 eylem|60 fit|V,S|1 dakika, odaklanma|D,S|Bir hayvanın davranışını yönetirsin.
Fire Shield|Ateş Kalkanı|4|E|1 eylem|Kendi|V,S,M|10 dakika|W|Seni saran alevler yakın dövüşte saldıranlara ateş ya da soğuk hasarı verir.
Freedom of Movement|Hareket Özgürlüğü|4|A|1 eylem|Dokunma|V,S,M|1 saat|B,C,D,R|Hedefi felç, kısıtlanma ve yavaşlatma etkilerinden korur.
Greater Invisibility|Büyük Görünmezlik|4|I|1 eylem|Dokunma|V,S|1 dakika, odaklanma|B,S,W|Saldırı yapsan da görünmez kalırsın.
Ice Storm|Buz Fırtınası|4|E|1 eylem|300 fit|V,S,M|Anlık|D,S,W|Yağan dolu darbe ve soğuk hasarı verir, zemin zorlu arazi olur.
Locate Creature|Yaratığı Bul|4|D|1 eylem|Kendi|V,S,M|1 saat, odaklanma|B,C,D,P,R,W|Tanıdığın bir yaratığın yönünü ve yerini hissedersin.
Phantasmal Killer|Hayalet Katil|4|I|1 eylem|120 fit|V,S|1 dakika, odaklanma|W|Hedef kendi en büyük korkusunu görür ve her tur psişik hasar alır.
Polymorph|Biçim Değiştirme|4|T|1 eylem|60 fit|V,S,M|1 saat, odaklanma|B,D,S,W|Hedefi başka bir yaratık biçimine dönüştürür.
Stoneskin|Taş Deri|4|A|1 eylem|Dokunma|V,S,M|1 saat, odaklanma|D,R,S,W|Hedef sıradan silahların kesici, ezici, delici hasarına direnç kazanır.
Wall of Fire|Ateş Duvarı|4|E|1 eylem|120 fit|V,S,M|1 dakika, odaklanma|D,S,W|Yaratıklara ateş hasarı veren bir alev duvarı kurarsın.
Animate Objects|Nesnelere Can Ver|5|T|1 eylem|120 fit|V,S|1 dakika, odaklanma|B,S,W|On adede kadar nesne canlanıp saldırır.
Cloudkill|Ölüm Bulutu|5|C|1 eylem|120 fit|V,S|10 dakika, odaklanma|S,W|Zehirli sis içindekilere zehir hasarı verir ve yavaşça hareket eder.
Commune|Ruhlarla Konuş|5|D|1 dakika|Kendi|V,S,M|1 dakika|C|Tanrından üç evet ya da hayır cevabı alırsın.
Cone of Cold|Soğuk Koni|5|E|1 eylem|Kendi (60 fit koni)|V,S,M|Anlık|S,W|Koni içindekilere soğuk hasar verir.
Dominate Person|İnsana Hükmet|5|N|1 eylem|60 fit|V,S|1 dakika, odaklanma|B,S,W|Bir hümanoidin davranışını yönetirsin.
Flame Strike|Alev Darbesi|5|E|1 eylem|60 fit|V,S,M|Anlık|C|Gökten inen alev sütunu ateş ve ışıma hasarı verir.
Greater Restoration|Büyük İyileşme|5|A|1 eylem|Dokunma|V,S,M|Anlık|B,C,D|Hedefteki bir yıpranmayı, lanet ya da seviye kaybını kaldırır.
Hold Monster|Canavarı Dondur|5|N|1 eylem|90 fit|V,S,M|1 dakika, odaklanma|B,S,L,W|Herhangi bir yaratığı felç eder.
Insect Plague|Böcek Salgını|5|C|1 eylem|300 fit|V,S,M|10 dakika, odaklanma|C,D,S|Böcek sürüsü alandaki yaratıklara hasar verir.
Mass Cure Wounds|Toplu Yaraları Sar|5|C|1 eylem|60 fit|V,S|Anlık|B,C,D|Altı yaratığın can puanını iyileştirir.
Modify Memory|Hafızayı Değiştir|5|N|1 eylem|30 fit|V,S|1 dakika, odaklanma|B,W|Hedefin yakın bir anısını değiştirirsin.
Raise Dead|Ölüyü Dirilt|5|X|1 saat|Dokunma|V,S,M|Anlık|B,C,P|On gün içinde ölen yaratığı diriltir.
Scrying|Kâhin Gözü|5|D|10 dakika|Kendi|V,S,M|10 dakika, odaklanma|B,C,D,L,W|Bir yaratığı uzaktan görür ve duyarsın.
Teleportation Circle|Işınlanma Çemberi|5|C|1 dakika|10 fit|V,M|1 tur|B,S,W|Bilinen bir çembere kalıcı geçit açarsın.
Telekinesis|Telekinezi|5|T|1 eylem|60 fit|V,S|10 dakika, odaklanma|S,W|Zihinle yaratık ya da nesneleri hareket ettirirsin.
Wall of Force|Güç Duvarı|5|E|1 eylem|120 fit|V,S,M|10 dakika, odaklanma|W|Görünmez, aşılmaz bir duvar kurarsın.
Chain Lightning|Zincirleme Yıldırım|6|E|1 eylem|150 fit|V,S,M|Anlık|S,W|Yıldırım hedefe ve üç yaratığa daha sıçrar.
Circle of Death|Ölüm Çemberi|6|X|1 eylem|150 fit|V,S,M|Anlık|S,L,W|Alandakilere ölüm hasarı veren bir enerji dalgası yayılır.
Disintegrate|Toz Et|6|T|1 eylem|60 fit|V,S,M|Anlık|S,W|Hedefe ağır güç hasarı verir; 0'a düşen yaratık toz olur.
Globe of Invulnerability|Dokunulmazlık Küresi|6|A|1 eylem|Kendi (10 fit)|V,S,M|1 dakika, odaklanma|S,W|Küre içindeki 5. seviyeye kadar büyüler etkisiz kalır.
Harm|Zarar Ver|6|N|1 eylem|60 fit|V,S|Anlık|C|Hedefin azami can puanı düşer ve ağır hasar alır.
Heal|Şifa|6|E|1 eylem|60 fit|V,S|Anlık|C,D|Hedefin 70 can puanını iyileştirir ve hastalıkları kaldırır.
Heroes' Feast|Kahramanlar Ziyafeti|6|C|10 dakika|30 fit|V,S,M|Anlık|B,C,D|Yiyenlere zehir direnci, korku bağışıklığı ve ek can puanı verir.
Mass Suggestion|Toplu Telkin|6|N|1 eylem|60 fit|V,M|24 saat|B,S,L,W|On iki yaratığa makul bir telkinde bulunursun.
Sunbeam|Güneş Işını|6|E|1 eylem|Kendi (60 fit çizgi)|V,S,M|1 dakika, odaklanma|D,S,W|Işıma hasarı veren ve kör eden bir ışın çıkarırsın.
True Seeing|Gerçek Görüş|6|D|1 eylem|Dokunma|V,S,M|1 saat|B,C,S,L,W|Hedef karanlıkta, görünmezlikte ve yanılsamalarda gerçeği görür.
Divine Word|İlahi Söz|7|E|1 bonus eylem|30 fit|V|Anlık|C|Söz, yaratıkları duruma göre sağır eder, kör eder, sersemletir ya da öldürür.
Etherealness|Eterik Geçiş|7|T|1 eylem|Kendi|V,S|8 saat|B,C,S,L,W|Eterik düzleme geçersin.
Finger of Death|Ölüm Parmağı|7|X|1 eylem|60 fit|V,S|Anlık|S,L,W|Hedefe ağır ölüm hasarı verir; ölen hedef zombi olarak kalkar.
Fire Storm|Ateş Fırtınası|7|E|1 eylem|150 fit|V,S|Anlık|C,D,S|Alanda alevler yağar ve ateş hasarı verir.
Plane Shift|Düzlem Kaydır|7|C|1 eylem|Dokunma|V,S,M|Anlık|C,D,S,L,W|Seni ve ortakları başka bir düzleme taşır.
Prismatic Spray|Prizmatik Püskürtme|7|E|1 eylem|Kendi (60 fit koni)|V,S|Anlık|B,S,W|Rastgele renkli ışınlar yaratıklara farklı etkiler uygular.
Resurrection|Diriliş|7|C|1 saat|Dokunma|V,S,M|Anlık|B,C|Yüz yıl içinde ölen yaratığı tüm can puanıyla geri getirir.
Reverse Gravity|Yerçekimini Ters Çevir|7|T|1 eylem|100 fit|V,S,M|1 dakika, odaklanma|D,S,W|Alandaki yaratıklar ve nesneler yukarı düşer.
Teleport|Işınlan|7|C|1 eylem|10 fit|V|Anlık|B,S,W|Seni ve ortakları uzak bir yere ışınlar.
Antimagic Field|Büyü Karşıtı Alan|8|A|1 eylem|Kendi (10 fit)|V,S,M|1 saat, odaklanma|C,W|Çevrendeki tüm büyüler çalışmaz.
Dominate Monster|Canavara Hükmet|8|N|1 eylem|60 fit|V,S|1 saat, odaklanma|B,S,L,W|Herhangi bir yaratığın davranışını yönetirsin.
Earthquake|Deprem|8|E|1 eylem|500 fit|V,S,M|1 dakika, odaklanma|C,D,S|Alandaki zemin yarılır, yapılar çöker.
Feeblemind|Akılsızlaştırma|8|E|1 eylem|150 fit|V,S,M|Anlık|B,D,L,W|Hedefin zekâsı 1'e düşer ve büyü kullanamaz.
Mind Blank|Zihin Kalkanı|8|A|1 eylem|Dokunma|V,S|24 saat|B,W|Hedef psişik hasar ve zihin okumaya karşı korunur.
Power Word Stun|Güç Sözü: Sersemlet|8|N|1 eylem|60 fit|V|Anlık|B,S,L,W|Düşük can puanlı hedef sersemler.
Sunburst|Güneş Patlaması|8|E|1 eylem|150 fit|V,S,M|Anlık|D,S,W|Alanda güneş ışığı patlar, ışıma hasarı verir ve kör eder.
Astral Projection|Astral Yansıma|9|N|1 saat|10 fit|V,S,M|Özel|C,L,W|Ruhunu astral düzleme gönderirsin.
Foresight|Önsezi|9|D|1 dakika|Dokunma|V,S,M|8 saat|B,D,L,W|Hedef saldırı, kurtarma ve kontrollerde üstünlük kazanır, sürprize uğramaz.
Gate|Geçit|9|C|1 eylem|60 fit|V,S,M|1 dakika, odaklanma|C,S,W|Başka bir düzleme açılan bir geçit yaratırsın.
Mass Heal|Toplu Şifa|9|C|1 eylem|60 fit|V,S|Anlık|C|Yüzlerce can puanını dağıtarak iyileştirir ve hastalıkları kaldırır.
Meteor Swarm|Göktaşı Yağmuru|9|E|1 eylem|1 mil|V,S|Anlık|S,W|Dört göktaşı patlar; geniş alanda ağır ateş ve ezici hasar verir.
Power Word Kill|Güç Sözü: Öldür|9|N|1 eylem|60 fit|V|Anlık|B,S,L,W|Düşük can puanlı hedef doğrudan ölür.
Shapechange|Biçim Ustalığı|9|T|1 eylem|Kendi|V,S,M|1 saat, odaklanma|D,W|Zorluk derecesi seviyene kadar herhangi bir yaratığa dönüşürsün.
Time Stop|Zamanı Durdur|9|T|1 eylem|Kendi|V|Anlık|S,W|Zaman durur; birkaç tur boyunca tek başına eylem yaparsın.
True Resurrection|Gerçek Diriliş|9|C|1 saat|Dokunma|V,S,M|Anlık|C,D|Uzun süre önce ölmüş yaratığı bile tam can puanıyla geri getirir.
Wish|Dilek|9|C|1 eylem|Kendi|V|Anlık|S,W|En güçlü büyü; başka bir büyüyü taklit eder ya da dileğin gerçekleşmesini sağlar.
Weird|Dehşet|9|I|1 eylem|120 fit|V,S|1 dakika, odaklanma|W|Alandakiler en büyük korkuyla yüzleşir ve psişik hasar alır.
Animal Friendship|Hayvan Dostluğu|1|N|1 eylem|30 fit|V,S,M|24 saat|B,D,R|Bir hayvan seni tehdit saymaz ve dost olur.
Color Spray|Renk Püskürtmesi|1|I|1 eylem|Kendi (15 fit koni)|V,S,M|1 tur|S,W|Düşük can puanlı yaratıklar kör olur.
Create or Destroy Water|Su Yarat ya da Yok Et|1|T|1 eylem|30 fit|V,S,M|Anlık|C,D|Su yaratır ya da var olan suyu ve sisi yok eder.
Find Familiar|Yoldaş Çağır|1|C|1 saat|10 fit|V,S,M|Anlık|W|Sana hizmet eden ve düşünceni paylaşan küçük bir ruh yoldaşı çağırırsın.
Inflict Wounds|Yara Aç|1|X|1 eylem|Dokunma|V,S|Anlık|C|Dokunuşla ağır ölüm hasarı verir.
Ray of Sickness|Hastalık Işını|1|X|1 eylem|60 fit|V,S|Anlık|S,W|Hedefe zehir hasarı verir ve zehirli yapabilir.
Tasha's Hideous Laughter|Kahkaha Büyüsü|1|N|1 eylem|30 fit|V,S,M|1 dakika, odaklanma|B,W|Hedef kahkahaya boğulup yere düşer ve eylem yapamaz.
Augury|Fal|2|D|1 dakika|Kendi|V,S,M|Anlık|C|Bir eylemin yakın gelecekte iyi mi kötü mü sonuçlanacağını öğrenirsin.
Arcane Lock|Büyülü Kilit|2|A|1 eylem|Dokunma|V,S,M|Bozulana dek|W|Kapı ya da sandığı büyüyle kilitlersin.
Blindness/Deafness|Körlük ya da Sağırlık|2|N|1 eylem|30 fit|V|1 dakika|B,C,S,W|Hedefi kör ya da sağır edersin.
Continual Flame|Sürekli Alev|2|E|1 eylem|Dokunma|V,S,M|Bozulana dek|C,W|Dokunulan nesne sönmeyen bir ışık yayar.
Crown of Madness|Delilik Tacı|2|N|1 eylem|120 fit|V,S|1 dakika, odaklanma|B,S,L,W|Hedef bir hümanoid senin söylediğin yaratığa saldırır.
Find Traps|Tuzakları Bul|2|D|1 eylem|120 fit|V,S|Anlık|C,D,R|Görüş alanındaki tuzakların varlığını sezersin.
Gentle Repose|Huzurlu Dinlenme|2|X|1 eylem|Dokunma|V,S,M|10 gün|C,W|Cesedin çürümesini durdurur ve diriltilmeyi zorlaştırmaz.
Blink|Göz Kırp|3|T|1 eylem|Kendi|V,S|1 dakika|S,W|Her tur sonunda rastgele eterik düzleme geçip geri dönersin.
Dispel Evil and Good|Kötü ve İyiyi Kov|5|A|1 eylem|Kendi|V,S,M|1 dakika, odaklanma|C,P|Başka düzlemlerin yaratıklarından seni korur ve onları kovar.
Find the Path|Yolu Bul|6|D|1 dakika|Kendi|V,S,M|1 gün, odaklanma|B,C,D|Bilinen bir yere en kısa yolu bulursun.
Wall of Stone|Taş Duvar|5|E|1 eylem|120 fit|V,S,M|10 dakika, odaklanma|D,S,W|Taştan bir duvar kurarsın.
Wall of Thorns|Dikenli Duvar|6|C|1 eylem|120 fit|V,S,M|10 dakika, odaklanma|D|Geçenleri yaralayan dikenli bir duvar yükselir.
Gaseous Form|Gaz Biçimi|3|T|1 eylem|Dokunma|V,S,M|1 saat, odaklanma|S,L,W|Hedef süzülen bir buluta dönüşür ve dar aralıklardan geçer.
Dream|Rüya|5|I|1 dakika|Özel|V,S,M|8 saat|B,L,W|Uyuyan bir yaratığın rüyasına girer ve ona mesaj ya da kâbus verirsin.
Bigby's Hand|Bigby'nin Eli|5|E|1 eylem|120 fit|V,S,M|1 dakika, odaklanma|W|Dev bir güç eli iter, kavrar ya da yumruklar.
Contagion|Bulaşıcı Hastalık|5|X|1 eylem|Dokunma|V,S|7 gün|C,D|Hedefe bir hastalık bulaştırırsın.
Creation|Yaratım|5|I|1 dakika|30 fit|V,S,M|Özel|S,W|Gölgeden geçici bir nesne yaratırsın.
Geas|Yemin Bağı|5|N|1 dakika|60 fit|V|30 gün|B,C,D,P,W|Hedefi bir görevi yapmaya zorlarsın.
Seeming|Görünüş Değişimi|5|I|1 eylem|30 fit|V,S|8 saat|B,S,W|Gruptakilerin görünüşünü değiştirirsin.
Wall of Ice|Buz Duvarı|6|E|1 eylem|120 fit|V,S,M|10 dakika, odaklanma|W|Buzdan bir duvar kurarsın.
Move Earth|Toprağı Oyna|6|T|1 eylem|120 fit|V,S,M|2 saat, odaklanma|D,S,W|Toprak ve taşı şekillendirirsin.
Flesh to Stone|Etten Taşa|6|T|1 eylem|60 fit|V,S,M|1 dakika, odaklanma|W|Hedef yavaş yavaş taşa dönüşür.
Eyebite|Göz Lanetli|6|N|1 eylem|Kendi|V,S|1 dakika, odaklanma|B,S,L,W|Gözlerinle hedefi uyutur, korkutur ya da hasta edersin.
Sending|Mesaj Gönder|3|E|1 eylem|Sınırsız|V,S,M|1 tur|B,C,W|Tanıdığın bir yaratığa kısa bir mesaj gönderirsin.
Glyph of Warding|Koruma Yazısı|3|A|1 saat|Dokunma|V,S,M|Bozulana dek|B,C,W|Tetiklenince patlayan ya da büyü salan bir yazı çizersin.
Nondetection|Sezilmezlik|3|A|1 eylem|Dokunma|V,S,M|8 saat|B,R,W|Hedef kehanet büyülerinden gizlenir.
Phantom Steed|Hayalet Binek|3|I|1 dakika|30 fit|V,S|1 saat|W|Hızlı, hayalet bir binek yaratırsın.
Leomund's Tiny Hut|Leomund'un Kulübesi|3|E|1 dakika|Kendi (10 fit küre)|V,S,M|8 saat|B,W|Dışarıdan etkilenmeyen küçük bir sığınak kurarsın.
Water Walk|Suda Yürü|3|T|1 eylem|30 fit|V,S,M|1 saat|C,D,R,S|On yaratık su ve sıvı üstünde yürür.
Compulsion|Zorlama|4|N|1 eylem|30 fit|V,S|1 dakika, odaklanma|B|Hedeflerin hareket yönünü zorlarsın.
Control Water|Suyu Yönet|4|T|1 eylem|300 fit|V,S,M|10 dakika, odaklanma|C,D,W|Su kütlesini kaldırır, böler ya da yönlendirirsin.
Divination|Kehanet|4|D|1 eylem|Kendi|V,S,M|Anlık|C,D|Bir hedef ya da olay hakkında tanrından bir cevap alırsın.
Guardian of Faith|İnanç Muhafızı|4|C|1 eylem|30 fit|V|8 saat|C|Düşmanlara hasar veren hayalet bir muhafız çağırırsın.
Stone Shape|Taşı Şekillendir|4|T|1 eylem|Dokunma|V,S,M|Anlık|C,D,W|Taş bir nesneyi şekillendirirsin.
Resilient Sphere|Dayanıklı Küre|4|E|1 eylem|30 fit|V,S,M|1 dakika, odaklanma|W|Bir yaratığı aşılmaz bir kürenin içine hapsedersin.
Magic Circle|Büyülü Çember|3|A|1 dakika|10 fit|V,S,M|1 saat|C,P,L,W|Belirli yaratıklara karşı bir çember çizersin.
`.trim();

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SPELLS: Spell[] = ROWS.split('\n').map((line) => {
  const [en, tr, level, school, time, range, comp, duration, classes, summary] = line.split('|');
  return {
    id: slug(en!),
    name: { en: en!, tr: tr! },
    level: Number(level),
    school: school as SpellSchool,
    time: time!,
    range: range!,
    components: comp!.split(','),
    duration: duration!,
    classes: classes!.split(',') as SpellClass[],
    summary: summary!,
  };
});

export interface SpellFilter { text?: string; level?: number; cls?: SpellClass | ''; school?: SpellSchool | '' }

const fold = (s: string): string => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function filterSpells(list: Spell[], f: SpellFilter): Spell[] {
  const text = f.text ? fold(f.text.trim()) : '';
  return list.filter((s) =>
    (f.level === undefined || s.level === f.level)
    && (!f.cls || s.classes.includes(f.cls))
    && (!f.school || s.school === f.school)
    && (!text || fold(s.name.tr).includes(text) || fold(s.name.en).includes(text) || fold(s.summary).includes(text)));
}

/** Zarla çözülen büyülerin temel (en düşük seviyeden) zarı; kind hasar türü ya da iyileştirme. */
export const SPELL_ROLLS: Record<string, { dice: string; kind: string }> = {
  'acid-splash': { dice: '1d6', kind: 'acid' },
  'chill-touch': { dice: '1d8', kind: 'necrotic' },
  'eldritch-blast': { dice: '1d10', kind: 'force' },
  'fire-bolt': { dice: '1d10', kind: 'fire' },
  'poison-spray': { dice: '1d12', kind: 'poison' },
  'produce-flame': { dice: '1d8', kind: 'fire' },
  'ray-of-frost': { dice: '1d8', kind: 'cold' },
  'sacred-flame': { dice: '1d8', kind: 'radiant' },
  'shocking-grasp': { dice: '1d8', kind: 'lightning' },
  'vicious-mockery': { dice: '1d4', kind: 'psychic' },
  'burning-hands': { dice: '3d6', kind: 'fire' },
  'cure-wounds': { dice: '1d8', kind: 'healing' },
  'guiding-bolt': { dice: '4d6', kind: 'radiant' },
  'healing-word': { dice: '1d4', kind: 'healing' },
  'inflict-wounds': { dice: '3d10', kind: 'necrotic' },
  'magic-missile': { dice: '3d4+3', kind: 'force' },
  'ray-of-sickness': { dice: '2d8', kind: 'poison' },
  'thunderwave': { dice: '2d8', kind: 'thunder' },
  'flaming-sphere': { dice: '2d6', kind: 'fire' },
  'moonbeam': { dice: '2d10', kind: 'radiant' },
  'scorching-ray': { dice: '2d6', kind: 'fire' },
  'shatter': { dice: '3d8', kind: 'thunder' },
  'spiritual-weapon': { dice: '1d8', kind: 'force' },
  'prayer-of-healing': { dice: '2d8', kind: 'healing' },
  'call-lightning': { dice: '3d10', kind: 'lightning' },
  'fireball': { dice: '8d6', kind: 'fire' },
  'lightning-bolt': { dice: '8d6', kind: 'lightning' },
  'mass-healing-word': { dice: '1d4', kind: 'healing' },
  'spirit-guardians': { dice: '3d8', kind: 'radiant' },
  'vampiric-touch': { dice: '3d6', kind: 'necrotic' },
  'blight': { dice: '8d8', kind: 'necrotic' },
  'wall-of-fire': { dice: '5d8', kind: 'fire' },
  'cone-of-cold': { dice: '8d8', kind: 'cold' },
  'flame-strike': { dice: '4d6', kind: 'fire' },
  'mass-cure-wounds': { dice: '3d8', kind: 'healing' },
  'chain-lightning': { dice: '10d8', kind: 'lightning' },
  'disintegrate': { dice: '10d6+40', kind: 'force' },
  'harm': { dice: '14d6', kind: 'necrotic' },
  'finger-of-death': { dice: '7d8+30', kind: 'necrotic' },
  'fire-storm': { dice: '7d10', kind: 'fire' },
  'sunburst': { dice: '12d6', kind: 'radiant' },
  'meteor-swarm': { dice: '20d6', kind: 'fire' },
};
