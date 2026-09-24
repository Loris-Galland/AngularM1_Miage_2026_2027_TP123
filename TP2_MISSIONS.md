# TP2 — Mes missions

## Préparation

Avant de commencer j'ai récupéré deux mp3 libres de droits en plus de song1 et song2 qui étaient déjà dans le starter. Je les ai rangés dans frontend-starter/fichiers-audio-de-test avec des noms simples (coffee-time.mp3 et summer-breeze.mp3), comme ça j'ai quatre fichiers sous les 25 Mo pour tester l'upload et avoir assez de pistes pour voir plusieurs pages.

## Mission 2 — Bibliothèque paginée

Le but c'est que la page tracks affiche les pistes page par page, et surtout que chaque changement de page refasse une vraie requête au backend. Interdit de tout récupérer d'un coup et de découper la liste côté Angular. Et on touche pas au backend.

Ce qui était déjà là

Comme au TP1 j'ai d'abord regardé ce que le starter faisait déjà. TrackService.list(page, limit) envoie bien page et limit en query params avec HttpClient, donc le flux composant → TrackService → HttpClient → GET /api/tracks?page=...&limit=... existait déjà. Le composant avait aussi les signals tracks, page, pages et loading, un @for avec @empty pour la liste vide, et des boutons pour changer de page.

J'ai aussi été voir dans app.js comment le backend calcule la pagination. Il fait un skip((page - 1) * limit) et un limit(limit) sur la requête Mongo, en parallèle d'un countDocuments pour avoir le total, et il renvoie pages = au moins 1. Du coup même avec une bibliothèque vide on a "Page 1 / 1", pas de bug de ce côté là.

Le signal d'erreur

C'était le seul signal demandé qui manquait. Avant, si le chargement plantait, l'erreur partait juste dans la console et l'utilisateur voyait rien. J'ai ajouté un signal error, je le vide au début de chaque chargement et je le remplis avec le message du backend (ou un message par défaut) si la requête échoue. Il s'affiche en rouge au dessus de la liste avec role="alert" pour que ce soit lu par un lecteur d'écran.

L'affichage pendant le chargement

Avant, le "Chargement…" s'affichait en même temps que la liste, donc on pouvait voir "Aucune piste" et "Chargement…" en même temps au premier affichage, c'était pas très propre. Maintenant c'est un @if (loading()) avec un @else, donc soit on voit le chargement, soit on voit la liste (ou "Aucune piste" grâce au @empty).

Les boutons Précédent et Suivant

Je les ai renommés "Précédent" et "Suivant" comme dans le sujet (avant c'était "Préc." et "Suiv."). Ils sont désactivés aux bornes, Précédent sur la page 1 et Suivant sur la dernière page, et aussi pendant un chargement pour éviter qu'on spamme les clics et qu'on lance plusieurs requêtes en même temps. Dans go() j'ai rajouté une vérif en plus : si la page demandée est en dehors de 1 à pages, ou si ça charge déjà, on fait rien. Comme ça même si on appelle go() autrement que par le bouton, on peut pas sortir des bornes.

Le limit explicite

Le composant appelait list(this.page()) en laissant limit par défaut à 5 dans le service. Ça marchait mais c'était caché, donc j'ai mis une constante limit = 5 dans le composant et je l'envoie explicitement, comme ça on voit direct dans le composant combien de pistes par page on demande.

Comment j'ai vérifié

Le build Angular passe sans erreur. J'ai lancé le backend et appelé GET /api/tracks avec page=1, 2 et 3. Dans les logs du backend on voit bien "Lecture page=1", "page=2", "page=3" à chaque fois, donc c'est bien le serveur qui découpe et pas Angular. Pour la capture Network il faut plus de 5 pistes sur le compte pour avoir au moins deux pages, sinon le bouton Suivant reste grisé.
