document.addEventListener('DOMContentLoaded', () => {
    const sentence = 'Ich lerne gerne neue Sprachen';
    const correctOrder = sentence.split(' ');
    const wordList = document.getElementById('wordList');
    const checkBtn = document.getElementById('checkBtn');
    const result = document.getElementById('result');

    const shuffled = shuffle([...correctOrder]);
    renderWords(shuffled);

    checkBtn.addEventListener('click', () => {
        const current = Array.from(wordList.children).map(li => li.textContent);
        if (arraysEqual(current, correctOrder)) {
            result.textContent = 'Richtig!';
            result.style.color = 'green';
        } else {
            result.textContent = 'Leider falsch.';
            result.style.color = 'red';
        }
    });

    function renderWords(words) {
        wordList.innerHTML = '';
        words.forEach((word, index) => {
            const li = document.createElement('li');
            li.textContent = word;
            li.draggable = true;
            li.dataset.index = index;
            addDragHandlers(li);
            wordList.appendChild(li);
        });
    }

    function addDragHandlers(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.index);
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = e.dataTransfer.getData('text/plain');
            const toIndex = e.target.dataset.index;
            const fromEl = wordList.querySelector(`[data-index="${fromIndex}"]`);
            const toEl = wordList.querySelector(`[data-index="${toIndex}"]`);
            if (fromEl && toEl && fromEl !== toEl) {
                if (fromIndex < toIndex) {
                    wordList.insertBefore(fromEl, toEl.nextSibling);
                } else {
                    wordList.insertBefore(fromEl, toEl);
                }
                updateIndexes();
            }
        });
    }

    function updateIndexes() {
        Array.from(wordList.children).forEach((li, idx) => {
            li.dataset.index = idx;
        });
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function arraysEqual(a, b) {
        return a.length === b.length && a.every((v, i) => v === b[i]);
    }
});
