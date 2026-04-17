
// ============================================
// CONFIGURATION & STATE
// ============================================

const CONFIG = {
    mosqueName: 'Masjid Jami Al Ikhlas Petukangan Selatan',
    mosqueNameArabic: 'مَسْجِد جَامِع الإِخْلَاص',
    mosqueNameFontFamily: "'Cormorant Garamond', serif",
    mosqueNameFontSize: 1,
    mosqueNameColor: '#ffffff',        // TAMBAHKAN: Warna nama masjid Latin
    mosqueNameArabicColor: '#C9A84C',  // TAMBAHKAN: Warna nama masjid Arab
    dateOpacity: false, // true = semi-transparent, false = normal
    dateColor: '#ffffff',
    dateFontFamily: "'Cormorant Garamond', serif",
    dateFontSize: 1,
    theme: 'haramain',
    
    // Clock Type
    clockType: 'digital',
    digitalFontFamily: "'Orbitron', monospace",
    digitalFontSize: 6.5,
    showSeconds: true,
    analogNumberStyle: 'arabic',
    analogSize: 200,
    
    // Prayer Schedule
    prayerSourceMode: 'auto', // 'auto' or 'manual'
    sidebarWidth: 38,
    cardBgColor: 'rgba(201,168,76,0.08)',
    cardBorderColor: 'rgba(201,168,76,0.2)',
    showSidebar: true,
    
    // Prayer Times (default template - will be used in auto mode or as base for manual)
    prayerTimesTemplate: [
        { id: 'subuh', latin: 'Subuh', arabic: 'الفَجْر', time: '04:32', isMain: true },
        { id: 'dzuhur', latin: 'Dzuhur', arabic: 'الظُّهْر', time: '11:58', isMain: true },
        { id: 'ashar', latin: 'Ashar', arabic: 'العَصْر', time: '15:15', isMain: true },
        { id: 'maghrib', latin: 'Maghrib', arabic: 'المَغْرِب', time: '17:58', isMain: true },
        { id: 'isya', latin: 'Isya', arabic: 'العِشَاء', time: '19:08', isMain: true },
        { id: 'dhuha', latin: 'Dhuha', arabic: 'الضُّحَى', time: '07:00', isMain: false },
        { id: 'tahajjud', latin: 'Tahajud', arabic: 'تَهَجُّد', time: '03:30', isMain: false }
    ],
    
    // Adhan & Iqomah Mode
    adhanModeEnabled: true,
    adhanDuration: 180, // seconds (3 minutes default)
    iqomahModeEnabled: true,
    iqomahFontFamily: "'Orbitron', monospace",
    iqomahFontSize: 12,
    iqomahBeepEnabled: true,
    iqomahMinutes: 10, // minutes after adhan
    
    // Running Text
    runningAnimation: 'scroll-left',
    runningSpeed: 25,
    
    // Display Options
    showHijri: true,
    showCountdown: true,
    soundEnabled: true,
    showAnnouncement: true,
    
    announcement: "Assalamu'alaikum Warahmatullahi Wabarakatuh — Selamat datang di Masjid Jami Al Ikhlas Petukangan Selatan.",
    lang: 'id'
};

// State Variables
let PRAYER_TIMES = [];
let isAdhanMode = false;
let isIqomahMode = false;
let audioContext = null;
let lastBeepSecond = -1;
let lastIqomahBeepSecond = -1;
let lastAdhanSecond = -1;

const THEMES = {
    haramain: { accent: '#C9A84C', accentLight: '#E8D48B', bgClass: 'theme-haramain' },
    ottoman: { accent: '#08D9D6', accentLight: '#4EEAEA', bgClass: 'theme-ottoman' },
    madinah: { accent: '#A8C0D6', accentLight: '#D0E0F0', bgClass: 'theme-madinah' },
    nusantara: { accent: '#8DC06A', accentLight: '#B8DD9E', bgClass: 'theme-nusantara' },
    ramadhan: { accent: '#F5D78A', accentLight: '#FFF5DB', bgClass: 'theme-ramadhan' }
};

