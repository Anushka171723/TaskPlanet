import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'taskplanet_social_token';
const USER_KEY = 'taskplanet_social_user';

function getSavedUser() {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

async function apiRequest(path, method = 'GET', body, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => getSavedUser());
  const [feed, setFeed] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState('');

  const [authMode, setAuthMode] = useState('signup');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [postForm, setPostForm] = useState({ text: '', image: '' });
  const [postError, setPostError] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState({});
  const [actionError, setActionError] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const isLoggedIn = useMemo(() => Boolean(token && user), [token, user]);

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!profileMenuRef.current || profileMenuRef.current.contains(event.target)) {
        return;
      }

      setIsProfileMenuOpen(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  async function loadFeed() {
    try {
      setIsLoadingFeed(true);
      setFeedError('');
      const posts = await apiRequest('/posts');
      setFeed(posts);
    } catch (error) {
      setFeedError(error.message);
    } finally {
      setIsLoadingFeed(false);
    }
  }

  function updateOnePost(updatedPost) {
    setFeed((currentFeed) =>
      currentFeed.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
    );
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';

      const payload =
        authMode === 'signup'
          ? {
              username: authForm.username,
              email: authForm.email,
              password: authForm.password,
            }
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const result = await apiRequest(endpoint, 'POST', payload);

      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setAuthForm({ username: '', email: '', password: '' });
      await loadFeed();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setUser(null);
    setIsProfileMenuOpen(false);
  }

  function handleProfileMenuAction(menuLabel) {
    void menuLabel;
    setIsProfileMenuOpen(false);
  }

  async function handleImageUpload(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const fileDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(selectedFile);
    });

    setPostForm((current) => ({ ...current, image: fileDataUrl }));
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    setPostError('');

    if (!postForm.text.trim() && !postForm.image.trim()) {
      setPostError('Write text, add an image, or both.');
      return;
    }

    try {
      setIsPosting(true);
      const newPost = await apiRequest('/posts', 'POST', postForm, token);
      setFeed((currentFeed) => [newPost, ...currentFeed]);
      setPostForm({ text: '', image: '' });
    } catch (error) {
      setPostError(error.message);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleLike(postId) {
    setActionError('');

    try {
      const updatedPost = await apiRequest(`/posts/${postId}/like`, 'POST', null, token);
      updateOnePost(updatedPost);
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function handleComment(postId) {
    const commentText = commentDrafts[postId] || '';

    if (!commentText.trim()) {
      return;
    }

    setActionError('');

    try {
      const updatedPost = await apiRequest(
        `/posts/${postId}/comment`,
        'POST',
        { text: commentText },
        token,
      );

      updateOnePost(updatedPost);
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <main className="app-shell">
      <section className="phone-frame">
        {isLoggedIn && (
          <>
            <header className="social-header">
              <div>
                <h1>Social</h1>
                <p>TaskPlanet Community</p>
              </div>
              <div className="header-right">
                <span className="pill coin-pill">50</span>
                <span className="pill wallet-pill">₹0.00</span>
                <button type="button" className="icon-circle" title="Notifications">
                  🔔
                </button>
                <div className="avatar-menu-wrap" ref={profileMenuRef}>
                  <button
                    type="button"
                    className="avatar-button"
                    title="Open profile menu"
                    onClick={() => setIsProfileMenuOpen((current) => !current)}
                  >
                    <div className="avatar">{user.username.slice(0, 1).toUpperCase()}</div>
                  </button>
                  {isProfileMenuOpen && (
                    <div className="profile-menu" role="menu">
                      <button
                        type="button"
                        className="profile-menu-item profile-heading"
                        onClick={() => handleProfileMenuAction('My Profile')}
                      >
                        <span>My Profile</span>
                        <span className="menu-badges">
                          <span className="badge">Get 800</span>
                          <span className="badge">Free</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('Activate Premium')}
                      >
                        Activate Premium
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('Activate Premium Plus')}
                      >
                        Activate Premium Plus
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('Help and Support')}
                      >
                        Help and Support
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('Chat with Us')}
                      >
                        Chat with Us
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('Feedback')}
                      >
                        Feedback
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('FAQ')}
                      >
                        FAQ
                      </button>
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuAction('About')}
                      >
                        About
                      </button>
                      <button type="button" className="profile-menu-item menu-button" onClick={handleLogout}>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <section className="search-row">
              <input type="text" placeholder="Search promotions, users" readOnly />
              <button type="button" className="icon-circle search-btn" title="Search">
                🔎
              </button>
              <button type="button" className="icon-circle" title="Theme">
                ☾
              </button>
            </section>
          </>
        )}

        {!isLoggedIn ? (
          <section className="card auth-card">
            <h2>{authMode === 'signup' ? 'Create Account' : 'Login'}</h2>
            <form onSubmit={handleAuthSubmit} className="stack" autoComplete="off">
              {authMode === 'signup' && (
                <input
                  value={authForm.username}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="Username"
                  autoComplete="new-password"
                  required
                />
              )}
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Email"
                autoComplete={authMode === 'signup' ? 'off' : 'email'}
                required
              />
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Password"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              <button type="submit" disabled={isAuthLoading}>
                {isAuthLoading ? 'Please wait...' : authMode === 'signup' ? 'Signup and Continue' : 'Login'}
              </button>
            </form>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setAuthMode((current) => (current === 'signup' ? 'login' : 'signup'));
                setAuthForm({ username: '', email: '', password: '' });
                setAuthError('');
              }}
            >
              {authMode === 'signup' ? 'Already have an account? Login' : 'New user? Signup'}
            </button>
            {authError && <p className="error-text">{authError}</p>}
          </section>
        ) : (
          <section className="card composer-card">
            <div className="composer-head">
              <h2>Create Post</h2>
              <div className="mini-tabs">
                <span className="mini-tab active">All Posts</span>
                <span className="mini-tab">Promotions</span>
              </div>
            </div>
            <form onSubmit={handleCreatePost} className="stack">
              <textarea
                placeholder="What's on your mind?"
                value={postForm.text}
                onChange={(event) =>
                  setPostForm((current) => ({ ...current, text: event.target.value }))
                }
                rows={4}
              />
              <div className="composer-actions">
                <label className="file-label">
                  📷
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </label>
                <button type="submit" disabled={isPosting}>
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
              {postForm.image && <img src={postForm.image} alt="Selected upload" className="preview-image" />}
            </form>
            {postError && <p className="error-text">{postError}</p>}
          </section>
        )}

        {actionError && <p className="error-text feed-error">{actionError}</p>}

        {isLoggedIn && (
          <>
            <section className="feed-chip-row">
              <button type="button" className="feed-chip active">
                All Post
              </button>
              <button type="button" className="feed-chip">
                For You
              </button>
              <button type="button" className="feed-chip">
                Most Liked
              </button>
              <button type="button" className="feed-chip" onClick={loadFeed}>
                Refresh
              </button>
            </section>

            {isLoadingFeed && <p className="hint-text">Loading feed...</p>}
            {feedError && <p className="error-text">{feedError}</p>}

            <section className="feed-list">
              {feed.map((post) => {
                const hasLiked = post.likes.some((like) => like.userId === user?.id);

                return (
                  <article key={post.id} className="card post-card">
                    <header className="post-head">
                      <div>
                        <h3>
                          {post.username} <span className="username-tag">@{post.username.toLowerCase()}</span>
                        </h3>
                        <p>{new Date(post.createdAt).toLocaleString()}</p>
                      </div>
                      <button type="button" className="follow-btn">
                        Follow
                      </button>
                    </header>

                    {post.text && <p className="post-text">{post.text}</p>}
                    {post.image && <img src={post.image} alt="Post visual" className="post-image" />}

                    <div className="meta-row">
                      <span>👍 {post.likesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                      <span>Liked by: {post.likedBy.length ? post.likedBy.join(', ') : 'No likes yet'}</span>
                    </div>

                    <div className="post-actions">
                      <button type="button" onClick={() => handleLike(post.id)}>
                        {hasLiked ? 'Unlike' : 'Like'}
                      </button>
                    </div>

                    <form
                      className="comment-box"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleComment(post.id);
                      }}
                    >
                      <input
                        placeholder="Write a comment"
                        value={commentDrafts[post.id] || ''}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                        }
                      />
                      <button type="submit">Comment</button>
                    </form>

                    <ul className="comment-list">
                      {post.comments.map((comment) => (
                        <li key={comment._id}>
                          <strong>{comment.username}</strong>: {comment.text}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}

              {!isLoadingFeed && !feed.length && <p className="hint-text">No posts yet. Be the first to share.</p>}
            </section>
          </>
        )}

        {isLoggedIn && (
          <button type="button" className="floating-add" title="Create Post">
            +
          </button>
        )}

        {isLoggedIn && (
          <nav className="bottom-nav">
            <span>Home</span>
            <span>Tasks</span>
            <span className="active">Social</span>
            <span>Rewards</span>
            <button type="button" className="logout-link" onClick={handleLogout}>
              Sign out
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

export default App;
