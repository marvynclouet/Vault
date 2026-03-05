# Méthode RICE — Priorisation

## Formule
**Score RICE = (Reach × Impact × Confidence) / Effort**

---

## Les 4 composantes

### Reach (Portée)
- Combien d'utilisateurs/clients impactés par trimestre
- Exemple : 500 utilisateurs/mois = 1500/trimestre

### Impact (Impact)
| Score | Signification |
|-------|---------------|
| 3 = massive | Double les métriques clés |
| 2 = high | Amélioration significative |
| 1.5 = medium | Amélioration notable |
| 1 = low | Amélioration mineure |
| 0.5 = minimal | Amélioration négligeable |

### Confidence (Confiance)
- Pourcentage de certitude (0-100%)
- 100% = données solides
- 80% = hypothèse forte
- 50% = hypothèse moyenne
- < 50% = à dérisquer d'abord

### Effort (Effort)
- En person-months (1 personne × 1 mois)
- 0.5 = 2 semaines, 1 = 1 mois, 2 = 2 mois

---

## 5 exemples de scoring

| Feature | Reach | Impact | Confidence | Effort | Score RICE |
|---------|-------|--------|------------|--------|------------|
| Login Google | 5000 | 2 | 100% | 0.5 | 20000 |
| Export PDF | 2000 | 1.5 | 80% | 0.25 | 9600 |
| Dark mode | 3000 | 0.5 | 90% | 0.5 | 2700 |
| API publique | 500 | 2 | 60% | 2 | 300 |
| Notification push | 4000 | 1 | 70% | 1 | 2800 |
