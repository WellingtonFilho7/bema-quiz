document.addEventListener('DOMContentLoaded', () => {
    // Configuração da API
    const API_BASE_URL = 'https://9yhyi3czv5z8.manus.space/api'; // URL do backend
    
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
    let currentSession = null;
    let questionStartTime = null;

    // Sistema de Badges
    const availableBadges = {
        "Quiz Completo": {
            name: "Quiz Completo",
            description: "Completou seu primeiro quiz!",
            icon: "🎯"
        },
        "Erudito Completo": {
            name: "Erudito Completo", 
            description: "Acertou 100% das perguntas!",
            icon: "🏆"
        },
        "Mestre do Trivium": {
            name: "Mestre do Trivium",
            description: "Dominou o Trivium com excelência!",
            icon: "📚"
        },
        "Pensador Veloz": {
            name: "Pensador Veloz",
            description: "Completou um quiz em menos de 5 minutos!",
            icon: "⚡"
        }
    };

    // Funções da API
    async function createOrGetUser(name, email) {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email })
            });
            
            const data = await response.json();
            if (data.success) {
                return data.user;
            } else {
                throw new Error(data.error || 'Erro ao criar usuário');
            }
        } catch (error) {
            console.error('Erro na API:', error);
            // Fallback para localStorage se API não estiver disponível
            const fallbackUser = {
                id: Date.now(),
                username: name,
                email: email,
                created_at: new Date().toISOString(),
                total_sessions: 0,
                total_badges: 0
            };
            localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
            return fallbackUser;
        }
    }

    async function startQuizSession(userId, moduleName, totalQuestions) {
        try {
            const response = await fetch(`${API_BASE_URL}/quiz/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    module_name: moduleName,
                    total_questions: totalQuestions
                })
            });
            
            const data = await response.json();
            if (data.success) {
                return data.session;
            } else {
                throw new Error(data.error || 'Erro ao iniciar sessão');
            }
        } catch (error) {
            console.error('Erro na API:', error);
            // Fallback para localStorage
            const fallbackSession = {
                id: Date.now(),
                user_id: userId,
                module_name: moduleName,
                total_questions: totalQuestions,
                start_time: new Date().toISOString(),
                correct_answers: 0,
                incorrect_answers: 0
            };
            localStorage.setItem('currentSession', JSON.stringify(fallbackSession));
            return fallbackSession;
        }
    }

    async function submitAnswer(sessionId, questionText, userAnswer, correctAnswer, isCorrect, timeToAnswer) {
        try {
            const response = await fetch(`${API_BASE_URL}/quiz/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    question_text: questionText,
                    user_answer: userAnswer,
                    correct_answer: correctAnswer,
                    is_correct: isCorrect,
                    time_to_answer: timeToAnswer
                })
            });
            
            const data = await response.json();
            if (!data.success) {
                console.error('Erro ao enviar resposta:', data.error);
            }
        } catch (error) {
            console.error('Erro na API:', error);
            // Em caso de erro, continua o jogo normalmente
        }
    }

    async function completeQuiz(sessionId) {
        try {
            const response = await fetch(`${API_BASE_URL}/quiz/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId
                })
            });
            
            const data = await response.json();
            if (data.success) {
                return data.badges_earned || [];
            } else {
                console.error('Erro ao finalizar quiz:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Erro na API:', error);
            return [];
        }
    }

    async function getUserBadges(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/badges`);
            const data = await response.json();
            if (data.success) {
                return data.badges;
            } else {
                console.error('Erro ao buscar badges:', data.error);
                return [];
            }
        } catch (error) {
            console.error('Erro na API:', error);
            return [];
        }
    }

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
            identificationScreen.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar o quiz. Verifique o arquivo 'perguntas.json' e tente novamente.</p>`;
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

    // Manipula o login do usuário
    startQuizBtn.addEventListener('click', async () => {
        const name = userNameInput.value.trim();
        const email = userEmailInput.value.trim();
        
        if (!name || !email) {
            alert('Por favor, preencha seu nome e email.');
            return;
        }
        
        if (!isValidEmail(email)) {
            alert('Por favor, digite um email válido.');
            return;
        }
        
        try {
            startQuizBtn.textContent = 'Carregando...';
            startQuizBtn.disabled = true;
            
            currentUser = await createOrGetUser(name, email);
            
            identificationScreen.classList.add('hidden');
            selectionScreen.classList.remove('hidden');
            
        } catch (error) {
            alert('Erro ao fazer login. Tente novamente.');
            console.error(error);
        } finally {
            startQuizBtn.textContent = 'Começar o Quiz';
            startQuizBtn.disabled = false;
        }
    });

    // Valida email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Inicia o quiz com um módulo específico ou aleatório
    async function startQuiz(moduleName = null) {
        if (!currentUser) {
            alert('Erro: usuário não identificado');
            return;
        }
        
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
            moduleName = "Quiz Aleatório";
        }

        try {
            // Inicia sessão no backend
            currentSession = await startQuizSession(currentUser.id, moduleName, currentQuestions.length);
            
            selectionScreen.classList.add('hidden');
            completionScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            
            displayQuestion();
            updateProgress();
        } catch (error) {
            alert('Erro ao iniciar quiz. Tente novamente.');
            console.error(error);
        }
    }

    // Mostra a pergunta atual
    function displayQuestion() {
        flashcard.classList.remove('flipped');
        nextBtn.style.display = 'none';
        resultIndicator.textContent = '';
        resultIndicator.className = 'result-indicator';
        
        questionStartTime = Date.now(); // Marca o tempo de início da pergunta

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
            button.addEventListener('click', () => handleAnswer(button, option, question.resposta, question.pergunta));
            optionsGrid.appendChild(button);
        });

        updateProgress();
    }

    // Processa a resposta do usuário
    async function handleAnswer(button, selectedOption, correctAnswer, questionText) {
        const isCorrect = selectedOption === correctAnswer;
        const timeToAnswer = questionStartTime ? (Date.now() - questionStartTime) / 1000 : null;

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

        // Envia resposta para o backend
        if (currentSession) {
            await submitAnswer(
                currentSession.id,
                questionText,
                selectedOption,
                correctAnswer,
                isCorrect,
                timeToAnswer
            );
        }

        // Desabilita todos os botões e mostra o verso do card
        Array.from(optionsGrid.children).forEach(btn => btn.disabled = true);
        flashcard.classList.add('flipped');
        nextBtn.style.display = 'inline-block';
        updateProgress();
    }

    // Atualiza a barra de progresso e contadores
    function updateProgress() {
        const current = Math.min(currentQuestionIndex + 1, currentQuestions.length);
        currentQuestionEl.textContent = current;
        totalQuestionsEl.textContent = currentQuestions.length;
        correctCountEl.textContent = correctAnswers;
        incorrectCountEl.textContent = incorrectAnswers;
        
        const progressPercent = (current / currentQuestions.length) * 100;
        progressFill.style.width = `${progressPercent}%`;
    }

    // Próxima pergunta
    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    // Mostra a tela de conclusão
    async function showCompletionScreen() {
        gameScreen.classList.add('hidden');
        completionScreen.classList.remove('hidden');
        
        const finalScore = currentQuestions.length > 0 ? 
            Math.round((correctAnswers / currentQuestions.length) * 100) : 0;
        
        finalScoreEl.textContent = `${correctAnswers} de ${currentQuestions.length} (${finalScore}%)`;
        
        // Finaliza sessão no backend e recebe badges
        let newBadges = [];
        if (currentSession) {
            newBadges = await completeQuiz(currentSession.id);
        }
        
        // Mensagem baseada na pontuação
        let message = '';
        let scoreClass = '';
        
        if (finalScore >= 90) {
            message = 'Excelente! Você demonstra um conhecimento excepcional da Educação Clássica Cristã!';
            scoreClass = 'score-excellent';
        } else if (finalScore >= 70) {
            message = 'Muito bom! Você tem uma boa base na Educação Clássica Cristã. Continue estudando!';
            scoreClass = 'score-good';
        } else {
            message = 'Continue estudando! A jornada na Educação Clássica Cristã é longa e recompensadora.';
            scoreClass = 'score-needs-improvement';
        }
        
        scoreMessageEl.textContent = message;
        finalScoreEl.className = `final-score ${scoreClass}`;
        
        // Exibe badges conquistadas
        displayUserBadges(newBadges);
    }

    // Exibe as badges do usuário
    async function displayUserBadges(newBadges = []) {
        userBadgesEl.innerHTML = '';
        
        // Busca todas as badges do usuário
        let userBadges = [];
        if (currentUser) {
            userBadges = await getUserBadges(currentUser.id);
        }
        
        // Se não conseguiu buscar do backend, usa localStorage
        if (userBadges.length === 0) {
            const savedBadges = localStorage.getItem('userBadges');
            if (savedBadges) {
                userBadges = JSON.parse(savedBadges);
            }
        }
        
        // Adiciona novas badges
        newBadges.forEach(badge => {
            if (!userBadges.find(b => b.name === badge.name)) {
                userBadges.push(badge);
            }
        });
        
        // Salva no localStorage como backup
        localStorage.setItem('userBadges', JSON.stringify(userBadges));
        
        // Exibe todas as badges disponíveis
        for (const badgeKey in availableBadges) {
            const badge = availableBadges[badgeKey];
            const isUnlocked = userBadges.some(b => b.name === badge.name);
            
            const badgeElement = document.createElement('div');
            badgeElement.className = 'badge-item';
            badgeElement.innerHTML = `
                <div class="badge-icon ${isUnlocked ? 'unlocked' : ''}">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            `;
            userBadgesEl.appendChild(badgeElement);
        }
        
        // Mostra mensagem de novas badges
        if (newBadges.length > 0) {
            const newBadgeNames = newBadges.map(b => b.name).join(', ');
            setTimeout(() => {
                alert(`🎉 Parabéns! Você conquistou: ${newBadgeNames}`);
            }, 1000);
        }
    }

    // Reinicia o quiz
    restartBtn.addEventListener('click', () => {
        completionScreen.classList.add('hidden');
        identificationScreen.classList.remove('hidden');
        currentUser = null;
        currentSession = null;
    });

    // Volta ao menu
    backToMenuBtn.addEventListener('click', () => {
        completionScreen.classList.add('hidden');
        selectionScreen.classList.remove('hidden');
    });

    // Quiz aleatório
    startRandomQuizBtn.addEventListener('click', () => startQuiz());

    // Função para embaralhar array
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Inicializa o app
    loadQuestions();
});

    // Inicializa o app
    loadQuestions();
});

