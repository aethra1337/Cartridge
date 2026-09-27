# Cartridge — Brandkit v1

> Pikap iğnesi plakla buluştuğu an. Düzenli, sessiz, turuncu.

## Logo

* `public/logo.svg` — ana marka (header, 26px).
* `public/favicon.svg` — sekme ikonu, aynı çizimin sadeleşmiş hali.
* Çizim: koyu zeminde krem "C", açıklığında turuncu play üçgeni.
  "Koy, bas, çal" tek işarette. Koyu kutu + ince çerçeve; 16px'te
  C halkası + üçgen okunur.
* Minimum boyut 16px. Etrafında en az logo genişliğinin 1/4'ü boşluk bırak.
* Yasaklar: gradient verme, döndürme, gölge ekleme, turuncu dışında
  zemine koyma (siyah/beyaz zemin serbest).

## Renkler

| Rol | Token | Değer |
|---|---|---|
| Zemin | `--bg-primary` | `#0a0a0a` |
| Yüzey | `--bg-surface` | `#1a1a1a` |
| Yükseltilmiş | `--bg-elevated` | `#202020` |
| Çizgi | `--border` | `#2d2d2d` |
| Açık çizgi | `--border-light` | `#3a3a3a` |
| Birincil metin | `--text-primary` | `#eceae6` |
| İkincil metin | `--text-secondary` | `#a7a49c` |
| Yardımcı/micro | `--text-muted` | `#7a7a78` |
| **Aksiyon (tek accent)** | `--accent` | `#ff6b35` |
| Aksiyon hover | `--accent-hover` | `#ff8252` |
| Seçim zemini | `--accent-subtle` | `rgba(255,107,53,0.08)` |
| Hata/tehlike | `--error` | `#d64045` |
| Uyarı | `--warning` | `#d99a2b` |

Kural: **turuncu = eylem ve seçim.** İkincil butonlar gri çerçeveli,
turuncu çerçeve yok. Kırmızı sadece hata ve yıkıcı işlemlerde.

## Tipografi

* Arayüz: Inter (12.5–19px). Başlıklar 600–650 weight, `-0.01em` sıkılık.
* Micro-label: 11px, uppercase, `0.07em` aralık, gri.
* Sayılar (BPM, yıl, yüzde): `tabular-nums`, mono (JetBrains Mono) sadece
  rozet ve sayaçlarda.

## Bileşen dili

* Köşe: 5–8px. Hap buton yok ( segmented kontrol hariç).
* Çizgi = bilgi: 1px çizgiler bölümleri tanımlar.
* Tablo: 34px satır, sticky başlık, 26px kapak, seçili satır turuncu %8.
* Sidebar 200px sabit; `+ Playlist` sadece hover'da görünür.
* Kopya kısa ve sakin: "BPM ramp — slow to fast", "30 tracks selected".

## Ses (voice)

* Sade, emin, bağırmayan. "Get your music collection in order."
* Spotify atfı zorunlu: playlist açıklamalarında
  "Created with Cartridge — Organize Your Music" yazılır.
