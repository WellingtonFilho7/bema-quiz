# BEMA! - Quiz de Educação Clássica Cristã

Este é o MVP (Produto Mínimo Viável) do quiz BEMA!, um projeto interativo focado em testar e aprofundar conhecimentos sobre a Educação Clássica Cristã.

## Funcionalidades do MVP:

- **Identificação de Usuário:** Os usuários podem inserir seu nome e e-mail para salvar o progresso e colecionar conquistas.
- **Módulos de Perguntas:** O quiz é dividido em módulos temáticos (ex: Fundamentos, Virtudes, Fontes e Pensadores) para um aprendizado estruturado.
- **Sistema de Badges:** Conquistas visuais são desbloqueadas à medida que o usuário avança e acerta as perguntas, incentivando a rejogabilidade.
- **Design Responsivo:** O quiz é otimizado para funcionar bem em diferentes dispositivos (desktops, tablets e smartphones).
- **Conteúdo Fácil de Atualizar:** As perguntas e respostas são armazenadas em um arquivo JSON (`perguntas.json`), permitindo que não-programadores adicionem ou editem o conteúdo facilmente.

## Como Adicionar/Editar Conteúdo (para não-programadores):

O conteúdo das perguntas e respostas está no arquivo `perguntas.json`. Para adicionar ou editar perguntas, siga estes passos:

1.  Abra o arquivo `perguntas.json` em um editor de texto simples (como Bloco de Notas no Windows, TextEdit no Mac, ou VS Code).
2.  Você verá uma estrutura clara de 'módulos', e dentro de cada módulo, uma lista de perguntas.
3.  Cada pergunta tem os seguintes campos:
    -   `"pergunta"`: O texto da pergunta.
    -   `"opcoes"`: Uma lista de possíveis respostas. **Certifique-se de que há pelo menos 2 e no máximo 4 opções.**
    -   `"resposta"`: A resposta correta (deve ser idêntica a uma das opções).
    -   `"feedback"`: Um breve comentário que aparece após a resposta (opcional, mas recomendado).
4.  Para adicionar uma nova pergunta, copie e cole um bloco de pergunta existente e edite o conteúdo. **ATENÇÃO:** Certifique-se de manter a estrutura com vírgulas e chaves `{}` e colchetes `[]` corretamente, como no exemplo.
5.  Para adicionar um novo módulo, copie e cole um bloco de módulo existente e edite o nome e as perguntas dentro dele.

**Exemplo de uma pergunta no JSON:**

```json
{
  "pergunta": "Qual é a capital do Brasil?",
  "opcoes": ["Rio de Janeiro", "São Paulo", "Brasília", "Belo Horizonte"],
  "resposta": "Brasília",
  "feedback": "Brasília foi planejada e construída para ser a capital do Brasil."
}
```

## Estrutura do Projeto:

-   `index.html`: A estrutura principal da página web.
-   `style.css`: Os estilos visuais do quiz.
-   `quiz.js`: A lógica JavaScript que controla o quiz, o login e as badges.
-   `perguntas.json`: O banco de dados das perguntas e respostas.
-   `README.md`: Este arquivo, com informações sobre o projeto.
-   `.gitignore`: Arquivo de configuração para o Git.

## Como Rodar Localmente (para desenvolvedores):

1.  Clone este repositório.
2.  Navegue até a pasta do projeto no terminal.
3.  Inicie um servidor HTTP local (ex: `python3 -m http.server` ou `npx serve`).
4.  Abra `http://localhost:8000` (ou a porta que seu servidor usar) no seu navegador.

## Publicação no GitHub Pages:

Este projeto pode ser facilmente publicado usando o GitHub Pages. Basta fazer o upload dos arquivos para um repositório no GitHub e configurar a branch `main` (ou `master`) como fonte para o GitHub Pages.

---

