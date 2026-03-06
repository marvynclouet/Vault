# Vault-PM — Ton Chef de Projet IA

> "Arrêtez de perdre vos idées. Parlez à Vault-PM, votre Chef de Projet IA qui écoute vos vocaux, structure vos projets, et avec qui vous pouvez affiner vos stratégies au quotidien."

## Le Problème

Les entrepreneurs, freelances et chefs de projet ont des idées partout — sous la douche, dans le métro, en réunion. Ces idées se perdent dans des notes vocales oubliées, des carnets jamais relus, ou des messages envoyés à soi-même. Quand il faut passer à l'action, tout est flou, désorganisé, et rien ne se concrétise.

## La Solution

Vault-PM est une **app mobile** qui transforme un monologue vocal chaotique en un **projet structuré avec un plan d'action**, grâce à une IA qui agit comme un vrai Product Owner / Chef de Projet.

L'utilisateur ne dicte pas des tâches — il **pense à voix haute**. L'IA fait le reste.

## Public Visé

- **Entrepreneurs solo / solopreneurs** qui jonglent entre 10 idées et n'ont pas de co-fondateur pour challenger leurs projets
- **Freelances et consultants** qui gèrent plusieurs clients et ont besoin de structurer leurs livrables rapidement
- **Chefs de projet / PM** qui veulent capturer des idées en déplacement et les transformer en tickets actionnables
- **Équipes startup early-stage** qui n'ont pas encore de process mais ont besoin de structure

## Ce que fait l'app — Écran par écran

### 1. Écran d'authentification

L'utilisateur crée un compte (email + mot de passe) ou se connecte. Son workspace est personnel et sécurisé — personne d'autre ne voit ses projets.

### 2. Onglet "Dicter" — Le Brain Dump

C'est l'écran principal. Un gros bouton micro au centre.

- L'utilisateur appuie, parle librement pendant 30 secondes ou 5 minutes
- **Pendant qu'il parle**, le texte apparaît en temps réel à l'écran (transcription live)
- Quand il arrête, il appuie sur **"Analyser le projet"**
- L'IA traite l'audio et crée automatiquement un projet dans son workspace

### 3. Onglet "Projets" — Le Dashboard

La liste de tous les projets créés, triés du plus récent au plus ancien. Chaque carte affiche :

