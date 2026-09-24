# Rapport d'usage de l'IA - TP1

Pour chaque mission, détailler et fournir des explications concernant : objectif; prompt principal; plan proposé par l'agent; vérifications réalisées par le binôme; erreurs ou propositions rejetées; fichiers effectivement modifiés; preuve de fonctionnement; ce que chaque membre sait maintenant expliquer sans l'agent.

Modèle utilisé : Claude Sonnet 5 (`claude-sonnet-5`), via Claude Code.

Note : j'ai fait ce premier TD seul, pas encore en binôme.

## Mission 0 — Cartographie de l'application

**Objectif** : comprendre comment le projet frontend est organisé (composant racine, routes, HttpClient, services, mécanisme JWT) sans toucher au code, et produire un schéma du flux de connexion.

**Prompt principal** : c'est moi qui ai donné la direction à prendre : explorer `frontend-starter/src/` sans rien modifier, expliquer un par un les points demandés par le sujet, et me générer un schéma du flux de connexion directement en HTML plutôt que d'aller sur un site externe pour faire un diagramme — comme ça j'ai un fichier tout prêt à ouvrir, sans dépendre d'un outil en ligne.

**Plan proposé par l'agent** : lire les fichiers clés (`main.ts`, `app.ts`, `routes.ts`, les intercepteurs, les services, les pages) et comparer avec `API_CONTRACT.md`, puis rédiger les notes et le diagramme.

**Vérifications réalisées par moi** : le contenu de ces notes vient de ce que j'ai compris moi-même en explorant le projet. Le premier jet de rédaction ne me convenait pas, donc j'ai demandé à l'assistant de le reformuler dans un style plus simple et plus proche de comment je parle, pour que ce soit plus clair et plus facile à réviser pour moi — pas pour qu'il fasse le travail de compréhension à ma place. J'ai aussi ouvert le schéma HTML dans le navigateur pour vérifier qu'il s'affiche correctement.

**Erreurs ou propositions rejetées** : le premier jet de notes était trop formel à mon goût, j'ai demandé qu'il soit réécrit dans un langage plus simple.

