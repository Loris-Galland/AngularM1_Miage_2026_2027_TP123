# Contrat HTTP - TP1

Base : `/api`. Sauf inscription et connexion, envoyer `Authorization: Bearer <token>`.

Le contrat HTTP ne dépend pas du choix de persistance : le backend fourni utilise Mongoose et MongoDB. MongoDB conserve les utilisateurs et métadonnées ; les octets des fichiers audio restent sur le disque du serveur.

| Méthode | Route | Requête | Réponse principale |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/auth/register` | `{name,email,password}` | `201 {token,user}` |
| POST | `/auth/login` | `{email,password}` | `200 {token,user}` |
| GET | `/users/me` | JWT | `200 User` |
| PUT | `/users/me` | `{name}` + JWT | `200 User` |
| GET | `/tracks?page=1&limit=5` | JWT | `Page<Track>` |
| POST | `/tracks` | multipart : `audio`, `title` | `201 Track` |
| GET | `/tracks/:id/audio` | JWT | flux audio |
| DELETE | `/tracks/:id` | JWT | `204` (bonus) |

`GET /tracks` : paramètres de requête `page` (entier ≥ 1, défaut 1) et `limit` (entier entre 1 et 20, défaut 5), JWT obligatoire, seules les pistes de l'utilisateur connecté sont renvoyées, triées de la plus récente à la plus ancienne. Erreurs : `401` sans JWT valide.

`Page<Track>` (pagination faite avec le plugin `mongoose-aggregate-paginate-v2`) contient :

```json
{
  "items": [Track],
  "total": 6,
  "limit": 5,
  "page": 2,
  "pages": 2,
  "pagingCounter": 6,
  "hasPrevPage": true,
  "hasNextPage": false,
  "prevPage": 1,
  "nextPage": null
}
```

`pages` vaut au moins 1 même sans piste, `pagingCounter` est le numéro de la première piste de la page, et `prevPage` / `nextPage` valent `null` aux bornes. Formats acceptés : MP3, WAV, OGG et M4A, 25 Mo maximum.

Erreurs courantes : `400` validation, `401` authentification, `404` ressource, `409` email déjà utilisé.
