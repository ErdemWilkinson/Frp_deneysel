// Irklar kitabı: SRD 5.1 (CC-BY 4.0) ırklarının kısa, özgün Türkçe özetleri.

export interface RaceTrait { name: string; text: string }

export interface Race {
  id: string;
  name: { en: string; tr: string };
  size: string;
  /** Yürüme hızı (ft). */
  speed: number;
  /** Yetenek puanı artışları. */
  abilities: string;
  languages: string;
  traits: RaceTrait[];
  subraces: { name: string; abilities: string; traits: RaceTrait[] }[];
}

export const RACES: Race[] = [
  {
    id: 'dragonborn', name: { en: 'Dragonborn', tr: 'Ejderdoğan' }, size: 'Orta', speed: 30,
    abilities: 'Kuvvet +2, Karizma +1', languages: 'Ortak, Ejderce',
    traits: [
      { name: 'Ejder soyu', text: 'Bir ejder rengi seçilir; nefes silahının hasar türünü ve direncini bu renk belirler.' },
      { name: 'Nefes silahı', text: 'Eylemle alanda çeviklik ya da dayanıklılık kurtarması isteyen bir nefes salar; kısa dinlenmeyle yenilenir.' },
      { name: 'Hasar direnci', text: 'Ejder soyunun hasar türüne direnç.' },
    ],
    subraces: [],
  },
  {
    id: 'dwarf', name: { en: 'Dwarf', tr: 'Cüce' }, size: 'Orta', speed: 25,
    abilities: 'Dayanıklılık +2', languages: 'Ortak, Cücece',
    traits: [
      { name: 'Karanlıkgörüşü', text: '60 fit karanlıkta görür.' },
      { name: 'Cüce dayanıklılığı', text: 'Zehir hasarına direnç ve zehire karşı kurtarmalarda üstünlük.' },
      { name: 'Cüce silah eğitimi', text: 'Balta, el baltası, hafif çekiç ve savaş çekicinde yetkinlik.' },
      { name: 'Taş ustalığı', text: 'Taş işçiliğiyle ilgili tarih kontrollerinde yetkinlik bonusunu iki katı olarak ekler.' },
      { name: 'Ağır zırh yavaşlatmaz', text: 'Ağır zırh giyse de hızı düşmez.' },
    ],
    subraces: [
      { name: 'Dağ cücesi', abilities: 'Kuvvet +2', traits: [{ name: 'Cüce zırh eğitimi', text: 'Hafif ve orta zırhta yetkinlik.' }] },
      { name: 'Tepe cücesi', abilities: 'Bilgelik +1', traits: [{ name: 'Cüce sertliği', text: 'Azami can puanı 1 artar ve her seviyede 1 daha artar.' }] },
    ],
  },
  {
    id: 'elf', name: { en: 'Elf', tr: 'Elf' }, size: 'Orta', speed: 30,
    abilities: 'Çeviklik +2', languages: 'Ortak, Elfçe',
    traits: [
      { name: 'Karanlıkgörüşü', text: '60 fit karanlıkta görür.' },
      { name: 'Keskin duyular', text: 'Algı becerisinde yetkinlik.' },
      { name: 'Peri soyu', text: 'Büyülenmeye karşı kurtarmalarda üstünlük; büyü uykuya yatıramaz.' },
      { name: 'Trans', text: 'Uyumak yerine dört saat meditasyon yapar.' },
    ],
    subraces: [
      { name: 'Yüksek elf', abilities: 'Zekâ +1', traits: [{ name: 'Büyü hilesi', text: 'Büyücü listesinden bir büyü hilesi bilir ve ek bir dil öğrenir.' }, { name: 'Elf silah eğitimi', text: 'Uzun kılıç, kısa kılıç, kısa yay ve uzun yayda yetkinlik.' }] },
    ],
  },
  {
    id: 'gnome', name: { en: 'Gnome', tr: 'Gnom' }, size: 'Küçük', speed: 25,
    abilities: 'Zekâ +2', languages: 'Ortak, Gnomca',
    traits: [
      { name: 'Karanlıkgörüşü', text: '60 fit karanlıkta görür.' },
      { name: 'Gnom kurnazlığı', text: 'Zekâ, bilgelik ve karizma kurtarmalarında büyüye karşı üstünlük.' },
    ],
    subraces: [
      { name: 'Kaya gnomu', abilities: 'Dayanıklılık +1', traits: [{ name: 'Artifisyel bilgi', text: 'Büyülü, simya ya da teknik nesnelerle ilgili tarih kontrollerinde yetkinlik bonusunu iki katı ekler.' }, { name: 'Tamirci', text: 'Küçük mekanik oyuncaklar yapabilir.' }] },
    ],
  },
  {
    id: 'half-elf', name: { en: 'Half-Elf', tr: 'Yarı-Elf' }, size: 'Orta', speed: 30,
    abilities: 'Karizma +2, ayrıca iki yetenekte +1', languages: 'Ortak, Elfçe, ek bir dil',
    traits: [
      { name: 'Karanlıkgörüşü', text: '60 fit karanlıkta görür.' },
      { name: 'Peri soyu', text: 'Büyülenmeye karşı kurtarmalarda üstünlük; büyü uykuya yatıramaz.' },
      { name: 'Çok yönlülük', text: 'İki beceride yetkinlik kazanır.' },
    ],
    subraces: [],
  },
  {
    id: 'halfling', name: { en: 'Halfling', tr: 'Halfling' }, size: 'Küçük', speed: 25,
    abilities: 'Çeviklik +2', languages: 'Ortak, Halflingce',
    traits: [
      { name: 'Şanslı', text: 'Saldırı, kontrol ya da kurtarmada 1 gelirse zarı yeniden atar.' },
      { name: 'Cesur', text: 'Korkmaya karşı kurtarmalarda üstünlük.' },
      { name: 'Halfling çevikliği', text: 'Daha büyük yaratıkların alanından geçebilir.' },
    ],
    subraces: [
      { name: 'Hafif ayaklı', abilities: 'Karizma +1', traits: [{ name: 'Doğal gizlilik', text: 'Daha büyük bir yaratığın arkasına saklanabilir.' }] },
    ],
  },
  {
    id: 'half-orc', name: { en: 'Half-Orc', tr: 'Yarı-Ork' }, size: 'Orta', speed: 30,
    abilities: 'Kuvvet +2, Dayanıklılık +1', languages: 'Ortak, Orkça',
    traits: [
      { name: 'Karanlıkgörüşü', text: '60 fit karanlıkta görür.' },
      { name: 'Yıldırıcı', text: 'Yıldırma becerisinde yetkinlik.' },
      { name: 'Amansız dayanıklılık', text: '0 can puanına düşünce bir kez 1 can puanında kalır; uzun dinlenmeyle yenilenir.' },
      { name: 'Vahşi saldırılar', text: 'Yakın dövüşte kritik vuruşta bir ek hasar zarı atar.' },
    ],
    subraces: [],
  },
  {
    id: 'human', name: { en: 'Human', tr: 'İnsan' }, size: 'Orta', speed: 30,
    abilities: 'Tüm yeteneklere +1', languages: 'Ortak, ek bir dil',
    traits: [{ name: 'Çok yönlü', text: 'Sade ama güçlü: bütün yetenek puanlarına +1 ve bir ek dil.' }],
    subraces: [],
  },
  {
    id: 'tiefling', name: { en: 'Tiefling', tr: 'Tiefling' }, size: 'Orta', speed: 30,
    abilities: 'Karizma +2, Zekâ +1', languages: 'Ortak, Cehennemce',
    traits: [
      { name: 'Karanlıkgörüşü', text: '60 fit karanlıkta görür.' },
      { name: 'Cehennem direnci', text: 'Ateş hasarına direnç.' },
      { name: 'Şeytani miras', text: 'Büyü hilesi Mucize Gösterisi; 3. seviyede Cehennem Misillemesi, 5. seviyede Karanlık büyüsünü günde bir kez kullanır.' },
    ],
    subraces: [],
  },
];