const ANALOG_NUMBERS = {
    arabic: ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    roman: ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'],
    hindi: ['١٢', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١']
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrentTime() { return new Date(); }

function formatTime(date, showSec = true) {
    const now = getCurrentTime();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return showSec ? `${h}:${m}:${s}` : `${h}:${m}`;
}

function formatDate(date) {
    return getCurrentTime().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getHijriDate() {
    const days = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const formatNum = n => String(n).split('').map(d => days[parseInt(d)]).join('');
    return `${formatNum(27)} رَجَب ${formatNum(1446)} هـ`;
}

function getTimeDiff(targetStr) {
    const now = getCurrentTime();
    const [h, m] = targetStr.split(':').map(Number);
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return Math.floor((target - now) / 1000);
}

function formatCountdown(seconds) {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h === 0) return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatCountdownShort(seconds) {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Detect prayer status based on current time
function detectPrayerStatus() {
    const now = getCurrentTime();
    const currentTimeStr = formatTime(now, false);
    const [currentH, currentM] = currentTimeStr.split(':').map(Number);
    const currentMinutes = currentH * 60 + currentM;

    PRAYER_TIMES = JSON.parse(JSON.stringify(CONFIG.prayerTimesTemplate));
    
    // Sort by time
    PRAYER_TIMES.sort((a, b) => {
        const [aH, aM] = a.time.split(':').map(Number);
        const [bH, bM] = b.time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
    });

    // Determine status for each prayer
    let foundCurrent = false;
    let foundNext = false;

    for (let i = 0; i < PRAYER_TIMES.length; i++) {
        const [pH, pM] = PRAYER_TIMES[i].time.split(':').map(Number);
        const prayerMinutes = pH * 60 + pM;

        if (!foundCurrent && currentMinutes >= prayerMinutes) {
            // Check if we're still within this prayer's window (until next prayer)
            if (i < PRAYER_TIMES.length - 1) {
                const [nextH, nextM] = PRAYER_TIMES[i + 1].time.split(':').map(Number);
                if (currentMinutes < nextH * 60 + nextM) {
                    PRAYER_TIMES[i].status = 'now';
                    foundCurrent = true;
                } else {
                    PRAYER_TIMES[i].status = 'passed';
                }
            } else {
                // Last prayer of the day
                PRAYER_TIMES[i].status = 'now';
                foundCurrent = true;
            }
        } else if (!foundNext && currentMinutes < prayerMinutes) {
            PRAYER_TIMES[i].status = 'upcoming';
            PRAYER_TIMES[i].isNext = true;
            foundNext = true;
        } else if (!PRAYER_TIMES[i].status) {
            PRAYER_TIMES[i].status = 'upcoming';
        }
    }

    // If no next found, first one tomorrow
    if (!foundNext) {
        const firstTomorrow = PRAYER_TIMES.find(p => !p.status || p.status === 'upcoming');
        if (firstTomorrow) {
            firstTomorrow.isNext = true;
            firstTomorrow.status = 'upcoming';
        }
    }

    return PRAYER_TIMES;
}

function getNextPrayer() {
    detectPrayerStatus();
    return PRAYER_TIMES.find(p => p.isNext) || PRAYER_TIMES[0];
}

function getCurrentPrayer() {
    detectPrayerStatus();
    return PRAYER_TIMES.find(p => p.status === 'now') || null;
}

function calculateIqomah(prayerTime) {
    const [h, m] = prayerTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + CONFIG.iqomahMinutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2,'0')}:${String(newM).padStart(2,'0')}`;
}

function getIqomahCountdown() {
    const nextPrayer = getNextPrayer();
    if (!nextPrayer || !nextPrayer.isMain) return null;
    
    const iqomahTime = calculateIqomah(nextPrayer.time);
    const diffSeconds = getTimeDiff(iqomahTime);
    
    return { prayer: nextPrayer, iqomahTime, remainingSeconds: diffSeconds };
}

function getAdhanCountdown() {
    const nextPrayer = getNextPrayer();
    if (!nextPrayer || !nextPrayer.isMain) return null;
    
    const diffToPrayer = getTimeDiff(nextPrayer.time);
    const adhanStart = diffToPrayer - CONFIG.adhanDuration;
    
    if (adhanStart <= 0 && diffToPrayer > 0) {
        return { 
            prayer: nextPrayer, 
            remainingSeconds: diffToPrayer,
            remainingToIqomah: getTimeDiff(calculateIqomah(nextPrayer.time))
        };
    }
    return null;
}

// Sound functions
function playBeep(frequency = 880, duration = 150) {
    if (!CONFIG.soundEnabled && !CONFIG.iqomahBeepEnabled) return;
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = frequency;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);
        osc.stop(audioContext.currentTime + duration / 1000);
    } catch(e) {}
}

function playTripleBeep() {
    playBeep(880, 150);
    setTimeout(() => playBeep(880, 150), 250);
    setTimeout(() => playBeep(880, 150), 500);
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderPrayerList() {
    const container = document.getElementById('prayerList');
    if (!container || !CONFIG.showSidebar) {
        if (container) container.innerHTML = '';
        return;
    }
    
    detectPrayerStatus();
    const accent = THEMES[CONFIG.theme].accent;
    
    // Only show main prayers in the list
    const mainPrayers = PRAYER_TIMES.filter(p => p.isMain);
    
    container.innerHTML = mainPrayers.map(prayer => {
        const iqomahTime = calculateIqomah(prayer.time);
        
        let rowClass = 'rounded-lg p-2 md:p-2.5 flex items-center justify-between transition-all duration-300';
        
        if (prayer.status === 'now') rowClass += ' prayer-row-active-now';
        else if (prayer.isNext) rowClass += ' prayer-row-upcoming';
        else if (prayer.status === 'passed') rowClass += ' prayer-row-passed';
        
        return `
            <div class="${rowClass}" style="background:${prayer.status==='now'?'rgba(220,38,38,0.15)':prayer.isNext?'var(--prayer-card-bg)':'transparent'};border-left:3px solid ${prayer.status==='now'?'#DC2626':prayer.isNext?accent:'transparent'};">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
                         style="background:${prayer.status==='now'?'rgba(220,38,38,0.2)':prayer.isNext?accent+'20':'rgba(255,255,255,0.05)'};">
                        <span class="font-amiri text-xs" style="color:${prayer.status==='now'?'#DC2626':prayer.isNext?accent:'rgba(255,255,255,0.5)'};">${prayer.arabic}</span>
                    </div>
                    <div class="min-w-0">
                        <p class="font-medium text-xs truncate" style="color:${prayer.status==='now'||prayer.isNext?'#fff':'rgba(255,255,255,0.7)'};">
                            ${prayer.latin}${prayer.status==='now'?' (Sekarang)':prayer.isNext?' (Berikutnya)':''}
                        </p>
                    </div>
                </div>
                <div class="text-right flex-shrink-0 ml-2">
                    <p class="font-orbitron text-xs md:text-sm font-semibold" style="color:${prayer.status==='now'?'#DC2626':prayer.isNext?accent:'rgba(255,255,255,0.7)'};">${prayer.time}</p>
                    <p class="text-[9px] text-white/35">Iqomah: ${iqomahTime}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderPrayerListCompact() {
    const container = document.getElementById('prayerListCompact');
    if (!container) return;
    
    detectPrayerStatus();
    const accent = THEMES[CONFIG.theme].accent;
    const mainPrayers = PRAYER_TIMES.filter(p => p.isMain);
    
    container.innerHTML = mainPrayers.map(prayer => {
        let rowClass = 'prayer-row-compact main-prayer';
        
        if (prayer.status === 'now') rowClass += ' prayer-row-compact-now';
        else if (prayer.isNext) rowClass += ' prayer-row-compact-upcoming';
        else if (prayer.status === 'passed') rowClass += ' prayer-row-compact-passed';
        else rowClass += ' prayer-row-compact-future';
        
        return `
            <div class="${rowClass}">
                <span class="prayer-name">${prayer.latin}</span>
                <span class="prayer-time">${prayer.time}</span>
            </div>
        `;
    }).join('');
}

function renderNextPrayerBoxes() {
    const container = document.getElementById('nextPrayerBoxes');
    if (!container) return;

    detectPrayerStatus();
    const nextPrayers = PRAYER_TIMES.filter(p => p.isMain).slice(0, 5);

    container.innerHTML = nextPrayers.map(prayer => {
        const statusLabel = prayer.status === 'now' ? 'Sekarang' : prayer.isNext ? 'Berikutnya' : '';
        const activeClass = prayer.status === 'now' || prayer.isNext ? ' active' : '';
        return `
            <div class="mini-prayer-box${activeClass}">
                <div>
                    <p class="mini-prayer-title">${statusLabel || prayer.latin}</p>
                    <p class="mini-prayer-name">${prayer.arabic}</p>
                </div>
                <p class="mini-prayer-time">${prayer.time}</p>
            </div>
        `;
    }).join('');
}

function renderPrayerTimesEditor() {
    const container = document.getElementById('prayerTimesList');
    if (!container) return;
    
    container.innerHTML = CONFIG.prayerTimesTemplate.map((prayer, index) => `
        <div class="prayer-time-editor-item" data-id="${prayer.id}">
            <input type="text" value="${prayer.arabic}" readonly class="w-16 bg-transparent text-right font-amiri text-sm" title="Arabic">
            <input type="text" value="${prayer.latin}" class="flex-1 bg-transparent text-sm font-medium" onchange="updatePrayerTime('${prayer.id}','latin',this.value)">
            <input type="time" value="${prayer.time}" class="bg-transparent text-sm font-orbitron" onchange="updatePrayerTime('${prayer.id}','time',this.value)">
            ${!prayer.isMain ? `<button class="remove-prayer-btn" onclick="removePrayerTime('${prayer.id}')" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>` : ''}
        </div>
    `).join('');
}

function updatePrayerTime(id, field, value) {
    const prayer = CONFIG.prayerTimesTemplate.find(p => p.id === id);
    if (prayer) prayer[field] = value;
    renderPrayerList();
}

function removePrayerTime(id) {
    CONFIG.prayerTimesTemplate = CONFIG.prayerTimesTemplate.filter(p => p.id !== id);
    renderPrayerTimesEditor();
    renderPrayerList();
}

function addNewPrayerTime() {
    const newId = 'custom_' + Date.now();
    CONFIG.prayerTimesTemplate.push({
        id: newId,
        latin: 'Sholat Baru',
        arabic: 'صَلَاة',
        time: '12:00',
        isMain: false
    });
    renderPrayerTimesEditor();
}



function renderAnalogClockFace() {
    const face = document.getElementById('analogClockFace');
    if (!face) return;
    
    face.querySelectorAll('.clock-mark, .clock-number').forEach(el => el.remove());
    
    const size = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--clock-size')) || 200;
    const radius = size / 2 - 32; // Increased from 22 to 32 for better spacing
    const markRadius = size / 2 - 8; // Position marks closer to edge
    
    for (let i = 0; i < 12; i++) {
        const mark = document.createElement('div');
        mark.className = `clock-mark ${i % 3 === 0 ? 'major' : ''}`;
        mark.style.transform = `rotate(${i * 30}deg)`;
        mark.style.transformOrigin = `center ${markRadius}px`;
        face.insertBefore(mark, face.firstChild);
    }
    
    const numbers = ANALOG_NUMBERS[CONFIG.analogNumberStyle] || ANALOG_NUMBERS.arabic;
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const numEl = document.createElement('div');
        numEl.className = `clock-number ${CONFIG.analogNumberStyle}-num`;
        numEl.textContent = numbers[i];
        numEl.style.left = `calc(50% + ${x}px)`;
        numEl.style.top = `calc(50% + ${y}px)`;
        numEl.style.transform = 'translate(-50%, -50%)';
        face.insertBefore(numEl, face.firstChild);
    }
}

function updateAnalogClockHands(date) {
    const hourHand = document.getElementById('hourHand');
    const minuteHand = document.getElementById('minuteHand');
    const secondHand = document.getElementById('secondHand');
    if (!hourHand || !minuteHand || !secondHand) return;
    
    hourHand.style.transform = `rotate(${(date.getHours() % 12) * 30 + date.getMinutes() * 0.5}deg)`;
    minuteHand.style.transform = `rotate(${date.getMinutes() * 6}deg)`;
    secondHand.style.transform = `rotate(${date.getSeconds() * 6}deg)`;
}

function updateThemeDecorations() {
    const container = document.getElementById('themeDecorations');
    if (!container) return;
    let html = '';
    if (CONFIG.theme === 'ramadhan') {
        html = `<div class="absolute top-6 right-8 md:right-16" style="animation: float 6s ease-in-out infinite;"><svg width="50" height="50" viewBox="0 0 50 50" fill="none"><path d="M25 4C12 4 4 18 4 30C4 42 12 48 24 48C17 45 13 37 13 28C13 17 21 8 33 6C30 5 27 4 25 4Z" fill="#F5D78A" fill-opacity="0.7"/></svg></div>`;
    }
    container.innerHTML = html;
}

function applyTheme() {
    const theme = THEMES[CONFIG.theme];
    const display = document.getElementById('mainDisplay');
    if (display) {
        display.className = `tv-screen ${theme.bgClass} mx-auto max-w-[1600px] shadow-2xl shadow-black/50${isIqomahMode ? ' iqomah-mode-active' : ''}${isAdhanMode ? ' adhan-mode-active' : ''}`;
    }
    
    const mainClock = document.getElementById('mainClock');
    const clockGlow = document.getElementById('clockGlow');
    if (mainClock) mainClock.style.color = theme.accent;
    if (clockGlow) clockGlow.style.background = `${theme.accent}18`;
    
    document.documentElement.style.setProperty('--accent-gold', theme.accent);
    document.documentElement.style.setProperty('--prayer-card-bg', CONFIG.cardBgColor);
    document.documentElement.style.setProperty('--prayer-card-border', CONFIG.cardBorderColor);
    
    updateThemeDecorations();
    renderPrayerList();
}

function applyDigitalClockSettings() {
    const mainClock = document.getElementById('mainClock');
    if (mainClock) {
        mainClock.style.fontFamily = CONFIG.digitalFontFamily;
        mainClock.style.fontSize = `${CONFIG.digitalFontSize}rem`;
    }
    const preview = document.getElementById('digitalFontPreview');
    if (preview) {
        preview.style.fontFamily = CONFIG.digitalFontFamily;
        preview.style.fontSize = `${Math.min(CONFIG.digitalFontSize, 4)}rem`;
    }
}

function applyAnalogClockSettings() {
    document.documentElement.style.setProperty('--clock-size', `${CONFIG.analogSize}px`);
    renderAnalogClockFace();
}

function applyIqomahSettings() {
    const display = document.getElementById('iqomahCountdownDisplay');
    if (display) {
        display.style.fontFamily = CONFIG.iqomahFontFamily;
        display.style.fontSize = `${CONFIG.iqomahFontSize}rem`;
    }
    const preview = document.getElementById('iqomahFontPreview');
    if (preview) {
        preview.style.fontFamily = CONFIG.iqomahFontFamily;
        preview.style.fontSize = `${Math.min(CONFIG.iqomahFontSize, 5)}rem`;
    }
}

function applyRunningTextSettings() {
    const annTexts = [
        document.getElementById('announcementText'),
        document.getElementById('fullscreenAnnouncementText')
    ];

    annTexts.forEach(annText => {
        if (!annText) return;
        annText.classList.remove('running-text-scroll-left', 'running-text-scroll-right', 'running-text-alternate', 'running-text-fade');
        switch(CONFIG.runningAnimation) {
            case 'scroll-left': annText.classList.add('running-text-scroll-left'); break;
            case 'scroll-right': annText.classList.add('running-text-scroll-right'); break;
            case 'alternate': annText.classList.add('running-text-alternate'); break;
            case 'fade': annText.classList.add('running-text-fade'); break;
        }
    });

    document.documentElement.style.setProperty('--running-speed', `${CONFIG.runningSpeed}s`);
}

function applySidebarSettings() {
    document.documentElement.style.setProperty('--sidebar-width', `${CONFIG.sidebarWidth}%`);
    const grid = document.getElementById('normalDisplayContent');
    if (grid) {
        grid.style.gridTemplateColumns = `calc(100% - var(--sidebar-width)) var(--sidebar-width)`;
    }
}

function applyMosqueNameSettings() {
    document.documentElement.style.setProperty('--mosque-name-font', CONFIG.mosqueNameFontFamily);
    document.documentElement.style.setProperty('--mosque-name-size', `${CONFIG.mosqueNameFontSize}rem`);
    
    // TAMBAHKAN: Warna nama masjid
    document.documentElement.style.setProperty('--mosque-name-color', CONFIG.mosqueNameColor);
    document.documentElement.style.setProperty('--mosque-name-arabic-color', CONFIG.mosqueNameArabicColor);
    
    const latinEl = document.getElementById('mosqueNameLatin');
    const arabicEl = document.getElementById('mosqueNameArabic');
    if (latinEl) latinEl.style.color = CONFIG.mosqueNameColor;
    if (arabicEl) arabicEl.style.color = CONFIG.mosqueNameArabicColor;
}

function applyDateSettings() {
    document.documentElement.style.setProperty('--date-font', CONFIG.dateFontFamily);
    document.documentElement.style.setProperty('--date-size', `${CONFIG.dateFontSize}rem`);
    document.documentElement.style.setProperty('--date-opacity', CONFIG.dateOpacity ? '0.4' : '0.6');
    document.documentElement.style.setProperty('--date-color', CONFIG.dateColor);
}

function applyClockType() {
    const digitalClock = document.getElementById('digitalClock');
    const analogClock = document.getElementById('analogClock');
    const digitalSettings = document.getElementById('digitalClockSettings');
    const analogSettings = document.getElementById('analogClockSettings');
    
    if (CONFIG.clockType === 'digital') {
        digitalClock?.classList.remove('hidden');
        analogClock?.classList.add('hidden');
        digitalSettings?.classList.remove('hidden');
        analogSettings?.classList.add('hidden');
    } else {
        digitalClock?.classList.add('hidden');
        analogClock?.classList.remove('hidden');
        digitalSettings?.classList.add('hidden');
        analogSettings?.classList.remove('hidden');
        applyAnalogClockSettings();
    }
}

function updateStatusIndicator() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot || !text) return;
    
    if (isIqomahMode) {
        dot.className = 'w-2 h-2 rounded-full bg-red-500 animate-pulse';
        text.textContent = 'IQOMAH';
        text.className = 'text-[10px] text-red-400 font-semibold';
    } else if (isAdhanMode) {
        dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
        text.textContent = 'ADHAN';
        text.className = 'text-[10px] text-yellow-400 font-semibold';
    } else {
        const currentPrayer = getCurrentPrayer();
        if (currentPrayer && currentPrayer.isMain) {
            dot.className = 'w-2 h-2 rounded-full bg-green-500';
            text.textContent = currentPrayer.latin.toUpperCase();
            text.className = 'text-[10px] text-green-400';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-amber-500';
            text.textContent = 'Normal';
            text.className = 'text-[10px] text-white/50';
        }
    }
}

