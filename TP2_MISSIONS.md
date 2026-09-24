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

Les preuves

J'ai uploadé 6 pistes pour avoir 2 pages, puis j'ai fait les captures avec le Network ouvert, filtré sur tracks et cache désactivé.

Sur la première on voit les trois requêtes à la suite quand je fais recharger, Suivant puis Précédent : page=1, page=2, page=1, toutes en 200. Ça prouve qu'Angular refait une requête à chaque clic au lieu de découper la liste lui-même.

![Requêtes de pagination dans Network](screenshots/tp2/pagination1.PNG)

Sur la deuxième je suis sur la page 2, et dans le Preview de la requête on voit ce que le serveur renvoie : une seule piste dans items, page 2, pages 2 et total 6.

![Réponse du serveur pour la page 2](screenshots/tp2/pagination_page2.PNG)

Et la dernière montre l'interface sur la page 2 : "Page 2 / 2", Précédent actif et Suivant grisé parce que c'est la dernière page.

![Boutons désactivés sur la dernière page](screenshots/tp2/pagination_interface.PNG)

Ces captures c'est la version de base avec mes propres boutons, avant que je fasse les deux options avancées juste en dessous.

## Mission 2 — AVANCÉ — Pagination Mongoose

Là c'est la seule partie du TP2 où le sujet autorise à toucher au backend. Le but c'est de remplacer la pagination faite à la main par le plugin mongoose-aggregate-paginate-v2.

Avant, la route GET /api/tracks faisait deux requêtes en parallèle avec Promise.all : un find() avec skip et limit pour récupérer les pistes de la page, et un countDocuments() pour avoir le total. Ensuite elle calculait pages elle-même avec Math.ceil(total / limit).

Maintenant j'ai installé le plugin, je l'ai branché sur le schéma Track avec schema.plugin(aggregatePaginate), et dans la route je construis un pipeline d'agrégation en trois étapes : un $match pour ne garder que les pistes de l'utilisateur connecté, un $sort pour avoir les plus récentes en premier, et un $project pour virer storedName (le nom du fichier sur le disque, qu'on doit jamais envoyer au front). Ensuite Track.aggregatePaginate() s'occupe tout seul du skip, du limit et du comptage.

Un piège que j'ai vu en passant : dans un aggregate, Mongoose convertit pas automatiquement l'id en ObjectId comme il le fait avec find(). Du coup si on met juste req.auth.sub (qui est une string) dans le $match, ça trouve rien. Faut faire new mongoose.Types.ObjectId(req.auth.sub).

Le plugin renvoie de base des champs qui s'appellent docs, totalDocs et totalPages. Avec l'option customLabels je les ai renommés en items, total et pages, comme ça le format de base du contrat reste le même et le front casse pas. Par contre il renvoie en plus des infos bonus : hasPrevPage, hasNextPage, prevPage, nextPage et pagingCounter (le numéro de la première piste de la page). Du coup j'ai mis à jour API_CONTRACT.md pour documenter tout ça, et le modèle Page côté Angular.

Pour vérifier j'ai ajouté un petit test dans api.test.js qui regarde que Track.aggregatePaginate existe bien, les 3 tests passent. Et j'ai appelé la route avec le compte demo qui a 6 pistes : page 1 donne 5 pistes avec hasNextPage à true, page 2 donne 1 piste avec nextPage à null, avec limit=10 on a les 6 d'un coup sur une seule page, sans token c'est toujours 401, et aucun storedName ni _id dans les réponses.

## Mission 2 — AVANCÉ — Angular Material

Le deuxième bonus c'était d'utiliser le composant Paginator d'Angular Material au lieu de mes boutons Précédent / Suivant faits main. J'ai choisi de remplacer mes boutons plutôt que de garder les deux, sinon ça fait doublon à l'écran.

J'ai installé @angular/material et @angular/cdk en version 22 pour que ça colle avec notre Angular 22. J'ai pas utilisé ng add parce que ça modifie plein de fichiers tout seul, j'ai préféré ajouter moi même le thème prédéfini azure-blue dans angular.json. Dans styles.css j'ai remis le vert du site comme couleur principale du paginator, et j'ai annulé le style global des boutons (fond vert, texte blanc) juste pour les boutons du paginator, sinon ses flèches avaient un gros fond vert. J'ai mis ça dans un :where() pour que ma règle soit pas plus forte que les styles de Material eux-mêmes.

Dans le composant, limit est devenu un signal parce que maintenant l'utilisateur peut choisir 5, 10 ou 20 pistes par page (20 c'est le max accepté par le backend). J'ai ajouté un signal total, parce que le paginator a besoin du nombre total de pistes pour calculer lui-même le nombre de pages. La fonction go() a été remplacée par onPage() qui reçoit l'événement du paginator. Petit truc à savoir : le paginator compte les pages à partir de 0 (pageIndex) alors que notre API commence à 1, donc je fais pageIndex + 1.