**Fichiers effectivement modifiés** : aucun fichier de code (mission d'exploration uniquement, comme demandé). Fichiers créés : `TP1_MISSIONS.md`, `schema-flux-connexion.html`.

**Preuve de fonctionnement** : pas de code à tester pour cette mission ; le schéma HTML a été ouvert et s'affiche correctement.

**Ce que je sais maintenant expliquer sans l'agent** : le rôle du composant racine et du `router-outlet`, comment `authGuard` protège les routes, comment l'intercepteur ajoute automatiquement le JWT aux requêtes, où le token est stocké (localStorage + Signal), et la différence entre routes publiques et protégées côté API.

## Mission 1 — Inscription, connexion et profil

**Objectif** : compléter la partie utilisateur du frontend selon la checklist du sujet (formulaires, validations, JWT, déconnexion, profil, gestion du 401), en modifiant seulement ce qui manquait ou n'était pas optimal — le starter avait déjà une bonne partie de fait.

**Prompt principal** : j'ai donné la méthode à suivre : reprendre les points du sujet un par un dans l'ordre, vérifier l'état réel de chaque point dans le code plutôt que de supposer, ne modifier que ce qui était vraiment nécessaire, me montrer le code avant de l'appliquer, et documenter chaque changement dans `TP1_MISSIONS.md` avec mes mots pour que je puisse tout réexpliquer facilement.

**Plan proposé par l'agent** : passer les 10 points du sujet un à un (formulaires, validations, appels API, stockage JWT, Signal `currentUser`, redirections, bouton de déconnexion, chargement du profil, modification du profil, gestion du 401), vérifier ce qui existait déjà avant de coder, et attendre ma validation avant chaque modification de code.

**Vérifications réalisées par moi** : pour chaque modification proposée (validations du formulaire d'inscription, bouton de déconnexion, chargement auto du profil, intercepteur 401), j'ai lu le code avant/après et validé avant que ce soit appliqué. J'ai demandé de garder le bouton "Charger mon profil" en plus du chargement automatique plutôt que de le supprimer. J'ai aussi fait vérifier avec un `grep` que la contrainte "les composants n'appellent jamais HttpClient directement" était bien respectée partout. Les explications dans `TP1_MISSIONS.md` viennent de ce que j'ai compris en suivant chaque étape ; j'ai demandé une reformulation dans mon style à chaque fois que ce n'était pas assez clair pour moi.

**Erreurs ou propositions rejetées** : rien de rejeté sur le fond du code, mais j'ai ajusté un point : garder le bouton manuel de rechargement du profil au lieu de le supprimer, pour pouvoir recharger le profil à la main si besoin.

**Fichiers effectivement modifiés** : `register-page.ts` et `register-page.html` (validations du formulaire), `app.ts` et `app.html` (bouton de déconnexion), `profile-page.ts` (chargement automatique du profil), `main.ts` et le nouveau fichier `error.interceptor.ts` (gestion du 401).

**Preuve de fonctionnement** : compilation Angular réussie à chaque étape (logs `ng serve` vérifiés). Côté backend, tests via `curl` : inscription avec mot de passe trop court → 400, inscription valide → 201 avec token, login → token renvoyé, `GET /api/users/me` avec token valide → 200, avec token invalide → 401. Le rendu complet dans le navigateur (affichage des messages d'erreur, redirection effective sur 401, captures Network) reste à faire par moi-même dans les DevTools pour le rendu final du TP.

**Ce que je sais maintenant expliquer sans l'agent** : pourquoi les validations du formulaire côté front doivent correspondre aux règles du backend, comment fonctionne l'intercepteur qui ajoute le JWT à chaque requête, pourquoi il fallait un intercepteur séparé pour intercepter les réponses 401, où se trouve exactement la logique de mise à jour du profil côté back (`app.js`) et côté front (`auth.service.ts` / `profile-page.ts`), et pourquoi les composants ne doivent jamais appeler `HttpClient` directement.

# Rapport d'usage de l'IA - TP2

Modèle utilisé : Claude Opus 5.5 (`claude-opus-5-5`), via Claude Code.

Les explications détaillées de chaque mission sont dans `TP2_MISSIONS.md`.

## Mission 2 — Bibliothèque paginée

**Objectif** : avoir une bibliothèque paginée côté serveur, avec les Signals `tracks`, `page`, `pages`, `loading` et l'erreur, `@for` / `@empty` / `@if` dans le template, et des boutons Précédent / Suivant désactivés aux bornes, sans modifier le backend et sans découper la liste côté Angular.

**Prompt principal** : j'ai repris la même méthode qu'au TP1 : d'abord ranger mes fichiers audio de test au bon endroit, puis vérifier point par point ce que le starter faisait déjà pour la Mission 2, ne compléter que ce qui manquait, et tout documenter dans `TP2_MISSIONS.md` et ici en m'énonçant clairement chaque étape.

**Plan proposé par l'agent** : lire `track.service.ts`, `tracks-page.ts/html` et la route `GET /api/tracks` dans `app.js` pour voir comment le backend calcule `pages` ; ajouter le signal d'erreur manquant ; séparer l'affichage chargement / liste ; renommer et sécuriser les boutons de pagination ; tester la pagination sur le vrai backend.

**Vérifications réalisées par moi** : j'ai vérifié dans le backend que `pages` vaut toujours au moins 1 (donc pas de bug avec une bibliothèque vide, contrairement à ce qu'on soupçonnait au départ). J'ai relu les modifications du composant et du template avant de les garder. La pagination a été testée sur le backend lancé en local avec `page=1`, `2` et `3`, et les logs serveur montrent bien une requête différente à chaque page.

**Erreurs ou propositions rejetées** : l'hypothèse d'un bug du bouton Suivant avec une bibliothèque vide a été écartée après lecture du backend. Les options avancées (Paginator Angular Material, pagination Mongoose avec `aggregate-paginate-v2`) ne sont pas faites dans cette étape.

**Fichiers effectivement modifiés** : `tracks-page.ts` (signal `error`, constante `limit`, garde dans `go()`), `tracks-page.html` (affichage de l'erreur, `@if/@else` pour le chargement, boutons Précédent / Suivant). Fichiers ajoutés : `coffee-time.mp3` et `summer-breeze.mp3` dans `frontend-starter/fichiers-audio-de-test/`. `track.service.ts` n'a pas eu besoin d'être modifié.

**Preuve de fonctionnement** : build Angular sans erreur ; logs backend `[tracks] Lecture page=1, limit=5`, puis `page=2`, puis `page=3` lors des tests. La capture Network de la pagination dans le navigateur reste à faire par moi une fois qu'il y a plus de 5 pistes sur le compte.

**Ce que je sais maintenant expliquer sans l'agent** : la différence entre une pagination serveur (`skip`/`limit` + `countDocuments` dans Mongo) et un découpage côté client, pourquoi chaque clic sur Précédent / Suivant doit refaire une requête HTTP, comment les Signals pilotent l'affichage du template (`@if`, `@for`, `@empty`), et pourquoi on désactive les boutons pendant un chargement.
