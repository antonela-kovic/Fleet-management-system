
# Fleet Management Backend

Ovaj projekt predstavlja backend aplikaciju za upravljanje voznim parkom (fleet management) implementiranu u Express.js. Sustav omogućuje administraciju korisnika, vozila, rezervacija te prijava problema. Backend koristi MongoDB za pohranu podataka, a autentikacija i autorizacija provedeni su putem JSON Web Tokena.

---

##  Ključne funkcionalnosti

Upravljanje korisnicima i autentikacija  
Rad s vozilima (dodavanje, uređivanje, brisanje)  
Upravljanje rezervacijama vozila  
Evidencija problema s vozilima (issue tracker)  
JWT autentikacija za zaštićene rute  

---

## Struktura projekta

```

Projekt/
├── server.js              # Ulazna točka aplikacije
├── .env                   # Varijable okoline
├── User.js                # Model korisnika
├── Vehicle.js             # Model vozila
├── Reservation.js         # Model rezervacija
├── Issue.js               # Model prijava problema
├── auth.js                # Middleware za autentikaciju
├── admin.js               # Middleware za administraciju
├── employee.js            # Middleware za zaposlenike
├── package.json           # Ovisnosti i konfiguracije
├── node\_modules/          # Node moduli
└── fleet-management-frontend/ # Frontend aplikacija (ako postoji)

````

---

## Instalacija i pokretanje

1. Klonirajte repozitorij:  
```bash
git clone <URL-repozitorija>
cd <ime-repozitorija>/Projekt
````

2. Instalirajte potrebne pakete:

```bash
npm install
```

3. Konfigurirajte varijable okoline (.env):

```
MONGO_URI=<vaša-mongo-uri>
JWT_SECRET=<tajni-kljuc>
```

4. Pokrenite razvojni server:

```bash
npm run start
```

---

## Tehnologije

* **Express.js** – Node.js web framework
* **Mongoose** – ODM za MongoDB
* **bcryptjs** – Hashiranje lozinki
* **jsonwebtoken** – Upravljanje autentikacijom
* **dotenv** – Varijable okoline
* **nodemon** – Automatsko pokretanje servera za razvoj

---

## Deployment smjernice

* Postavite MongoDB URI i JWT tajni ključ u `.env` datoteku.
* Na serveru pokrenite:

```bash
npm install
npm run start
```

---

