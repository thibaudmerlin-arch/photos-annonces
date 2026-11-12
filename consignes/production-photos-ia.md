# Directive permanente prioritaire — photographies IA Déniche ta Fripe
Mise à jour utilisateur du 12 novembre 2026. Applicable au catalogue Shopify, nouveautés Vinted et republications Leboncoin.

## Vérifier avant génération
Examiner toutes les photographies originales de chaque article et sa fiche Vinted. Vérifier genre (femme/homme/enfant/unisexe), taille exacte, étiquettes lisibles, mesures, coupe, longueur, matière et tombé. Ne pas se fier au seul titre. Si les preuves sont insuffisantes ou contradictoires, statut BLOQUÉ et explication précise ; ne pas inventer.

## Adapter le mannequin au vêtement
XS/S : silhouette plutôt mince ; M/L : moyenne ; XL : plus large si nécessaire ; XXL/3XL : plus corpulente, naturelle. Adapter à la marque, aux mesures et à la coupe, ces repères ne sont pas des règles mécaniques.
Femme : mannequin féminin ; homme : masculin ; enfant : enfant de la tranche d'âge et taille correspondantes ; unisexe : présentation cohérente.
Réutiliser autant que possible les mannequins récurrents, mais la justesse morphologique est prioritaire. Ne jamais élargir, allonger, cintrer ou raccourcir un vêtement pour l'adapter au mannequin.
Salon récurrent : canapé sombre, lampe crème sur trépied bois à gauche, cadre ou miroir bois, plante verte à droite, lumière naturelle chaude.

## Production et qualité
Deux images distinctes par article uniquement si les références permettent une représentation fidèle : face puis autre angle, même mannequin, même salon et lumière cohérente.
Respect strict couleurs, matière, motifs, logos, coutures, fermetures, boutons, poches, proportions, longueur, coupe, tombé, plis et défauts. Aucun détail inventé.
Comparer chaque sortie à toutes les sources ; régénérer si incohérence. Refuser les images trompeuses.
Format vertical 4:5, JPEG haute qualité, idéalement 1200 × 1500 ou plus.
Originaux inchangés, aucun mélange entre articles. Un article physique = une fiche Shopify.

## Classement
Windows : Bureau\\photo vinted\\IDENTIFIANT - Nom article\\PHOTOS_IA\\IA_01_FACE.jpg et IA_02_AUTRE_ANGLE.jpg.
GitHub : photos/IDENTIFIANT_VINTED/ia/IA_01_FACE.jpg et IA_02_AUTRE_ANGLE.jpg.
Conserver FICHE_CONTROLE.json avec identifiant, genre, taille, preuve, morphologie, contrôles et statut. Une image présente dans ia/ n'est PAS automatiquement validée : lire impérativement cette fiche et SUIVI_PRODUCTION_IA.csv.
Suivi CSV : ID_VINTED ; ARTICLE ; PHOTO_1 ; PHOTO_2 ; CONTROLE_QUALITE ; GITHUB ; STATUT ; ERREUR.
Statuts : À FAIRE, EN COURS, À VÉRIFIER, TERMINÉ, EN ATTENTE D'ENVOI, BLOQUÉ.
TERMINÉ exige paire validée, copie Windows réellement vérifiée et dépôt GitHub vérifié. Ne pas déclarer une copie Windows depuis l'espace Linux.

## Transmission à Claude
Ne publier ou intégrer que les paires explicitement VALIDÉES. Les autres sont des brouillons bloqués à corriger, même si présentes dans ia/.
Ordre final : face IA, autre angle IA, puis tous les originaux dans leur ordre.
Aucune publication Shopify/Vinted/Leboncoin dans la mission photo.
Republications gérées séparément par Alex : objectif utilisateur 10 % du stock actif/jour ; ne pas modifier les automatisations ou supprimer des annonces dans cette mission. Maintenir la protection des conversations acheteur récentes.
Dédupliquer les entrées photoId/repostOf : ne pas créer un second article physique.
Vérifier la disponibilité actuelle avant traitement ; la présence dans le dépôt ne prouve pas que l'article n'est pas vendu.

## Priorité
10412700800, 10269737733, 10269053614, 10673819897, 10676736020, 10498664401, 10703291878, 10269152003 puis autres articles actifs.