Le paginator est désactivé pendant un chargement, et ses flèches sont grisées toutes seules aux bornes, donc on garde bien ce que demandait la mission de base. J'ai aussi gardé un petit "Page X / Y" en dessous pour que le signal pages soit toujours visible.

Par défaut les textes du paginator sont en anglais ("Items per page", "1 – 5 of 6"). J'ai créé une classe FrenchPaginatorIntl dans shared/i18n qui hérite de MatPaginatorIntl pour tout mettre en français ("Pistes par page", "1 – 5 sur 6", "Page suivante"...), et je l'ai fournie dans main.ts, comme ça ça s'applique à tous les paginators de l'appli.

Chaque clic sur une flèche ou changement du nombre par page refait toujours une vraie requête au serveur avec page et limit, c'est toujours le backend qui découpe.

Voilà le rendu final avec le paginator en français, sur la page 1 avec 6 pistes : la flèche précédente est grisée et on voit bien "1 – 5 sur 6".

![Paginator Angular Material](screenshots/tp2/paginator.PNG)

## Mission 3 — Upload et lecture audio

Ici le sujet dit bien de pas refaire ce qui existe déjà et de pas toucher au contrat HTTP. Le starter savait déjà envoyer un fichier et le lire, donc j'ai d'abord repéré où tout se passe, et après j'ai juste complété ce qui manquait côté front.

Où se trouve chaque étape

Le choix du fichier c'est dans tracks-page.html, l'input type file avec (change)="choose($event)", et la méthode choose() dans tracks-page.ts qui récupère le premier fichier sélectionné.

La construction du FormData et l'appel HTTP d'upload c'est dans track.service.ts, la méthode upload(file, title). Elle crée un FormData, fait append('audio', file) et append('title', title), puis un http.post vers /api/tracks. C'est la méthode upload() du composant qui l'appelle.

La récupération du Blob c'est la méthode audio(id) de track.service.ts, un http.get vers /api/tracks/:id/audio avec responseType: 'blob', donc Angular me rend le fichier binaire au lieu d'essayer de le lire comme du JSON.

La création de l'ObjectURL, l'affectation au lecteur et la révocation de l'ancienne URL c'est dans play() de tracks-page.ts : on révoque l'URL précédente avec URL.revokeObjectURL, on crée la nouvelle avec URL.createObjectURL(blob), et on la met dans le signal audioUrl, qui est branché sur le [src] de la balise audio dans le template.

Le flux complet

