document.addEventListener('DOMContentLoaded', () => {
    const scrambledEl = document.getElementById('scrambled');
    const timerEl = document.getElementById('timer');
    const timerText = document.getElementById('timerText');
    const revealBtn = document.getElementById('revealBtn');
    const nextBtn = document.getElementById('nextBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDlg = document.getElementById('settings');
    const phrasesInput = document.getElementById('phrasesInput');
    const namesInput = document.getElementById('namesInput');
    const durationInput = document.getElementById('durationInput');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const scoreList = document.getElementById('scoreList');

    let data = loadData();
    let played = [];
    let currentSentence = '';
    let timer = null;
    let timeLeft = data.duration;

    init();

    function init() {
        updateScoreboard();
        nextRound();
    }

    function loadData() {
        const defaults = {
            phrases: ['Bonjour tout le monde.'],
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

    function updateTimerDisplay() {
        timerText.textContent = timeLeft;
        const angle = (timeLeft / data.duration) * 360;
        timerEl.style.background = `conic-gradient(#4caf50 ${angle}deg, rgba(0,0,0,0.1) 0deg)`;
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

            const label = document.createElement('span');
            label.className = 'score-label';
            label.textContent = `${name} – ${data.scores[name]}`;

            const addBtn = document.createElement('button');
            addBtn.className = 'score-btn';
            addBtn.textContent = '+';
            addBtn.addEventListener('click', () => {
                data.scores[name]++;
                saveData();
                updateScoreboard();
            });

            const subBtn = document.createElement('button');
            subBtn.className = 'score-btn';
            subBtn.textContent = '−';
            subBtn.addEventListener('click', () => {
                data.scores[name]--;
                saveData();
                updateScoreboard();
            });

            li.appendChild(label);
            li.appendChild(addBtn);
            li.appendChild(subBtn);
            scoreList.appendChild(li);
        });
    }

    function getRandomSentence() {
        if (played.length === data.phrases.length) return null;
        let idx;
        do {
            idx = Math.floor(Math.random() * data.phrases.length);
        } while (played.includes(idx));
        played.push(idx);
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
        timerText.textContent = '';
        currentSentence = getRandomSentence();
        const words = shuffleWords(currentSentence);
        scrambledEl.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
        startTimer();
    }

    function reveal() {
        stopTimer();
        scrambledEl.innerHTML = `${scrambledEl.innerHTML}<br><em>${currentSentence}</em>`;
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
        timerText.textContent = '';
        timerEl.style.background = 'conic-gradient(#4caf50 0deg, rgba(0,0,0,0.1) 0deg)';
        revealBtn.hidden = true;
        nextBtn.hidden = true;
    }

    revealBtn.addEventListener('click', reveal);
    nextBtn.addEventListener('click', nextRound);

    settingsBtn.addEventListener('click', () => {
        phrasesInput.value = data.phrases.join('\n');
        namesInput.value = data.names.join(', ');
        durationInput.value = data.duration;
        settingsDlg.showModal();
    });

    saveSettingsBtn.addEventListener('click', () => {
        data.phrases = phrasesInput.value.split(/\n+/).map(l => l.trim()).filter(Boolean);
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
});
