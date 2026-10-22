# BASIRA — Spécification de l'intelligence documentaire

## 1. Rôle

BASIRA est le futur système d'interprétation de contributions terrain en propositions structurées, explicables et vérifiables. Il ne doit pas agir comme générateur autonome de faits ou d'approbations. La maquette livrée **n'exécute aucun modèle IA** : `assets/core.js` applique des règles deterministes limitées.

## 2. Pipeline cible (20 responsabilités)

1. Acquisition (audio, texte, images, mesures) ; 2. précontrôle qualité ; 3. transcription ; 4. segmentation ; 5. lexique métier ; 6. extraction entités-valeurs ; 7. résolution des références ; 8. normalisation unités, nombres et dates ; 9. séparation faits/hypothèses ; 10. mapping du schéma documentaire ; 11. validation de type ; 12. détection incohérences ; 13. liaison aux preuves ; 14. qualité / confiance ; 15. données manquantes et ambiguës ; 16. question de clarification ; 17. proposition champ-valeur ; 18. confirmation humaine ; 19. historique des décisions ; 20. construction d'une révision vérifiable.

Service proposé : `ingestion` → `transcription` → `extraction` → `field-mapper` → `rule-engine` → `evidence-index` → `review-queue` → `document-renderer` ; transports asynchrones et idempotents pour les événements de mission.

## 3. Schémas typés indicatifs

```ts
type EvidenceRef = { id: string; kind: 'audio'|'photo'|'text'|'measurement'|'external'; sha256?: string; storageKey?: string; createdAt: string; authorId: string };
type Observation = { id: string; missionId: string; authorId: string; happenedAt: string; receivedAt: string; rawText?: string; sources: EvidenceRef[] };
type FieldProposal = { id: string; observationId: string; templateVersionId: string; fieldDefinitionId: string; candidate: string|number|null; unit?: string; sourceSpan?: {start: number; end: number}; evidenceIds: string[]; extractorVersion: string; ruleVersion: string; confidence?: number; confidenceCalibrationVersion?: string; state: 'candidate'|'unknown'|'conflict'|'rejected'|'human_verified'; rationale: string };
type ReviewDecision = { proposalId: string; reviewerId: string; action: 'accept'|'correct'|'reject'|'abstain'; correctedValue?: unknown; reason: string; createdAt: string };
```

Les modèles de stockage et les règles d'intégrité doivent être formalisés dans des migrations et un dictionnaire de données complets avant toute mise en production.

## 4. La confiance doit être testée

Une valeur numérique de confiance n'est acceptable que si sa définition et son étalonnage sont documentés. Séparer confiance de transcription, extraction, attribution au champ, conformité au type, et preuve externe. Tester calibration, courbes fiabilité, ECE/Brier selon tâches probabilistes, couverture vs taux d'erreurs avec abstention, taux de contradiction détectée, taux de champs justifiés. Répliquer par domaine/site et sous-groupes pertinents avec jeux annotés indépendants, et analyser les dérives temporelles.

Pour les systèmes génératifs, imposer schémas de sorties stricts, arguments citant des passages identifiables et abstention conditionnelle ; vérifier les candidats par moteur de règles et revue humaine. Contre injections via documents, séparer les documents non fiables des instructions exécutables. Journaliser versions de prompts/modèles, tests, provenance et décisions.

## 5. Règles du démonstrateur inclus

- `parseObservation(text)` reconnaît seulement les expressions prévues : circuit secondaire ou principal, pression suivie d'une valeur en bars, température suivie d'un nombre en degrés/°C, mots-clés d'état de filtre, mention de photo et incertitude sur remplacement.
- `mergeField(...)` marque les valeurs divergentes comme contradiction et ne les remplace pas en silence.
- `replacement` demeure `null` quand l'intervenant n'en connaît pas la date.
- `status: candidate` n'équivaut pas à une source vérifiée ; `human` ne signifie qu'un clic du visiteur de la démo.
- `canApprove(...)` vérifie les champs requis et l'absence de contradiction.
- Aucun microphone, OCR, API LLM, modèle deep learning, stockage serveur ou transcription réelle n'est branché.

## 6. Risques à étudier

Mesures mal transcrites, unités implicites, négation (« pas de fuite » vs « fuite »), homonymie des équipements, dates ambiguës, voix bruyante, données contradictoires, hallucination, preuves non jointes, documents manipulés, corrections multi-utilisateurs simultanées et modifications de modèles après collecte. Chaque classe doit disposer de scénarios de test et d'une politique d'abstention.
