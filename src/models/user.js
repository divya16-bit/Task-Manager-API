const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')


const userSchema = new mongoose.Schema({
   name: {
      type: String,
      required: true,
      trim : true
   },
   email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      validate(value) {
          if(!validator.isEmail(value)){
              throw new Error('Email is unvalid.')
          }
      }
   },
   age: {
      type: Number,
      default: 0,
      validate(value) {
         if(value < 0){
          throw new Error('Age must be a positive number')
         }
      }
   },
   password: {
      type: String,
      required: true,
      minlength: 7,
      trim: true,
      validate(value){
          if(value.toLowerCase().includes("password")){
              throw new Error('you can not set "password" as password!')
          }
      }

   },
   tokens: [{
       token: {
         type: String,
         required: true
    }
   }],
   avatar: {
     type: Buffer
   }
}, {
    timestamps: true
}) 

userSchema.virtual('Tasks', {
  ref: 'Tasks',
  localField: '_id',
  foreignField: 'owner'
})

// you added this below line because 'Task' was not accessible earlier
//const task = mongoose.model('Task',userSchema)


userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET)
    user.tokens = user.tokens.concat({ token })
    await user.save()
    return token
}
userSchema.methods.toJSON = function () {
  const user = this
  const userObject = user.toObject()
  delete userObject.password
  delete userObject.tokens
  delete userObject.avatar
  return userObject
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email })
    if(!user){
      throw new Error('Unable to login!')
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if(!isMatch){
      throw new Error('Unable to login!')
    }
    return user
}




///hash the plaintext password
userSchema.pre('save', async function (next) {
    const user = this
    if(user.isModified('password')) {
      user.password = await bcrypt.hash(user.password, 8)
    }
    next()
})


//Delete user task when user is removed
userSchema.pre('deleteOne', { document: true }, async function(next) {
  const user = this
  const Task = require('./task')
  await Task.deleteMany({ owner: user._id })
  next()
})

const User = mongoose.model('User', userSchema)


module.exports = User