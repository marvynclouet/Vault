# Work Breakdown Structure — 3 exemples complets

## Exemple 1 : App e-commerce mobile

### Epic 1 : Authentification
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Auth | 40h |
| Feature | Inscription |
| | US: Inscription email/mot de passe | 8h |
| | US: Validation email | 4h |
| | US: Récupération mot de passe | 6h |
| Feature | Connexion |
| | US: Login email | 4h |
| | US: Login Google | 8h |
| | US: Session persistante | 4h |
| Task | Setup Firebase Auth | 2h |
| Task | UI écrans auth | 6h |

### Epic 2 : Catalogue
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Catalogue produits | 60h |
| Feature | Liste produits |
| | US: Affichage catalogue avec images | 12h |
| | US: Pagination infinie | 6h |
| | US: Filtres (catégorie, prix) | 10h |
| Feature | Détail produit |
| | US: Fiche produit complète | 8h |
| | US: Galerie images, zoom | 6h |
| | US: Stock et disponibilité | 4h |
| Task | API produits, intégration | 8h |
| Task | Cache images | 4h |

### Epic 3 : Panier et paiement
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Checkout | 50h |
| Feature | Panier |
| | US: Ajout/suppression panier | 8h |
| | US: Modification quantités | 4h |
| | US: Panier persistant | 6h |
| Feature | Paiement |
| | US: Récup commande | 6h |
| | US: Intégration Stripe | 16h |
| | US: Confirmation email | 4h |
| Task | Setup Stripe, webhooks | 6h |

---

## Exemple 2 : SaaS B2B dashboard

### Epic 1 : Authentification et SSO
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Auth entreprise | 50h |
| Feature | SSO SAML/OIDC |
| | US: Connexion SAML | 20h |
| | US: Connexion OIDC (Google, Azure) | 12h |
| | US: Provisioning utilisateurs | 10h |
| Feature | Gestion multi-tenant |
| | US: Isolation par organisation | 8h |
| | US: Rôles et permissions | 12h |
| Task | Setup Auth0/Okta | 8h |

### Epic 2 : Tableau de bord
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Dashboard KPIs | 80h |
| Feature | Widgets |
| | US: Widgets configurables | 8h |
| | US: Graphiques (ligne, barre, pie) | 16h |
| | US: Filtres (date, segment) | 12h |
| Feature | Personnalisation |
| | US: Drag & drop layout | 16h |
| | US: Sauvegarde vues | 8h |
| | US: Partage de dashboards | 12h |
| Task | API métriques, agrégations | 20h |

### Epic 3 : Export et rapports
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Reporting | 40h |
| Feature | Export |
| | US: Export PDF | 12h |
| | US: Export Excel | 10h |
| | US: Export planifié (email) | 10h |
| Task | Génération PDF | 8h |

---

## Exemple 3 : Marketplace 2 faces (vendeurs + acheteurs)

### Epic 1 : Côté vendeur
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Gestion vendeur | 70h |
| Feature | Inscription vendeur |
| | US: Création compte pro | 8h |
| | US: Vérification identité | 12h |
| | US: Paramètres boutique | 6h |
| Feature | Gestion annonces |
| | US: Création annonce (titre, desc, prix, photos) | 16h |
| | US: Modification/suppression | 6h |
| | US: Statuts (brouillon, en ligne) | 4h |
| Feature | Commandes vendeur |
| | US: Liste des commandes | 8h |
| | US: Mise à jour statut (expédié, etc.) | 6h |
| | US: Paiement des commissions | 10h |
| Task | Modération annonces | 8h |

### Epic 2 : Côté acheteur
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Achat | 60h |
| Feature | Recherche |
| | US: Recherche full-text | 10h |
| | US: Filtres (prix, localisation, catégorie) | 8h |
| | US: Tri (pertinence, prix, date) | 4h |
| Feature | Parcours achat |
| | US: Fiche produit | 8h |
| | US: Contact vendeur | 6h |
| | US: Panier multi-vendeurs | 12h |
| | US: Checkout | 12h |
| Task | Calcul frais de port | 6h |

### Epic 3 : Plateforme
| Niveau | Élément | Estimation |
|--------|---------|------------|
| Epic | Infrastructure | 50h |
| Feature | Paiement |
| | US: Split payment (vendeur + commission) | 20h |
| | US: Remboursements | 10h |
| Feature | Notifications |
| | US: Emails transactionnels | 8h |
| | US: Push in-app | 6h |
| Task | Modération, signalement | 6h |
