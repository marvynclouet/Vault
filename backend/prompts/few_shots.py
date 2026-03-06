# Few shots pour le format AnalyzeResponse (utilisé par /api/analyze)
FEW_SHOTS_ANALYZE = [
    {
        "role": "user",
        "content": "Voici la transcription vocale d'une idée de projet :\n\nJe veux faire une app pour aider les freelances à gérer leurs finances, leurs factures et leur trésorerie. Les freelances galèrent tous avec ça.\n\nAnalyse ce projet selon ta méthodologie. Réponds UNIQUEMENT en JSON.",
    },
    {
        "role": "assistant",
        "content": """{
  "project_name": "FinanceFreelance",
  "summary": "App mobile de gestion financière pour freelances : facturation automatique, suivi trésorerie, préparation déclaration fiscale. Zéro compta complexe.",
  "vision": "Quand je termine une mission client, je veux facturer et suivre ma trésorerie en 2 minutes, pour ne plus avoir de mauvaises surprises fiscales en fin d'année.",
  "mvp_summary": "MVP en 3 semaines : création de factures PDF, suivi entrées/sorties, dashboard trésorerie. Sans intégration bancaire ni compta avancée.",
  "review": {
    "verdict": "pivot",
    "confidence": 6,
    "strengths": [
      "Problème réel et douloureux : 3M+ freelances en France sous-équipés",
      "Marché validé par Indy, Freebe, Shine — la demande existe et les gens paient",
      "Monétisation SaaS claire avec LTV élevée (abonnement mensuel)"
    ],
    "risks": [
      "Concurrence forte et mature : Indy, Freebe, Shine ont des années d'avance",
      "Factures électroniques obligatoires en 2026 — contrainte légale lourde à gérer",
      "Coût d'acquisition élevé sur un positionnement générique 'tous freelances'"
    ],
    "suggestions": [
      "Se spécialiser sur une niche (ex: développeurs, consultants, créatifs) pour réduire la concurrence",
      "Trouver un unfair advantage réel — ex: intégration API Urssaf pour déclaration auto, introuvable ailleurs",
      "Valider la demande avec une landing page + liste d'attente avant de coder"
    ],
    "one_liner": "Le comptable automatique pour freelances qui détestent la compta.",
    "score_clarity": 8,
    "score_market": 7,
    "score_feasibility": 8,
    "score_competitive": 3,
    "score_global": 26
  },
  "tasks": [
    {
      "title": "Création de factures PDF",
      "description": "Formulaire client + prestation + montant HT/TTC, génération PDF automatique, envoi par email",
      "assignee_role": "Développeur Full Stack",
      "priority": "Haute",
      "action_target": "Trello",
      "status": "todo",
      "due_date": null,
      "completed_at": null,
      "order": 0
    },
    {
      "title": "Dashboard trésorerie",
      "description": "Affichage entrées/sorties du mois, solde courant, alerte si trésorerie sous seuil",
      "assignee_role": "Développeur Front",
      "priority": "Haute",
      "action_target": "Trello",
      "status": "todo",
      "due_date": null,
      "completed_at": null,
      "order": 1
    },
    {
      "title": "Authentification et profil freelance",
      "description": "Signup/login email, profil avec statut juridique, numéro SIRET, taux TVA",
      "assignee_role": "Développeur Back",
      "priority": "Haute",
      "action_target": "Trello",
      "status": "todo",
      "due_date": null,
      "completed_at": null,
      "order": 2
    },
    {
      "title": "Suivi des missions et clients",
      "description": "CRM minimaliste : liste clients, historique factures par client, statut payé/en attente",
      "assignee_role": "Développeur Full Stack",
      "priority": "Moyenne",
      "action_target": "Trello",
      "status": "todo",
      "due_date": null,
      "completed_at": null,
      "order": 3
    },
    {
      "title": "Export comptable CSV",
      "description": "Export du journal des recettes pour le comptable ou la déclaration URSSAF",
      "assignee_role": "Développeur Back",
      "priority": "Basse",
      "action_target": "Trello",
      "status": "todo",
      "due_date": null,
      "completed_at": null,
      "order": 4
    }
  ]
}""",
    },
]

