# Fleet Management System

Fleet Management System je full-stack web aplikacija za upravljanje voznim parkom.

Sustav omogućuje zaposlenicima kreiranje zahtjeva za korištenje službenih vozila, praćenje vlastitih rezervacija i prijavu problema, dok administratorima omogućuje upravljanje vozilima, rezervacijama, korisničkim zahtjevima i prijavljenim problemima.

Aplikacija je izrađena korištenjem **Reacta i Vitea** na frontend strani te **Node.js, Express.js i MongoDB** tehnologija na backend strani.

---

## Glavne funkcionalnosti

Sustav razlikuje dvije korisničke uloge:

- **Administrator**
- **Zaposlenik**

Nakon prijave korisnik se automatski preusmjerava na sučelje koje odgovara njegovoj ulozi.

---

# Administrator

Administrator ima pristup funkcionalnostima za upravljanje cijelim voznim parkom.

### Upravljanje vozilima

Administrator može:

- pregledavati sva vozila
- dodavati nova vozila
- uređivati podatke o vozilima
- brisati vozila
- pratiti status vozila
- pratiti datum registracije vozila
- označiti vozilo kao dostupno ili zauzeto

### Upravljanje rezervacijama

Administrator može:

- pregledavati sve zahtjeve zaposlenika
- prihvatiti ili odbiti zahtjev
- dodijeliti konkretno vozilo zaposleniku
- pregledavati termin rezervacije
- vidjeti korisnika koji je kreirao zahtjev
- pregledavati prijavljene probleme vezane uz rezervaciju
- brisati rezervacije

### Bilješke

Administrator ima mogućnost:

- dodavanja bilješki
- pregleda postojećih bilješki
- evidencije dodatnih informacija važnih za upravljanje voznim parkom

### Kalendar

Administratorski kalendar prikazuje:

- rezervacije
- bilješke
- dane koji sadrže rezervaciju
- dane koji sadrže bilješku
- dane koji sadrže obje vrste zapisa

Dodatno se prikazuju:

- trenutno vrijeme
- statistika rezervacija i bilješki
- legenda događaja u kalendaru

---

# Zaposlenik

Zaposleničko sučelje prilagođeno je kreiranju i praćenju zahtjeva za korištenje službenih vozila.

### Početna stranica

Zaposlenik ima pregled osnovnih informacija i svojih aktivnosti u sustavu.

### Rezervacije

Zaposlenik može:

- pregledavati vlastite rezervacije
- pregledavati termin rezervacije
- vidjeti tip vozila
- vidjeti svrhu putovanja
- pratiti status zahtjeva
- vidjeti dodijeljeno vozilo
- otkazati rezervaciju prije početka rezerviranog termina

### Novi zahtjev

Zaposlenik može poslati novi zahtjev za rezervaciju unosom:

- početnog datuma
- završnog datuma
- svrhe korištenja vozila
- željenog tipa vozila

Zahtjev se nakon slanja prikazuje administratoru koji ga može prihvatiti ili odbiti.

### Prijava problema

Zaposlenik može prijaviti:

- kvar
- štetu
- poteškoću vezanu uz vozilo

Prijava problema povezuje se s odgovarajućom rezervacijom i dodijeljenim vozilom.

### Kalendar

Zaposlenički kalendar omogućuje pregled vlastitih rezervacija po datumima.

Dani koji imaju rezervaciju vizualno su označeni kako bi korisnik lakše pratio svoje termine.

---

# Korisnički profil

Administrator i zaposlenik imaju pristup vlastitom korisničkom profilu.

Profil omogućuje:

- prikaz imena
- prikaz e-mail adrese
- promjenu lozinke
- postavljanje profilne slike
- pregled korisničkih postavki
- brisanje korisničkog profila
- odjavu

Podaci aktivne prijave spremaju se po korisničkoj sesiji kako bi administratorska i zaposlenička prijava bile međusobno odvojene.

---

# Light / Dark mode

Aplikacija podržava:

- **Light mode**
- **Dark mode**

Korisnik može promijeniti temu pomoću ikone u zaglavlju aplikacije.

Administratorsko i zaposleničko sučelje imaju prilagođen izgled za obje teme.

---

# Autentikacija i autorizacija

Za autentikaciju korisnika koristi se **JSON Web Token (JWT)**.

Sustav koristi zaštićene rute kako bi spriječio pristup stranicama korisnicima koji nisu prijavljeni.

Pristup administratorskim i zaposleničkim stranicama dodatno se kontrolira prema korisničkoj ulozi.

Lozinke korisnika pohranjuju se u hashiranom obliku pomoću biblioteke **bcryptjs**.

---

# Tehnologije

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token
- bcryptjs
- dotenv
- cors
- nodemon

## Frontend

- React
- Vite
- React Router
- Axios
- Font Awesome
- CSS

---

# Struktura projekta

