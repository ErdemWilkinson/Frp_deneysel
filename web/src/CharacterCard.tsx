import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ABILITIES, ABILITY_TR, CHARACTER_CLASSES, DAMAGE_TR, DAMAGE_TYPES, PROFILE_TEXT_LIMITS, RACES, SKILLS, SKILL_KEYS, SKILL_RANK_TR,
  abilityMod, blankProfile, initiativeBonus, passivePerception, skillBonus,
  type Ability, type Character, type CharacterAttack, type CharacterProfile, type DamageType, type SkillKey, type SkillRank,
} from '@masa/shared';

import { AttackPicker } from './AttackPicker';
const RACE_CHOICES: string[] = RACES.flatMap((r) => [r.name.tr, ...r.subraces.map((x) => x.name)]);
import { readSheet } from './api';
import { num } from './controls';
import type { Send } from './useTable';

type Draft = Omit<Character, 'deathSaves' | 'dead'>;
const BLANK: Draft = {
  name: '', level: 1, ac: 10, maxHp: 10, hp: 10, tempHp: 0, speed: 30,
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiency: 2, saveProficiencies: [], attacks: [], profile: blankProfile(),
};
const NEW_ATTACK: CharacterAttack = { name: '', bonus: 0, damage: '1d6', type: 'slashing', range: 5 };
const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));
const NUMBERS = ['level', 'ac', 'maxHp', 'hp', 'tempHp', 'speed', 'proficiency'] as const;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Dışa aktarılmış kart dosyasını okur; tanımadığı alanları atar. Kart değilse null döner. */
export function readCharacter(input: unknown): Draft | null {
  const wrapped = (input as { character?: unknown } | null)?.character;
  const c = (wrapped ?? input) as Record<string, any> | null;
  if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.name.trim()) return null;
  const draft: Draft = { ...BLANK, name: c.name.trim().slice(0, 60), abilities: { ...BLANK.abilities } };
  for (const key of NUMBERS) if (finite(c[key])) draft[key] = Math.trunc(c[key]);
  for (const a of ABILITIES) if (finite(c.abilities?.[a])) draft.abilities[a] = Math.trunc(c.abilities[a]);
  if (Array.isArray(c.saveProficiencies)) draft.saveProficiencies = ABILITIES.filter((a) => c.saveProficiencies.includes(a));
  if (Array.isArray(c.attacks)) {
    draft.attacks = c.attacks
      .filter((a: any) => a && typeof a.name === 'string' && typeof a.damage === 'string' && finite(a.bonus) && DAMAGE_TYPES.includes(a.type))
      .slice(0, 12)
      .map((a: any) => ({ name: a.name, bonus: a.bonus, damage: a.damage, type: a.type, range: finite(a.range) ? Math.trunc(a.range) : 5 }));
  }
  draft.profile = readProfile(c.profile);
  return draft;
}

/** Kimlik ve öykü bölümü: tanıdığı alanları alır, gerisini boş bırakır. */
function readProfile(input: unknown): CharacterProfile {
  const out = blankProfile();
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  for (const key of Object.keys(PROFILE_TEXT_LIMITS) as (keyof typeof PROFILE_TEXT_LIMITS)[]) {
    if (typeof p[key] === 'string') out[key] = p[key].slice(0, PROFILE_TEXT_LIMITS[key]);
  }
  if (finite(p.experience)) out.experience = Math.max(0, Math.trunc(p.experience));
  if (finite(p.inspiration)) out.inspiration = Math.max(0, Math.trunc(p.inspiration));
  const skills = p.skills && typeof p.skills === 'object' ? p.skills : {};
  for (const key of SKILL_KEYS) {
    if (skills[key] === 'proficient' || skills[key] === 'expertise') out.skills[key] = skills[key];
  }
  return out;
}

interface Props {
  character: Character | null;
  send: Send;
  title?: string;
  saveLabel?: string;
  /** Kart gönderildikten sonra çağrılır. */
  onSaved?: () => void;
}

