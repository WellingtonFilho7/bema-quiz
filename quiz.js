document.addEventListener('DOMContentLoaded', () => {
    // ===== SISTEMA DE COLETA LOCAL INTEGRADO =====
    class LocalDataCollector {
        constructor() {
            this.storageKey = 'bema_user_data';
            this.init();
        }

        init() {
            if (!localStorage.getItem(this.storageKey)) {
                const initialData = {
                    users: [],
                    sessions: [],
                    lastUpdated: new Date().toISOString()
                };
                localStorage.setItem(this.storageKey, JSON.stringify(initialData));
            }
        }

        addUser(name, email) {
            const data = this.getData();
            const existingUser = data.users.find(u => u.email === email);
            if (existingUser) {
                return existingUser;
            }

            const newUser = {
                id: Date.now(),
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                totalSessions: 0,
                totalQuestions: 0,
                correctAnswers: 0
            };

            data.users.push(newUser);
            data.lastUpdated = new Date().toISOString();
            this.saveData(data);
            console.log('✅ Usuário salvo localmente:', newUser);
            return newUser;
        }

        addSession(userId, moduleName, totalQuestions, correctAnswers, timeSpent) {
            const data = this.getData();
            const session = {
                id: Date.now(),
                userId: userId,
                moduleName: moduleName,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers,
                score: Math.round((correctAnswers / totalQuestions) * 100),
                timeSpent: timeSpent,
                completedAt: new Date().toISOString()
            };

            data.sessions.push(session);

            const user = data.users.find(u => u.id === userId);
            if (user) {
                user.totalSessions++;
                user.totalQuestions += totalQuestions;
                user.correctAnswers += correctAnswers;
            }

            data.lastUpdated = new Date().toISOString();
            this.saveData(data);
            console.log('✅ Sessão salva localmente:', session);
            return session;
        }

        getData() {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : { users: [], sessions: [], lastUpdated: new Date().toISOString() };
        }

        saveData(data) {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
    }

    // Instância global do coletor local
    const localCollector = new LocalDataCollector();
    let quizStartTime = null;

    // ===== CONFIGURAÇÃO ORIGINAL DO QUIZ =====
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

    // ===== FUNÇÕES DA API MODIFICADAS =====
    async function createOrGetUser(name, email) {
        // SEMPRE salva localmente primeiro
        const localUser = localCollector.addUser(name, email);
        
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
                console.log('✅ Usuário salvo no backend também');
                return { ...localUser, backendId: data.user.id };
            }
        } catch (error) {
            console.log('⚠️ Backend indisponível, usando dados locais');
        }
        
        return localUser;
    }

    async function startQuizSession(userId, moduleName, totalQuestions) {
        quizStartTime = Date.now();
        
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
            }
        } catch (error) {
            console.log('⚠️ Backend indisponível para sessão');
        }
        
        // Fallback local
        const fallbackSession = {
            id: Date.now(),
            user_id: userId,
            module_name: moduleName,
            total_questions: totalQuestions,
            start_time: new Date().toISOString(),
            correct_answers: 0,
            incorrect_answers: 0
        };
        return fallbackSession;
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
                console.log('⚠️ Erro ao enviar resposta para backend');
            }
        } catch (error) {
            console.log('⚠️ Backend indisponível para resposta');
        }
    }

    async function completeQuiz(sessionId) {
        const timeSpent = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
        
        // SEMPRE salva localmente
        if (currentUser && currentSession) {
            localCollector.addSession(
                currentUser.id,
                currentSession.module_name,
                currentQuestions.length,
                correctAnswers,
                timeSpent
            );
            console.log('✅ Sessão salva localmente');
        }
        
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
                console.log('✅ Quiz finalizado no backend também');
                return data.badges_earned || [];
            }
        } catch (error) {
            console.log('⚠️ Backend indisponível para finalização');
        }
        
        return [];
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
            console.log('⚠️ Backend indisponível para badges');
            return [];
        }
    }

    // ===== RESTO DO CÓDIGO ORIGINAL =====
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

        // Desabilita todos os botões imediatamente
        Array.from(optionsGrid.children).forEach(btn => btn.disabled = true);

        if (isCorrect) {
            correctAnswers++;
            button.classList.add('correct');
            resultIndicator.textContent = '✓ Correto!';
            resultIndicator.className = 'result-indicator result-correct';
            
            // Fade out das opções incorretas, deixando apenas a correta
            Array.from(optionsGrid.children).forEach(btn => {
                if (btn !== button) {
                    btn.classList.add('fade-out');
                    setTimeout(() => {
                        btn.classList.add('hidden');
                    }, 300);
                }
            });
        } else {
            incorrectAnswers++;
            button.classList.add('incorrect');
            resultIndicator.textContent = '✗ Incorreto';
            resultIndicator.className = 'result-indicator result-incorrect';
            
            // Encontra e marca a resposta correta
            let correctButton = null;
            Array.from(optionsGrid.children).forEach(btn => {
                if (btn.textContent === correctAnswer) {
                    btn.classList.add('correct');
                    correctButton = btn;
                }
            });
            
            // Fade out das opções que não são nem a escolhida nem a correta
            Array.from(optionsGrid.children).forEach(btn => {
                if (btn !== button && btn !== correctButton) {
                    btn.classList.add('fade-out');
                    setTimeout(() => {
                        btn.classList.add('hidden');
                    }, 300);
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

        // Mostra o verso do card e o botão próxima
        setTimeout(() => {
            flashcard.classList.add('flipped');
            nextBtn.style.display = 'inline-block';
        }, 400);
        
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
        
        // Mensagem baseada na pontuação
        let message = '';
        if (finalScore >= 90) {
            message = '🏆 Excelente! Você domina o assunto!';
        } else if (finalScore >= 70) {
            message = '👏 Muito bom! Continue estudando!';
        } else if (finalScore >= 50) {
            message = '📚 Bom trabalho! Há espaço para melhorar.';
        } else {
            message = '💪 Continue se esforçando! A prática leva à perfeição.';
        }
        scoreMessageEl.textContent = message;

        // Finaliza quiz no backend e busca badges
        const earnedBadges = await completeQuiz(currentSession?.id);
        const userBadges = await getUserBadges(currentUser?.id);
        
        displayBadges([...earnedBadges, ...userBadges]);
    }

    // Exibe badges do usuário
    function displayBadges(badges) {
        userBadgesEl.innerHTML = '';
        
        if (badges && badges.length > 0) {
            badges.forEach(badgeName => {
                const badge = availableBadges[badgeName];
                if (badge) {
                    const badgeEl = document.createElement('div');
                    badgeEl.className = 'badge';
                    badgeEl.innerHTML = `
                        <span class="badge-icon">${badge.icon}</span>
                        <div class="badge-info">
                            <div class="badge-name">${badge.name}</div>
                            <div class="badge-description">${badge.description}</div>
                        </div>
                    `;
                    userBadgesEl.appendChild(badgeEl);
                }
            });
        } else {
            userBadgesEl.innerHTML = '<p>Continue jogando para conquistar badges!</p>';
        }
    }

    // Reinicia o quiz
    restartBtn.addEventListener('click', () => {
        completionScreen.classList.add('hidden');
        selectionScreen.classList.remove('hidden');
    });

    // Volta ao menu principal
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

    // ===== FUNÇÕES DE DEBUG PARA VERIFICAR DADOS =====
    window.showCollectedData = function() {
        const data = localCollector.getData();
        console.log('=== DADOS COLETADOS LOCALMENTE ===');
        console.log(`Total de usuários: ${data.users.length}`);
        console.log(`Total de sessões: ${data.sessions.length}`);
        console.log('Usuários:', data.users);
        console.log('Sessões:', data.sessions);
        
        // Gera relatório simples
        let report = `RELATÓRIO BEMA! - ${new Date().toLocaleDateString('pt-BR')}\\n\\n`;
        report += `📊 RESUMO:\\n`;
        report += `• Usuários: ${data.users.length}\\n`;
        report += `• Sessões: ${data.sessions.length}\\n\\n`;
        
        if (data.users.length > 0) {
            report += `👥 USUÁRIOS:\\n`;
            data.users.forEach((user, i) => {
                const userSessions = data.sessions.filter(s => s.userId === user.id);
                report += `${i+1}. ${user.name} (${user.email})\\n`;
                report += `   Sessões: ${userSessions.length}\\n`;
                if (userSessions.length > 0) {
                    const avgScore = userSessions.reduce((sum, s) => sum + s.score, 0) / userSessions.length;
                    report += `   Pontuação média: ${avgScore.toFixed(1)}%\\n`;
                }
                report += `\\n`;
            });
        }
        
        alert(report);
    };

    // Inicialização
    loadQuestions();
    
    console.log('✅ Sistema BEMA! com coleta local inicializado');
    console.log('Use showCollectedData() para ver os dados coletados');
});
