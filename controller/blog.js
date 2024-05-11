const express = require('express')
const passport = require('passport')
const ArticleModel = require('../models/Article')
const UserModel = require('../models/User')
const wordCount = require('../middleware/wordCount')
const router = express.Router()

router.post('/new', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const article = await ArticleModel.create({
            title: req.body.title,
            description: req.body.description,
            author: req.user._id,
            state: req.body.state,
            reading_time: wordCount(req.body.body),
            tags: req.body.tags,
            body: req.body.body
        })
        res.status(200).json({
            message: 'Blog Created Successfully',
            blog: article
        })
    } catch (error) {
        console.log(error.message)
    }
})

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20
    const sortCount = parseInt(req.query.read_count) || -1
    const skip = (page - 1) * limit;
    try {
        const articles = await ArticleModel.find({ state: 'published' }).sort({ read_count: sortCount, timestamp: -1, reading_time: -1 }).skip(skip).limit(limit).exec()
        res.status(200).json(articles)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.get('/user', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit;
    const state = req.query.state || ['published', 'draft']
    const articles = await ArticleModel.find({ author: req.user._id, state: state }).sort({ read_count: -1 }).skip(skip).limit(limit).exec()

    res.status(200).json(articles)
})

router.get('/:id', async (req, res) => {
    const article = await ArticleModel.findOne({ _id: req.params.id, state: 'published' });

    await ArticleModel.updateOne({ _id: article._id }, { $inc: { read_count: 1 } }, { new: true })

    const user = await UserModel.findById(article.author)
    if (!article) {
        res.status(400).json({ message: 'Published article not found' })
    }
    res.status(200).json({
        article,
        author: {
            id: article.author,
            name: `${user.firstname} ${user.surname}`,
            email: user.email
        }
    })
})

router.put('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const article = await ArticleModel.updateOne({ _id: req.params.id, author: req.user._id }, req.body, { new: true })
    if (!article) {
        res.status(400).json({
            message: 'Unauthorized Access to Article'
        })
    }
    res.status(200).json({
        message: `Article with the id ${req.params.id} Updated Successfully`,
        article
    })
})

router.delete('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const article = await ArticleModel.deleteOne({ author: req.user._id, _id: req.params.id })
    res.status(200).json({
        message: `Article with the id ${req.params.id} Deleted Successfully`,
    })
})


module.exports = router