// ============================================
// ADHAN & IQOMAH MODE LOGIC
// ============================================

function checkAndToggleSpecialModes() {
    const nextPrayer = getNextPrayer();
    if (!nextPrayer || !nextPrayer.isMain) {
        exitAdhanMode();
        exitIqomahMode();
        return;
    }
    
    const diffToPrayer = getTimeDiff(nextPrayer.time);
    const iqomahInfo = getIqomahCountdown();
    
    // IQOMAH MODE: When it's time for iqomah (countdown from iqomah time)
    if (CONFIG.iqomahModeEnabled && iqomahInfo && iqomahInfo.remainingSeconds <= 0) {
        // Iqomah time has passed or is now - but only show for reasonable duration
        // Show iqomah mode from iqomah time until iqomah time + 15 minutes (max)
        const iqomahTime = calculateIqomah(nextPrayer.time);
        const [iH, iM] = iqomahTime.split(':').map(Number);
        const iqomahEndWindow = iH * 60 + iM + 15; // 15 minutes after iqomah
        
        const now = getCurrentTime();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        
        if (currentMin >= iH * 60 + iM && currentMin < iqomahEndWindow) {
            enterIqomahMode(iqomahInfo);
            return;
        }
    }
    
    // ADHAN MODE: Between adhan start and iqomah time
    if (CONFIG.adhanModeEnabled && diffToPrayer <= CONFIG.adhanDuration && diffToPrayer > 0) {
        enterAdhanMode({ prayer: nextPrayer, remainingSeconds: diffToPrayer });
        return;
    }
    
    // Exit modes if conditions not met
    if (isAdhanMode) exitAdhanMode();
    if (isIqomahMode) exitIqomahMode();
}