```text
Projekt_Exspress/
│
├── server.js
├── auth.js
├── admin.js
├── employee.js
│
├── User.js
├── Vehicle.js
├── Reservation.js
├── Issue.js
├── Note.js
│
├── package.json
├── package-lock.json
├── .gitignore
│
└── fleet-management-frontend/
    │
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    │
    ├── public/
    │
    └── src/
        │
        ├── components/
        │   ├── AuthPage.jsx
        │   ├── Navbar.jsx
        │   └── PrivateRoute.jsx
        │
        ├── pages/
        │   ├── AdminDashBoard.jsx
        │   ├── AdminDashBoard.css
        │   ├── EmployeeDashboard.jsx
        │   ├── EmployeeDashboard.css
        │   ├── ProfilePopup.jsx
        │   ├── Login.jsx
        │   ├── Login.css
        │   ├── Register.jsx
        │   └── Register.css
        │
        ├── services/
        │   └── api.js
        │
        ├── App.jsx
        ├── App.css
        ├── main.jsx
        └── index.css
```

`node_modules` direktoriji nisu spremljeni u Git repozitorij. Potrebne ovisnosti instaliraju se pomoću naredbe `npm install`.

---

# Instalacija i pokretanje

## 1. Kloniranje repozitorija

```bash
git clone https://github.com/antonela-kovic/Projekt_Exspress.git
cd Projekt_Exspress
```

---

## 2. MongoDB

Projekt koristi MongoDB bazu podataka.

Za lokalni razvoj potrebno je imati instaliran i pokrenut **MongoDB Community Server**.

Zadani MongoDB port je:

```text
27017
```

Primjer lokalne baze:

```text
mongodb://localhost:27017/fleet_management
```

Na Windowsu se status MongoDB servisa može provjeriti u PowerShellu:

```powershell
Get-Service MongoDB
```

Ako servis nije pokrenut:

```powershell
Start-Service MongoDB
```

---

## 3. Backend konfiguracija

U glavnom direktoriju projekta potrebno je napraviti `.env` datoteku.

Primjer:

```env
MONGO_URI=mongodb://localhost:27017/fleet_management
JWT_SECRET=vas_tajni_jwt_kljuc
```

> `.env` datoteka s pravim pristupnim podacima i tajnim ključevima ne smije se spremati na GitHub.

---

## 4. Instalacija backend paketa

U glavnom direktoriju projekta:

```bash
npm install
```

---

## 5. Pokretanje backenda

```bash
npm run start
```

Backend se pokreće na:

```text
http://localhost:5000
```

Ako je MongoDB pravilno pokrenut, backend će se povezati s bazom podataka.

---

# Pokretanje frontenda

Otvorite novi terminal i prijeđite u frontend direktorij:

```bash
cd fleet-management-frontend
```

Instalirajte frontend pakete:

```bash
npm install
```

Pokrenite Vite razvojni server:

```bash
npm run dev
```

Frontend je zatim dostupan na:

```text
http://localhost:5173
```

---

# Pokretanje cijele aplikacije

Za lokalni rad potrebno je imati pokrenuta tri dijela sustava:

```text
MongoDB
   ↓
Backend / Express
http://localhost:5000
   ↓
Frontend / React + Vite
http://localhost:5173
```

Backend terminal i frontend terminal moraju ostati pokrenuti tijekom korištenja aplikacije.

---

# Primjer tijeka korištenja

### Zaposlenik

1. Registrira se ili prijavi.
2. Otvara stranicu **Novi zahtjev**.
3. Unosi željeni termin, svrhu i tip vozila.
4. Zahtjev dobiva status čekanja.
5. Administrator pregledava zahtjev.
6. Nakon odobrenja administrator dodjeljuje vozilo.
7. Zaposlenik vidi dodijeljeno vozilo u svojim rezervacijama.
8. Ako postoji kvar ili šteta, zaposlenik može poslati prijavu problema.

### Administrator

1. Prijavljuje se kao administrator.
2. Pregledava nove rezervacijske zahtjeve.
3. Prihvaća ili odbija zahtjev.
4. Dodjeljuje dostupno vozilo.
5. Upravlja voznim parkom.
6. Pregledava prijavljene probleme.
7. Koristi kalendar za pregled rezervacija i bilješki.

---

# Sigurnost

Projekt koristi nekoliko osnovnih sigurnosnih mehanizama:

- hashiranje lozinki pomoću `bcryptjs`
- JWT autentikaciju
- zaštićene frontend rute
- odvajanje administratorskih i zaposleničkih ovlasti
- varijable okoline za osjetljive podatke
- `.gitignore` za izbjegavanje objave `.env` i `node_modules` datoteka

---

# Buduća poboljšanja

Projekt se može dodatno proširiti funkcionalnostima kao što su:

- napredni filteri rezervacija po vozilu
- automatski podsjetnici za registraciju i tehnički pregled
- e-mail obavijesti
- detaljnija evidencija servisa vozila
- napredna statistika korištenja vozila
- izvještaji o troškovima
- povijest izmjena vozila
- deployment aplikacije na cloud platformu

---

# Autor

Projekt izrađen kao završni projekt za razvoj full-stack web aplikacije za upravljanje voznim parkom.
