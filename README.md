TaskPlanet Social Feature (React + Express + MongoDB)

Project structure
- client: React frontend
- server: Node.js + Express backend

Backend setup
1. Go to server folder.
2. Copy .env.example to .env and update values.
3. Install dependencies: npm install
4. Run backend: npm run dev

Frontend setup
1. Go to client folder.
2. Copy .env.example to .env (optional if using default API URL).
3. Install dependencies: npm install
4. Run frontend: npm run dev

What is implemented
- Signup and login with email/password
- User storage in MongoDB (users collection)
- Post creation with text, image, or both (posts collection)
- Public feed with username, content, likes count, comments count
- Like/unlike and comment support
- Usernames stored for likes and comments
- Instant UI updates after like/comment/create post

Collections used
- users
- posts