function enterAdhanMode(info) {
    if (isAdhanMode) return;
    isAdhanMode = true;
    
    const normalContent = document.getElementById('normalDisplayContent');
    const adhanContent = document.getElementById('adhanModeContent');
    const sidebar = document.getElementById('rightSidebar');
    const announcementBar = document.getElementById('announcementBar');
    const decorations = document.getElementById('themeDecorations');
    
    normalContent?.classList.add('hidden');
    sidebar?.classList.add('hidden');
    announcementBar?.classList.add('hidden');
    decorations?.classList.add('hidden');
    adhanContent?.classList.remove('hidden');
    
    applyTheme();
    updateAdhanDisplay(info);
    updateStatusIndicator();
}

function exitAdhanMode() {
    if (!isAdhanMode) return;
    isAdhanMode = false;
    
    const normalContent = document.getElementById('normalDisplayContent');
    const adhanContent = document.getElementById('adhanModeContent');
    const sidebar = document.getElementById('rightSidebar');
    const announcementBar = document.getElementById('announcementBar');
    const decorations = document.getElementById('themeDecorations');
    
    normalContent?.classList.remove('hidden');
    if (CONFIG.showSidebar) sidebar?.classList.remove('hidden');
    if (CONFIG.showAnnouncement) announcementBar?.classList.remove('hidden');
    decorations?.classList.remove('hidden');
    adhanContent?.classList.add('hidden');
    
    applyTheme();
    updateStatusIndicator();
}

function updateAdhanDisplay(info) {
    const prayerName = document.getElementById('adhanPrayerName');
    const countdown = document.getElementById('adhanCountdown');
    
    if (prayerName) prayerName.textContent = info.prayer.arabic;
    if (countdown) countdown.textContent = formatCountdownShort(info.remainingSeconds);
}