# Few shots pour le format llm_router (utilisé par /api/v1/analyze)
FEW_SHOTS = [
    {
        "role": "user",
        "content": "Je veux créer une app de livraison de courses pour les gens pressés",
    },
    {
        "role": "assistant",
        "content": """{
  "type": "analysis",
  "problem": {
    "job_to_be_done": "Quand je rentre du travail à 20h, je veux recevoir mes courses en 15 min, pour ne pas perdre ma soirée au supermarché.",
    "pain_level": "fort",
    "frequency": "hebdo"
  },
  "market": {
    "tam": "Marché de la livraison alimentaire : 150Md€ mondial",
    "sam": "Livraison rapide urbaine France : 2Md€",
    "som": "3 villes françaises an 1 : 5M€ adressable",
    "competitors": [
      {"name": "Gorillas/Flink", "weakness": "En restructuration, burn rate insoutenable"},
      {"name": "Uber Eats", "weakness": "Pas spécialisé courses, UX générique"},
      {"name": "Carrefour Sprint", "weakness": "Lent (30-45min), catalogue trop large"}
    ],
    "differentiator": "Catalogue ultra-réduit (200 produits essentiels) = livraison en 10 min"
  },
  "lean_canvas": {
    "problem": ["Supermarchés = 45min perdues", "Apps existantes trop lentes (30min+)", "Catalogues trop larges, choix paralysant"],
    "solution": ["200 produits essentiels uniquement", "Livraison en 10 min", "Commande en 2 taps (panier récurrent)"],
    "key_metrics": ["Temps de livraison moyen", "Taux de récommande semaine", "Panier moyen"],
    "uvp": "Tes courses essentielles en 10 minutes, pas une de plus.",
    "unfair_advantage": "Réseau de dark stores micro (50m²) en centre-ville",
    "channels": ["Instagram/TikTok ads ciblées 25-35 urbains", "Partenariats coworkings"],
    "customer_segments": ["Urbains 25-40 ans", "Couples sans enfants, double revenu"],
    "cost_structure": ["Dark stores loyer", "Livreurs", "Stock produits", "Tech"],
    "revenue_streams": ["Marge sur produits (25-30%)", "Frais de livraison 1,99€", "Abo premium sans frais livraison 9,99€/mois"]
  },
  "user_stories": [
    {
      "persona": "urbain pressé",
      "action": "commander mes 10 produits habituels en 2 taps",
      "benefit": "ne pas perdre 5 min à chercher dans un catalogue",
      "acceptance_criteria": {
        "given": "L'utilisateur a un historique d'au moins 1 commande",
        "when": "Il clique sur 'Recommander'",
        "then": "Son dernier panier est pré-rempli et il peut payer en 1 tap"
      },
      "moscow": "must",
      "rice": {"reach": 8, "impact": 3, "confidence": 0.9, "effort": 3, "score": 72}
    },
    {
      "persona": "urbain pressé",
      "action": "voir le temps de livraison estimé en temps réel",
      "benefit": "savoir exactement quand je serai livré",
      "acceptance_criteria": {
        "given": "Une commande est en cours",
        "when": "L'utilisateur ouvre l'app",
        "then": "Il voit une map avec la position du livreur et un ETA en minutes"
      },
      "moscow": "must",
      "rice": {"reach": 10, "impact": 2, "confidence": 0.8, "effort": 5, "score": 32}
    },
    {
      "persona": "nouvel utilisateur",
      "action": "parcourir les 200 produits par catégorie",
      "benefit": "trouver ce dont j'ai besoin en moins de 1 minute",
      "acceptance_criteria": {
        "given": "L'utilisateur est sur l'écran catalogue",
        "when": "Il sélectionne une catégorie (Frais, Snacks, Boissons...)",
        "then": "Les produits s'affichent en grille avec photo, prix et bouton ajouter"
      },
      "moscow": "must",
      "rice": {"reach": 10, "impact": 3, "confidence": 1.0, "effort": 3, "score": 100}
    },
    {
      "persona": "client régulier",
      "action": "souscrire à l'abonnement premium",
      "benefit": "ne plus payer de frais de livraison",
      "acceptance_criteria": {
        "given": "L'utilisateur a passé 3+ commandes",
        "when": "Il va dans Réglages > Abonnement",
        "then": "Il peut souscrire à 9,99€/mois avec paiement Stripe"
      },
      "moscow": "should",
      "rice": {"reach": 4, "impact": 2, "confidence": 0.7, "effort": 5, "score": 11}
    },
    {
      "persona": "urbain pressé",
      "action": "payer avec Apple Pay en 1 tap",
      "benefit": "ne pas taper ma CB à chaque commande",
      "acceptance_criteria": {
        "given": "L'utilisateur a Apple Pay configuré sur son iPhone",
        "when": "Il clique 'Payer'",
        "then": "Le paiement est validé via Face ID sans saisie manuelle"
      },
      "moscow": "must",
      "rice": {"reach": 7, "impact": 2, "confidence": 0.9, "effort": 4, "score": 32}
    }
  ],
  "mvp": {
    "description": "App iOS avec catalogue de 200 produits, commande en 2 taps, paiement Apple Pay, livraison trackée. 1 seul dark store, 1 ville.",
    "must_have_stories": [0, 1, 2, 4],
    "sprints": [
      {"week": 1, "goals": ["Catalogue produits + catégories", "Panier + ajout/retrait"]},
      {"week": 2, "goals": ["Paiement Stripe + Apple Pay", "Création de commande backend"]},
      {"week": 3, "goals": ["Tracking livreur temps réel", "Notifications push statut"]},
      {"week": 4, "goals": ["Reorder (recommander)", "Tests + polish + déploiement TestFlight"]}
    ]
  },
  "verdict": {
    "score": 48,
    "breakdown": {
      "problem_real": 22,
      "market": 12,
      "feasibility": 6,
      "monetization": 8
    },
    "decision": "PIVOT",
    "summary": "Le problème est réel et fréquent, mais le modèle dark store nécessite un capital initial énorme (stock, loyer, livreurs) incompatible avec un lancement solo. Gorillas et Flink ont brûlé des milliards sur ce modèle.",
    "next_steps": [
      "PIVOT vers un modèle marketplace sans stock : partenariat avec des épiceries de quartier existantes",
      "Tester la demande avec une landing page + liste d'attente avant de coder",
      "Valider le willingness-to-pay avec 20 interviews utilisateurs"
    ]
  }
}""",
    },
    {
        "role": "user",
        "content": "un truc avec l'IA",
    },
    {
        "role": "assistant",
        "content": """{
  "type": "clarification",
  "questions": [
    "Quel problème précis veux-tu résoudre avec l'IA ? (ex: automatiser des tâches, analyser des données, générer du contenu...)",
    "Qui sont tes utilisateurs cibles ? (ex: freelances, PME, étudiants, développeurs...)",
    "As-tu une expertise ou un avantage particulier dans un domaine ? (ex: tu travailles dans la santé, le juridique, l'éducation...)"
  ]
}""",
    },
]
