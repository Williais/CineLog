# 🎬 CineLog

Um diário e curador pessoal de filmes construído para registrar sessões de cinema e gerar análises estatísticas ao longo do ano.

## 💡 Por que este projeto existe?

Este projeto nasceu da vontade de criar uma aplicação útil para o meu dia a dia enquanto aplico e expando meus conhecimentos práticos como estudante de Análise e Desenvolvimento de Sistemas. 

A ideia central era resolver uma necessidade de organização: eu precisava de um espaço único e focado para registrar os filmes que eu assisto, os que a Adriele assiste, e principalmente, o catálogo do que assistimos juntos. Plataformas comerciais geralmente são poluídas ou focadas no aspecto de rede social. O CineLog foi desenhado para ser um ambiente privado, priorizando o registro preciso da nossa experiência e culminando em uma retrospectiva visual no final do ano.

## ⚙️ Como funciona

A aplicação é dividida em dois grandes fluxos: o **Diário** (para registro e consulta) e a **Retrospectiva** (para análise de dados).

### Funcionalidades Principais:

* **Perfis Dinâmicos:** O sistema possui três visões principais de dados. O meu perfil, o perfil da Adriele e a aba "Assistidos Juntos".
* **Merge Inteligente (Cross-Data):** Se um filme é registrado para os dois usuários, o sistema reconhece, cruza os dados nos bastidores e unifica a visualização na aba conjunta automaticamente.
* **Avaliações Independentes (Rating System):** Mesmo em sessões conjuntas do mesmo filme, a aplicação permite registrar notas (1 a 5 estrelas) e status de "Amei" (coração) diferentes para cada usuário, respeitando a visão crítica individual e exibindo ambas lado a lado.
* **Curadoria Automatizada (TMDB API):** Ao buscar um título, a aplicação consome a API do The Movie Database para preencher automaticamente os metadados (pôster, diretor, sinopse, gênero primário e duração), mantendo todos os campos editáveis para eventuais correções manuais.
* **Painel de Retrospectiva:** Um dashboard analítico gerado dinamicamente com base nos filtros do perfil, calculando o tempo total de tela (convertido em horas e minutos precisos), uma barra de progresso com o Top 5 Gêneros mais assistidos e uma galeria visual com o Top 5 Filmes Favoritados.

## 🛠️ Stack Tecnológica

A arquitetura foi pensada para ser rápida, moderna e de fácil manutenção:
* **Interface:** React + Vite
* **Estilização:** Tailwind CSS v4
* **Banco de Dados (BaaS):** Supabase (PostgreSQL)
* **Integração Externa:** TMDB API REST