function enterIqomahMode(iqomahInfo) {
    if (isIqomahMode) return;
    
    // Exit adhan mode first if active
    if (isAdhanMode) exitAdhanMode();
    
    isIqomahMode = true;
    
    const normalContent = document.getElementById('normalDisplayContent');
    const iqomahContent = document.getElementById('iqomahModeContent');
    const sidebar = document.getElementById('rightSidebar');
    const announcementBar = document.getElementById('announcementBar');
    const decorations = document.getElementById('themeDecorations');
    
    normalContent?.classList.add('hidden');
    sidebar?.classList.add('hidden');
    announcementBar?.classList.add('hidden');
    decorations?.classList.add('hidden');
    iqomahContent?.classList.remove('hidden');
    
    applyTheme();
    updateIqomahDisplay(iqomahInfo);
    updateStatusIndicator();
}

function exitIqomahMode() {
    if (!isIqomahMode) return;
    isIqomahMode = false;
    
    const normalContent = document.getElementById('normalDisplayContent');
    const iqomahContent = document.getElementById('iqomahModeContent');
    const sidebar = document.getElementById('rightSidebar');
    const announcementBar = document.getElementById('announcementBar');
    const decorations = document.getElementById('themeDecorations');
    
    normalContent?.classList.remove('hidden');
    if (CONFIG.showSidebar) sidebar?.classList.remove('hidden');
    if (CONFIG.showAnnouncement) announcementBar?.classList.remove('hidden');
    decorations?.classList.remove('hidden');
    iqomahContent?.classList.add('hidden');
    
    applyTheme();
    updateStatusIndicator();
}

function updateIqomahDisplay(iqomahInfo) {
    const countdownEl = document.getElementById('iqomahCountdownDisplay');
    const prayerNameEl = document.getElementById('iqomahPrayerName');
    const beepIndicator = document.getElementById('iqomahBeepIndicator');
    
    // Calculate actual remaining (should be counting down past iqomah time)
    const actualRemaining = Math.max(0, iqomahInfo.remainingSeconds);
    
    if (countdownEl) countdownEl.textContent = formatCountdownShort(actualRemaining);
    if (prayerNameEl) prayerNameEl.textContent = iqomahInfo.prayer.arabic;
    
    if (beepIndicator) {
        beepIndicator.style.display = actualRemaining <= 60 && actualRemaining > 0 ? 'flex' : 'none';
    }
    
    // Play triple beep every second in last 60 seconds
    if (CONFIG.iqomahBeepEnabled && actualRemaining <= 60 && actualRemaining > 0) {
        const now = getCurrentTime().getSeconds();
        if (now !== lastIqomahBeepSecond) {
            lastIqomahBeepSecond = now;
            playTripleBeep();
        }
    } else {
        lastIqomahBeepSecond = -1;
    }
}

// ============================================
// MAIN UPDATE LOOP
// ============================================

function updateDisplay() {
    const now = getCurrentTime();
    
    // Check special modes FIRST
    checkAndToggleSpecialModes();
    
    // If in special mode, handle that display
    if (isIqomahMode) {
        const iqomahInfo = getIqomahCountdown();
        if (iqomahInfo) updateIqomahDisplay(iqomahInfo);
        return;
    }
    
    if (isAdhanMode) {
        const adhanInfo = getAdhanCountdown();
        if (adhanInfo) updateAdhanDisplay(adhanInfo);
        return;
    }
    
    // NORMAL DISPLAY UPDATES
    const mainClock = document.getElementById('mainClock');
    if (mainClock) mainClock.textContent = formatTime(now, CONFIG.showSeconds);
    
    if (CONFIG.clockType === 'analog') updateAnalogClockHands(now);
    
    const gregorianEl = document.getElementById('gregorianDate');
    const hijriEl = document.getElementById('hijriDate');
    const dateContainer = document.getElementById('dateContainer');
    if (gregorianEl) gregorianEl.textContent = formatDate(now);
    if (hijriEl) hijriEl.textContent = getHijriDate();
    if (dateContainer) dateContainer.style.display = CONFIG.showHijri ? '' : 'none';
    
    const sidebar = document.getElementById('rightSidebar');
    if (sidebar) sidebar.style.display = CONFIG.showSidebar ? '' : 'none';
    
    // Handle announcement bars
    const isFullscreen = !!document.fullscreenElement;
    const normalAnnBar = document.getElementById('announcementBar');
    const fullscreenAnnBar = document.getElementById('fullscreenAnnouncementBar');
    const normalAnnText = document.getElementById('announcementText');
    const fullscreenAnnText = document.getElementById('fullscreenAnnouncementText');
    
    if (isFullscreen) {
        // In fullscreen mode, hide normal bar and show fullscreen bar
        if (normalAnnBar) normalAnnBar.style.display = 'none';
        if (fullscreenAnnBar) fullscreenAnnBar.style.display = CONFIG.showAnnouncement ? 'flex' : 'none';
        if (fullscreenAnnText) fullscreenAnnText.textContent = CONFIG.announcement;
    } else {
        // In normal mode, show normal bar and hide fullscreen bar
        if (normalAnnBar) normalAnnBar.style.display = CONFIG.showAnnouncement ? 'flex' : 'none';
        if (fullscreenAnnBar) fullscreenAnnBar.style.display = 'none';
        if (normalAnnText) normalAnnText.textContent = CONFIG.announcement;
    }
    
    // Next prayer countdown
    const nextPrayer = getNextPrayer();
    const diffSeconds = getTimeDiff(nextPrayer.time);
    const showAlertMode = diffSeconds < 600 && diffSeconds > 0;
    
    const nextPrayerCard = document.getElementById('nextPrayerCard');
    if (nextPrayerCard) nextPrayerCard.style.display = CONFIG.showCountdown ? '' : 'none';
    
    const normalCard = document.getElementById('normalPrayerCard');
    const alertCard = document.getElementById('alertPrayerCard');
    
    if (showAlertMode && CONFIG.showCountdown) {
        normalCard?.classList.add('hidden');
        alertCard?.classList.remove('hidden');
        const alertText = document.getElementById('alertPrayerText');
        const alertCountdown = document.getElementById('alertCountdown');
        if (alertText) alertText.textContent = `WAKTU SHOLAT ${nextPrayer.latin.toUpperCase()}`;
        if (alertCountdown) alertCountdown.textContent = formatCountdown(diffSeconds);
        
        const currentSecond = now.getSeconds();
        if (currentSecond >= 58 && currentSecond !== lastBeepSecond && CONFIG.soundEnabled) {
            playBeep();
            lastBeepSecond = currentSecond;
        }
        if (currentSecond < 58) lastBeepSecond = -1;
    } else {
        normalCard?.classList.remove('hidden');
        alertCard?.classList.add('hidden');
        
        const nextArabic = document.getElementById('nextPrayerArabic');
        const nextLatin = document.getElementById('nextPrayerLatin');
        const countdownTimer = document.getElementById('countdownTimer');
        const iqomahInfo = document.getElementById('iqomahInfo');
        
        if (nextArabic) nextArabic.textContent = nextPrayer.arabic;
        if (nextLatin) nextLatin.textContent = nextPrayer.latin.toUpperCase();
        if (countdownTimer) countdownTimer.textContent = formatCountdown(diffSeconds);
        if (iqomahInfo) iqomahInfo.textContent = `Iqomah: ${calculateIqomah(nextPrayer.time)}`;
    }
    
    renderPrayerList();
    renderNextPrayerBoxes();
    renderAdditionalCards();
    updateStatusIndicator();
}