À l'envoi ça donne : le composant (choose puis upload) → TrackService.upload qui construit le FormData → HttpClient qui fait le POST en multipart/form-data → l'intercepteur qui ajoute le JWT → l'API. Côté backend, Multer lit le multipart, vérifie le fichier, l'écrit sur le disque avec un nom aléatoire, et la route enregistre les infos (titre, nom d'origine, type, taille) dans MongoDB.

À la lecture c'est l'inverse : clic sur Écouter → TrackService.audio → HttpClient fait le GET avec le JWT → l'API vérifie que la piste m'appartient et envoie le fichier → HttpClient me donne un Blob → je crée une ObjectURL (une adresse du genre blob:http://localhost:4200/...) qui pointe vers ce Blob en mémoire → je la donne au lecteur audio.

L'intercepteur et pourquoi un src direct marche pas

C'est authInterceptor dans shared/interceptors/auth.interceptor.ts qui ajoute le header Authorization: Bearer suivi du token à toutes les requêtes faites avec HttpClient. Dans l'onglet Network, sur la requête /api/tracks/.../audio, on voit bien ce header dans les Request Headers.

Si je mettais directement src="/api/tracks/123/audio" sur la balise audio, c'est le navigateur lui-même qui ferait la requête, pas Angular. Du coup ça passe pas par HttpClient, donc pas par l'intercepteur, donc pas de header Authorization. Le navigateur envoie tout seul les cookies, mais nous le token il est dans le localStorage, pas dans un cookie, et y'a aucun moyen de dire à une balise audio d'ajouter un header. Résultat le backend répondrait 401. C'est pour ça qu'on passe par HttpClient + Blob + ObjectURL. Mettre le token dans l'URL (genre ?token=...) serait une mauvaise idée parce qu'il finirait dans l'historique et dans les logs.

Les contrôles du backend

Tout est dans app.js. MAX_FILE_SIZE vaut 25 Mo et est passé à Multer dans limits.fileSize. La liste allowed contient les types MIME acceptés (audio/mpeg, audio/wav, audio/x-wav, audio/ogg, audio/mp4, audio/x-m4a), et le fileFilter de Multer refuse tout le reste avec "Format audio non accepté". upload.single("audio") dit à Multer que le fichier doit être dans le champ audio, et le titre est lu dans req.body.title (si y'a pas de titre il prend le nom du fichier). Si y'a pas de fichier la route répond 400 "Fichier audio requis", et le gestionnaire d'erreurs à la fin transforme les erreurs de Multer (fichier trop gros, mauvais format) en 400.

Côté front j'ai vérifié que le FormData contient exactement les champs audio et title, c'était déjà bon. On le voit dans le Payload de la requête POST tracks : audio (binary) et title. Et à gauche on voit le message de succès, le champ fichier revenu à "Aucun fichier choisi" et la nouvelle card en premier.

![Upload en multipart avec audio et title](screenshots/tp2/upload_multipart.PNG)

La validation avant l'envoi

J'ai créé shared/validators/audio-file.ts avec les mêmes règles que le backend : la même liste de types et la même limite de 25 Mo, et une fonction validateAudioFile() qui renvoie un message d'erreur clair ou null si c'est bon. Je l'appelle dès qu'on choisit un fichier, comme ça l'erreur s'affiche direct et le bouton Envoyer se grise, et je la rappelle dans upload() juste avant l'appel HTTP par sécurité. L'input file a aussi un accept avec les types autorisés pour que la fenêtre de choix propose surtout les bons fichiers.

Pourquoi c'est pas suffisant tout seul : la validation front c'est pour le confort, on sait tout de suite que ça va pas au lieu d'attendre d'avoir envoyé 30 Mo pour rien. Mais n'importe qui peut la contourner, en envoyant la requête avec curl ou Postman, en modifiant le JS dans le navigateur, ou juste en renommant un fichier (le type MIME est deviné par le navigateur à partir de l'extension). Le backend c'est le seul endroit qu'on contrôle vraiment, donc c'est lui qui doit avoir le dernier mot. D'ailleurs j'ai testé avec curl : un fichier texte envoyé direct à l'API donne bien 400 "Format audio non accepté", et un envoi sans fichier donne 400 "Fichier audio requis".

Dans le navigateur, quand je choisis un fichier texte, le message rouge s'affiche tout de suite et le bouton Envoyer reste grisé. Dans Network on voit qu'aucune requête POST est partie : le 400 du serveur arrive jamais jusqu'au navigateur parce que la validation front bloque avant. C'est pour ça que le 400 du backend je l'ai prouvé avec curl.

![Fichier invalide refusé avant l'envoi](screenshots/tp2/fichier_invalide.PNG)

Pendant l'envoi

J'ai transformé file en signal et ajouté les signaux uploading, fileError (erreur de validation), uploadError (erreur du serveur) et uploadSuccess. Pendant l'envoi le bouton affiche "Envoi en cours…" et est désactivé, l'input fichier aussi, et upload() sort direct si un envoi est déjà en cours, donc pas de double envoi possible même en cliquant vite. Si le serveur répond une erreur, son message s'affiche. J'ai bien séparé l'erreur de validation et l'erreur serveur, sinon après une erreur serveur le bouton restait bloqué et on pouvait pas réessayer. Si ça marche, un message de succès s'affiche avec le titre, le titre et le fichier sont vidés, y compris l'input fichier lui-même (avant il affichait encore l'ancien nom) grâce à un viewChild, et on recharge la page 1.

Les cards

Avant c'était une simple liste avec le titre et "3605337 Ko", sauf que la taille renvoyée par l'API c'est des octets, pas des Ko. Maintenant chaque piste est une card dans une grille responsive (repeat(auto-fill, minmax(200px, 1fr)), donc plusieurs colonnes sur grand écran et une seule sur téléphone). Une card affiche le titre, le nom d'origine du fichier, le format, la taille et la date d'ajout, plus un bouton Écouter.

Pour le format et la taille j'ai fait deux petits pipes dans shared/pipes : audioFormat qui transforme audio/mpeg en MP3, et fileSize qui transforme les octets en Ko ou Mo (3605337 octets ça donne 3,4 Mo). La date passe par le DatePipe d'Angular.

Pour l'accessibilité, les pistes sont dans une vraie liste ul/li, les infos dans une liste de définitions dl/dt/dd, chaque bouton a un aria-label "Écouter + titre" pour qu'un lecteur d'écran sache quelle piste il lance, le focus clavier est bien visible, et la card en cours de lecture a aria-current en plus d'un contour vert.

La lecture

Le mécanisme était déjà là, j'ai complété ce qui manquait. Au-dessus des cards y'a maintenant "En cours : titre" avec le lecteur. Pendant le téléchargement du fichier le bouton de la piste affiche "Chargement…". Si la requête échoue j'affiche un message clair : avec un 404 ça veut dire que la piste existe pas ou appartient à quelqu'un d'autre. Si le fichier arrive mais que le navigateur arrive pas à le lire, l'événement (error) de la balise audio affiche aussi un message.

Et le dernier truc qui manquait : révoquer l'ObjectURL finale quand on quitte la page. play() révoquait déjà l'ancienne URL à chaque nouvelle lecture, mais la dernière restait en mémoire pour toujours. J'ai ajouté un DestroyRef.onDestroy qui la révoque quand le composant est détruit.

Sur cette capture on voit la lecture en cours avec la card entourée en vert, et la requête audio : GET en 200, Content-Type audio/mpeg (donc c'est bien un flux audio et pas du JSON) et Accept-Ranges bytes. Le header Authorization est bien là dans la requête, j'ai masqué la valeur du token.

![Lecture audio authentifiée](screenshots/tp2/lecture_audio.PNG)

J'ai aussi vérifié qu'une piste peut être lue que par son propriétaire : j'ai créé un deuxième compte (proprio-test@example.com) et j'ai essayé de lire une piste du compte demo avec son token, le serveur répond 404 "Piste inconnue", et ce compte voit 0 piste dans sa liste. C'est parce que la route cherche la piste avec son id ET ownerId égal à l'utilisateur du token.

Je l'ai aussi montré dans le navigateur : connecté avec le compte de test, j'ai lancé dans la console un fetch vers l'audio d'une piste du compte demo, avec le token du compte de test. Le serveur répond 404.

![Piste d'un autre utilisateur : 404](screenshots/tp2/proprietaire_404.PNG)

Blob, buffering et streaming, la différence

Télécharger un Blob complet c'est ce qu'on fait avec HttpClient : on attend d'avoir tout le fichier en mémoire avant de pouvoir faire quoi que ce soit avec. Le buffering c'est ce que fait le navigateur quand il lit un son depuis une URL HTTP : il télécharge un peu d'avance, commence à jouer, et continue à charger pendant la lecture. Le streaming côté serveur c'est quand le serveur envoie le fichier par morceaux au lieu de le charger en entier dans sa mémoire avant, et qu'il sait répondre à une demande du genre "donne moi juste les octets 1000 à 2000" (les requêtes Range).

## Mission 3 — Questions sur mémoire, buffering et streaming

Le backend envoie-t-il le fichier entier en mémoire ou progressivement depuis le disque ?

Progressivement. La route utilise res.sendFile(), qui lit le fichier sur le disque avec un flux et l'envoie morceau par morceau, sans jamais le charger en entier dans la mémoire du serveur. En plus il gère les requêtes Range : j'ai testé avec curl, la réponse normale a Accept-Ranges: bytes et Content-Length: 3605337, et si je demande juste les octets 0 à 1023 il répond 206 Partial Content avec Content-Range: bytes 0-1023/3605337.

Avec HttpClient et responseType "blob", à quel moment le composant reçoit-il le fichier ?

À la fin, une fois que tout le fichier est téléchargé. Même si le serveur envoie en flux, HttpClient accumule tout, et l'Observable émet une seule fois quand la réponse est complète. Donc le next() de play() est appelé qu'une fois les 3 ou 6 Mo arrivés, et la lecture peut commencer seulement à ce moment là. Pour des petits fichiers ça va, pour un morceau de 25 Mo sur une connexion lente on attendrait longtemps avant d'entendre quoi que ce soit.

Avec 100 morceaux, les 100 fichiers sont-ils chargés en mémoire dès l'affichage de la liste ?

Non. Déjà la liste est paginée, donc on en affiche 5, 10 ou 20 max. Et surtout, TrackService.list() appelle GET /api/tracks qui renvoie que les métadonnées en JSON (titre, nom, taille, date…), pas les fichiers. Le fichier audio est téléchargé seulement dans play(), donc quand on clique sur Écouter, et pour cette piste là uniquement. Et comme play() révoque l'ancienne URL avant d'en créer une nouvelle, y'a au maximum un seul Blob audio gardé en mémoire à la fois.

Quelle différence avec 100 éléments audio utilisant directement une URL HTTP ?

D'abord ça marcherait même pas ici : comme expliqué plus haut, le navigateur enverrait pas le JWT, donc 401 partout. Mais en imaginant une route publique, chaque balise audio fait ses propres requêtes. Selon l'attribut preload, le navigateur peut lancer une requête pour chacune des 100 dès l'affichage (au moins pour les métadonnées, voire le début du fichier), donc beaucoup de trafic pour rien. Par contre l'avantage c'est que le navigateur gère le buffering et les Range tout seul : la lecture commence avant la fin du téléchargement, on peut sauter au milieu du morceau sans tout charger, et il libère la mémoire lui-même.

Pourquoi l'URL créée par URL.createObjectURL doit-elle être révoquée ?

Parce que tant qu'elle existe, le navigateur garde le Blob en mémoire, même si plus aucune variable pointe dessus : l'URL elle-même est une référence. Normalement ça se nettoie quand on ferme ou recharge la page, mais dans une SPA Angular on recharge jamais la page, on change juste de composant. Donc sans revokeObjectURL, chaque morceau écouté resterait en mémoire (plusieurs Mo à chaque fois) jusqu'à la fermeture de l'onglet, c'est une fuite mémoire. C'est pour ça qu'on révoque l'ancienne à chaque nouvelle lecture et la dernière à la destruction du composant.

## Mission 3 — Pourquoi Blob et ObjectURL

En gros on avait un problème : les fichiers audio sont protégés par le JWT, et une balise audio avec un src normal peut pas envoyer ce JWT. La solution c'est de télécharger le fichier nous-mêmes avec HttpClient, qui passe par l'intercepteur et envoie donc le token. HttpClient nous rend le fichier sous forme de Blob, c'est juste des données binaires en mémoire. Sauf que la balise audio elle veut une URL, pas un Blob. URL.createObjectURL sert à ça : ça crée une URL locale blob:... qui pointe vers le Blob, et le lecteur peut la lire comme n'importe quelle URL, sans refaire de requête.

Les inconvénients c'est qu'il faut attendre que tout le fichier soit téléchargé avant de lire, que le fichier entier est en mémoire dans le navigateur, et qu'il faut penser à révoquer l'URL. Pour des fichiers de 25 Mo max c'est acceptable. Pour de gros fichiers, on pourrait passer à un token court dans un cookie, ou une URL signée temporaire, pour laisser le navigateur faire du vrai streaming.

## Améliorations facultatives

J'ai fait toutes celles proposées par le sujet. Le formatage lisible de la taille et de la date était déjà fait pendant la Mission 3 avec les pipes fileSize et audioFormat et le DatePipe, donc il restait la barre de progression, la suppression et le filtre.

La barre de progression de l'upload

Par défaut HttpClient renvoie juste la réponse finale. Dans TrackService.upload() j'ai ajouté observe: 'events' et reportProgress: true, du coup l'Observable émet plein d'événements pendant l'envoi. Dans le composant je regarde le type de chaque événement : si c'est un UploadProgress, je calcule le pourcentage avec loaded / total et je le mets dans un signal progress, et si c'est la Response finale, je récupère la piste dans event.body et je fais comme avant (message de succès, formulaire vidé, page 1). La barre c'est une balise progress native, avec un aria-label pour les lecteurs d'écran, et le pourcentage écrit à côté. Quand on arrive à 100 % j'affiche "Fichier reçu, enregistrement en cours…", parce qu'à ce moment là le navigateur a fini d'envoyer mais le serveur doit encore écrire dans MongoDB. En local ça va super vite, donc pour la voir avancer faut activer le throttling "Slow 4G" dans l'onglet Network. Sur la capture l'envoi vient de démarrer : bouton "Envoi en cours…" désactivé, input fichier grisé, barre et pourcentage, et la requête tracks en pending.

![Upload en cours avec la barre de progression](screenshots/tp2/progression_upload.PNG)

La suppression avec confirmation

La route DELETE /api/tracks/:id existait déjà dans le backend (elle supprime la fiche dans MongoDB et le fichier sur le disque, et vérifie aussi que la piste appartient à l'utilisateur), il manquait juste le front. J'ai ajouté remove(id) dans TrackService, et un bouton Supprimer rouge sur chaque card.

Pour la confirmation j'ai choisi une dialog Angular Material plutôt que le window.confirm() du navigateur, parce que c'est plus joli, cohérent avec le paginator, et accessible : le focus reste dans la fenêtre, Échap annule, et le focus part par défaut sur Annuler pour pas supprimer par erreur en tapant Entrée. J'ai fait un composant ConfirmDialogComponent générique dans shared/components, qui reçoit un titre, un message et le texte du bouton, et qui renvoie true si on confirme. Comme ça il pourra resservir pour d'autres confirmations.

Après la suppression la liste est rechargée depuis le serveur et un message "« titre » a été supprimée" s'affiche. Deux cas particuliers que j'ai gérés : si je supprime la piste en train d'être lue, le lecteur est coupé et son ObjectURL révoquée, et si je supprime la dernière piste d'une page qui est pas la première, on revient à la page d'avant au lieu d'afficher une page vide. Si le serveur répond une erreur (par exemple la fiche supprimée mais pas le fichier), le message s'affiche et la liste est rechargée quand même pour rester à jour.

Testé avec curl sur le compte de test : le premier DELETE répond 204, le deuxième 404 parce que la piste existe plus, et la liste retombe à 0. Et dans le navigateur on voit la dialog de confirmation, le message "« Test Multipart » a été supprimée", et dans Network la requête DELETE en 204 No Content suivie du rechargement tracks?page=1&limit=5.

![Dialog de confirmation et DELETE en 204](screenshots/tp2/suppression_son.PNG)

Le filtre par titre

Pour garder une vraie pagination serveur, j'ai fait le filtre côté backend et pas en filtrant les pistes déjà affichées, sinon on trouverait jamais les pistes des autres pages. GET /api/tracks accepte maintenant un paramètre optionnel q. Si il est là, le backend ajoute une condition sur le titre dans le $match du pipeline d'agrégation, avec une regex insensible aux majuscules. Et du coup total et pages sont calculés sur les résultats filtrés, donc le paginator reste juste. J'ai documenté le paramètre dans API_CONTRACT.md.

Côté sécurité j'ai fait attention à deux trucs. Le q doit être une chaîne (si quelqu'un envoie ?q=a&q=b ça fait un tableau, et on l'ignore) et il est coupé à 100 caractères. Et surtout les caractères spéciaux des regex sont échappés avant de construire la requête : sans ça, quelqu'un pourrait taper .* pour tout matcher, ou une regex volontairement très lente pour bloquer le serveur. J'ai testé : "song" et "SONG" donnent les mêmes 3 pistes, "coffee" en donne 1, ".*" en donne 0 parce qu'il est cherché tel quel, et "(" fait pas planter le serveur.

Côté front, y'a un champ "Rechercher par titre" au-dessus des cards. Pour pas envoyer une requête à chaque lettre tapée, j'utilise valueChanges avec debounceTime(300) : on attend 300 ms sans frappe avant de chercher, avec distinctUntilChanged pour pas relancer la même recherche, et takeUntilDestroyed pour arrêter d'écouter quand on quitte la page. À chaque nouvelle recherche on repart de la page 1. J'ai aussi fait en sorte que load() annule la requête précédente si elle est pas finie, sinon une vieille réponse lente pourrait arriver après la nouvelle et écraser les bons résultats. Et si rien correspond, ça affiche "Aucune piste ne correspond à « … »".

Sur la capture j'ai tapé "song" et on voit la requête tracks?page=1&limit=5&q=song partir vers le serveur.

![Filtre par titre envoyé au serveur](screenshots/tp2/recherche_son.PNG)
