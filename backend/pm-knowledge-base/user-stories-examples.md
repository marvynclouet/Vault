# 50 exemples de User Stories par domaine

Format : En tant que [X], je veux [Y] pour [Z] | MoSCoW | T-shirt | Critères d'acceptance

---

## Auth (5)
1. En tant qu'utilisateur, je veux me connecter avec Google pour gagner du temps | M | S | OAuth OK, token stocké, redirection
2. En tant qu'utilisateur, je veux réinitialiser mon mot de passe par email pour retrouver l'accès | M | XS | Email envoyé, lien valide 1h
3. En tant qu'utilisateur, je veux une double authentification pour sécuriser mon compte | S | M | TOTP, backup codes
4. En tant qu'admin, je veux gérer les rôles des utilisateurs pour contrôler les accès | S | M | CRUD rôles, affectation
5. En tant qu'utilisateur, je veux me déconnecter de tous les appareils pour la sécurité | C | XS | Invalidation tokens

## Onboarding (4)
6. En tant que nouvel utilisateur, je veux un tutoriel en 3 étapes pour comprendre l'app | M | S | 3 écrans, skip possible
7. En tant qu'utilisateur, je veux personnaliser mes préférences au premier lancement | S | XS | Formulaire, sauvegarde
8. En tant qu'utilisateur, je veux voir des exemples de données pour comprendre les fonctionnalités | C | S | Données fictives, reset
9. En tant qu'utilisateur, je veux être guidé vers ma première action pour démarrer | M | XS | CTA contextuel

## Profil (5)
10. En tant qu'utilisateur, je veux modifier mon avatar et mon nom pour personnaliser mon profil | S | XS | Upload image, édition
11. En tant qu'utilisateur, je veux exporter mes données pour la portabilité | S | M | Export JSON/CSV, RGPD
12. En tant qu'utilisateur, je veux supprimer mon compte pour respecter ma vie privée | M | S | Confirmation, purge données
13. En tant qu'utilisateur, je veux gérer mes notifications (email, push) | S | XS | Toggles par type
14. En tant qu'utilisateur, je veux lier mon compte à des réseaux sociaux | C | S | OAuth multiples

## Recherche (5)
15. En tant qu'utilisateur, je veux rechercher par mot-clé pour trouver rapidement | M | M | Index full-text, suggestions
16. En tant qu'utilisateur, je veux filtrer les résultats par critères pour affiner | M | S | Filtres dynamiques
17. En tant qu'utilisateur, je veux sauvegarder mes recherches pour y revenir | C | XS | Historique, favoris
18. En tant qu'utilisateur, je veux des suggestions de recherche pendant la saisie | S | M | Autocomplete, tri
19. En tant qu'utilisateur, je veux rechercher par voix pour les mains libres | C | L | STT, mapping requête

## Commande / Panier (4)
20. En tant que client, je veux ajouter des articles au panier pour les acheter plus tard | M | S | Panier persistant
21. En tant que client, je veux payer par carte pour finaliser ma commande | M | S | Stripe/PayPal, 3D Secure
22. En tant que client, je veux voir le récapitulatif avant paiement pour vérifier | M | XS | Récap, modification
23. En tant que client, je veux utiliser un code promo pour avoir une réduction | S | M | Validation, application

## Notification (4)
24. En tant qu'utilisateur, je veux recevoir des push pour les alertes importantes | M | S | FCM/APNs, permissions
25. En tant qu'utilisateur, je veux choisir la fréquence des emails pour éviter le spam | S | XS | Quotidien/hebdo/désactivé
26. En tant qu'utilisateur, je veux un centre de notifications in-app pour tout voir | M | M | Liste, marquer lu
27. En tant qu'utilisateur, je veux des notifications par canal (Slack, email, etc.) | C | S | Intégrations

## Admin (5)
28. En tant qu'admin, je veux un dashboard analytics pour suivre les KPIs | M | L | Graphiques, métriques
29. En tant qu'admin, je veux gérer les utilisateurs (CRUD, statut) | M | M | Table, actions
30. En tant qu'admin, je veux exporter des rapports pour les présentations | S | M | PDF, Excel
31. En tant qu'admin, je veux configurer les paramètres système | M | S | Formulaires, sauvegarde
32. En tant qu'admin, je veux voir les logs d'activité pour le debug | S | L | Filtres, pagination

## Analytics (5)
33. En tant que product owner, je veux suivre les conversions par funnel | M | L | Graphiques, étapes
34. En tant que marketeur, je veux segmenter les utilisateurs par comportement | S | M | Cohorts, segments
35. En tant que manager, je veux des rapports automatiques hebdomadaires | S | M | Cron, email
36. En tant qu'analyst, je veux exporter les données brutes | S | S | CSV, API
37. En tant que PM, je veux des métriques de rétention | M | S | D1, D7, D30

## Social (4)
38. En tant qu'utilisateur, je veux partager mon contenu sur les réseaux sociaux | S | M | Share API, preview
39. En tant qu'utilisateur, je veux inviter des amis pour gagner des avantages | M | S | Lien, tracking
40. En tant qu'utilisateur, je veux commenter et liker pour interagir | S | S | CRUD, compteurs
41. En tant qu'utilisateur, je veux suivre d'autres utilisateurs | C | M | Follow, feed

## Autres (9)
42. En tant qu'utilisateur, je veux un mode hors-ligne pour les zones sans réseau | S | L | Cache, sync
43. En tant qu'utilisateur, je veux un mode sombre pour le confort visuel | C | S | Thème, persistance
44. En tant qu'utilisateur, je veux changer la langue de l'interface | S | M | i18n, détection
45. En tant qu'utilisateur, je veux une aide contextuelle (?) pour comprendre | C | XS | Tooltips, modals
46. En tant qu'utilisateur, je veux des raccourcis clavier pour aller plus vite | C | S | Hotkeys, config
47. En tant qu'utilisateur, je veux annuler mes dernières actions | S | M | Undo stack, limite
48. En tant qu'utilisateur, je veux dupliquer un élément pour gagner du temps | S | XS | Copy, paste
49. En tant qu'utilisateur, je veux organiser par glisser-déposer | S | M | Drag and drop, ordre
50. En tant qu'utilisateur, je veux une recherche globale (Cmd+K) pour naviguer | C | M | Modal, résultats