// ============================================
// SETTINGS PANEL HANDLING
// ============================================

function openSettings() {
    document.getElementById('settingsPanel').classList.add('open');
    document.getElementById('settingsOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('settingsOverlay').classList.remove('show');
    document.body.style.overflow = '';
}

function saveAllSettings() {
    CONFIG.mosqueName = document.getElementById('mosqueNameInput').value;
    CONFIG.mosqueNameArabic = document.getElementById('mosqueNameArabicInput').value;
    CONFIG.mosqueNameColor = document.getElementById('mosqueNameColor').value;
    CONFIG.mosqueNameArabicColor = document.getElementById('mosqueNameArabicColor').value;
    CONFIG.dateFontFamily = document.getElementById('dateFontFamily').value;
    CONFIG.dateFontSize = parseFloat(document.getElementById('dateSize').value);
    CONFIG.dateColor = document.getElementById('dateColor').value;
    CONFIG.announcement = document.getElementById('announcementInput').value;
    CONFIG.mosqueNameFontFamily = document.getElementById('mosqueNameFontFamily').value;
    CONFIG.mosqueNameFontSize = parseFloat(document.getElementById('mosqueNameSize').value);
    CONFIG.dateFontFamily = document.getElementById('dateFontFamily').value;
    CONFIG.dateFontSize = parseFloat(document.getElementById('dateSize').value);
    CONFIG.dateColor = document.getElementById('dateColor').value;
    
    localStorage.setItem('masjidScreenConfig', JSON.stringify(CONFIG));
    
    applyTheme();
    applyDigitalClockSettings();
    applyAnalogClockSettings();
    applyRunningTextSettings();
    applyIqomahSettings();
    applyClockType();
    applySidebarSettings();
    applyMosqueNameSettings();
    applyDateSettings();
    
    document.getElementById('mosqueNameLatin').textContent = CONFIG.mosqueName.toUpperCase();
    document.getElementById('mosqueNameArabic').textContent = CONFIG.mosqueNameArabic;
    document.getElementById('mosqueNameArabic').textContent = CONFIG.mosqueNameArabic;
    
    const btn = document.getElementById('saveSettings');
    btn.textContent = 'Tersimpan!';
    btn.classList.add('bg-green-600');
    setTimeout(() => {
        btn.textContent = 'Simpan Pengaturan';
        btn.classList.remove('bg-green-600');
    }, 1500);
    
    closeSettings();
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('masjidScreenConfig');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(CONFIG, parsed);
            // TAMBAHKAN: Pastikan properti warna ada (untuk backward compatibility)
            if (!CONFIG.mosqueNameColor) CONFIG.mosqueNameColor = '#ffffff';
            if (!CONFIG.mosqueNameArabicColor) CONFIG.mosqueNameArabicColor = '#C9A84C';
        }
    } catch(e) {}
}

// ============================================
// FULLSCREEN
// ============================================

function toggleFullscreen() {
    const mainContent = document.getElementById('mainContent');
    if (!document.fullscreenElement) {
        mainContent.requestFullscreen().then(() => {
            document.body.classList.add('fullscreen-mode');
            updateFullscreenButton(true);
        }).catch(()=>{});
    } else {
        document.exitFullscreen().then(() => {
            document.body.classList.remove('fullscreen-mode');
            updateFullscreenButton(false);
        });
    }
}

function updateFullscreenButton(isFullscreen) {
    const btn = document.getElementById('fullscreenBtn');
    if (!btn) return;

    const svg = btn.querySelector('svg');
    if (!svg) return;

    if (isFullscreen) {
        // Change to exit fullscreen icon
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
        btn.title = 'Exit Fullscreen';
        btn.classList.add('active');
    } else {
        // Change to enter fullscreen icon
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>';
        btn.title = 'Fullscreen';
        btn.classList.remove('active');
    }
}