- Le nom du projet (généré par l'IA)
- Le résumé en 1-2 lignes
- Un badge de verdict : **GO** 🟢 / **PIVOT** 🟡 / **DROP** 🔴
- Le nombre de tâches
- La date de création

### 4. Détail d'un projet — La Salle de Réunion

Quand l'utilisateur ouvre un projet, il arrive sur une vue avec **3 onglets** :

#### Onglet "Résumé"
L'avis complet de l'IA sur le projet :
- **Verdict** (GO / PIVOT / DROP) avec un score de confiance sur 10
- **Points forts** identifiés
- **Risques** anticipés
- **Recommandations** concrètes pour améliorer le projet
- La dictée originale (transcription brute)

#### Onglet "Tâches"
Le plan d'action découpé par l'IA :
- Chaque tâche a un titre, une description, un rôle assigné (Designer, Dev, Marketing...), et une priorité (Haute/Moyenne/Basse)
- En bas, les boutons d'export vers **Trello** (et bientôt Jira, Notion, Asana)

#### Onglet "Chat PM"
C'est là que l'app devient un **workspace**. L'utilisateur discute avec son PM IA :

```
PM IA : "Salut ! J'ai analysé ton projet. Voici comment j'ai découpé les tâches.
         J'ai repéré un risque sur le système de paiement. On en parle ?"

Utilisateur : "Retire la feature chat, on fera ça plus tard.
               Ajoute plutôt une connexion Google."

PM IA : "C'est noté ! J'ai retiré le chat de la Phase 1 et je l'ai mis dans
         les idées futures. J'ai ajouté les tâches pour l'API Google Auth.
         Veux-tu que j'envoie ce plan sur Trello ?"
         [Projet mis à jour ✓]
```

Le chat modifie le projet en temps réel. Les tâches dans l'onglet "Tâches" se mettent à jour instantanément.

### 5. Onglet "Réglages"

- Infos du compte (email)
- Statut des intégrations (Trello, webhook n8n)
- Intégrations à venir (Jira, Notion, Asana)
- Déconnexion

## Stack Technique

| Couche | Techno | Rôle |
|--------|--------|------|
| Mobile | React Native / Expo | App iOS + Android, un seul code |
| Auth + BDD | Supabase | Authentification, Postgres, Row Level Security |
| Backend IA | Python / FastAPI | Proxy vers les APIs IA |
| Speech-to-Text | OpenAI Whisper | Transcription audio → texte |
| LLM | GPT-4o-mini | Analyse PM, structuration, chat conversationnel |
| Intégrations | Trello API, webhook | Export vers outils de gestion de projet |

## Architecture

```
📱 Mobile (Expo / React Native)
│
├── Supabase Auth ──→ Login / Signup / Session
├── Supabase Postgres ──→ Projets, Messages (RLS par user)
│
└── Backend FastAPI (proxy IA uniquement)
    ├── POST /api/transcribe ──→ Whisper (audio → texte)
    ├── POST /api/analyze/audio ──→ Whisper + GPT (audio → analyse PM complète)
    ├── POST /api/chat ──→ GPT (conversation PM interactive)
    └── POST /api/push/trello ──→ Trello API (création de cartes)
```

## Sécurité (Zero-Retention)

- L'audio est traité en mémoire et supprimé immédiatement après transcription
- Les appels API OpenAI sont configurés sans rétention de données
- Supabase Row Level Security : chaque utilisateur ne voit que ses propres projets et conversations
- Le backend FastAPI ne stocke aucune donnée — il sert uniquement de proxy vers les APIs IA
- Le webhook externe est optionnel et configurable

## Démarrage rapide

### Prérequis

- Python 3.11+
- Node.js 18+
- Un projet Supabase (gratuit sur [supabase.com](https://supabase.com))
- Une clé API OpenAI

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter le contenu de `supabase/schema.sql`
3. Récupérer l'URL et la clé anon dans **Settings > API**
4. Les mettre dans `mobile/src/lib/supabase.js`

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Éditer avec votre clé OpenAI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. App Mobile

```bash
cd mobile
npm install
npx expo start
```

Scanner le QR code avec **Expo Go**, ou appuyer sur `w` pour le web.

### 4. Configuration réseau

Dans `mobile/src/api.js`, mettre l'IP locale de votre machine :

```bash
# Trouver votre IP
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 5. Migration Supabase (outil quotidien)

Pour activer les features "outil quotidien" (Dashboard, Quick notes, tâches cochables), exécuter la migration :

```sql
-- Dans le SQL Editor Supabase
-- Contenu de supabase/migrations/001_quick_notes_and_user_settings.sql
```

### 6. Trello (optionnel)

1. API Key : [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Générer un Token depuis la même page
3. Ajouter les clés dans `backend/.env`
4. Trouver votre Board/List ID via `GET /api/trello/boards`

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/transcribe` | Audio → texte (Whisper) |
| `POST` | `/api/analyze` | Texte → analyse PM complète (verdict + tâches) |
| `POST` | `/api/analyze/audio` | Audio → analyse PM complète |
| `POST` | `/api/chat` | Chat interactif avec le PM IA |
| `POST` | `/api/push/trello` | Envoyer les tâches vers Trello |
| `GET` | `/api/trello/boards` | Lister les boards Trello |

## Benchmark IA

Pour mesurer les capacités max de l’IA (analyse PM Expert + Chat PM) :

```bash
# Depuis la racine du projet, avec le venv activé
python eval/benchmark_full.py
```

Le benchmark teste :
- **Analyse** : idées claires, vagues (clarification), longues (stress tokens)
- **Chat PM** : questions, modifications de tâches, priorités, conversation multi-tours
- **Stress** : chat avec 15 tâches en contexte
- **Débit** : 2 analyses en parallèle (peut atteindre le rate limit Groq en free tier)

## Déploiement Vercel (Backend API)

Pour déployer le backend FastAPI sur Vercel :

1. Connecte le repo GitHub à Vercel
2. **Settings → General → Root Directory** : clique "Edit" et saisis `backend`
3. Configure les variables d'environnement (OPENAI_API_KEY ou GROQ_API_KEY, etc.)
4. Redeploy

Sans cette configuration, la racine du repo affiche une page d'aide. Avec `backend` comme Root Directory, l'API FastAPI est déployée et `/`, `/health`, `/docs` répondent correctement.

## Modèle économique envisagé

| Plan | Prix | Contenu |
|------|------|---------|
| Free | 0€ | 3 projets, 10 messages chat/mois |
| Pro | 19€/mois | Projets illimités, chat illimité, export Trello/Jira |
| Team | 49€/mois | Multi-utilisateurs, partage de projets, Slack/webhook |

**Coût IA estimé par utilisateur actif : ~0.30€/mois** → marge de 95%+.

Un freelance PM coûte 400€/jour. Vault-PM coûte 19€/mois. L'offre est irresistible.
