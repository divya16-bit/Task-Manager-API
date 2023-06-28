const express = require('express')
const router = new express.Router()
const Task = require('../models/task')
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')



router.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    owner: req.user._id
  })
    try{
      await task.save()
      res.status(201).send()
    } catch(e) {
      console.log(e)
        res.status(400).send(e)
    }
 })

 router.get('/tasks', auth , async (req,res) => {
  const [query,completed,limit,skip,sort] = [req.query,{},{},{},{}]
    if(query.completed) {
        completed.completed = query.completed === 'true'? true : query.completed === 'false'? false : null
    }
    if(query.limit && parseInt(query.limit)) {
        limit.limit = parseInt(query.limit)
    }
    if(query.skip && parseInt(query.skip)) {
        skip.skip = parseInt(query.skip)
    }
    if(query.sortBy) {
        const [sortedBy,sortOrder] = query.sortBy.split(':')
        sort[sortedBy] = sortOrder == 'desc'? -1 : sortOrder == 'asc'? 1 : 0
    }
    try {
        const tasks = await Task.find({owner: req.user._id, ...completed},null,{sort:sort, ...limit,...skip})
 
        res.send(tasks)
    }
    catch(e) {
      res.status(500).send(e)
    }
 })

router.get('/tasks/:id', auth , async (req,res) => {
    const _id = req.params.id
    try{
    const task = await Task.findOne({ _id , owner: req.user._id})
     if(!task){
        return res.status(404).send()
     }
     res.send(task)
    } catch(e) {
      console.log(e)
    res.status(500).send(e)
    
    }
})

router.patch('/tasks/:id', auth, async (req, res) => {
    const updates =Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update) =>  allowedUpdates.includes(update))
    if(!isValidOperation){
        return res.status(400).send({error: 'invalid updates'})
    }
    
    try{
      const task = await Task.findOne({ _id: req.params.id , owner: req.user._id})
        if(!task){
            return res.status(404).send()
        }
        updates.forEach((update) => task[update] = req.body[update])
        await task.save()
        res.send()
    } catch(e){
        res.status(400).send(e)
    }
})

router.delete('/tasks/:id', auth, async(req, res) => {
    try{
     const task = await Task.findOneAndDelete({_id : req.params.id , owner: req.user._id})
     if(!task){
        return res.status(404).send()
     }
     res.send()
    } catch(e){
      res.status(500).send(e)
    }
})


const upload = multer({
  limits: {
      fileSize: 1000000
  },
  fileFilter(req, file, cb) {
      if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
        return cb(new Error('Please upload jpg, jpeg, png'))
      }
      cb(undefined, true)
  }

})

router.post('/tasks/:id/taskImage', auth , upload.single('taskImage') , async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id , owner: req.user._id})
  const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250}).png().toBuffer()
  task.taskImage = buffer
  await task.save()
  res.send()
 }, (error, req, res, next) => {
     res.status(400).send({error: error.message}  )
 })

 router.get('/tasks/:id/taskImage', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    if(!task || !task.taskImage){
      throw new Error()
    }
    res.set('Content-Type','image/png')
    res.send(task.taskImage)
  } catch(e) {
    res.status(404).send(e)
  }
})

router.delete('/tasks/:id/taskImage', auth , async (req, res) => {
  const task = await Task.findById(req.params.id)
  task.taskImage = undefined
  await task.save()
  res.send()
}) 


module.exports = router