document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    if (!isFullscreen) document.body.classList.remove('fullscreen-mode');
    updateFullscreenButton(isFullscreen);
    // Update display to handle announcement bar switching
    updateDisplay();
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    applyTheme();
    applyDigitalClockSettings();
    applyAnalogClockSettings();
    applyRunningTextSettings();
    applyIqomahSettings();
    applyClockType();
    applySidebarSettings();
    applyMosqueNameSettings();
    applyDateSettings();
    
    // Set form values
    document.getElementById('mosqueNameInput').value = CONFIG.mosqueName;
    document.getElementById('mosqueNameArabicInput').value = CONFIG.mosqueNameArabic;
    document.getElementById('announcementInput').value = CONFIG.announcement;
    document.getElementById('digitalFontFamily').value = CONFIG.digitalFontFamily;
    document.getElementById('digitalFontSize').value = CONFIG.digitalFontSize;
    document.getElementById('digitalFontSizeValue').textContent = `${CONFIG.digitalFontSize}rem`;
    document.getElementById('iqomahFontFamily').value = CONFIG.iqomahFontFamily;
    document.getElementById('iqomahFontSize').value = CONFIG.iqomahFontSize;
    document.getElementById('iqomahFontSizeValue').textContent = `${CONFIG.iqomahFontSize}rem`;
    
    // Mosque Name & Date Settings
    document.getElementById('mosqueNameFontFamily').value = CONFIG.mosqueNameFontFamily;
    document.getElementById('mosqueNameSize').value = CONFIG.mosqueNameFontSize;
    document.getElementById('mosqueNameSizeValue').textContent = `${CONFIG.mosqueNameFontSize}rem`;
    
    // TAMBAHKAN: Set nilai warna nama masjid dari CONFIG
    const mosqueNameColorInput = document.getElementById('mosqueNameColor');
    const mosqueNameArabicColorInput = document.getElementById('mosqueNameArabicColor');
    
    if (mosqueNameColorInput) {
        mosqueNameColorInput.value = CONFIG.mosqueNameColor || '#ffffff';
    }
    if (mosqueNameArabicColorInput) {
        mosqueNameArabicColorInput.value = CONFIG.mosqueNameArabicColor || '#C9A84C';
    }
    
    document.getElementById('dateFontFamily').value = CONFIG.dateFontFamily;
    document.getElementById('dateSize').value = CONFIG.dateFontSize;
    document.getElementById('dateSizeValue').textContent = `${CONFIG.dateFontSize}rem`;
    document.getElementById('dateColor').value = CONFIG.dateColor;
    
    // Toggle for date opacity
    const toggleDateOpacity = document.getElementById('toggleDateOpacity');
    if (toggleDateOpacity) {
        if (CONFIG.dateOpacity) toggleDateOpacity.classList.add('active');
        toggleDateOpacity.addEventListener('click', function() {
            this.classList.toggle('active');
            CONFIG.dateOpacity = this.classList.contains('active');
            applyDateSettings();
        });
    }
    document.getElementById('adhanDuration').value = CONFIG.adhanDuration;
    document.getElementById('iqomahMinutesSlider').value = CONFIG.iqomahMinutes;
    document.getElementById('iqomahMinutesValue').textContent = `${CONFIG.iqomahMinutes} menit`;
    document.getElementById('sidebarWidthSlider').value = CONFIG.sidebarWidth;
    document.getElementById('sidebarWidthValue').textContent = `${CONFIG.sidebarWidth}%`;
    document.getElementById('runningSpeed').value = CONFIG.runningSpeed;
    document.getElementById('runningSpeedValue').textContent = `${CONFIG.runningSpeed}s`;
    
    // Render editors
    renderPrayerTimesEditor();
    
    // Initialize mosque name display
    document.getElementById('mosqueNameLatin').textContent = CONFIG.mosqueName.toUpperCase();
    document.getElementById('mosqueNameArabic').textContent = CONFIG.mosqueNameArabic;
    
    // Initialize fullscreen button state
    updateFullscreenButton(!!document.fullscreenElement);
    
    // Clock type buttons
    if (CONFIG.clockType === 'analog') {
        document.getElementById('btnClockDigital').classList.remove('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnClockDigital').classList.add('border-white/10','text-white/60');
        document.getElementById('btnClockAnalog').classList.add('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnClockAnalog').classList.remove('border-white/10','text-white/60');
    }
    
    // Prayer source buttons
    if (CONFIG.prayerSourceMode === 'manual') {
        document.getElementById('btnPrayerAuto').classList.remove('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnPrayerManual').classList.add('active','border-amber-500/50','bg-amber-500/10');
    }
    
    // Start update loop
    updateDisplay();
    setInterval(updateDisplay, 1000);
    
    // Event listeners
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('saveSettings').addEventListener('click', saveAllSettings);
    
    // Clock type
    document.getElementById('btnClockDigital').addEventListener('click', function() {
        CONFIG.clockType = 'digital';
        this.classList.add('active','border-amber-500/50','bg-amber-500/10');
        this.classList.remove('border-white/10','text-white/60');
        document.getElementById('btnClockAnalog').classList.remove('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnClockAnalog').classList.add('border-white/10','text-white/60');
        applyClockType();
    });
    
    document.getElementById('btnClockAnalog').addEventListener('click', function() {
        CONFIG.clockType = 'analog';
        this.classList.add('active','border-amber-500/50','bg-amber-500/10');
        this.classList.remove('border-white/10','text-white/60');
        document.getElementById('btnClockDigital').classList.remove('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnClockDigital').classList.add('border-white/10','text-white/60');
        applyClockType();
    });
    
    // Digital settings
    document.getElementById('digitalFontFamily').addEventListener('change', e => { CONFIG.digitalFontFamily = e.target.value; applyDigitalClockSettings(); });
    document.getElementById('digitalFontSize').addEventListener('input', e => {
        CONFIG.digitalFontSize = parseFloat(e.target.value);
        document.getElementById('digitalFontSizeValue').textContent = `${CONFIG.digitalFontSize}rem`;
        applyDigitalClockSettings();
    });
    document.getElementById('toggleSeconds').addEventListener('click', function() { this.classList.toggle('active'); CONFIG.showSeconds = this.classList.contains('active'); });
    
    // Analog settings
    document.querySelectorAll('.analog-number-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.analog-number-btn').forEach(b => b.classList.remove('active','border-amber-500/50','bg-amber-500/10'));
            this.classList.add('active','border-amber-500/50','bg-amber-500/10');
            CONFIG.analogNumberStyle = this.dataset.style;
            applyAnalogClockSettings();
        });
    });
    
    document.querySelectorAll('.analog-size-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.analog-size-btn').forEach(b => b.classList.remove('active','border-amber-500/50','bg-amber-500/10'));
            this.classList.add('active','border-amber-500/50','bg-amber-500/10');
            CONFIG.analogSize = parseInt(this.dataset.size);
            applyAnalogClockSettings();
        });
    });
    
    // Prayer source mode
    document.getElementById('btnPrayerAuto').addEventListener('click', function() {
        CONFIG.prayerSourceMode = 'auto';
        this.classList.add('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnPrayerManual').classList.remove('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('prayerTimesEditor').style.opacity = '0.5';
        document.getElementById('prayerTimesEditor').style.pointerEvents = 'none';
    });
    
    document.getElementById('btnPrayerManual').addEventListener('click', function() {
        CONFIG.prayerSourceMode = 'manual';
        this.classList.add('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('btnPrayerAuto').classList.remove('active','border-amber-500/50','bg-amber-500/10');
        document.getElementById('prayerTimesEditor').style.opacity = '1';
        document.getElementById('prayerTimesEditor').style.pointerEvents = 'auto';
    });
    
    // Add/Remove prayer time
    document.getElementById('addPrayerTimeBtn').addEventListener('click', addNewPrayerTime);
    
    // TAMBAHKAN: Event listeners untuk warna nama masjid
    if (mosqueNameColorInput) {
        mosqueNameColorInput.addEventListener('change', (e) => {
            CONFIG.mosqueNameColor = e.target.value;
            applyMosqueNameSettings();
        });
    }
    
    if (mosqueNameArabicColorInput) {
        mosqueNameArabicColorInput.addEventListener('change', (e) => {
            CONFIG.mosqueNameArabicColor = e.target.value;
            applyMosqueNameSettings();
        });
    }
    
    // Mosque Name & Date Settings
    document.getElementById('mosqueNameFontFamily').addEventListener('change', e => {
        CONFIG.mosqueNameFontFamily = e.target.value;
        applyMosqueNameSettings();
    });
    
    document.getElementById('mosqueNameSize').addEventListener('input', e => {
        CONFIG.mosqueNameFontSize = parseFloat(e.target.value);
        document.getElementById('mosqueNameSizeValue').textContent = `${CONFIG.mosqueNameFontSize}rem`;
        applyMosqueNameSettings();
    });
    
    document.getElementById('dateFontFamily').addEventListener('change', e => {
        CONFIG.dateFontFamily = e.target.value;
        applyDateSettings();
    });
    
    document.getElementById('dateSize').addEventListener('input', e => {
        CONFIG.dateFontSize = parseFloat(e.target.value);
        document.getElementById('dateSizeValue').textContent = `${CONFIG.dateFontSize}rem`;
        applyDateSettings();
    });

    document.getElementById('dateColor').addEventListener('change', e => {
        CONFIG.dateColor = e.target.value;
        applyDateSettings();
    });
    
    // Sidebar settings
    document.getElementById('sidebarWidthSlider').addEventListener('input', e => {
        CONFIG.sidebarWidth = parseInt(e.target.value);
        document.getElementById('sidebarWidthValue').textContent = `${CONFIG.sidebarWidth}%`;
        applySidebarSettings();
    });
    
    document.querySelectorAll('.card-color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.card-color-btn').forEach(b => b.classList.remove('active','border-amber-500/50'));
            this.classList.add('active','border-amber-500/50');
            CONFIG.cardBgColor = this.dataset.bg;
            CONFIG.cardBorderColor = this.dataset.border;
            applyTheme();
        });
    });
    
    document.getElementById('toggleSidebar').addEventListener('click', function() {
        this.classList.toggle('active');
        CONFIG.showSidebar = this.classList.contains('active');
    });
    
    // Adhan & Iqomah mode toggles
    document.getElementById('toggleAdhanMode').addEventListener('click', function() {
        this.classList.toggle('active');
        CONFIG.adhanModeEnabled = this.classList.contains('active');
    });
    
    document.getElementById('toggleIqomahMode').addEventListener('click', function() {
        this.classList.toggle('active');
        CONFIG.iqomahModeEnabled = this.classList.contains('active');
    });
    
    document.getElementById('adhanDuration').addEventListener('change', e => CONFIG.adhanDuration = parseInt(e.target.value));
    
    document.getElementById('iqomahFontFamily').addEventListener('change', e => { CONFIG.iqomahFontFamily = e.target.value; applyIqomahSettings(); });
    document.getElementById('iqomahFontSize').addEventListener('input', e => {
        CONFIG.iqomahFontSize = parseFloat(e.target.value);
        document.getElementById('iqomahFontSizeValue').textContent = `${CONFIG.iqomahFontSize}rem`;
        applyIqomahSettings();
    });
    document.getElementById('toggleIqomahBeep').addEventListener('click', function() { this.classList.toggle('active'); CONFIG.iqomahBeepEnabled = this.classList.contains('active'); });
    
    // Iqomah minutes
    document.getElementById('iqomahMinutesSlider').addEventListener('input', e => {
        CONFIG.iqomahMinutes = parseInt(e.target.value);
        document.getElementById('iqomahMinutesValue').textContent = `${CONFIG.iqomahMinutes} menit`;
        document.querySelectorAll('.iqomah-quick-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.minutes) === CONFIG.iqomahMinutes);
            b.classList.toggle('border-amber-500/50', parseInt(b.dataset.minutes) === CONFIG.iqomahMinutes);
        });
    });
    
    document.querySelectorAll('.iqomah-quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            CONFIG.iqomahMinutes = parseInt(this.dataset.minutes);
            document.getElementById('iqomahMinutesSlider').value = CONFIG.iqomahMinutes;
            document.getElementById('iqomahMinutesValue').textContent = `${CONFIG.iqomahMinutes} menit`;
            document.querySelectorAll('.iqomah-quick-btn').forEach(b => {
                b.classList.remove('active','border-amber-500/50','bg-amber-500/10');
                b.classList.add('border-white/10','text-white/60');
            });
            this.classList.add('active','border-amber-500/50','bg-amber-500/10');
            this.classList.remove('border-white/10','text-white/60');
        });
    });
    
    // Running text
    document.querySelectorAll('.running-animation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.running-animation-btn').forEach(b => b.classList.remove('active','border-amber-500/50','bg-amber-500/10'));
            this.classList.add('active','border-amber-500/50','bg-amber-500/10');
            CONFIG.runningAnimation = this.dataset.animation;
            applyRunningTextSettings();
        });
    });
    
    document.getElementById('runningSpeed').addEventListener('input', e => {
        CONFIG.runningSpeed = parseInt(e.target.value);
        document.getElementById('runningSpeedValue').textContent = `${CONFIG.runningSpeed}s`;
        applyRunningTextSettings();
    });
    
    document.getElementById('toggleAnnouncement').addEventListener('click', function() { this.classList.toggle('active'); CONFIG.showAnnouncement = this.classList.contains('active'); });
    
    // Theme buttons
    document.querySelectorAll('.theme-select-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-select-btn').forEach(b => b.classList.remove('border-amber-500/50','bg-amber-500/10'));
            this.classList.add('border-amber-500/50','bg-amber-500/10');
            CONFIG.theme = this.dataset.theme;
            applyTheme();
        });
    });
    
    // Other toggles
    document.getElementById('toggleHijri')?.addEventListener('click', function() { this.classList.toggle('active'); CONFIG.showHijri = this.classList.contains('active'); });
    document.getElementById('toggleCountdown')?.addEventListener('click', function() { this.classList.toggle('active'); CONFIG.showCountdown = this.classList.contains('active'); });
    document.getElementById('toggleSound')?.addEventListener('click', function() { this.classList.toggle('active'); CONFIG.soundEnabled = this.classList.contains('active'); });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.getElementById('settingsPanel').classList.contains('open')) closeSettings();
            else if (isIqomahMode) exitIqomahMode();
            else if (isAdhanMode) exitAdhanMode();
            else if (document.fullscreenElement) document.exitFullscreen();
        }
        if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) toggleFullscreen();
        if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) openSettings();
    });
});