export function CharacterCard({ character, send, title = 'Karakter', saveLabel = 'Kartı kaydet', onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(character ?? BLANK);
  // Sunucudaki kart gerçekten değiştiğinde (ör. hasar alındığında) formu güncelle; ilgisiz yayınlarda yazılanı silme.
  const snapshot = JSON.stringify(character);
  useEffect(() => { if (character) setDraft(character); }, [snapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setAttack = (index: number, patch: Partial<CharacterAttack>) =>
    set('attacks', draft.attacks.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  const toggleSave = (a: Ability) =>
    set('saveProficiencies', draft.saveProficiencies.includes(a)
      ? draft.saveProficiencies.filter((x) => x !== a)
      : [...draft.saveProficiencies, a]);

  const [notice, setNotice] = useState<string | null>(null);
  const payload = () => {
    const { name, level, ac, maxHp, hp, tempHp, speed, abilities, proficiency, saveProficiencies, attacks, profile } = draft;
    return { name, level, ac, maxHp, hp, tempHp, speed, abilities, proficiency, saveProficiencies, attacks, profile };
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    send({ type: 'character.set', character: payload() });
    setNotice(null);
    onSaved?.();
  };
  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ format: 'acik-masa-karakter', version: 1, character: payload() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${draft.name.trim() || 'karakter'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const [reading, setReading] = useState(false);
  const fromImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReading(true);
    setNotice('Sayfa okunuyor; bu yarım dakika kadar sürebilir…');
    readSheet(file)
      .then((raw) => {
        // Ad okunamadıysa okunan sayılar yine de karta geçer; adı oyuncu yazar.
        const named = typeof (raw as { name?: unknown } | null)?.name === 'string' && (raw as { name: string }).name.trim() !== '';
        const fields = raw && typeof raw === 'object' ? Object.keys(raw).length : 0;
        const read = fields > 0 ? readCharacter(named ? raw : { ...(raw as object), name: draft.name.trim() || 'Adsız' }) : null;
        if (!read) { setNotice('Sayfadan hiçbir değer okunamadı. Daha net, düz çekilmiş bir resim dene ya da kartı elle doldur.'); return; }
        setDraft(named || draft.name.trim() ? read : { ...read, name: '' });
        setNotice(named
          ? 'Kart sayfadan dolduruldu. Sayıları sayfayla karşılaştır, sonra kaydet.'
          : 'Sayılar sayfadan dolduruldu ama ad okunamadı. Adı yaz, sayıları karşılaştır, sonra kaydet.');
      })
      .catch((e: Error) => setNotice(e.message))
      .finally(() => setReading(false));
  };
  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    file.text()
      .then((raw) => readCharacter(JSON.parse(raw)))
      .catch(() => null)
      .then((read) => {
        if (!read) { setNotice('Bu dosya bir karakter kartı değil. Buradan dışa aktarılmış bir .json dosyası seç.'); return; }
        setDraft(read);
        setNotice('Kart dosyadan dolduruldu. Masaya işlemek için "Kartı kaydet"e bas.');
      });
  };
  const profile = draft.profile ?? blankProfile();
  const setProfile = <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) =>
    set('profile', { ...profile, [key]: value });
  const setRank = (key: SkillKey, rank: SkillRank | '') => {
    const skills = { ...profile.skills };
    if (rank) skills[key] = rank; else delete skills[key];
    setProfile('skills', skills);
  };
  const field = (label: string, key: (typeof NUMBERS)[number]) => (
    <label className="box">{label} <input type="number" value={draft[key]} onChange={(e) => set(key, num(e))} required /></label>
  );
  const word = (label: string, key: 'background' | 'playerName' | 'alignment' | 'hitDice') => (
    <label className="box">{label}
      <input value={profile[key]} maxLength={PROFILE_TEXT_LIMITS[key]} onChange={(e) => setProfile(key, e.target.value)} />
    </label>
  );
  const long = (label: string, key: 'personality' | 'ideals' | 'bonds' | 'flaws' | 'equipment' | 'features' | 'languages', rows = 4) => (
    <label className="box page">{label}
      <textarea rows={rows} value={profile[key]} maxLength={PROFILE_TEXT_LIMITS[key]} onChange={(e) => setProfile(key, e.target.value)} />
    </label>
  );
  const bonusOf = (key: SkillKey) => signed(skillBonus({ abilities: draft.abilities, proficiency: draft.proficiency, profile }, key));

  return (
    <section aria-label="Karakter kartı" className="card paper-card">
      <h2>{title}</h2>
      {character?.dead && <p role="status">Karakter öldü.</p>}
      {character && character.hp === 0 && !character.dead && (
        <p>
          Ölüm zarları: {character.deathSaves.successes} başarı, {character.deathSaves.failures} başarısızlık{' '}
          <button type="button" onClick={() => send({ type: 'character.deathSave' })}>Ölüm kurtarma zarı at</button>
        </p>
      )}
      <form onSubmit={save} className="sheet paper">
        <header className="paper-head">
          <label className="box name">Karakter adı <input value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={60} required /></label>
          <div className="paper-facts">
            <label className="box">Sınıf
              <select value={profile.className} onChange={(e) => setProfile('className', e.target.value)}>
                <option value="">Seçilmedi</option>
                {/* Sayfadan okunan ya da eski karttaki sınıf listede yoksa kaybolmasın. */}
                {profile.className && !(CHARACTER_CLASSES as readonly string[]).includes(profile.className) && (
                  <option value={profile.className}>{profile.className}</option>
                )}
                {CHARACTER_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {field('Seviye', 'level')}
            {word('Geçmiş', 'background')}
            {word('Oyuncu adı', 'playerName')}
            <label className="box">Irk
              <select value={profile.race} onChange={(e) => {
                const value = e.target.value;
                setProfile('race', value);
                // Irkın yürüme hızı karta işlenir; alt ırk ana ırkın hızını taşır.
                const found = RACES.find((r) => r.name.tr === value || r.subraces.some((x) => x.name === value));
                if (found) set('speed', found.speed);
              }}>
                <option value="">Seçilmedi</option>
                {/* Elle yazılmış ya da sayfadan okunan ırk listede yoksa kaybolmasın. */}
                {profile.race && !RACE_CHOICES.includes(profile.race) && <option value={profile.race}>{profile.race}</option>}
                {RACES.map((r) => (
                  <optgroup key={r.id} label={r.name.tr}>
                    <option value={r.name.tr}>{r.name.tr}</option>
                    {r.subraces.map((sub) => <option key={sub.name} value={sub.name}>{sub.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {word('Yönelim', 'alignment')}
            <label className="box">Tecrübe puanı
              <input type="number" min={0} value={profile.experience} onChange={(e) => setProfile('experience', num(e))} />
            </label>
          </div>
        </header>

        <div className="paper-columns">
          <div className="paper-col">
            <label className="box">İlham puanı
              <input type="number" min={0} max={20} value={profile.inspiration} onChange={(e) => setProfile('inspiration', num(e))} />
            </label>
            {field('Yetkinlik bonusu', 'proficiency')}
            <fieldset className="ability-scores">
              <legend>Yetenekler</legend>
              {ABILITIES.map((a) => (
                <div key={a} className="row">
                  <label>{ABILITY_TR[a]} <input type="number" value={draft.abilities[a]}
                    onChange={(e) => set('abilities', { ...draft.abilities, [a]: num(e) })} required /></label>
                  <span className="mod">{signed(abilityMod(draft.abilities[a]))}</span>
                </div>
              ))}
            </fieldset>
            <fieldset>
              <legend>Kurtulma zarları</legend>
              {ABILITIES.map((a) => {
                const on = draft.saveProficiencies.includes(a);
                return (
                  <div key={a} className="row">
                    <input type="checkbox" aria-label={`${ABILITY_TR[a]} kurtulma yetkinliği`} checked={on} onChange={() => toggleSave(a)} />
                    <span className="mod">{signed(abilityMod(draft.abilities[a]) + (on ? draft.proficiency : 0))}</span>
                    <span className="name">{ABILITY_TR[a]}</span>
                    {character && (
                      <button type="button" aria-label={`${ABILITY_TR[a]} kurtarma zarı`}
                        onClick={() => send({ type: 'character.save', ability: a, mode: 'normal' })}>Zar at</button>
                    )}
                  </div>
                );
              })}
            </fieldset>
            <fieldset>
              <legend>Beceriler</legend>
              {SKILLS.map((k) => (
                <div key={k.key} className="row skill">
                  <select aria-label={`${k.tr} yetkinliği`} value={profile.skills[k.key] ?? ''}
                    onChange={(e) => setRank(k.key, e.target.value as SkillRank | '')}>
                    <option value="">Yetkin değil</option>
                    {(Object.keys(SKILL_RANK_TR) as SkillRank[]).map((r) => <option key={r} value={r}>{SKILL_RANK_TR[r]}</option>)}
                  </select>
                  <span className="mod">{bonusOf(k.key)}</span>
                  <span className="name">{k.tr} <em>({ABILITY_TR[k.ability]})</em></span>
                  {character && (
                    <button type="button" aria-label={`${k.tr} zarı`}
                      onClick={() => send({ type: 'character.check', skill: k.key, mode: 'normal' })}>Zar at</button>
                  )}
                </div>
              ))}
            </fieldset>
            <p className="box derived">Pasif algı (Bilgelik)
              <strong>{passivePerception({ abilities: draft.abilities, proficiency: draft.proficiency, profile })}</strong>
            </p>
          </div>

          <div className="paper-col">
            <div className="paper-vitals">
              {field('Zırh sınıfı', 'ac')}
              <p className="box derived">İnisiyatif <strong>{signed(initiativeBonus({ abilities: draft.abilities, proficiency: draft.proficiency }))}</strong></p>
              {field('Hız (fit)', 'speed')}
            </div>
            {field('En fazla can puanı', 'maxHp')}
            {field('Can puanı', 'hp')}
            {field('Geçici can puanı', 'tempHp')}
            {word('Can zarı', 'hitDice')}
            {character && (
              <p className="box derived">Ölümden kurtulma
                <span>{character.deathSaves.successes} başarılı · {character.deathSaves.failures} başarısız</span>
              </p>
            )}
            <fieldset>
              <legend>Saldırılar ve büyü yapma</legend>
              {draft.attacks.map((a, i) => (
                <div key={i} className="attack-row">
                  <label className="wide">Saldırı adı <input aria-label="Saldırı adı" value={a.name} onChange={(e) => setAttack(i, { name: e.target.value })} required /></label>
                  <label>İsabet bonusu <input aria-label="İsabet bonusu" type="number" value={a.bonus} onChange={(e) => setAttack(i, { bonus: num(e) })} /></label>
                  <label>Hasar zarı <input aria-label="Hasar zarı" value={a.damage} onChange={(e) => setAttack(i, { damage: e.target.value })} required /></label>
                  <label>Hasar türü <select aria-label="Hasar türü" value={a.type} onChange={(e) => setAttack(i, { type: e.target.value as DamageType })}>
                    {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{DAMAGE_TR[t]}</option>)}
                  </select></label>
                  <label>Menzil (fit) <input aria-label="Menzil (fit)" type="number" min={5} max={600} step={5} value={a.range}
                    onChange={(e) => setAttack(i, { range: num(e) })} /></label>
                  <button type="button" className="remove" onClick={() => set('attacks', draft.attacks.filter((_, j) => j !== i))}>Saldırıyı sil</button>
                </div>
              ))}
              <AttackPicker className={profile.className} race={profile.race} level={draft.level} abilities={draft.abilities}
                proficiency={draft.proficiency} attacks={draft.attacks} full={draft.attacks.length >= 12}
                onAdd={(a) => set('attacks', [...draft.attacks, a])} />
              <button type="button" disabled={draft.attacks.length >= 12}
                onClick={() => set('attacks', [...draft.attacks, NEW_ATTACK])}>Saldırı ekle</button>
            </fieldset>
            {long('Ekipmanlar', 'equipment', 6)}
          </div>

          <div className="paper-col">
            {long('Kişilik özellikleri', 'personality', 3)}
            {long('İdealler', 'ideals', 3)}
            {long('Bağlar', 'bonds', 3)}
            {long('Kusurlar', 'flaws', 3)}
            {long('Özellikler', 'features', 8)}
            {long('Diğer yetkinlikler ve diller', 'languages', 5)}
          </div>
        </div>
        <button className="btn-primary">{saveLabel}</button>
      </form>
      {notice && <p role="status" className="hint">{notice}</p>}
      <div className="board-tools">
        <button type="button" onClick={exportFile}>Kartı dosyaya aktar</button>
        <label className="file-btn">{reading ? 'Okunuyor…' : 'Sayfa resminden doldur'}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={reading} onChange={fromImage} />
        </label>
        <label className="file-btn">Dosyadan içe aktar
          <input type="file" accept="application/json,.json" onChange={importFile} />
        </label>
      </div>
    </section>
  );
}
