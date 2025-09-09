document.addEventListener('DOMContentLoaded', () => {
    const scrambledEl = document.getElementById('scrambled');
    const timebar = document.getElementById('timebar');
    const timebarFill = document.getElementById('timebarFill');
    const translationEl = document.getElementById('translation');
    const revealBtn = document.getElementById('revealBtn');
    const nextBtn = document.getElementById('nextBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDlg = document.getElementById('settings');
    const phrasesInput = document.getElementById('phrasesInput');
    const translationsInput = document.getElementById('translationsInput');
    const namesInput = document.getElementById('namesInput');
    const durationInput = document.getElementById('durationInput');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const resetScoresBtn = document.getElementById('resetScores');
    const scoreList = document.getElementById('scoreList');

    let data = loadData();
    let played = [];
    let currentSentence = '';
    let currentIndex = -1;
    let timer = null;
    let timeLeft = data.duration;

    init();

    function init() {
        updateScoreboard();
        translationEl.style.visibility = 'hidden';
        nextRound();
    }

    function loadData() {
        const defaults = {
            phrases: ['Bonjour tout le monde.'],
            translations: [],
            names: [],
            duration: 30,
            scores: {}
        };
        let stored = localStorage.getItem('wm_data');
        if (stored) {
            try { stored = JSON.parse(stored); } catch (e) { stored = {}; }
        } else {
            stored = {};
        }
        const d = { ...defaults, ...stored };
        if (!Array.isArray(d.phrases)) d.phrases = defaults.phrases;
        if (!Array.isArray(d.translations)) d.translations = defaults.translations;
        if (!Array.isArray(d.names)) d.names = defaults.names;
        if (!d.duration) d.duration = defaults.duration;
        if (!d.scores) d.scores = {};
        d.names.forEach(n => {
            if (d.scores[n] == null) d.scores[n] = 0;
        });
        return d;
    }

    function saveData() {
        localStorage.setItem('wm_data', JSON.stringify(data));
    }

    function hashName(name){
        let h = 2166136261 >>> 0; // FNV-1a seed
        for (let i=0;i<name.length;i++){
            h ^= name.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }
    function pastelForName(name){
        // Palette répartie en 20 teintes bien distinctes (toutes différentes)
        const steps = 20; // 360/20 = 18°
        const idx = hashName(name) % steps;
        const h = idx * 18; // 0..342
        const bg = `hsl(${h}, 70%, 92%)`;
        const border = `hsl(${h}, 55%, 78%)`;
        return {bg, border};
    }

    function shuffleWords(sentence) {
        const m = sentence.trim().match(/^(.*?)([.!?])?$/);
        let words = m[1].split(/\s+/);
        const punct = m[2] || '';
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }
        words[words.length - 1] += punct;
        return words;
    }

    function tokensForSentence(sentence) {
        const m = sentence.trim().match(/^(.*?)([.!?])?$/);
        let words = (m && m[1] ? m[1] : sentence.trim()).split(/\s+/).filter(Boolean);
        const punct = (m && m[2]) ? m[2] : '';
        if (punct && words.length) {
            words[words.length - 1] = words[words.length - 1] + punct;
        }
        return words;
    }

    function updateTimerDisplay() {
        const pct = Math.max(0, Math.min(1, timeLeft / data.duration));
        if (timebarFill) {
            timebarFill.style.width = `${(pct * 100).toFixed(1)}%`;
        }
        if (timebar) {
            timebar.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
        }
    }

    function startTimer() {
        stopTimer();
        timeLeft = data.duration;
        updateTimerDisplay();
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                stopTimer();
                revealBtn.disabled = false;
            }
        }, 1000);
    }

    function stopTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        updateTimerDisplay();
    }

    function updateScoreboard() {
        scoreList.innerHTML = '';
        const sortedNames = [...data.names].sort((a, b) => data.scores[b] - data.scores[a]);
        sortedNames.forEach(name => {
            if (data.scores[name] == null) data.scores[name] = 0;
            const li = document.createElement('li');
            li.dataset.name = name;
            const colors = pastelForName(name);
            li.style.background = colors.bg;
            li.style.borderColor = colors.border;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'score-name';
            nameSpan.textContent = name;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'score-value';
            valueSpan.textContent = data.scores[name];

            const right = document.createElement('div');
            right.className = 'score-right';

            const minusBtn = document.createElement('button');
            minusBtn.type = 'button';
            minusBtn.className = 'icon-btn minus';
            minusBtn.textContent = '−';
            minusBtn.setAttribute('aria-label', `Retirer un point à ${name}`);
            minusBtn.addEventListener('click', () => {
                data.scores[name]--;
                saveData();
                updateScoreboard();
            });

            const plusBtn = document.createElement('button');
            plusBtn.type = 'button';
            plusBtn.className = 'icon-btn plus';
            plusBtn.textContent = '+';
            plusBtn.setAttribute('aria-label', `Ajouter un point à ${name}`);
            plusBtn.addEventListener('click', () => {
                data.scores[name]++;
                saveData();
                updateScoreboard();
            });

            right.appendChild(minusBtn);
            right.appendChild(valueSpan);
            right.appendChild(plusBtn);

            li.appendChild(nameSpan);
            li.appendChild(right);
            scoreList.appendChild(li);
        });
        // Ajuste dynamiquement la taille du nom pour tenir sur une ligne
        requestAnimationFrame(fitTeamNames);
    }

    function fitTeamNames(){
        const MIN_SIZE = 10; // px, permet d'éviter la troncature
        document.querySelectorAll('#scoreList .score-name').forEach(span =>{
            // reset to CSS value
            span.style.fontSize = '';
            // ensure measuring against available width
            const parent = span.parentElement;
            if(!parent) return;
            // Loop down until it fits on one line without overflow
            let size = parseFloat(getComputedStyle(span).fontSize);
            // protect against NaN
            if(!isFinite(size) || size<=0) size = 18;
            // shrink if needed
            let guard = 80;
            while(guard-- && span.scrollWidth > span.clientWidth && size > MIN_SIZE){
                size -= 1;
                span.style.fontSize = size + 'px';
            }
        });
    }

    window.addEventListener('resize', () => requestAnimationFrame(fitTeamNames));

    function getRandomSentence() {
        if (played.length === data.phrases.length) return null;
        let idx;
        do {
            idx = Math.floor(Math.random() * data.phrases.length);
        } while (played.includes(idx));
        played.push(idx);
        currentIndex = idx;
        return data.phrases[idx];
    }

    function nextRound() {
        if (played.length === data.phrases.length) {
            endGame();
            return;
        }
        revealBtn.disabled = true;
        revealBtn.hidden = false;
        nextBtn.hidden = true;
        if (timebarFill) timebarFill.style.width = '100%';
        if (timebar) timebar.setAttribute('aria-valuenow','100');
        currentSentence = getRandomSentence();
        const translation = data.translations[currentIndex] || '';
        translationEl.textContent = translation;
        translationEl.style.visibility = translation ? 'visible' : 'hidden';
        const words = shuffleWords(currentSentence);
        scrambledEl.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
        startTimer();
    }

    function reveal() {
        stopTimer();
        const ordered = tokensForSentence(currentSentence);
        scrambledEl.innerHTML = ordered.map(w => `<span class="word">${w}</span>`).join(' ');
        revealBtn.hidden = true;
        nextBtn.hidden = false;
    }

    function endGame() {
        stopTimer();
        const ranking = Object.entries(data.scores).sort((a, b) => b[1] - a[1]);
        let html = 'Classement final:<br>';
        ranking.forEach((entry, idx) => {
            html += `${idx + 1}. ${entry[0]} – ${entry[1]}<br>`;
        });
        scrambledEl.innerHTML = html;
        if (timebarFill) timebarFill.style.width = '0%';
        revealBtn.hidden = true;
        nextBtn.hidden = true;
        translationEl.textContent = '';
        translationEl.style.visibility = 'hidden';
    }

    revealBtn.addEventListener('click', reveal);
    nextBtn.addEventListener('click', nextRound);

    settingsBtn.addEventListener('click', () => {
        phrasesInput.value = data.phrases.join('\n');
        translationsInput.value = data.translations.join('\n');
        namesInput.value = data.names.join(', ');
        durationInput.value = data.duration;
        settingsDlg.showModal();
    });

    saveSettingsBtn.addEventListener('click', () => {
        data.phrases = phrasesInput.value.split(/\n+/).map(l => l.trim()).filter(Boolean);
        data.translations = translationsInput.value.split(/\n+/).map(l => l.trim());
        data.names = namesInput.value.split(',').map(n => n.trim()).filter(Boolean);
        data.duration = parseInt(durationInput.value, 10) || 30;
        const newScores = {};
        data.names.forEach(n => {
            newScores[n] = data.scores[n] || 0;
        });
        data.scores = newScores;
        saveData();
        settingsDlg.close();
        updateScoreboard();
        played = [];
        nextRound();
    });

    resetScoresBtn.addEventListener('click', () => {
        Object.keys(data.scores).forEach(name => {
            data.scores[name] = 0;
        });
        saveData();
        updateScoreboard();
    });
});
