import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'tr'

const dict = {
  // Landing nav
  navHow: { en: 'How it works', tr: 'Nasıl çalışır' },
  navFeatures: { en: 'Features', tr: 'Özellikler' },
  navFaq: { en: 'FAQ', tr: 'SSS' },
  connectSpotify: { en: 'Connect Spotify', tr: "Spotify'ı Bağla" },
  openStudio: { en: 'Open the studio', tr: "Stüdyoyu Aç" },
  tryDemo: { en: 'Try the demo', tr: 'Demoyu dene' },
  demoNotice: {
    en: 'Demo collection with fictional artists — connect Spotify to organize your own library. Nothing is ever changed.',
    tr: 'Kurgusal sanatçılardan oluşan demo koleksiyon — kendi arşivini düzenlemek için Spotify’ı bağla. Hiçbir şey değiştirilmez.',
  },
  demoCollection: { en: 'Demo collection', tr: 'Demo koleksiyon' },
  authFailed: {
    en: 'Spotify login failed. Nothing was changed — please try connecting again.',
    tr: 'Spotify girişi başarısız oldu. Hiçbir şey değişmedi — lütfen tekrar bağlanmayı dene.',
  },
  // Landing hero
  kicker: { en: 'Spotify playlist curator', tr: 'Spotify çalma listesi küratörü' },
  heroTitle: { en: 'Organize your music.', tr: 'Müziğini düzenle.' },
  seeHow: { en: 'See how it works', tr: 'Nasıl çalıştığını gör' },
  exploreBins: { en: 'Explore bins', tr: 'Kutuluları keşfet' },
  heroNote: { en: 'Free · No edits to your library · 1-minute first sync', tr: 'Ücretsiz · Arşivine dokunulmaz · 1 dakikalık ilk eşitleme' },
  statCats: { en: 'organize categories', tr: 'düzenleme kategorisi' },
  statCov: { en: 'audio coverage', tr: 'ses verisi kapsamı' },
  statExp: { en: 'click Spotify export', tr: 'tek tıkla Spotify kaydı' },
  bgMotion: { en: 'Background motion', tr: 'Arka plan hareketi' },
  on: { en: 'on', tr: 'açık' },
  off: { en: 'off', tr: 'kapalı' },
  genresBins: { en: '128 bins', tr: '128 kutu' },
  previewFoot: { en: '…and moods, decades, popularity, duration, sources', tr: '…ve modlar, on yıllar, popülerlik, süre, kaynaklar' },
  // Landing sections
  usageGuide: { en: 'Usage guide', tr: 'Kullanım kılavuzu' },
  stepsTitle: { en: 'Five steps to a finished playlist', tr: 'Bitmiş bir listeye beş adım' },
  whatYouGet: { en: 'What you get', tr: 'Neler var' },
  featuresTitle: { en: 'Built like the original, kept simple', tr: 'Orijinali gibi, sade tutuldu' },
  questions: { en: 'Questions', tr: 'Sorular' },
  faqTitle: { en: 'Before you ask', tr: 'Sormadan önce' },
  finalTitle: { en: 'Your collection, in order.', tr: 'Koleksiyonun, düzende.' },
  footerTag: { en: 'Cartridge — organize your music', tr: 'Cartridge — müziğini düzenle' },
  footerNote: {
    en: "Powered by the Spotify API. Cartridge is a personal project and is not affiliated with Spotify AB. By connecting you agree to Spotify's Terms.",
    tr: "Spotify API ile çalışır. Cartridge kişisel bir projedir, Spotify AB ile bağlantısı yoktur. Bağlanarak Spotify koşullarını kabul edersin.",
  },
  studio: { en: 'Studio', tr: 'Stüdyo' },
  feedback: { en: 'Feedback', tr: 'Geri bildirim' },
  // Studio tabs
  tabTracks: { en: 'THE TRACK LIST', tr: 'ŞARKI LİSTESİ' },
  tabPlots: { en: 'AUDIO PROFILE PLOTS', tr: 'SES PROFİLİ GRAFİKLERİ' },
  tabStaging: { en: 'STAGING PLAYLIST', tr: 'HAZIRLIK LİSTESİ' },
  tabCompare: { en: 'COMPARE BINS', tr: 'KUTULARI KARŞILAŞTIR' },
  tabStats: { en: 'LIBRARY STATS', tr: 'ARŞİV İSTATİSTİKLERİ' },
  tabDuplicates: { en: 'FIND DUPLICATES', tr: 'TEKRARLARI BUL' },
  // Studio chrome
  organizeYourMusic: { en: 'Organize your music', tr: 'Müziğini düzenle' },
  connected: { en: 'Connected', tr: 'Bağlı' },
  disconnect: { en: 'Disconnect Spotify', tr: "Spotify bağlantısını kes" },
  whatToOrganize: { en: 'WHAT DO YOU WANT TO ORGANIZE:', tr: 'NEYİ DÜZENLEMEK İSTİYORSUN:' },
  likedSongs: { en: "Songs you've saved (Liked)", tr: 'Kaydettiklerin (Beğenilenler)' },
  specificPlaylist: { en: 'A specific playlist', tr: 'Belirli bir liste' },
  allMusic: { en: 'All of your music', tr: 'Tüm müziğin' },
  organizeEverything: { en: 'Organize Everything', tr: 'Her Şeyi Düzenle' },
  playlistPlaceholder: {
    en: 'Paste playlist URI / link / ID: open.spotify.com/playlist/... or spotify:playlist:...',
    tr: 'Liste URI / bağlantı / ID yapıştır: open.spotify.com/playlist/... veya spotify:playlist:...',
  },
  pickPlaylist: { en: 'Or pick one of your playlists', tr: 'veya listelerinden birini seç' },
  organizeMusic: { en: 'Organize your music', tr: 'Müziğini düzenle' },
  fullSync: { en: 'Full Sync', tr: 'Tümünü Eşitle' },
  syncNew: { en: 'Sync New Tracks', tr: 'Yeni Şarkıları Eşitle' },
  syncedAt: { en: 'synced', tr: 'eşitlendi' },
  organizeThis: { en: 'Organize This Playlist', tr: "Bu Listeyi Düzenle" },
  autoWizard: { en: 'Auto-Playlist Wizard', tr: 'Otomatik Liste Sihirbazı' },
  share: { en: 'Share', tr: 'Paylaş' },
  selectAll: { en: 'Select All', tr: 'Tümünü Seç' },
  exportCsv: { en: 'Export CSV', tr: 'CSV dışa aktar' },
  staging: { en: 'Staging', tr: 'Hazırlık' },
  saveView: { en: 'Save View as Playlist', tr: "Görünümü Liste Olarak Kaydet" },
  saveAsPlaylist: { en: 'as Spotify Playlist', tr: 'Spotify listesi olarak kaydet' },
  saving: { en: 'Saving...', tr: 'Kaydediliyor...' },
  searchCollection: { en: 'SEARCH COLLECTION', tr: 'KOLEKSİYONDA ARA' },
  searchPlaceholder: { en: 'Song, artist, or album...', tr: 'Şarkı, sanatçı veya albüm...' },
  quickSliders: { en: 'QUICK SLIDERS', tr: 'HIZLI KAYDIRICILAR' },
  showSliders: { en: 'Show Range Sliders', tr: "Aralık Kızaklarını Göster" },
  hideSliders: { en: 'Hide Sliders', tr: 'Kızakları Gizle' },
  resetFilters: { en: 'Reset Filters', tr: 'Filtreleri Sıfırla' },
  // Staging
  readyToExport: { en: 'READY TO EXPORT', tr: 'DIŞA AKTARMAYA HAZIR' },
  stagingTitle: { en: 'Staging Playlist', tr: 'Hazırlık Listesi' },
  stagingSub: {
    en: 'Review and finalize your playlist before saving directly to your Spotify library.',
    tr: "Spotify arşivine kaydetmeden önce listeni gözden geçir ve son haline getir.",
  },
  clearSelection: { en: 'Clear selection', tr: 'Seçimi temizle' },
  optimizeFlow: { en: 'Optimize flow', tr: 'Akışı optimize et' },
  djFlow: { en: 'DJ flow', tr: 'DJ akışı' },
  optimized: { en: 'optimized', tr: 'optimize edildi' },
  playlistName: { en: 'PLAYLIST NAME', tr: 'LİSTE ADI' },
  description: { en: 'DESCRIPTION', tr: 'AÇIKLAMA' },
  sortOrder: { en: 'SORT PLAYLIST ORDER', tr: 'LİSTE SIRALAMASI' },
  naturalOrder: { en: 'Selected order', tr: 'Seçim sırası' },
  saveToSpotify: { en: 'Save playlist to Spotify', tr: "Listeyi Spotify'a kaydet" },
  savingToSpotify: { en: 'Saving to Spotify...', tr: "Spotify'a kaydediliyor..." },
  nothingStaged: { en: 'Nothing staged yet', tr: 'Henüz hazırlık yok' },
  nothingStagedSub: {
    en: 'Return to The Track List and select songs or use the Auto-Playlist Wizard.',
    tr: 'Şarkı Listesine dönüp şarkı seç veya Otomatik Liste Sihirbazını kullan.',
  },
  tracks: { en: 'tracks', tr: 'şarkı' },
  // Compare
  compareNothing: { en: 'Nothing to compare yet', tr: 'Karşılaştırılacak bir şey yok' },
  compareNothingSub: {
    en: 'Sync your library first, then pick two bins to compare.',
    tr: 'Önce arşivini eşitle, sonra karşılaştırmak için iki kutu seç.',
  },
  shared: { en: 'shared', tr: 'ortak' },
  stageShared: { en: 'Stage shared', tr: 'Ortakları hazırla' },
  onlyIn: { en: 'ONLY IN', tr: 'YALNIZCA' },
  pickBin: { en: 'Pick a bin…', tr: 'Bir kutu seç…' },
  // Duplicates
  dupEmpty: { en: 'Nothing to scan yet', tr: 'Taranacak bir şey yok' },  dupEmptySub: {
    en: 'Sync your library first, then hunt down duplicate releases.',
    tr: 'Önce arşivini eşitle, sonra tekrar sürümleri avla.',
  },
  dupNone: { en: 'No duplicates found', tr: 'Tekrar bulunamadı' },
  dupNoneSub: {
    en: 'Every song appears exactly once. Your library is squeaky clean.',
    tr: 'Her şarkı tam bir kez geçiyor. Arşivin tertemiz.',
  },
  dupGroupsWord: { en: 'duplicate groups', tr: 'tekrar grubu' },
  dupCopiesWord: { en: 'extra copies', tr: 'fazla kopya' },
  dupVersionsWord: { en: 'versions', tr: 'sürüm' },
  dupStageAll: { en: 'Stage all extras (keep first)', tr: 'Fazlaları hazırla (ilkini tut)' },
  dupStageGroup: { en: 'Stage extras', tr: 'Fazlaları hazırla' },
  dupHint: {
    en: 'The first copy of each group is kept; the rest get staged for a cleanup playlist.',
    tr: 'Her grubun ilk kopyası tutulur; kalanlar temizlik listesi için hazırlanır.',
  },
  // Custom bins
  customLabelPh: { en: 'Bin name, e.g. Workout rock', tr: 'Kutu adı, örn. Antrenman rock' },
  customKeywordsPh: { en: 'Genre keywords, comma separated', tr: 'Tür anahtarları, virgülle ayır' },
  customAdd: { en: 'Add bin', tr: 'Kutu ekle' },
  customDelete: { en: 'Delete this custom bin', tr: 'Bu özel kutuyu sil' },
  customEmpty: {
    en: 'No custom bins yet — name one above and list the genres it should catch.',
    tr: 'Henüz özel kutu yok — yukarıya bir ad yaz ve yakalamasını istediğin türleri listele.',
  },
  // Library stats
  statsEmpty: { en: 'No stats yet', tr: 'Henüz istatistik yok' },  statsEmptySub: {
    en: 'Sync your library (or try the demo) to see charts.',
    tr: 'Grafikleri görmek için arşivini eşitle (veya demoyu dene).',
  },
  statsArtists: { en: 'Top artists', tr: 'En çok dinlenen sanatçılar' },
  statsGenres: { en: 'Top genres', tr: 'En çok dinlenen türler' },
  statsDecades: { en: 'Tracks by decade', tr: 'On yıllara göre şarkılar' },
  statsArtistsWord: { en: 'artists', tr: 'sanatçı' },
  statsMinutesWord: { en: 'minutes', tr: 'dakika' },
  statsAvgBpm: { en: 'avg bpm', tr: 'ort. bpm' },
  statsAvgEnergy: { en: 'avg energy', tr: 'ort. enerji' },
  statsAvgDance: { en: 'avg dance', tr: 'ort. dans' },
  statsAvgValence: { en: 'avg mood', tr: 'ort. mod' },
  // Share
  shareTaste: { en: 'Share your taste', tr: 'Zevkini paylaş' },
  copyText: { en: 'Copy text', tr: 'Metni kopyala' },
  copied: { en: 'Copied!', tr: 'Kopyalandı!' },
  downloadPng: { en: 'Download PNG', tr: "PNG indir" },
  // Landing steps
  step1t: { en: 'Connect', tr: 'Bağlan' },
  step1d: {
    en: 'Login with Spotify. Cartridge only reads your library — it never edits or deletes anything.',
    tr: "Spotify ile giriş yap. Cartridge arşivini sadece okur — asla düzenlemez veya silmez.",
  },
  step2t: { en: 'Organize', tr: 'Düzenle' },
  step2d: {
    en: 'Pick Liked Songs or any playlist. Everything is sorted into genre, mood, decade and popularity bins automatically.',
    tr: 'Beğenilenleri veya bir listeyi seç. Her şey tür, mod, on yıl ve popülerlik kutularına otomatik ayrılır.',
  },
  step3t: { en: 'Pick a bin', tr: 'Bir kutu seç' },
  step3d: {
    en: 'Open a genre like anadolu rock, inspect BPM, energy and mood, plot the tracks on the audio matrix.',
    tr: 'Anadolu rock gibi bir türü aç, BPM, enerji ve modu incele, şarkıları ses matrisinde çizdir.',
  },
  step4t: { en: 'Stage', tr: 'Hazırla' },
  step4d: {
    en: 'Tick songs into your staging playlist. Reorder with BPM or energy ramps.',
    tr: 'Şarkıları hazırlık listene işaretle. BPM veya enerji rampalarıyla sırala.',
  },
  step5t: { en: 'Save', tr: 'Kaydet' },
  step5d: {
    en: 'One click creates the playlist in your Spotify account. Only new playlists, only when you say so.',
    tr: "Tek tıkla liste Spotify hesabında oluşur. Sadece yeni listeler, sadece sen istediğinde.",
  },
  // Landing features
  feat1t: { en: 'Automatic genre bins', tr: 'Otomatik tür kutuları' },
  feat1d: {
    en: 'Your whole collection split by genre, mood, style, decade, recency, popularity and length. Unclassified tracks sink to the bottom.',
    tr: 'Tüm koleksiyonun türe, moda, tarza, on yıla, yeniliğe, popülerliğe ve süreye göre ayrılır. Sınıflanamayanlar en alta iner.',
  },
  feat2t: { en: 'Audio matrix plots', tr: 'Ses matrisi grafikleri' },
  feat2d: {
    en: 'X, Y and bubble-size axes across energy, danceability, valence, BPM, loudness and more. Click a dot to stage it.',
    tr: 'Enerji, dans edilebilirlik, mod, BPM, gürlük ve dahasında X, Y ve balon eksenleri. Noktaya tıkla, hazırlığa ekle.',
  },
  feat3t: { en: 'One-click presets', tr: 'Tek tıklık hazır listeler' },
  feat3d: {
    en: 'Workout, late-night chill, peak dance floor, hidden gems — eight starters that export instantly.',
    tr: 'Antrenman, gece chill, dans pisti, gizli cevherler — anında dışa aktarılan sekiz başlangıç.',
  },
  feat4t: { en: 'Two sources', tr: 'İki kaynak' },
  feat4d: {
    en: 'Organize Liked Songs or paste any playlist link, URI or ID. Pick from your own playlists too.',
    tr: 'Beğenilenleri düzenle veya liste bağlantısı, URI ya da ID yapıştır. Kendi listelerinden de seç.',
  },
  feat5t: { en: 'Staging that respects order', tr: 'Sıraya saygılı hazırlık' },
  feat5d: {
    en: 'Build the flow with BPM and energy ramps, then save once. Nothing is touched until you press save.',
    tr: 'Akışı BPM ve enerji rampalarıyla kur, sonra bir kez kaydet. Kaydete basana kadar hiçbir şeye dokunulmaz.',
  },
  feat6t: { en: 'Private by design', tr: 'Doğası gereği gizli' },
  feat6d: {
    en: 'No backend, no database of yours anywhere. Tokens stay in your browser, music never leaves Spotify.',
    tr: 'Sunucu yok, verin hiçbir yerde yok. Jetonlar tarayıcında kalır, müzik Spotify’dan çıkmaz.',
  },
  // Landing FAQ
  faq1q: { en: 'Does Cartridge change or delete my music?', tr: 'Cartridge müziğimi değiştirir veya siler mi?' },
  faq1a: {
    en: 'No. It only reads your library and creates brand-new playlists when you explicitly press save. Your Liked Songs and existing playlists are never modified.',
    tr: 'Hayır. Arşivini sadece okur ve yalnızca sen kaydet deyince yepyeni listeler oluşturur. Beğenilenlerin ve listelerin asla değiştirilmez.',
  },
  faq2q: { en: 'Why are some audio values estimated?', tr: 'Bazı ses değerleri neden tahmini?' },
  faq2a: {
    en: 'Spotify closed the audio-features endpoint for newer apps. Where real data is missing, Cartridge fills it deterministically from genre profiles, so every bin still works. Genre labels always come from Spotify artist data.',
    tr: 'Spotify ses-verisi uç noktasını yeni uygulamalara kapattı. Gerçek veri yoksa Cartridge tür profillerinden deterministik doldurur, kutular çalışmaya devam eder. Tür etiketleri hep Spotify sanatçı verisinden gelir.',
  },
  faq3q: { en: 'What can I organize?', tr: 'Neleri düzenleyebilirim?' },
  faq3a: {
    en: 'Your Liked Songs, or any specific playlist via link, URI or ID — including playlists you follow, as long as you can open them in Spotify.',
    tr: 'Beğenilen Şarkıların veya bağlantı, URI ya da ID ile herhangi bir liste — Spotify’da açabildiğin takip listeleri dahil.',
  },
  faq4q: { en: 'Is it free?', tr: 'Ücretsiz mi?' },
  faq4a: {
    en: 'Yes. You just need a Spotify account (Free is fine) and about a minute for the first sync.',
    tr: 'Evet. Sadece bir Spotify hesabı (ücretsiz olur) ve ilk eşitleme için yaklaşık bir dakika gerekir.',
  },
  wizardTitle: { en: 'Smart Playlist Wizard', tr: 'Akıllı Liste Sihirbazı' },
  quickStart: { en: 'QUICK START — ONE CLICK', tr: 'HIZLI BAŞLANGIÇ — TEK TIK' },
  genre: { en: 'GENRE', tr: 'TÜR' },
  allGenres: { en: 'All Genres', tr: 'Tüm Türler' },
  decade: { en: 'DECADE', tr: 'ON YIL' },
  allDecades: { en: 'All Decades', tr: 'Tüm On Yıllar' },
  bpmTempo: { en: 'BPM / TEMPO', tr: 'BPM / TEMPO' },
  anyTempo: { en: 'Any Tempo', tr: 'Herhangi Bir Tempo' },
  energy: { en: 'ENERGY', tr: 'ENERJİ' },
  anyEnergy: { en: 'Any Energy', tr: 'Herhangi Bir Enerji' },
  mood: { en: 'MOOD (OYM)', tr: 'MOD (OYM)' },
  anyMood: { en: 'Any Mood', tr: 'Herhangi Bir Mod' },
  trackLimit: { en: 'TRACK LIMIT', tr: 'ŞARKI LİMİTİ' },
  flowOrdering: { en: 'FLOW / ORDERING', tr: 'AKIŞ / SIRALAMA' },
  cancel: { en: 'Cancel', tr: 'Vazgeç' },
  createSave: { en: 'Create & Save to Spotify', tr: "Oluştur ve Spotify'a Kaydet" },
  matching: { en: 'Matching', tr: 'Eşleşen' },
  tracksReady: { en: 'tracks ready to export', tr: 'şarkı dışa aktarmaya hazır' },
  likedSongsSrc: { en: 'Liked Songs', tr: 'Beğenilenler' },
  faq5q: { en: 'Where is my data stored?', tr: 'Verilerim nerede saklanıyor?' },
  faq5a: {
    en: 'In your own browser: an IndexedDB cache for tracks and localStorage for the Spotify session. There is no Cartridge server.',
    tr: 'Kendi tarayıcında: şarkılar için IndexedDB önbelleği, Spotify oturumu için localStorage. Cartridge sunucusu yok.',
  },
  // WhatsNew (new tracks since last sync)
  whatsNewTitle: { en: "What's new since last sync", tr: 'Son eşitlemeden beri yeniler' },  whatsNewLoading: { en: 'Checking Spotify for new additions…', tr: 'Spotify’da yeni eklenenler denetleniyor…' },
  whatsNewEmpty: { en: 'Nothing new yet', tr: 'Henüz yeni bir şey yok' },
  whatsNewEmptySub: {
    en: 'No songs were added to your Liked Songs since the last sync.',
    tr: 'Son eşitlemeden beri Beğenilenlere eklenen şarkı yok.',
  },
  whatsNewSince: { en: 'new since last sync', tr: 'son eşitlemeden beri yeni' },
  whatsNewSync: { en: 'Sync now', tr: 'Şimdi eşitle' },
  // Copy URIs
  copyUris: { en: 'Copy URIs', tr: "URI'leri kopyala" },
  copiedUris: { en: 'URIs copied to clipboard', tr: "URI'ler panoya kopyalandı" },
  // Backup & restore
  backup: { en: 'Backup', tr: 'Yedekle' },
  restore: { en: 'Restore', tr: 'Geri yükle' },
  backupDone: { en: 'Library backup downloaded', tr: 'Arşiv yedeği indirildi' },
  restoreDone: { en: 'Backup restored', tr: 'Yedek geri yüklendi' },
  restoreFailed: { en: 'Could not read that backup file', tr: 'Yedek dosyası okunamadı' },
  // Sync history
  syncHistory: { en: 'Sync history', tr: 'Eşitleme geçmişi' },
  historyEmpty: { en: 'No syncs yet', tr: 'Henüz eşitleme yok' },
  historyEmptySub: {
    en: 'Sync your library and the last 20 runs will appear here.',
    tr: 'Arşivini eşitle, son 20 çalıştırma burada görünür.',
  },
  // Saved views
  savedViews: { en: 'SAVED VIEWS', tr: 'KAYITLI GÖRÜNÜMLER' },
  saveCurrentView: { en: 'Save current view', tr: 'Geçerli görünümü kaydet' },
  viewNamePh: { en: 'View name…', tr: 'Görünüm adı…' },
  deleteView: { en: 'Delete this view', tr: 'Bu görünümü sil' },
  noSavedViews: { en: 'No saved views yet', tr: 'Henüz kayıtlı görünüm yok' },
  // Shortcuts
  shortcutsHint: { en: 'Press / to search', tr: 'Aramak için / tuşuna bas' },
  // WhatsNew tabs
  addedTab: { en: 'Added', tr: 'Eklenenler' },
  removedTab: { en: 'Removed', tr: 'Silinenler' },
} as const

export type I18nKey = keyof typeof dict

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('cartridge.lang') as Lang) === 'tr' ? 'tr' : 'en'
    } catch {
      return 'en'
    }
  })
  const set = useCallback((l: Lang) => {
    setLang(l)
    try {
      localStorage.setItem('cartridge.lang', l)
    } catch {
      // ignore
    }
  }, [])
  return <LangCtx.Provider value={{ lang, setLang: set }}>{children}</LangCtx.Provider>
}

export function useLang() {
  return useContext(LangCtx)
}

export function useT() {
  const { lang } = useContext(LangCtx)
  return useCallback((key: I18nKey) => dict[key][lang], [lang])
}

export function LangToggle() {
  const { lang, setLang } = useContext(LangCtx)
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
      title={lang === 'en' ? 'Türkçeye geç' : 'Switch to English'}
    >
      {lang === 'en' ? 'TR' : 'EN'}
    </button>
  )
}