const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes float{0%,100%{transform:translateY(0) rotate(-15deg)}50%{transform:translateY(-8px) rotate(-12deg)}}`;
document.head.appendChild(styleSheet);

function renderAdditionalCards() {
    const container = document.getElementById('otherPrayerCards');
    if (!container) return;

    detectPrayerStatus();

    const mainPrayers = PRAYER_TIMES.filter(p => p.isMain);
    const nextIndex = mainPrayers.findIndex(p => p.isNext);

    if (nextIndex === -1) {
        container.innerHTML = '';
        return;
    }

    // Ambil 2 setelah next
    const nextCards = [
        mainPrayers[(nextIndex + 1) % mainPrayers.length],
        mainPrayers[(nextIndex + 2) % mainPrayers.length]
    ];

    container.innerHTML = nextCards.map(prayer => `
        <div class="rounded-xl p-4 md:p-5 backdrop-blur-sm w-full"
            style="background: var(--prayer-card-bg); border: 1px solid var(--prayer-card-border);">

            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs text-white/40 uppercase">
                        Selanjutnya
                    </p>
                    <p class="text-lg font-semibold text-white">
                        ${prayer.latin}
                    </p>
                </div>

                <div class="text-right">
                    <p class="font-orbitron text-xl text-amber-400">
                        ${prayer.time}
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}