document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const identificationScreen = document.getElementById('identificationScreen');
    const selectionScreen = document.getElementById('selectionScreen');
    const gameScreen = document.getElementById('gameScreen');
    const completionScreen = document.getElementById('completionScreen');
    
    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');
    const startQuizBtn = document.getElementById('startQuizBtn');
    
    const moduleList = document.getElementById('moduleList');
    const startRandomQuizBtn = document.getElementById('startRandomQuiz');

    const quizTitle = document.getElementById('quizTitle');
    const cardQuestion = document.getElementById('cardQuestion');
    const cardAnswer = document.getElementById('cardAnswer');
    const cardFeedback = document.getElementById('cardFeedback');
    const optionsGrid = document.getElementById('optionsGrid');
    const flashcard = document.getElementById('flashcard');
    const resultIndicator = document.getElementById('resultIndicator');
    
    const currentQuestionEl = document.getElementById('currentQuestion');
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const correctCountEl = document.getElementById('correctCount');
    const incorrectCountEl = document.getElementById('incorrectCount');
    const progressFill = document.getElementById('progressFill');

    const nextBtn = document.getElementById('nextBtn');
    const restartBtn = document.getElementById('restartBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    
    const finalScoreEl = document.getElementById('finalScore');
    const scoreMessageEl = document.getElementById('scoreMessage');
    const userBadgesEl = document.getElementById('userBadges');

    // Variáveis do jogo
    let allQuestions = {};
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let currentUser = null;

    // Sistema de Badges
    const availableBadges = {
        'primeiro_passo': {
            name: 'Primeiro Passo',
            description: 'Complete seu primeiro quiz',
            icon: '🎯',
            condition: (stats) => stats.totalQuizzes >= 1
        },
        'iniciado_trivium': {
            name: 'Iniciado no Trivium',
            description: 'Complete o módulo Fundamentos',
            icon: '📚',
            condition: (stats) => stats.modulesCompleted.includes('Fundamentos (Trivium & Quadrivium)')
        },
        'mestre_virtudes': {
            name: 'Mestre das Virtudes',
            description: 'Gabarite o módulo As Virtudes',
            icon: '⚖️',
            condition: (stats) => stats.perfectScores.includes('As Virtudes')
        },
        'viajante_tempo': {
            name: 'Viajante do Tempo',
            description: 'Complete o módulo Fontes e Pensadores',
            icon: '🏛️',
            condition: (stats) => stats.modulesCompleted.includes('Fontes e Pensadores')
        },
        'mente_afiada': {
            name: 'Mente Afiada',
            description: 'Acerte 5 perguntas seguidas',
            icon: '🧠',
            condition: (stats) => stats.maxStreak >= 5
        },
        'erudito_completo': {
            name: 'Erudito Completo',
            description: 'Ganhe todas as outras badges',
            icon: '👑',
            condition: (stats) => {
                const otherBadges = ['primeiro_passo', 'iniciado_trivium', 'mestre_virtudes', 'viajante_tempo', 'mente_afiada'];
                return otherBadges.every(badge => stats.badges.includes(badge));
            }
        }
    };

    // Carrega as perguntas do arquivo JSON
    async function loadQuestions() {
        try {
            const response = await fetch('perguntas.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allQuestions = data.módulos;
            populateModules();
        } catch (error) {
            console.error("Não foi possível carregar as perguntas:", error);
            selectionScreen.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar o quiz. Verifique o arquivo 'perguntas.json' e tente novamente.</p>`;
        }
    }

    // Sistema de usuário e persistência
    function loadUserData() {
        const userData = localStorage.getItem('bemaQuizUser');
        if (userData) {
            currentUser = JSON.parse(userData);
            // Se já tem usuário salvo, pula para a seleção de módulo
            identificationScreen.classList.add('hidden');
            selectionScreen.classList.remove('hidden');
            return true;
        }
        return false;
    }

    function saveUserData() {
        localStorage.setItem('bemaQuizUser', JSON.stringify(currentUser));
    }

    function createUser(name, email) {
        currentUser = {
            name: name,
            email: email,
            stats: {
                totalQuizzes: 0,
                modulesCompleted: [],
                perfectScores: [],
                maxStreak: 0,
                badges: []
            }
        };
        saveUserData();
    }

    function updateUserStats(moduleName, score, totalQuestions, streak) {
        currentUser.stats.totalQuizzes++;
        
        // Adiciona módulo completado se não estiver na lista
        if (!currentUser.stats.modulesCompleted.includes(moduleName)) {
            currentUser.stats.modulesCompleted.push(moduleName);
        }
        
        // Verifica se foi um gabarito
        if (score === totalQuestions && !currentUser.stats.perfectScores.includes(moduleName)) {
            currentUser.stats.perfectScores.push(moduleName);
        }
        
        // Atualiza streak máximo
        if (streak > currentUser.stats.maxStreak) {
            currentUser.stats.maxStreak = streak;
        }
        
        // Verifica e adiciona novas badges
        checkAndAwardBadges();
        saveUserData();
    }

    function checkAndAwardBadges() {
        for (const [badgeId, badge] of Object.entries(availableBadges)) {
            if (!currentUser.stats.badges.includes(badgeId) && badge.condition(currentUser.stats)) {
                currentUser.stats.badges.push(badgeId);
            }
        }
    }

    // Cria os botões para cada módulo na tela inicial
    function populateModules() {
        moduleList.innerHTML = '';
        for (const moduleName in allQuestions) {
            const button = document.createElement('button');
            button.className = 'btn module-btn';
            button.textContent = moduleName;
            button.addEventListener('click', () => startQuiz(moduleName));
            moduleList.appendChild(button);
        }
    }

    // Inicia o quiz com um módulo específico ou aleatório
    function startQuiz(moduleName = null) {
        currentQuestionIndex = 0;
        correctAnswers = 0;
        incorrectAnswers = 0;

        if (moduleName) {
            currentQuestions = shuffleArray([...allQuestions[moduleName]]);
            quizTitle.textContent = moduleName;
        } else { // Quiz aleatório
            let combinedQuestions = [];
            for (const key in allQuestions) {
                combinedQuestions.push(...allQuestions[key]);
            }
            currentQuestions = shuffleArray(combinedQuestions);
            quizTitle.textContent = "Quiz Aleatório";
        }

        selectionScreen.classList.add('hidden');
        completionScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        displayQuestion();
        updateProgress();
    }

    // Mostra a pergunta atual
    function displayQuestion() {
        flashcard.classList.remove('flipped');
        nextBtn.style.display = 'none';

        if (currentQuestionIndex >= currentQuestions.length) {
            showCompletionScreen();
            return;
        }

        const question = currentQuestions[currentQuestionIndex];
        cardQuestion.textContent = question.pergunta;
        cardAnswer.textContent = question.resposta;
        cardFeedback.textContent = question.feedback || "";
        
        optionsGrid.innerHTML = '';
        const options = shuffleArray([...question.opcoes]);
        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            button.addEventListener('click', () => handleAnswer(button, option, question.resposta));
            optionsGrid.appendChild(button);
        });

        updateProgress();
    }

    // Processa a resposta do usuário
    function handleAnswer(button, selectedOption, correctAnswer) {
        const isCorrect = selectedOption === correctAnswer;

        if (isCorrect) {
            correctAnswers++;
            button.classList.add('correct');
            resultIndicator.textContent = '✓ Correto!';
            resultIndicator.className = 'result-indicator result-correct';
        } else {
            incorrectAnswers++;
            button.classList.add('incorrect');
            resultIndicator.textContent = '✗ Incorreto';
            resultIndicator.className = 'result-indicator result-incorrect';
            // Mostra a resposta correta
            Array.from(optionsGrid.children).forEach(btn => {
                if (btn.textContent === correctAnswer) {
                    btn.classList.add('correct');
                }
            });
        }

        // Desabilita todos os botões e mostra o verso do card
        Array.from(optionsGrid.children).forEach(btn => btn.disabled = true);
        flashcard.classList.add('flipped');
        nextBtn.style.display = 'inline-block';
        updateProgress();
    }

    // Atualiza a barra de progresso e contadores
    function updateProgress() {
        currentQuestionEl.textContent = currentQuestionIndex + 1 > currentQuestions.length ? currentQuestions.length : currentQuestionIndex + 1;
        totalQuestionsEl.textContent = currentQuestions.length;
        correctCountEl.textContent = correctAnswers;
        incorrectCountEl.textContent = incorrectAnswers;
        const percentage = (currentQuestionIndex / currentQuestions.length) * 100;
        progressFill.style.width = `${percentage}%`;
    }

    // Calcula streak (sequência de acertos)
    function calculateStreak() {
        // Para simplificar no MVP, vamos considerar o número de acertos consecutivos no quiz atual
        // Em uma versão futura, poderíamos rastrear isso globalmente
        return correctAnswers;
    }

    // Mostra a tela final
    function showCompletionScreen() {
        gameScreen.classList.add('hidden');
        completionScreen.classList.remove('hidden');
        
        const percentage = Math.round((correctAnswers / currentQuestions.length) * 100);
        finalScoreEl.textContent = `Você acertou ${correctAnswers} de ${currentQuestions.length} perguntas (${percentage}%)`;
        
        // Atualiza estatísticas do usuário
        const currentStreak = calculateStreak();
        updateUserStats(quizTitle.textContent, correctAnswers, currentQuestions.length, currentStreak);
        
        // Mensagem baseada na performance
        if (percentage >= 85) {
            finalScoreEl.className = 'final-score score-excellent';
            scoreMessageEl.innerHTML = `<strong>Excelente, ${currentUser.name}!</strong> Você domina muito bem os conceitos. Continue aprofundando seus estudos!`;
        } else if (percentage >= 60) {
            finalScoreEl.className = 'final-score score-good';
            scoreMessageEl.innerHTML = `<strong>Bom trabalho, ${currentUser.name}!</strong> Você tem uma base sólida. Revise alguns conceitos e continue praticando.`;
        } else {
            finalScoreEl.className = 'final-score score-needs-improvement';
            scoreMessageEl.innerHTML = `<strong>Continue estudando, ${currentUser.name}!</strong> Os pilares da educação clássica são fundamentais. Recomendamos revisar o material e refazer o quiz.`;
        }
        
        displayUserBadges();
    }

    // Exibe as badges do usuário
    function displayUserBadges() {
        userBadgesEl.innerHTML = '';
        
        for (const [badgeId, badge] of Object.entries(availableBadges)) {
            const badgeElement = document.createElement('div');
            badgeElement.className = 'badge-item';
            
            const isUnlocked = currentUser.stats.badges.includes(badgeId);
            
            badgeElement.innerHTML = `
                <div class="badge-icon ${isUnlocked ? 'unlocked' : ''}">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            `;
            
            badgeElement.title = badge.description;
            userBadgesEl.appendChild(badgeElement);
        }
    }

    // Função para embaralhar arrays (melhora a rejogabilidade)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Event Listeners
    startQuizBtn.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        const email = userEmailInput.value.trim();
        
        if (!name || !email) {
            alert('Por favor, preencha seu nome e e-mail.');
            return;
        }
        
        if (!email.includes('@')) {
            alert('Por favor, digite um e-mail válido.');
            return;
        }
        
        createUser(name, email);
        identificationScreen.classList.add('hidden');
        selectionScreen.classList.remove('hidden');
    });

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    startRandomQuizBtn.addEventListener('click', () => startQuiz());
    
    restartBtn.addEventListener('click', () => {
        const previousModule = quizTitle.textContent;
        if (previousModule === "Quiz Aleatório") {
            startQuiz();
        } else {
            startQuiz(previousModule);
        }
    });

    backToMenuBtn.addEventListener('click', () => {
        completionScreen.classList.add('hidden');
        selectionScreen.classList.remove('hidden');
    });

    // Inicialização
    if (!loadUserData()) {
        // Se não há usuário salvo, mostra a tela de identificação
        identificationScreen.classList.remove('hidden');
    }
    
    loadQuestions();
});

