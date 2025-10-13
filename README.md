# StudyTrack

A web app to track study resources, mark progress, and take notes.

## 🛠️ Tech Stack
- Node.js
- Express
- EJS
- TailwindCSS
- PostgreSQL
- Passport.js (authentication)

## Setup Instructions (Local)
1. **Clone the repository** 

   ```bash
   git clone https://github.com/Guimeida/Project-.git
   cd Project- 

2. **Install dependencies**  

   npm install

3. **Set up environment variables**  
   Create a .env file in the project root with:
   SESSION_SECRET=your_secret_key
   # For local Postgres, either provide separate values:
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=permalist
   DB_PASSWORD=your_database_password
   DB_PORT=5432

   # Or set DATABASE_URL if you prefer (works the same locally):
   # DATABASE_URL=postgres://postgres:password@localhost:5432/permalist

4. **Create database & tables**
   Create the permalist database and run the SQL schema (see db/schema.sql or run the SQL commands in your DB client). createdb permalist
   psql -d permalist -f db/schema.sql
   (See db/schema.sql in the repo for the exact table definitions.)

5. **Start the app**  ~
   npm start
   By default the app runs at http://localhost:3000. (If you deploy to Render, the app will use the platform's PORT environment variable.)

## Features
- Register/login users
- Add, edit, delete resources
- Assign tags & filter by tags
- Track progress (Not Started / In Progress / Completed)
- Add notes for each resource


