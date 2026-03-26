const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function formatPost(postDoc) {
  return {
    id: postDoc._id.toString(),
    userId: postDoc.author?._id?.toString?.() || postDoc.author?.toString?.() || '',
    username: postDoc.author?.username || 'Unknown User',
    text: postDoc.text || '',
    image: postDoc.image || '',
    likes: postDoc.likes,
    comments: postDoc.comments,
    likesCount: postDoc.likes.length,
    commentsCount: postDoc.comments.length,
    likedBy: postDoc.likes.map((item) => item.username),
    commentedBy: postDoc.comments.map((item) => item.username),
    createdAt: postDoc.createdAt,
    updatedAt: postDoc.updatedAt,
  };
}

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    return res.json(posts.map(formatPost));
  } catch (error) {
    return res.status(500).json({ message: 'Could not load posts.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { text = '', image = '' } = req.body;

    if (!text.trim() && !image.trim()) {
      return res.status(400).json({ message: 'Add text, image, or both to create a post.' });
    }

    const post = await Post.create({
      author: new mongoose.Types.ObjectId(req.user.id),
      text: text.trim(),
      image: image.trim(),
    });

    const populatedPost = await post.populate('author', 'username');

    return res.status(201).json(formatPost(populatedPost));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create post.' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const existingLikeIndex = post.likes.findIndex(
      (item) => item.userId.toString() === req.user.id,
    );

    if (existingLikeIndex >= 0) {
      post.likes.splice(existingLikeIndex, 1);
    } else {
      post.likes.push({ userId: req.user.id, username: req.user.username });
    }

    await post.save();

    return res.json(formatPost(post));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update like.' });
  }
});

router.post('/:id/comment', requireAuth, async (req, res) => {
  try {
    const { text = '' } = req.body;

    if (!text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const post = await Post.findById(req.params.id).populate('author', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    post.comments.push({
      userId: req.user.id,
      username: req.user.username,
      text: text.trim(),
      createdAt: new Date(),
    });

    await post.save();

    return res.json(formatPost(post));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add comment.' });
  }
});

module.exports = router;
