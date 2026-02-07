# Magazyn App

Lekka aplikacja magazynowa (frontend React + backend Express + Prisma). README zawiera instrukcje uruchomienia, budowania i publikacji projektu.

## Zawartość repozytorium
- `client/` — aplikacja React (frontend)
- `server/` — serwer Express, Prisma i skrypty serwera
- `server/prisma/` — schemat i migracje bazy danych

## Wymagania
- Node.js 18+ (zalecane LTS)
- npm 8+ lub yarn
- PostgreSQL (jeśli chcesz uruchomić serwer lokalnie z bazą)

## Zmienne środowiskowe
Utwórz plik `.env` w katalogu `server/` na bazie `server/.env.example` i — opcjonalnie — `.env` w katalogu głównym. Przykładowe klucze:

- `DATABASE_URL` — URL do Postgres (np. `postgresql://user:pass@localhost:5432/magazyn`)
# Magazyn App

Aplikacja do zarządzania magazynami: produkty, stany, transfery i importy. Projekt w wersji developerskiej.

⚠️ Projekt w wersji developerskiej

## Demo

- Brak publicznego demo — uruchom lokalnie (instrukcja w sekcji „Uruchomienie lokalne”).

## Screenshots

![Logowanie i rejestracja](client/public/screenshots/logowanie.png)

![Akcja pobierz](client/public/screenshots/pobieranie.png)

![Akcja przenieś](client/public/screenshots/przenoszenie.png)

![Widok magazynów](client/public/screenshots/widok_magazynów.png)

![Widok typów produktów](client/public/screenshots/widok_typów.png)

![Szczegóły produktu](client/public/screenshots/szczegóły_produktu.png)

![Edycja lub dodawanie produktu](client/public/screenshots/edycja.png)

![Import z pliku](client/public/screenshots/import_z_pliku.png)

![Tryb responsywny - widok](client/public/screenshots/ekrany_mobilne.png)

![Tryb responsywny - menu](client/public/screenshots/ekrany_mobilne_menu.png)


## Tech Stack

- Frontend: React (Create React App), MUI, Tailwind CSS
- Backend: Node.js, Express
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT
- File uploads: Multer (z obsługą miniatur przez sharp)

Oddzielony frontend (w `client/`) i backend (w `server/`), API REST, baza zarządzana przez Prisma.

## Funkcjonalności

- Rejestracja i logowanie użytkowników
- CRUD produktów (z obsługą obrazów)
- Zarządzanie magazynami i przesunięciami stanów (transfery)
- Import arkuszy Excel / CSV z tworzeniem magazynów i produktów
- Historia zmian stanu produktów
- Uprawnienia podstawowe (rola użytkownika)

## Architektura

- Oddzielny frontend i backend: `client/` (UI) i `server/` (API + logika) są oddzielone.
- Baza: Prisma + PostgreSQL — migracje i modele w `server/prisma`.
- Centralny klient API w `client/src/services/api.js` — ułatwia testy i zmianę endpointów.
- UI: komponenty z prostym eventowaniem (np. `products-updated`) by unikać przestarzałych widoków.

## Uruchomienie lokalne (developerskie)

Wymagania:
- Node.js (polecane LTS)
- PostgreSQL dostępny i skonfigurowany

1. Sklonuj repozytorium

```bash
git clone https://github.com/OWNER/REPO.git
cd REPO
```

2. Skonfiguruj plik `.env` (możesz skopiować `.env.example`)

Przykładowe zmienne (zawarte też w `.env.example`):

```
DATABASE_URL=postgresql://user:password@localhost:5432/magazyn_dev
JWT_SECRET=changeme
PORT=5000
REACT_APP_API_URL=http://localhost:5000/api
```

3. Instalacja zależności

```bash
# Serwer
cd server
npm install

# Klient
cd ../client
npm install
```

4. Migracje bazy (lokalnie)

W katalogu `server` uruchom (jeśli to pierwsze uruchomienie):

```bash
cd server
npx prisma migrate dev --name init
```

5. Uruchomienie w trybie developerskim

W dwóch terminalach uruchom serwer i klienta:

```bash
# terminal 1 (serwer)
cd server
npm run dev

# terminal 2 (klient)
cd client
npm start
```

6. Build produkcyjny frontendu

```bash
cd client
npm run build
```

Serwer statycznie serwuje `client/build` jeśli istnieje.

Jeśli coś nie działa:
- Sprawdź `DATABASE_URL` i czy baza jest dostępna.
- Zajrzyj do `server/logs` (jeśli istnieje) lub konsoli serwera.

## Status projektu

🚧 Projekt w wersji developerskiej — planowane:
- Testy jednostkowe i integracyjne (Jest + Supertest)
-- Docker + docker-compose dla prostego lokalnego środowiska
-- Audyt zależności i aktualizacje security


