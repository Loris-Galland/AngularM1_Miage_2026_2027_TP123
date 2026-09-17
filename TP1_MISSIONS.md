# TP1 — Mes missions

## Mission 0 — Comprendre comment le projet est fait

Alors le but ici c'était de pas toucher au code, juste comprendre comment tout est organisé côté frontend.

Le composant racine

En gros c'est AppComponent, il est dans app.ts, et c'est lui qui démarre tout dans main.ts avec bootstrapApplication. Son template a juste un header avec le nom du site et la nav, et surtout un router-outlet, c'est ça qui affiche la page sur laquelle on est (login, profil, tracks etc).

Les routes

Elles sont dans routes.ts et enregistrées dans main.ts. Y'a login et register qui sont accessibles direct, et profile et tracks qui sont protégées par un guard (authGuard). Si je vais sur /profile sans être connecté, le guard me bloque direct et me renvoie ailleurs.

HttpClient

Toujours dans main.ts, provideHttpClient avec un intercepteur branché dessus (authInterceptor). Y'a rien d'autre configuré niveau HTTP pour l'instant.

Les modèles, services et pages

Les modèles c'est juste des interfaces TS qui décrivent ce que l'API renvoie (user, track, etc), ça colle avec ce qui est écrit dans API_CONTRACT.md.

Y'a deux services, AuthService qui gère tout le login/register/profil/déconnexion, avec deux signals dedans (currentUser et token). Et TrackService pour la partie tracks que j'ai pas encore regardé en détail.

Les pages c'est login, register, profile et tracks, chacune avec son ts, son html et son css.

Ce que j'ai capté surtout c'est que les composants appellent jamais HttpClient directement, ça passe toujours par le service.

Le mécanisme JWT

C'est authInterceptor. Il regarde le signal token() dans AuthService, et si y'a un token il l'ajoute dans le header Authorization de la requête. Ça s'applique à toutes les requêtes qui sortent, pas juste celles qui en ont besoin, mais bon le backend s'en fiche sur les routes publiques donc ça pose pas de souci.

Le token il est stocké à deux endroits en même temps, dans le localStorage (pour survivre à un refresh) et dans le signal (pour que l'appli réagisse tout de suite).

Routes publiques vs protégées

En comparant avec API_CONTRACT.md, les routes publiques c'est health, auth/register et auth/login. Tout le reste (users/me et tracks) demande le JWT. Et ça matche avec ce que le guard protège côté front.

Deux trucs que j'ai remarqué en explorant et qui vont être utiles pour la mission 1: y'a aucune gestion du 401 nulle part, donc si le token expire rien redirige vers login automatiquement, faudra sûrement ajouter un intercepteur pour ça. Et sur la page profil, le profil se charge pas tout seul, faut cliquer sur un bouton exprès, à voir si c'est fait exprès ou si c'est à corriger.

## Mission 1 — Inscription, connexion et profil

(à compléter au fur et à mesure)
